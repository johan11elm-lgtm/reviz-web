// -------------------------------------------------------
// Réviz — Fin de Battle : l'aura de la partie va sur les comptes
//
// Appelée par les deux téléphones à la fin d'une partie (idempotent). Le
// serveur relit le salon dans Realtime Database, recalcule chaque round avec
// le quiz du chapitre (mêmes règles que l'app : src/utils/battle.js), puis
// écrit dans une transaction Firestore l'aura des joueurs qui ont un compte :
// plancher à 0, 5 parties comptées par jour dont 2 contre le même adversaire.
// Le client ne peut pas écrire son aura (firestore.rules). Le résultat est
// recopié dans le salon (battles/{code}/compte) pour l'écran de fin.
// -------------------------------------------------------
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { FieldValue } from 'firebase-admin/firestore'
import { getAuthAdmin, getDb, getRtdb } from './_firebaseAdmin.js'
import { appliquerAura, joueursDe, normaliserCode, resoudrePartie } from '../src/utils/battle.js'
import { chapterContentUrl } from '../src/utils/programme.js'

export const config = { maxDuration: 30 }

/** Date du jour à Paris (AAAA-MM-JJ) : les plafonds repartent à minuit. */
export function dateParis(maintenant = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(maintenant)
}

/** Le quiz du chapitre, lu dans public/programme (embarqué avec la fonction, vercel.json). */
export async function chargerQuiz(chapitre) {
  const url = chapterContentUrl(chapitre.classe, chapitre.matiere, chapitre.id)
  const data = JSON.parse(await readFile(path.join(process.cwd(), 'public', url), 'utf8'))
  if (!Array.isArray(data?.quiz)) throw new Error('QUIZ_ABSENT')
  return data.quiz
}

/**
 * Compte une partie terminée, une seule fois : la marque battlesComptees/{code-creeLe}
 * est écrite dans la même transaction que l'aura.
 * @returns {Promise<Record<string, { delta: number, aura?: number, comptee: boolean, sansCompte?: true }>>}
 */
export async function compterPartie(db, { code, battle, partie, date }) {
  const joueurs = joueursDe(battle)
  const marqueRef = db.collection('battlesComptees').doc(`${code}-${battle.creeLe}`)
  return db.runTransaction(async tx => {
    const marque = await tx.get(marqueRef)
    if (marque.exists) return marque.data().compte
    const refs = joueurs.map(uid => db.collection('users').doc(uid))
    const comptes = await Promise.all(refs.map(ref => tx.get(ref)))
    const resultat = {}
    joueurs.forEach((uid, i) => {
      const snap = comptes[i]
      // Invité sans compte : son aura n'est gardée nulle part.
      if (!snap.exists) { resultat[uid] = { delta: partie.aura[uid], comptee: false, sansCompte: true }; return }
      const avant = snap.data().aura ?? 0
      const r = appliquerAura({ aura: avant, jour: snap.data().auraJour }, {
        delta: partie.aura[uid], adversaire: joueurs[1 - i], date,
      })
      tx.update(refs[i], {
        aura: r.aura,
        auraJour: r.jour,
        'battles.jouees': FieldValue.increment(1),
        'battles.gagnees': FieldValue.increment(partie.vainqueur === uid ? 1 : 0),
      })
      resultat[uid] = { delta: r.aura - avant, aura: r.aura, comptee: r.comptee }
    })
    tx.set(marqueRef, {
      code, joueurs, compte: resultat, issue: partie.issue, vainqueur: partie.vainqueur ?? null,
      date, compteLe: FieldValue.serverTimestamp(),
    })
    return resultat
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  const { idToken, code: saisie } = req.body ?? {}
  if (!idToken) return res.status(401).json({ error: 'UNAUTHORIZED' })
  const code = normaliserCode(saisie)
  if (!code) return res.status(400).json({ error: 'BAD_CODE' })

  let uid
  try {
    uid = (await getAuthAdmin().verifyIdToken(idToken)).uid
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED' })
  }

  const rtdb = await getRtdb()
  const battle = (await rtdb.ref(`battles/${code}`).get()).val()
  if (!battle) return res.status(404).json({ error: 'NOT_FOUND' })
  if (!joueursDe(battle).includes(uid) || joueursDe(battle).length !== 2) return res.status(403).json({ error: 'NOT_A_PLAYER' })
  if (battle.compte) return res.status(200).json({ compte: battle.compte })
  if (battle.etat !== 'fin' && battle.etat !== 'abandon') return res.status(409).json({ error: 'NOT_FINISHED' })
  // L'id du chapitre sert de nom de fichier : rien d'autre que des lettres, chiffres et tirets.
  if (!/^[a-z0-9-]{1,120}$/.test(battle.chapitre?.id ?? '')) return res.status(400).json({ error: 'BAD_CHAPTER' })

  let quiz
  try {
    quiz = await chargerQuiz(battle.chapitre)
  } catch {
    return res.status(500).json({ error: 'CHAPTER_UNAVAILABLE' })
  }
  const partie = resoudrePartie(battle, quiz, Date.now())
  if (!partie.terminee) return res.status(409).json({ error: 'NOT_FINISHED' })

  try {
    const compte = await compterPartie(getDb(), { code, battle, partie, date: dateParis() })
    await rtdb.ref(`battles/${code}/compte`).set(compte)
    return res.status(200).json({ compte })
  } catch (err) {
    console.error('[battle-fin]', err)
    return res.status(500).json({ error: 'SAVE_FAILED' })
  }
}
