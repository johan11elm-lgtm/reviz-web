// -------------------------------------------------------
// Réviz — Achat de Réviz+ dans l'app iOS (achats intégrés Apple, via RevenueCat)
//
// L'App Store impose ses achats intégrés pour un abonnement numérique (règle 3.1.1).
// RevenueCat garde les reçus et prévient le serveur (api/revenuecat-webhook.js), qui
// écrit users/{uid}.plan comme le fait Stripe : l'app ne s'accorde jamais Réviz+ seule.
// Le compte RevenueCat porte l'uid Firebase (appUserID), pour retrouver l'élève.
// Prix fixés dans App Store Connect (18/11) : 7,99 €/mois, 54,99 €/an.
// -------------------------------------------------------
import { Capacitor } from '@capacitor/core'
import { auth } from './firebaseConfig'
import { apiFetch } from './apiClient.js'
import { PRODUITS_APPLE } from '../../api/_apple.js'

const CLE = import.meta.env.VITE_REVENUECAT_IOS

/** L'achat intégré est-il possible ici (app iOS, clé RevenueCat posée) ? */
export const achatAppleDisponible = () => Capacitor.getPlatform?.() === 'ios' && !!CLE

let module = null
const plugin = async () => (module ??= (await import('@revenuecat/purchases-capacitor')).Purchases)

let pret = null
let uidConfigure = null

/** Prépare RevenueCat pour cet élève (appelé à la connexion). Sans effet hors iOS. */
export function preparerAchatApple(uid) {
  if (!achatAppleDisponible() || !uid) return Promise.resolve()
  if (uidConfigure === uid && pret) return pret
  const precedent = pret
  uidConfigure = uid
  pret = (async () => {
    const P = await plugin()
    if (!precedent) await P.configure({ apiKey: CLE, appUserID: uid })
    else { await precedent.catch(() => {}); await P.logIn({ appUserID: uid }) }
  })()
  pret.catch(err => { console.warn('[achat-apple] configuration', err?.message || err); pret = null; uidConfigure = null })
  return pret
}

/** À la déconnexion : le prochain élève sur ce téléphone ne reprend pas l'achat du précédent. */
export async function oublierAchatApple() {
  if (!pret) return
  try { await pret; await (await plugin()).logOut() } catch { /* déjà anonyme */ }
  uidConfigure = null
}

async function pretPour() {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('UNAUTHORIZED')
  await preparerAchatApple(uid)
  return plugin()
}

/**
 * Les deux formules telles que l'App Store les vend (prix dans la devise de l'élève).
 * @returns {Promise<Record<'annuel'|'mensuel', { prix: string, centimes: number, devise: string, produit: object }>>}
 */
export async function formulesApple() {
  const P = await pretPour()
  const { products } = await P.getProducts({ productIdentifiers: Object.values(PRODUITS_APPLE), type: 'SUBS' })
  const formules = {}
  for (const [formule, id] of Object.entries(PRODUITS_APPLE)) {
    const p = products.find(x => x.identifier === id)
    if (p) formules[formule] = { prix: p.priceString, centimes: Math.round(p.price * 100), devise: p.currencyCode, produit: p }
  }
  if (!formules.annuel && !formules.mensuel) throw new Error('INDISPONIBLE')
  return formules
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
export async function acheterApple(formule, formules) {
  const P = await pretPour()
  const produit = formules?.[formule]?.produit
  if (!produit) throw new Error('INDISPONIBLE')
  try {
    await P.purchaseStoreProduct({ product: produit })
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
  const P = await pretPour()
  await P.restorePurchases()
  const r = await synchroniser()
  return r.plan === 'premium'
}

/** Page des abonnements de l'App Store (gérer, résilier). */
export const URL_GERER_APPLE = 'https://apps.apple.com/account/subscriptions'
