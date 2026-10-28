// -------------------------------------------------------
// Réviz — Espace parent (lien sans mot de passe)
//
// L'élève (avec un compte) génère depuis l'app un lien qu'il partage à son
// parent : ?op=lien-parent (POST, jeton Firebase) dans api/track.js. Le lien
// mène à la page /parent de l'app, qui lit ?op=parent (GET) : ce que l'enfant
// a révisé ces 30 derniers jours, ses contrôles à venir et sa préparation,
// et s'il a Réviz+. Comme le bilan J+3 (api/_bilanParent.js) : l'effort, les
// chapitres et les formats, pas les notes ; rien ne s'y modifie.
// Le lien est signé (HMAC, CRON_SECRET) avec sa date d'expiration (60 jours) :
// pas de compte parent, pas de mot de passe, rien de stocké. Un nouveau lien
// ne révoque pas l'ancien ; il expire seul.
// -------------------------------------------------------
import { signatureDesabo, signatureValide, prenomPropre, titrePropre } from './_rappels.js'
import { resumeActivite, avecTitres } from './_bilanParent.js'
import { JOUR_MS } from '../src/utils/consent.js'
import { jourParis } from '../src/utils/retour.js'
import { controlesAVenir, matiereControle } from '../src/utils/agenda.js'
import { planRevision, etatPreparation } from '../src/utils/planRevision.js'

export const PORTEE_ESPACE = 'espace-parent'
export const DUREE_LIEN_MS = 60 * JOUR_MS
export const FENETRE_MS = 30 * JOUR_MS
const APP = 'https://app.revizapp.fr'
const UID_OK = /^[A-Za-z0-9]{10,128}$/
const MAX_CHAPITRES = 8

const portee = exp => `${PORTEE_ESPACE}:${exp}`

/** Lien de l'espace parent, valable 60 jours (null sans secret). */
export function lienEspaceParent(uid, { maintenant = Date.now(), secret = process.env.CRON_SECRET } = {}) {
  const exp = Math.floor((maintenant + DUREE_LIEN_MS) / 1000)
  const t = signatureDesabo(uid, secret, portee(exp))
  return t ? `${APP}/parent?u=${encodeURIComponent(uid)}&e=${exp}&t=${t}` : null
}

/** Le lien est-il authentique et encore valable ? */
export function lienParentValide(uid, exp, t, { maintenant = Date.now(), secret = process.env.CRON_SECRET } = {}) {
  if (typeof uid !== 'string' || !UID_OK.test(uid)) return false
  const e = Number(exp)
  if (!Number.isInteger(e) || e * 1000 < maintenant) return false
  return signatureValide(uid, t, secret, portee(e))
}

/** Abonnement Réviz+ en cours (users/{uid}, champs posés par api/stripe-webhook.js). */
export function aRevizPlus(u) {
  return u?.plan === 'premium' && ['active', 'trialing', 'past_due'].includes(u?.subscriptionStatus)
}

/**
 * Ce que voit le parent. null si le compte n'existe pas.
 * @returns {Promise<null|{
 *   prenom, classe, depuis, jours: string[], joursRevision, quizTermines, parties,
 *   chapitres: { titre, matiere, formats: string[], quizTermine: boolean, derniere: number }[],
 *   controles: { matiere, titre, date, etat, etapesFaites, etapes }[], revizPlus: boolean,
 * }>}
 */
export async function donneesEspaceParent({ db, uid, maintenant = Date.now() }) {
  const ref = db.collection('users').doc(uid)
  const profil = await ref.get()
  if (!profil.exists) return null
  const u = profil.data() ?? {}
  const depuis = maintenant - FENETRE_MS
  const revs = (await ref.collection('revisions').where('revisedAt', '>=', depuis).get()).docs.map(r => r.data())
  const resume = resumeActivite({ revisions: revs, jeux: u.jeux, depuis, maintenant })

  // Les jours où il a révisé ou joué la partie du jour (bande des 30 jours).
  const debut = jourParis(new Date(depuis))
  const fin = jourParis(new Date(maintenant))
  const jours = new Set(revs.filter(r => Number.isFinite(r?.revisedAt) && r.revisedAt >= depuis && r.revisedAt <= maintenant)
    .map(r => jourParis(new Date(r.revisedAt))))
  for (const j of Array.isArray(u.jeux?.jours) ? u.jeux.jours : []) if (typeof j === 'string' && j >= debut && j <= fin) jours.add(j)

  const chapitres = (await avecTitres(ref, resume.chapitres.slice(0, MAX_CHAPITRES))).map(ch => ({
    titre: ch.titre ?? null,
    matiere: typeof ch.matiere === 'string' ? titrePropre(ch.matiere) : null,
    formats: [...(ch.formats ?? [])],
    quizTermine: Boolean(ch.quizTermine),
    derniere: ch.derniere,
  }))

  const controles = controlesAVenir(Array.isArray(u.agenda?.controles) ? u.agenda.controles : [], fin).slice(0, 5).map(c => {
    const etapes = planRevision(c, fin)
    return {
      matiere: matiereControle(c.matiere).label,
      titre: titrePropre(c.titre),
      date: c.date,
      etat: etatPreparation(c, etapes, fin).label,
      etapesFaites: etapes.filter(e => e.fait).length,
      etapes: etapes.length,
    }
  })

  return {
    prenom: prenomPropre(u.prenom),
    classe: typeof u.level?.classe === 'string' ? u.level.classe : null,
    depuis: debut,
    jours: [...jours].sort(),
    joursRevision: jours.size,
    quizTermines: resume.quizTermines,
    parties: resume.parties,
    chapitres,
    controles,
    revizPlus: aRevizPlus(u),
  }
}

/**
 * ?op=parent (GET) : les données de l'espace parent, si le lien est valable.
 * ?op=lien-parent (POST, { idToken }) : un lien pour l'élève connecté.
 */
export async function routeEspaceParent(req, res, { db, auth, maintenant = Date.now(), secret = process.env.CRON_SECRET }) {
  res.setHeader?.('Cache-Control', 'no-store')
  if (req.query?.op === 'parent') {
    const { u, e, t } = req.query ?? {}
    if (!lienParentValide(u, e, t, { maintenant, secret })) return res.status(403).json({ error: 'LIEN_INVALIDE' })
    const donnees = await donneesEspaceParent({ db, uid: u, maintenant })
    if (!donnees) return res.status(404).json({ error: 'INTROUVABLE' })
    return res.status(200).json(donnees)
  }
  let body = req.body ?? {}
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  if (!body.idToken) return res.status(401).json({ error: 'UNAUTHORIZED' })
  let decoded
  try { decoded = await auth.verifyIdToken(body.idToken) } catch { return res.status(401).json({ error: 'UNAUTHORIZED' }) }
  if (decoded.firebase?.sign_in_provider === 'anonymous') return res.status(403).json({ error: 'ANONYMOUS' })
  const lien = lienEspaceParent(decoded.uid, { maintenant, secret })
  if (!lien) return res.status(500).json({ error: 'INTERNAL' })
  return res.status(200).json({ lien, jusquau: maintenant + DUREE_LIEN_MS })
}
