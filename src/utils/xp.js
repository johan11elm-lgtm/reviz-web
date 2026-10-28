// -------------------------------------------------------
// Réviz — l'XP gagnée en révisant (29/10)
// Avant : XP = leçons ouvertes × 100, et le « +XP » des fins de quiz n'était
// compté nulle part. Désormais chaque révision porte l'XP qu'elle a rapportée
// (champ `xp`, synchronisé avec les révisions) : bonnes réponses, séance
// finie, sans-faute, paliers de combo, lecture. Un plafond par jour évite de
// gonfler son niveau en rejouant le même quiz. Les 100 XP par leçon ouverte
// restent : aucun élève ne perd de niveau.
// -------------------------------------------------------
import { jourParis } from './retour.js'

export const BAREME = {
  bonneReponse: 10, // quiz, exercices, contrôle blanc
  carteSue: 5,      // flashcard « Je sais » ou « Presque »
  terminee: 20,     // séance menée jusqu'au bout
  sansFaute: 20,    // en plus, si tout est juste
  palierCombo: 10,  // à chaque palier de combo
  lecture: 10,      // résumé ou carte mentale, une fois par jour et par leçon
  plafondJour: 500, // XP de révision au plus par jour (les quêtes en plus)
}
/** Un palier de combo toutes les 5 bonnes réponses d'affilée. */
export const PALIER_COMBO = 5

// « 7 bonnes réponses », « 1 carte sue » : chaque mot prend la marque du pluriel.
const pluriel = (n, mots) => `${n} ${n > 1 ? mots.split(' ').map(m => `${m}s`).join(' ') : mots}`

/**
 * Le détail de l'XP d'une séance, ligne par ligne (avant plafond).
 * @param {{ bonnes?: number, total?: number, paliers?: number, cartes?: boolean }} seance
 *   `cartes` : une série de flashcards (5 XP par carte sue au lieu de 10).
 * @returns {{ libelle: string, xp: number }[]}
 */
export function xpSeance({ bonnes = 0, total = 0, paliers = 0, cartes = false } = {}) {
  const lignes = []
  if (bonnes > 0) {
    lignes.push(cartes
      ? { libelle: pluriel(bonnes, 'carte sue'), xp: bonnes * BAREME.carteSue }
      : { libelle: pluriel(bonnes, 'bonne réponse'), xp: bonnes * BAREME.bonneReponse })
  }
  if (total > 0) lignes.push({ libelle: 'Séance finie', xp: BAREME.terminee })
  if (total > 0 && bonnes === total) lignes.push({ libelle: 'Sans faute', xp: BAREME.sansFaute })
  if (paliers > 0) lignes.push({ libelle: paliers > 1 ? `${paliers} paliers de combo` : 'Palier de combo', xp: paliers * BAREME.palierCombo })
  return lignes
}

export const sommeXp = lignes => lignes.reduce((s, l) => s + l.xp, 0)

/** XP de révision déjà gagnée ce jour-là (pour le plafond). */
export function xpDuJour(revisions, jour = jourParis()) {
  return (revisions ?? []).reduce((s, r) => s + (Number.isFinite(r?.xp) && r.revisedAt && jourParis(r.revisedAt) === jour ? r.xp : 0), 0)
}

/** Ce qui peut encore être crédité aujourd'hui. */
export function plafonner(demande, deja, plafond = BAREME.plafondJour) {
  return Math.max(0, Math.min(demande, plafond - deja))
}

/**
 * XP d'une lecture (résumé, carte mentale) : une fois par jour et par leçon, dans le plafond.
 */
export function xpLecture(revisions, type, lessonId, jour = jourParis()) {
  if (!lessonId) return 0
  const deja = (revisions ?? []).some(r => r.type === type && r.lessonId === lessonId && r.xp > 0 && r.revisedAt && jourParis(r.revisedAt) === jour)
  return deja ? 0 : plafonner(BAREME.lecture, xpDuJour(revisions, jour))
}
