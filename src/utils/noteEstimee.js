// -------------------------------------------------------
// Réviz — Note estimée d'un contrôle (11/11, repris de l'app iOS de Knowunity : « Predicted score »
// en tête du plan). Une ESTIMATION, présentée comme telle, à partir des séances notées sur les
// chapitres du contrôle (exercices et quiz, les 3 dernières par chapitre, la plus récente pèse le
// plus) et du contrôle blanc de la matière s'il a été fait depuis que le contrôle est noté (il
// compte pour 60 %). Un chapitre pas encore travaillé compte pour 9/20 : il tire la note vers le
// bas, et c'est lui qu'on conseille de revoir. Rien sans au moins une séance notée.
// -------------------------------------------------------
import { chapterLessonId } from './programme.js'

const JOUR = 86_400_000
const FENETRE_JOURS = 45
export const PAS_TRAVAILLE = 0.45
const POIDS = [3, 2, 1]
const VISEE_CHAPITRE = 0.85

const lessonDuChapitre = ch => (ch.scan ? ch.id : chapterLessonId(ch.id))
const instant = r => new Date(r?.revisedAt ?? NaN).getTime()
const reussite = r => r.score / r.total
const arrondi = n => Math.min(20, Math.max(0, Math.round(n * 40) / 2))

function moyennePonderee(revs) {
  const recentes = [...revs].sort((a, b) => instant(b) - instant(a)).slice(0, POIDS.length)
  const p = recentes.reduce((s, _, i) => s + POIDS[i], 0)
  return recentes.reduce((s, r, i) => s + POIDS[i] * reussite(r), 0) / p
}

/**
 * @param {{ matiere: string, chapitres?: { id: string, titre: string, scan?: boolean }[], cree?: string }} controle
 * @param {object[]} revisions  revisionService : { type, lessonId, matiere, score, total, revisedAt }
 * @returns {null | { note: number, seances: number, blanc: boolean, conseil: null | { titre: string, visee: number } }}
 */
export function noteEstimee(controle, revisions = [], maintenant = Date.now()) {
  if (!controle) return null
  const notees = revisions.filter(r => Number.isFinite(r?.score) && Number.isFinite(r?.total) && r.total > 0
    && maintenant - instant(r) < FENETRE_JOURS * JOUR)
  // Les chapitres cochés ; sans chapitres (contrôles notés avant le 06/11), ceux de la matière déjà travaillés.
  let chapitres = (controle.chapitres ?? []).map(ch => ({ titre: ch.titre, lessonId: lessonDuChapitre(ch) }))
  if (!chapitres.length) {
    const ids = new Set(notees.filter(r => typeof r.lessonId === 'string' && r.lessonId.includes(`-${controle.matiere}-`)).map(r => r.lessonId))
    chapitres = [...ids].map(lessonId => ({ titre: null, lessonId }))
  }
  const parChapitre = chapitres.map(ch => {
    const revs = notees.filter(r => r.lessonId === ch.lessonId && (r.type === 'exercices' || r.type === 'quiz'))
    return { ...ch, n: revs.length, reussite: revs.length ? moyennePonderee(revs) : PAS_TRAVAILLE }
  })
  const depuis = controle.cree ? Date.parse(`${controle.cree}T00:00:00`) : 0
  const blancs = notees.filter(r => r.type === 'controle' && r.matiere === controle.matiere && instant(r) >= depuis)
  const seances = parChapitre.reduce((s, c) => s + c.n, 0) + blancs.length
  if (!seances) return null

  const moyenne = liste => liste.reduce((s, c) => s + c.reussite, 0) / liste.length
  const blanc = blancs.length ? moyennePonderee(blancs) : null
  const estimer = liste => {
    const chap = liste.length ? moyenne(liste) : blanc
    return blanc == null ? chap : 0.6 * blanc + 0.4 * chap
  }
  const note = arrondi(estimer(parChapitre))

  // Le conseil : le chapitre le plus faible, et la note qu'on peut viser en le travaillant.
  let conseil = null
  const faible = parChapitre.filter(c => c.titre).sort((a, b) => a.reussite - b.reussite)[0]
  if (faible && faible.reussite < VISEE_CHAPITRE) {
    const visee = arrondi(estimer(parChapitre.map(c => (c === faible ? { ...c, reussite: VISEE_CHAPITRE } : c))))
    if (visee > note) conseil = { titre: faible.titre, visee }
  }
  return { note, seances, blanc: blanc != null, conseil }
}

/** « 12 », « 12,5 » */
export const ecrireNote = n => String(n).replace('.', ',')

// -------------------------------------------------------
// La note visée de la découverte (pages/Onboarding.jsx, reviz-entree-<uid>.objectif), reliée à la
// note estimée (11/11) : « Avoir la moyenne » vise 10, « Viser 16 et plus » vise 16, « Gagner 2 ou
// 3 points » vise 2,5 points au-dessus de la première note estimée de ce contrôle (gardée sur
// l'appareil, reviz-note-depart-<id du contrôle>).
// -------------------------------------------------------
const CIBLES = { moyenne: 10, haut: 16 }
export const GAIN_VISE = 2.5

export function objectifDeLaDecouverte(uid) {
  if (!uid) return null
  try { return JSON.parse(localStorage.getItem(`reviz-entree-${uid}`) || 'null')?.objectif ?? null } catch { return null }
}

/** La première note estimée de ce contrôle, gardée la première fois qu'on la voit. */
export function noteDeDepart(controleId, note) {
  if (!controleId || !Number.isFinite(note)) return null
  const cle = `reviz-note-depart-${controleId}`
  try {
    const deja = Number(localStorage.getItem(cle))
    if (localStorage.getItem(cle) != null && Number.isFinite(deja)) return deja
    localStorage.setItem(cle, String(note))
  } catch { /* stockage indisponible */ }
  return note
}

/** { cible, atteint, ecart } pour l'objectif, ou null sans objectif. */
export function objectifNote(objectif, note, depart = note) {
  if (!objectif || !Number.isFinite(note)) return null
  const cible = objectif === 'progresser' ? Math.min(20, Math.round((depart + GAIN_VISE) * 2) / 2) : CIBLES[objectif]
  if (!Number.isFinite(cible)) return null
  return { cible, atteint: note >= cible, ecart: Math.max(0, Math.round((cible - note) * 2) / 2) }
}
