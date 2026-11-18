// -------------------------------------------------------
// Réviz — Réviz+ acheté dans l'app iOS (achats intégrés Apple, via RevenueCat)
//
// Une seule règle, appliquée par le webhook RevenueCat (api/revenuecat-webhook.js) ET par
// la synchro demandée par l'app juste après l'achat (?op=apple dans api/abonnement.js) :
// on relit l'abonnement chez RevenueCat (API REST, clé secrète) au lieu de croire l'événement.
// Rejouer, recevoir dans le désordre ou deux fois ne change donc rien.
//
// L'état Apple vit dans abonnementsApple/{uid}, que seul le serveur lit et écrit (aucune règle
// Firestore ne l'ouvre) ; users/{uid} reçoit plan + les champs affichés (comme Stripe).
// On ne déclasse que ce qu'Apple a donné : un abonné Stripe ou un cadeau n'est jamais touché.
// -------------------------------------------------------

// Identifiants des abonnements dans App Store Connect (groupe « Reviz+ », 18/11/2026).
export const PRODUITS_APPLE = {
  annuel: 'com.reviz.app.plus.annuel',
  mensuel: 'com.reviz.app.plus.mensuel',
}
const FORMULE_DU_PRODUIT = Object.fromEntries(Object.entries(PRODUITS_APPLE).map(([f, id]) => [id, f]))

export const COLLECTION_APPLE = 'abonnementsApple'

const ms = d => { const t = d ? Date.parse(d) : NaN; return Number.isFinite(t) ? t : null }

/**
 * État Réviz+ d'un abonné RevenueCat (réponse de GET /v1/subscribers/{id}).
 * Garde l'abonnement Réviz+ qui finit le plus tard ; un remboursement le coupe tout de suite,
 * une période de grâce (paiement en échec, Apple relance) le prolonge.
 * @returns {{ actif: boolean, formule: string|null, produit: string|null, expire: number|null, annule: boolean, sandbox: boolean } | null}
 *   null si l'élève n'a jamais acheté Réviz+ chez Apple
 */
export function etatApple(subscriber, maintenant = Date.now()) {
  const subs = subscriber?.subscriptions ?? {}
  let meilleur = null
  for (const [produit, s] of Object.entries(subs)) {
    if (!FORMULE_DU_PRODUIT[produit] || s?.store && s.store !== 'app_store') continue
    const rembourse = ms(s.refunded_at)
    const fin = rembourse ?? Math.max(ms(s.expires_date) ?? 0, ms(s.grace_period_expires_date) ?? 0)
    if (!meilleur || fin > meilleur.fin) meilleur = { produit, s, fin, rembourse }
  }
  if (!meilleur) return null
  const { produit, s, fin, rembourse } = meilleur
  return {
    actif: !rembourse && fin > maintenant,
    formule: FORMULE_DU_PRODUIT[produit],
    produit,
    expire: fin || null,
    annule: !!s.unsubscribe_detected_at,
    sandbox: !!s.is_sandbox,
  }
}

/** Lit l'abonné chez RevenueCat. @throws si la clé manque ou si RevenueCat répond mal */
export async function lireAbonneRevenueCat(uid, { fetchImpl = fetch, cle = process.env.REVENUECAT_SECRET_KEY } = {}) {
  if (!cle) throw new Error('REVENUECAT_SECRET_KEY manquante')
  const res = await fetchImpl(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`, {
    headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`RevenueCat HTTP ${res.status}`)
  return (await res.json())?.subscriber ?? null
}

/** Abonnement Apple en cours pour cet élève ? (lu par le webhook Stripe avant de déclasser) */
export async function appleActif(db, uid, maintenant = Date.now()) {
  const snap = await db.collection(COLLECTION_APPLE).doc(uid).get()
  const e = snap.exists ? snap.data() : null
  return !!e?.actif && Number(e.expire) > maintenant
}

/** Abonnement Stripe en cours (actif, essai, impayé en relance) : même règle que planForStatus. */
const stripeEnCours = p => !!p?.stripeSubscriptionId && ['active', 'trialing', 'past_due'].includes(p?.subscriptionStatus)

/**
 * Reporte l'état Apple sur le profil. Écrit plan = premium quand Apple l'a donné ; ne le retire
 * que si c'est Apple qui l'avait donné et qu'aucun abonnement Stripe ne court.
 * @returns {Promise<{ plan: 'premium'|'free'|null, change: boolean }>} plan null : profil inconnu
 */
export async function appliquerApple(db, uid, etat, maintenant = Date.now()) {
  const userRef = db.collection('users').doc(uid)
  const appleRef = db.collection(COLLECTION_APPLE).doc(uid)
  return db.runTransaction(async tx => {
    const snap = await tx.get(userRef)
    if (!snap.exists) return { plan: null, change: false }
    const p = snap.data()
    tx.set(appleRef, { ...(etat ?? { actif: false }), majLe: maintenant }, { merge: true })
    if (etat?.actif) {
      const champs = {
        plan: 'premium',
        sourceAbonnement: 'apple',
        formule: etat.formule,
        periodeFin: etat.expire,
        annuleLe: etat.annule ? etat.expire : null,
        planUpdatedAt: maintenant,
      }
      if (p.plan !== 'premium') champs.upgradedAt = maintenant
      tx.set(userRef, champs, { merge: true })
      return { plan: 'premium', change: p.plan !== 'premium' }
    }
    // Plus d'abonnement Apple : on ne reprend que ce qu'Apple avait donné.
    if (p.plan === 'premium' && p.sourceAbonnement === 'apple' && !stripeEnCours(p)) {
      tx.set(userRef, { plan: 'free', planUpdatedAt: maintenant, annuleLe: null }, { merge: true })
      return { plan: 'free', change: true }
    }
    return { plan: p.plan === 'premium' ? 'premium' : 'free', change: false }
  })
}

/** Relit RevenueCat et reporte sur le profil (webhook et synchro). */
export async function synchroniserApple(db, uid, deps = {}) {
  const subscriber = await lireAbonneRevenueCat(uid, deps)
  const etat = etatApple(subscriber, deps.maintenant)
  return { etat, ...(await appliquerApple(db, uid, etat, deps.maintenant)) }
}

/**
 * ?op=apple (POST, jeton Firebase) : l'app vient d'acheter ou de restaurer.
 * 200 { plan, actif, formule, expire } ; 401 sans jeton valable ; 502 si RevenueCat ne répond pas.
 */
export async function routeSynchroApple(req, res, { db, auth, ...deps }) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  const idToken = req.body?.idToken
  if (!idToken) return res.status(401).json({ error: 'UNAUTHORIZED' })
  let uid
  try { uid = (await auth.verifyIdToken(idToken)).uid } catch { return res.status(401).json({ error: 'UNAUTHORIZED' }) }
  try {
    const { etat, plan } = await synchroniserApple(db, uid, deps)
    return res.status(200).json({ plan, actif: !!etat?.actif, formule: etat?.formule ?? null, expire: etat?.expire ?? null })
  } catch (err) {
    console.error('[apple] synchro', uid, err?.message || err)
    return res.status(502).json({ error: 'REVENUECAT' })
  }
}

/** Identifiants d'élèves (uid Firebase) cités par un événement RevenueCat, sans les anonymes. */
export function uidsDeLEvenement(event) {
  const ids = [
    event?.app_user_id, event?.original_app_user_id,
    ...(event?.aliases ?? []), ...(event?.transferred_from ?? []), ...(event?.transferred_to ?? []),
  ]
  return [...new Set(ids.filter(id => typeof id === 'string' && id && !id.startsWith('$RCAnonymousID')))]
}
