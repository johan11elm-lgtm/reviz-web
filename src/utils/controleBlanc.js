// -------------------------------------------------------
// Réviz — Mode contrôle : le sujet d'un contrôle blanc (Réviz+, docs/offre-revizplus.md)
//
// La veille d'un contrôle (étape J-1 du plan de révision), ou quand l'élève veut : un sujet
// type chronométré, sans correction pendant l'épreuve, puis une note sur 20 et le corrigé.
// Le sujet mélange les questions des chapitres de la matière déjà ouverts (programme et
// leçons scannées), en donnant leur place aux questions ratées et en couvrant chaque chapitre.
// -------------------------------------------------------
import { matiereDuCours } from './agenda'

export const NB_QUESTIONS = 10
export const SECONDES_PAR_QUESTION = 60
/** En dessous, pas de sujet : l'élève doit d'abord ouvrir un chapitre de la matière. */
export const MIN_QUESTIONS = 4

/** La leçon est-elle de cette matière (slug du contrôle) ? « autre » prend tout. */
export function leconDeLaMatiere(lecon, matiere) {
  if (matiere === 'autre') return true
  return matiereDuCours(lecon?.metadata?.subject ?? '') === matiere || matiereDuCours(lecon?.matiere ?? '') === matiere
}

function melanger(liste, alea) {
  const l = [...liste]
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [l[i], l[j]] = [l[j], l[i]]
  }
  return l
}

/**
 * Le sujet : jusqu'à `nb` questions des leçons de la matière. D'abord une part des questions
 * ratées (au plus un tiers du sujet), puis les autres chapitre par chapitre, à tour de rôle,
 * pour que le sujet couvre tout ce qui a été ouvert. Chaque question garde sa leçon (lessonId)
 * et son chapitre, pour noter les erreurs au bon endroit.
 * @returns {{ questions: Array, chapitres: string[] }}
 */
export function sujetControle({ lecons = [], matiere, ratees = new Set(), nb = NB_QUESTIONS, alea = Math.random } = {}) {
  const vues = new Set()
  const parLecon = []
  for (const l of lecons) {
    if (!leconDeLaMatiere(l, matiere)) continue
    const qs = []
    for (const q of l.aiData?.quiz ?? []) {
      if (!q?.question || !Array.isArray(q.choices) || q.choices.length < 2 || !Number.isInteger(q.correct) || vues.has(q.question)) continue
      vues.add(q.question)
      qs.push({ ...q, lessonId: l.id, chapitre: l.metadata?.title ?? '' })
    }
    if (qs.length) parLecon.push(melanger(qs, alea))
  }
  const toutes = parLecon.flat()
  const choisies = melanger(toutes.filter(q => ratees.has(q.question)), alea).slice(0, Math.floor(nb / 3))
  const prises = new Set(choisies.map(q => q.question))
  // Le reste, une question de chaque chapitre à tour de rôle.
  const files = parLecon.map(qs => qs.filter(q => !prises.has(q.question)))
  for (let tour = 0; choisies.length < nb && files.some(f => f.length); tour++) {
    for (const f of files) {
      if (choisies.length >= nb) break
      const q = f.shift()
      if (q) choisies.push(q)
    }
  }
  const questions = melanger(choisies, alea)
  const chapitres = [...new Set(questions.map(q => q.chapitre).filter(Boolean))]
  return { questions, chapitres }
}

/** Note sur 20, au demi-point. */
export function noteSur20(justes, total) {
  if (!total) return 0
  return Math.round((justes / total) * 40) / 2
}

/** « 14 » ou « 13,5 » : la note à la française. */
export function noteEnClair(note) {
  return String(note).replace('.', ',')
}

/** Durée de l'épreuve en secondes. */
export function dureeControle(nbQuestions) {
  return nbQuestions * SECONDES_PAR_QUESTION
}

/** « 09:42 » */
export function chrono(secondes) {
  const s = Math.max(0, Math.ceil(secondes))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
