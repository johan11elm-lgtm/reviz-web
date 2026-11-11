// -------------------------------------------------------
// Réviz — Ligues de la semaine (11/11, repris de Knowunity : Bronze → Argent → Or, groupes de 30)
//
// Chaque semaine (du lundi, heure de Paris), l'élève qui gagne des XP entre dans un groupe d'au
// plus TAILLE_GROUPE élèves de sa ligue. Le classement suit l'XP de la semaine. À la fin, les
// PLACES_MONTEE premiers montent d'une ligue, les PLACES_DESCENTE derniers descendent (sauf en
// Bronze). Calculé paresseusement : à sa première venue de la semaine, la ligue de l'élève se
// déduit de sa place dans son groupe de la semaine d'avant.
//
// Mineurs : chacun n'apparaît que sous un pseudo tiré de son uid (« Hibou malin 42 »), jamais son
// prénom ; users/{uid}.ligueMasquee = true le retire des ligues. L'XP de la semaine est envoyée par
// l'app (calculée sur ses révisions) et plafonnée à XP_SEMAINE_MAX (le plafond du jour × 7).
//
//   ?op=ligue (POST, jeton Firebase) { xpSemaine } → { ligue, rang, total, membres, zones, fin }
//   ligues/{lundi}/membres/{uid} = { ligue, groupe, pseudo, xp, majLe }
//   ligues/{lundi}/groupes/{ligue}-{n} = { ligue, n, membres }   (écrits par le serveur seul)
// -------------------------------------------------------
import { createHash } from 'node:crypto'
import { jourParis } from '../src/utils/retour.js'
import { lundiDe, ajouterJours } from '../src/utils/agenda.js'
import { minuitParis } from '../src/utils/remiseQuotas.js'

export const LIGUES = ['bronze', 'argent', 'or']
export const TAILLE_GROUPE = 30
export const PLACES_MONTEE = 5
export const PLACES_DESCENTE = 5
export const XP_SEMAINE_MAX = 500 * 7

const ADJECTIFS = ['malin', 'rapide', 'curieux', 'calme', 'futé', 'vaillant', 'joyeux', 'patient', 'brillant', 'tenace', 'agile', 'sage']
const ANIMAUX = ['Hibou', 'Renard', 'Panda', 'Lynx', 'Dauphin', 'Koala', 'Faucon', 'Loutre', 'Castor', 'Tigre', 'Manchot', 'Écureuil']

/** Le pseudo de ligue d'un élève : toujours le même, sans rien de son identité. */
export function pseudoLigue(uid) {
  const h = createHash('sha256').update(`ligue:${uid}`).digest()
  return `${ANIMAUX[h[0] % ANIMAUX.length]} ${ADJECTIFS[h[1] % ADJECTIFS.length]} ${10 + (h[2] % 90)}`
}

/** Les zones d'un groupe de `total` élèves dans `ligue` : montée = rangs 1..m, descente = rangs d..total. */
export function zones(ligue, total) {
  const i = LIGUES.indexOf(ligue)
  const montee = i < LIGUES.length - 1 ? Math.min(PLACES_MONTEE, Math.floor(total / 3)) : 0
  const descente = i > 0 ? Math.min(PLACES_DESCENTE, Math.floor(total / 3)) : 0
  return { montee, descente: descente ? total - descente + 1 : null }
}

/** La ligue de la semaine suivante, d'après le rang dans le groupe. */
export function ligueSuivante(ligue, rang, total) {
  const i = Math.max(0, LIGUES.indexOf(ligue))
  const z = zones(ligue, total)
  if (z.montee && rang <= z.montee) return LIGUES[i + 1]
  if (z.descente && rang >= z.descente) return LIGUES[i - 1]
  return LIGUES[i]
}

const classer = membres => [...membres].sort((a, b) => b.xp - a.xp || (a.majLe ?? 0) - (b.majLe ?? 0))

async function membresDuGroupe(db, semaine, groupe) {
  const snap = await db.collection('ligues').doc(semaine).collection('membres').where('groupe', '==', groupe).get()
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }))
}

export async function routeLigue(req, res, { db, auth, maintenant = Date.now() }) {
  const idToken = req.body?.idToken
  let uid
  try {
    const d = await auth.verifyIdToken(idToken)
    if (d.firebase?.sign_in_provider === 'anonymous') return res.status(409).json({ error: 'COMPTE' })
    uid = d.uid
  } catch { return res.status(401).json({ error: 'UNAUTHORIZED' }) }
  const xp = Math.max(0, Math.min(XP_SEMAINE_MAX, Math.round(Number(req.body?.xpSemaine) || 0)))

  const profil = (await db.collection('users').doc(uid).get()).data() ?? {}
  if (profil.ligueMasquee === true) return res.status(200).json({ masquee: true })

  const semaine = lundiDe(jourParis(maintenant))
  const fin = minuitParis(ajouterJours(semaine, 7))
  const sem = db.collection('ligues').doc(semaine)
  const moiRef = sem.collection('membres').doc(uid)
  let moi = (await moiRef.get()).data()

  if (!moi) {
    if (xp <= 0) return res.status(200).json({ attente: true, fin })
    // La ligue de cette semaine : d'après la place dans le groupe de la semaine d'avant.
    const avant = ajouterJours(semaine, -7)
    const prec = (await db.collection('ligues').doc(avant).collection('membres').doc(uid).get()).data()
    let ligue = 'bronze'
    let resultat = null
    if (prec?.groupe) {
      const groupe = classer(await membresDuGroupe(db, avant, prec.groupe))
      const rang = groupe.findIndex(m => m.uid === uid) + 1
      ligue = ligueSuivante(prec.ligue, rang, groupe.length)
      resultat = { rang, total: groupe.length, avant: prec.ligue, apres: ligue }
    }
    // Un groupe pas encore plein dans cette ligue, sinon un nouveau.
    moi = await db.runTransaction(async tx => {
      const deja = await tx.get(moiRef)
      if (deja.exists) return deja.data()
      const compteurRef = sem.collection('groupes').doc(`${ligue}-compteur`)
      const compteur = (await tx.get(compteurRef)).data() ?? { n: 0, membres: 0 }
      let { n, membres } = compteur
      if (!n || membres >= TAILLE_GROUPE) { n = (n ?? 0) + 1; membres = 0 }
      const groupe = `${ligue}-${n}`
      const doc = { ligue, groupe, pseudo: pseudoLigue(uid), xp, majLe: maintenant, ...(resultat && { resultat }) }
      tx.set(compteurRef, { n, membres: membres + 1 })
      tx.set(moiRef, doc)
      return doc
    })
  } else if (xp > moi.xp) {
    await moiRef.set({ xp, majLe: maintenant }, { merge: true })
    moi = { ...moi, xp, majLe: maintenant }
  }

  const groupe = classer(await membresDuGroupe(db, semaine, moi.groupe))
  const rang = groupe.findIndex(m => m.uid === uid) + 1
  return res.status(200).json({
    ligue: moi.ligue,
    rang,
    total: groupe.length,
    zones: zones(moi.ligue, groupe.length),
    fin,
    resultat: moi.resultat ?? null,
    membres: groupe.map((m, i) => ({ rang: i + 1, pseudo: m.pseudo, xp: m.xp, moi: m.uid === uid })),
  })
}
