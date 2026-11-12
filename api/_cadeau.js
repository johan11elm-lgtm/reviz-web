// -------------------------------------------------------
// Réviz — Réviz+ offert par un parent, sans compte (11/11, repris de Knowunity)
//
// Sur /parents, le parent choisit sa formule et paie (Stripe, abonnement sans
// élève rattaché : metadata.cadeau = '1'). Le code de son enfant est dérivé du
// paiement (HMAC de l'id de session) : la page de remerciement et le webhook le
// retrouvent sans se concerter, et le webhook l'envoie aussi par e-mail au parent.
// L'enfant l'active depuis son compte : l'abonnement lui est rattaché
// (stripeCustomerId, stripeSubscriptionId), et les événements Stripe suivants
// (renouvellement, résiliation) le retrouvent comme un abonné normal.
//
//   ?op=cadeau (POST) action 'caisse' { formule, email }  → { url } de paiement
//                     action 'code'   { session }         → { code, formule, active }
//                     action 'activer' { idToken, code }  → { ok, formule } (compte requis)
// cadeaux/{CODE} = { sessionId, customer, subscription, formule, fondateur, email?, creeLe,
//                    uid?, activeLe? } : écrit par le serveur seul (fermé à l'app par défaut).
// -------------------------------------------------------
import { createHmac } from 'node:crypto'
import { ALPHABET_CADEAU, normaliserCodeCadeau, lienCadeau, ecrireCodeCadeau } from '../src/utils/cadeau.js'
import { FORMULES } from './_prix.js'
import { planForStatusCadeau } from './_cadeauPlan.js'
import { accordParPaiement } from './_accordParent.js'

const APP = 'https://app.revizapp.fr'
const EMAIL_OK = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[a-z]{2,24}$/i

/** Le code d'un paiement, toujours le même pour une session donnée. */
export function codeCadeau(sessionId, secret = process.env.CRON_SECRET) {
  if (!secret) throw new Error('SECRET')
  const h = createHmac('sha256', secret).update(`cadeau:${sessionId}`).digest()
  let code = ''
  for (let i = 0; i < 8; i++) code += ALPHABET_CADEAU[h[i] % ALPHABET_CADEAU.length]
  return code
}

const paye = s => s?.metadata?.cadeau === '1' && (s.status === 'complete' || s.payment_status === 'paid' || s.payment_status === 'no_payment_required')

/**
 * Écrit cadeaux/{CODE} pour une session payée (idempotent). Renvoie { code, cadeau, nouveau }.
 * La page de remerciement passe souvent avant le webhook : « nouveau » ne dit donc pas si l'e-mail
 * est parti ; c'est cadeau.mailLe (voir noterMailCadeau).
 */
export async function enregistrerCadeau(db, session, { maintenant = Date.now(), secret } = {}) {
  const code = codeCadeau(session.id, secret)
  const ref = db.collection('cadeaux').doc(code)
  const snap = await ref.get()
  const base = {
    sessionId: session.id,
    customer: session.customer ?? null,
    subscription: session.subscription ?? null,
    formule: session.metadata?.formule ?? null,
    fondateur: session.metadata?.fondateur === 'true',
    // Une carte vraiment débitée (pas 0 € avec un code promo) : seule condition pour que le paiement
    // vaille accord parental à l'activation (un élève peut payer 0 € lui-même).
    debite: session.amount_total > 0 && session.payment_status === 'paid',
  }
  if (!snap.exists) {
    const email = session.customer_details?.email ?? session.customer_email ?? null
    await ref.set({ ...base, ...(email && { email }), creeLe: maintenant })
    return { code, cadeau: { ...base, creeLe: maintenant }, nouveau: true }
  }
  return { code, cadeau: snap.data(), nouveau: false }
}

/** Marque l'e-mail du code comme envoyé : le webhook ne l'envoie qu'une fois. */
export function noterMailCadeau(db, code, maintenant = Date.now()) {
  return db.collection('cadeaux').doc(code).set({ mailLe: maintenant }, { merge: true })
}

/** L'e-mail au parent, avec le code et le lien à transmettre. */
export function mailCadeau({ code, formule }) {
  const lien = lienCadeau(code)
  const duree = formule === 'mensuel' ? 'au mois' : 'à l’année'
  return {
    subject: 'Le code Réviz+ de votre enfant',
    html: `<div style="font-family:Poppins,Arial,sans-serif;font-size:16px;line-height:1.5;color:#042A65;max-width:520px">
<p>Bonjour,</p>
<p>Merci d’avoir offert Réviz+ ${duree} à votre enfant. Voici son code :</p>
<p style="font-size:28px;font-weight:800;letter-spacing:.12em;margin:18px 0">${ecrireCodeCadeau(code)}</p>
<p>Le plus simple : envoyez-lui ce lien. Il l’ouvre sur son téléphone, crée son compte gratuit (ou se connecte), et Réviz+ s’active tout seul.</p>
<p><a href="${lien}" style="color:#E2541B;font-weight:700">${lien}</a></p>
<p>Il peut aussi taper le code dans Réviz, onglet « Moi ».</p>
<p style="color:#5A6A86;font-size:14px">Résiliable à tout moment : répondez simplement à cet e-mail.</p>
</div>`,
    text: `Merci d'avoir offert Réviz+ à votre enfant. Son code : ${ecrireCodeCadeau(code)}\nLe lien à lui envoyer : ${lien}\nRésiliable à tout moment : répondez à cet e-mail.`,
  }
}

