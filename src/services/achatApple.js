// -------------------------------------------------------
// Réviz — Achat de Réviz+ dans l'app iOS (achats intégrés Apple, via RevenueCat)
//
// L'App Store impose ses achats intégrés pour un abonnement numérique (règle 3.1.1).
// RevenueCat garde les reçus et prévient le serveur (api/revenuecat-webhook.js), qui
// écrit users/{uid}.plan comme le fait Stripe : l'app ne s'accorde jamais Réviz+ seule.
// Le compte RevenueCat porte l'uid Firebase (appUserID), pour retrouver l'élève.
// Prix fixés dans App Store Connect : les mêmes que sur le site depuis le 26/11 (6,99 €/mois,
// 49 €/an, Pass brevet 29 €). Black Friday = offre de lancement datée sur l'annuel ; fin d'essai =
// offre promotionnelle du mensuel (OFFRE_FIN_ESSAI.offreApple), signée par RevenueCat.
// -------------------------------------------------------
import { Capacitor } from '@capacitor/core'
import { auth } from './firebaseConfig'
import { apiFetch } from './apiClient.js'
import { PRODUITS_APPLE, PRODUIT_PASS_APPLE } from '../../api/_apple.js'
import { OFFRE_FIN_ESSAI } from '../../api/_offres.js'

const CLE = import.meta.env.VITE_REVENUECAT_IOS

/** L'achat intégré est-il possible ici (app iOS, clé RevenueCat posée) ? */
export const achatAppleDisponible = () => Capacitor.getPlatform?.() === 'ios' && !!CLE

// Le plugin Capacitor est un Proxy qui répond à toute propriété, `then` compris : le renvoyer
// tel quel d'une fonction async le fait passer pour une promesse qui ne se résout jamais
// (aucun appel natif ne part). On le garde donc dans une boîte.
let boite = null
const charger = async () => (boite ??= { P: (await import('@revenuecat/purchases-capacitor')).Purchases })
async function avecPlugin(fn) { const { P } = await charger(); return fn(P) }

/** Coupe une attente native trop longue (StoreKit muet, réseau absent). */
function delai(promesse, ms, code = 'INDISPONIBLE') {
  let t
  return Promise.race([promesse, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(code)), ms) })]).finally(() => clearTimeout(t))
}

let pret = null
let uidConfigure = null

/** Prépare RevenueCat pour cet élève (appelé à la connexion). Sans effet hors iOS. */
export function preparerAchatApple(uid) {
  if (!achatAppleDisponible() || !uid) return Promise.resolve()
  if (uidConfigure === uid && pret) return pret
  const precedent = pret
  uidConfigure = uid
  pret = avecPlugin(async P => {
    if (!precedent) await P.configure({ apiKey: CLE, appUserID: uid })
    else { await precedent.catch(() => {}); await P.logIn({ appUserID: uid }) }
  })
  pret.catch(err => { console.warn('[achat-apple] configuration', err?.message || err); pret = null; uidConfigure = null })
  return pret
}

/** À la déconnexion : le prochain élève sur ce téléphone ne reprend pas l'achat du précédent. */
export async function oublierAchatApple() {
  if (!pret) return
  try { await pret; await avecPlugin(P => P.logOut()) } catch { /* déjà anonyme */ }
  uidConfigure = null
}

/** Prépare RevenueCat pour l'élève connecté puis lance fn(Purchases). */
async function avecPurchases(fn) {
  // Démarrage optimiste : l'accueil s'affiche avant que Firebase ait rendu la session.
  if (!auth.currentUser) await delai(auth.authStateReady?.() ?? Promise.resolve(), 10_000, 'UNAUTHORIZED').catch(() => {})
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('UNAUTHORIZED')
  await delai(preparerAchatApple(uid), 15_000)
  return avecPlugin(fn)
}

/**
 * Les deux formules telles que l'App Store les vend (prix dans la devise de l'élève).
 * @returns {Promise<Record<'annuel'|'mensuel', { prix: string, centimes: number, devise: string, produit: object }>>}
 */
