// -------------------------------------------------------
// Réviz — Notifications web (push)
//
// 1. Abonnement : POST /api/track?op=push { idToken, abonnement } enregistre
//    l'abonnement du navigateur dans users/{uid}/push/{id} ; { idToken,
//    endpoint, retirer: true } (ou DELETE) le retire. L'uid vient du jeton vérifié.
//    Greffé sur api/track.js (limite de 12 fonctions du plan Vercel Hobby).
// 2. Envoi : appelé par le cron quotidien de api/send-parental-consent.js
//    (16 h UTC, 17 h à Paris), après les e-mails. Au plus une notification par
//    jour et par élève, à tous ses appareils abonnés. Jamais :
//    - s'il a déjà révisé ou ouvert l'app aujourd'hui ;
//    - le jour où il reçoit le rappel du lendemain par e-mail ;
//    - avant 15 ans sans l'autorisation d'un parent, ni sans date de naissance
//      (même règle que les e-mails de rappel) ;
//    - après MAX_SANS_RETOUR notifications d'affilée restées sans retour :
//      on se tait jusqu'à son prochain passage dans l'app.
// Le lien de la notification porte via=push (provenance mesurée à part).
// -------------------------------------------------------
import { createHash } from 'node:crypto'
import { isUnder15 } from '../src/utils/levels.js'
import { jourParis } from '../src/utils/retour.js'
import { VAPID_PUBLIC_KEY, MAX_SANS_RETOUR, notifDuJour } from '../src/utils/push.js'

const JOUR_MS = 24 * 60 * 60 * 1000
// Une notification qui n'a pas pu partir dans les 6 h n'a plus de sens (le soir est passé).
const TTL_S = 6 * 60 * 60
const ENDPOINT_RE = /^https:\/\/[a-z0-9.-]+(:\d+)?\/\S{1,2000}$/i
const CLE_RE = /^[A-Za-z0-9_-]{16,200}$/

/** Identifiant stable d'un abonnement (un navigateur = un document). */
export function idAbonnement(endpoint) {
  return createHash('sha256').update(String(endpoint)).digest('hex').slice(0, 32)
}

/** Abonnement envoyé par le navigateur (PushSubscription.toJSON()), validé. */
export function abonnementValide(a) {
  if (!a || typeof a !== 'object') return null
  const endpoint = typeof a.endpoint === 'string' ? a.endpoint : ''
  const p256dh = a.keys?.p256dh
  const auth = a.keys?.auth
  if (!ENDPOINT_RE.test(endpoint) || !CLE_RE.test(p256dh ?? '') || !CLE_RE.test(auth ?? '')) return null
  return { endpoint, keys: { p256dh, auth } }
}

/**
 * POST (abonner) ou DELETE (désabonner) depuis l'app.
 * @param {{ db, auth }} deps  firebase-admin
 */
export async function routeAbonnement(req, res, { db, auth, maintenant = Date.now() }) {
  let body = req.body ?? {}
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const { idToken, abonnement, endpoint, retirer } = body
  if (!idToken) return res.status(401).json({ error: 'UNAUTHORIZED' })
  let decoded
  try { decoded = await auth.verifyIdToken(idToken) } catch { return res.status(401).json({ error: 'UNAUTHORIZED' }) }
  // Les invités de la Battle sont des comptes anonymes jetables.
  if (decoded.firebase?.sign_in_provider === 'anonymous') return res.status(403).json({ error: 'ANONYMOUS' })
  const col = db.collection('users').doc(decoded.uid).collection('push')

  if (req.method === 'DELETE' || retirer === true) {
    if (typeof endpoint !== 'string' || !endpoint) return res.status(400).json({ error: 'MISSING_ENDPOINT' })
    await col.doc(idAbonnement(endpoint)).delete().catch(() => {})
    return res.status(200).json({ ok: true })
  }
  const a = abonnementValide(abonnement)
  if (!a) return res.status(400).json({ error: 'INVALID_SUBSCRIPTION' })
  const ref = col.doc(idAbonnement(a.endpoint))
  const deja = await ref.get().catch(() => null)
  await ref.set({ ...a, creeLe: deja?.exists ? (deja.data()?.creeLe ?? maintenant) : maintenant, vuLe: maintenant })
  return res.status(200).json({ ok: true })
}

/** Un élève de moins de 15 ans ne reçoit rien sans l'autorisation d'un parent. */
async function peutRecevoir(db, uid, profil) {
  if (!profil.birthDate) return false
  if (!isUnder15(profil.birthDate)) return true
  const c = await db.collection('users').doc(uid).collection('parentalConsent').doc('consent').get().catch(() => null)
  return c?.exists === true && c.data()?.status === 'approved'
}