async function uidDuJeton(idToken, auth) {
  if (!idToken) return null
  try {
    const d = await auth.verifyIdToken(idToken)
    if (d.firebase?.sign_in_provider === 'anonymous') return { anonyme: true }
    return { uid: d.uid }
  } catch { return null }
}

export async function routeCadeau(req, res, { db, auth, stripe, creerSession, maintenant = Date.now(), secret = process.env.CRON_SECRET }) {
  const corps = req.body ?? {}
  const action = corps.action

  if (action === 'caisse') {
    const formule = FORMULES.includes(corps.formule) ? corps.formule : null
    const email = typeof corps.email === 'string' ? corps.email.trim() : ''
    if (!formule) return res.status(400).json({ error: 'FORMULE' })
    if (!EMAIL_OK.test(email)) return res.status(400).json({ error: 'EMAIL' })
    const url = await creerSession({
      uid: null, cadeau: true, email, formule, parent: true,
      successUrl: `${APP}/parents/merci?session={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${APP}/parents?annule=1`,
    })
    return res.status(200).json({ url })
  }

  if (action === 'code') {
    const id = typeof corps.session === 'string' && /^cs_[A-Za-z0-9_]{10,200}$/.test(corps.session) ? corps.session : null
    if (!id) return res.status(400).json({ error: 'SESSION' })
    let session
    try { session = await stripe.checkout.sessions.retrieve(id) } catch { return res.status(404).json({ error: 'SESSION' }) }
    if (!paye(session)) return res.status(409).json({ error: 'PAS_PAYE' })
    const { code, cadeau } = await enregistrerCadeau(db, session, { maintenant, secret })
    return res.status(200).json({ code, formule: cadeau.formule, active: !!cadeau.uid })
  }

  if (action === 'activer') {
    const qui = await uidDuJeton(corps.idToken, auth)
    if (!qui) return res.status(401).json({ error: 'UNAUTHORIZED' })
    if (qui.anonyme) return res.status(409).json({ error: 'COMPTE' })
    const code = normaliserCodeCadeau(corps.code)
    if (!code) return res.status(400).json({ error: 'CODE_INVALIDE' })
    const cadeauRef = db.collection('cadeaux').doc(code)
    const premier = await cadeauRef.get()
    if (!premier.exists) return res.status(404).json({ error: 'CODE_INCONNU' })
    // L'abonnement payé par le parent court-il toujours ?
    let statut = 'active'
    const subId = premier.data()?.subscription
    if (subId && stripe) {
      try { statut = (await stripe.subscriptions.retrieve(subId)).status } catch { /* Stripe injoignable : on suit le paiement */ }
    }
    if (planForStatusCadeau(statut) !== 'premium') return res.status(409).json({ error: 'EXPIRE' })

    const userRef = db.collection('users').doc(qui.uid)
    const resultat = await db.runTransaction(async tx => {
      const c = await tx.get(cadeauRef)
      const u = await tx.get(userRef)
      const cadeau = c.data()
      const profil = u.exists ? u.data() : null
      if (cadeau.uid && cadeau.uid !== qui.uid) return { status: 409, body: { error: 'DEJA_UTILISE' } }
      if (cadeau.uid === qui.uid) return { status: 200, body: { ok: true, formule: cadeau.formule, deja: true } }
      if (profil?.plan === 'premium' && profil.stripeSubscriptionId && profil.stripeSubscriptionId !== cadeau.subscription) {
        return { status: 409, body: { error: 'DEJA_ABONNE' } }
      }
      tx.set(userRef, {
        plan: 'premium',
        stripeCustomerId: cadeau.customer,
        stripeSubscriptionId: cadeau.subscription,
        subscriptionStatus: statut,
        upgradedAt: maintenant,
        ...(cadeau.formule && { formule: cadeau.formule }),
        fondateur: !!cadeau.fondateur,
        payeur: 'parent',
        annuleLe: null,
      }, { merge: true })
      tx.set(cadeauRef, { uid: qui.uid, activeLe: maintenant }, { merge: true })
      return { status: 200, body: { ok: true, formule: cadeau.formule }, email: cadeau.email ?? null, debite: cadeau.debite === true }
    })
    // Le parent a payé (carte débitée) : vaut accord parental pour cet élève.
    if (resultat.status === 200 && !resultat.body.deja && resultat.debite) {
      await accordParPaiement(db, qui.uid, { parentEmail: resultat.email, maintenant }).catch(err => console.error('[cadeau] accord parental', err?.message || err))
    }
    // Pour s'y retrouver dans Stripe : l'abonnement porte désormais l'élève.
    if (resultat.status === 200 && !resultat.body.deja && subId && stripe) {
      stripe.subscriptions.update(subId, { metadata: { firebaseUid: qui.uid, payeur: 'parent', cadeau: '1' } }).catch(() => {})
    }
    return res.status(resultat.status).json(resultat.body)
  }

  return res.status(400).json({ error: 'ACTION' })
}