export async function formulesApple() {
  const [abonnements, pass] = await avecPurchases(P => Promise.all([
    delai(P.getProducts({ productIdentifiers: Object.values(PRODUITS_APPLE), type: 'SUBSCRIPTION' }), 20_000),
    // Le Pass brevet (non renouvelable) : son absence ne bloque pas les abonnements.
    delai(P.getProducts({ productIdentifiers: [PRODUIT_PASS_APPLE], type: 'NON_SUBSCRIPTION' }), 20_000).catch(() => ({ products: [] })),
  ]))
  const products = [...(abonnements?.products ?? []), ...(pass?.products ?? [])]
  const formules = {}
  for (const [formule, id] of [...Object.entries(PRODUITS_APPLE), ['pass', PRODUIT_PASS_APPLE]]) {
    const p = products.find(x => x.identifier === id)
    if (!p) continue
    formules[formule] = {
      prix: p.priceString, centimes: Math.round(p.price * 100), devise: p.currencyCode, produit: p,
      // Offre de lancement (Black Friday sur l'annuel) : Apple l'applique seule aux nouveaux abonnés.
      intro: p.introPrice ? { prix: p.introPrice.priceString, centimes: Math.round(p.introPrice.price * 100) } : null,
      // Offre promotionnelle de fin d'essai (mensuel), si App Store Connect la propose.
      promo: (p.discounts ?? []).find(d => d.identifier === OFFRE_FIN_ESSAI.offreApple) ?? null,
    }
  }
  if (!formules.annuel && !formules.mensuel) throw new Error('INDISPONIBLE')
  return formules
}

/** Le prix de lancement s'applique-t-il encore à cet élève (jamais abonné à ce produit) ? */
export async function introEligible(formules) {
  const ids = Object.values(formules ?? {}).filter(f => f.intro).map(f => f.produit.identifier)
  if (!ids.length) return {}
  try {
    const r = await avecPurchases(P => delai(P.checkTrialOrIntroductoryPriceEligibility({ productIdentifiers: ids }), 10_000))
    // INTRO_ELIGIBILITY_STATUS : 2 = éligible (0 inconnu, 1 non éligible, 3 pas d'offre).
    return Object.fromEntries(ids.map(id => [id, r?.[id]?.status === 2 || r?.[id]?.status === 0]))
  } catch {
    return Object.fromEntries(ids.map(id => [id, true]))
  }
}

/** Demande au serveur de relire l'abonnement chez RevenueCat (déblocage immédiat, restauration). */
async function synchroniser() {
  const idToken = await auth.currentUser?.getIdToken().catch(() => null)
  if (!idToken) throw new Error('UNAUTHORIZED')
  const res = await apiFetch('/api/abonnement?op=apple', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP_${res.status}`)
  return data // { plan: 'premium'|'free', ... }
}

// Codes d'erreur RevenueCat (purchases-typescript-internal, error-codes).
const ANNULE = '1'
const EN_ATTENTE = '20'

/**
 * Achète une formule. « Demander l'achat » (Partage familial) : l'achat attend l'accord
 * du parent sur son téléphone, et le webhook débloque Réviz+ quand il accepte.
 * @returns {Promise<'achete'|'annule'|'en_attente'>}
 * @throws {Error} 'UNAUTHORIZED' | 'INDISPONIBLE' | 'ECHEC'
 */
export async function acheterApple(formule, formules, { promo = false } = {}) {
  const produit = formules?.[formule]?.produit
  if (!produit) throw new Error('INDISPONIBLE')
  const remise = promo ? formules?.[formule]?.promo : null
  try {
    await avecPurchases(async P => {
      // Offre de fin d'essai : RevenueCat signe l'offre promotionnelle, puis Apple l'applique.
      const offre = remise ? await delai(P.getPromotionalOffer({ product: produit, discount: remise }), 15_000).catch(() => null) : null
      return offre ? P.purchaseDiscountedProduct({ product: produit, discount: offre }) : P.purchaseStoreProduct({ product: produit })
    })
  } catch (err) {
    if (err?.code === ANNULE || err?.userCancelled) return 'annule'
    if (err?.code === EN_ATTENTE) return 'en_attente'
    console.warn('[achat-apple] achat', err?.code, err?.message)
    throw new Error('ECHEC')
  }
  // L'App Store a encaissé : le webhook suit, la synchro rend l'accès tout de suite.
  await synchroniser().catch(err => console.warn('[achat-apple] synchro', err?.message || err))
  return 'achete'
}

/**
 * « Restaurer mes achats » (exigé par Apple) : retrouve un abonnement pris avec ce compte Apple.
 * @returns {Promise<boolean>} true si Réviz+ est actif après coup
 */
export async function restaurerApple() {
  await avecPurchases(P => P.restorePurchases())
  const r = await synchroniser()
  return r.plan === 'premium'
}

/** Page des abonnements de l'App Store (gérer, résilier). */
export const URL_GERER_APPLE = 'https://apps.apple.com/account/subscriptions'