/** Dernier passage connu dans l'app (révision ou jour d'ouverture), en ms. */
function dernierPassage(p) {
  const jours = Array.isArray(p.joursActifs) ? p.joursActifs.filter(j => typeof j === 'string').sort() : []
  const jour = jours.length ? Date.parse(`${jours[jours.length - 1]}T23:59:59+01:00`) : 0
  return Math.max(Number(p.derniereRevisionAt) || 0, jour || 0)
}

/**
 * @param {{
 *   db, envoyer: (abonnement, charge: string, options: object) => Promise,
 *   maintenant?: number, journal?: (m: string) => void,
 * }} p  envoyer = webpush.sendNotification déjà configuré (VAPID)
 * @returns {Promise<{ notifs: number, abonnesPush: number }>}
 */
export async function envoyerNotifs({ db, envoyer, maintenant = Date.now(), journal = m => console.error(m) }) {
  const aujourdhui = jourParis(new Date(maintenant))
  const hier = jourParis(new Date(maintenant - JOUR_MS))
  const demain = jourParis(new Date(maintenant + JOUR_MS))

  // Les abonnements se comptent en dizaines : pas de requête filtrée (index à publier).
  const snap = await db.collectionGroup('push').get()
  const parUid = new Map()
  for (const d of snap.docs) {
    const uid = d.ref.parent.parent?.id
    if (!uid) continue
    if (!parUid.has(uid)) parUid.set(uid, [])
    parUid.get(uid).push(d)
  }

  let notifs = 0
  for (const [uid, abonnements] of parUid) {
    try {
      const ref = db.collection('users').doc(uid)
      const profil = await ref.get()
      if (!profil.exists) continue
      const p = profil.data() ?? {}
      if (p.notifsPush === false) continue
      // Déjà venu aujourd'hui, ou rappel par e-mail ce jour-là : rien.
      if (Array.isArray(p.joursActifs) && p.joursActifs.includes(aujourdhui)) continue
      if (p.derniereRevisionAt && jourParis(new Date(p.derniereRevisionAt)) === aujourdhui) continue
      if (p.rappelJ1Le && jourParis(new Date(p.rappelJ1Le)) === aujourdhui) continue
      const etat = p.push ?? {}
      if (etat.dernierLe && jourParis(new Date(etat.dernierLe)) === aujourdhui) continue
      // Revenu depuis la dernière notification : le compteur repart de zéro.
      const sansRetour = etat.dernierLe && dernierPassage(p) > etat.dernierLe ? 0 : (etat.sansRetour ?? 0)
      if (sansRetour >= MAX_SANS_RETOUR) continue
      if (!(await peutRecevoir(db, uid, p))) continue

      const lecons = await ref.collection('lessons').orderBy('scannedAt', 'desc').limit(1).get().catch(() => null)
      const lecon = lecons?.docs?.[0]?.data() ?? null
      const notif = notifDuJour({ agenda: p.agenda, jeux: p.jeux, lecon, hier, demain })
      const charge = JSON.stringify(notif)

      let partie = false
      for (const a of abonnements) {
        const { endpoint, keys } = a.data() ?? {}
        try {
          await envoyer({ endpoint, keys }, charge, { TTL: TTL_S, urgency: 'normal', topic: 'reviz-jour' })
          partie = true
        } catch (err) {
          // 404 / 410 : le navigateur a retiré l'abonnement, on l'oublie.
          if (err?.statusCode === 404 || err?.statusCode === 410) await a.ref.delete().catch(() => {})
          else journal(`[push] ${uid} : ${err?.statusCode ?? ''} ${err?.message || err}`)
        }
      }
      if (!partie) continue
      await ref.set({ push: { dernierLe: maintenant, sansRetour: sansRetour + 1, dernierTag: notif.tag } }, { merge: true })
      notifs++
    } catch (err) {
      journal(`[push] ${uid} : ${err?.message || err}`)
    }
  }
  return { notifs, abonnesPush: parUid.size }
}

/** webpush configuré avec les clés VAPID, ou null sans clé privée (rien n'est envoyé). */
export async function preparerEnvoi(env = process.env) {
  if (!env.VAPID_PRIVATE_KEY) return null
  const { default: webpush } = await import('web-push')
  webpush.setVapidDetails('mailto:contact@revizapp.fr', VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)
  return (abonnement, charge, options) => webpush.sendNotification(abonnement, charge, options)
}
