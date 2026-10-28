// -------------------------------------------------------
// Réviz — créditer l'XP d'une séance (29/10)
// Calcule ce que la séance rapporte (barème de utils/xp.js, plafond du jour) et
// le niveau avant et après. La page enregistre ensuite la révision avec ce
// champ `xp` : c'est lui qui compte, pas un compteur à part.
// -------------------------------------------------------
import { loadLessons } from './historyService'
import { loadRevisions } from './revisionService'
import { xpQuetes } from './quetesService'
import { computeLevel } from '../utils/gamification'
import { sommeXp, plafonner, xpDuJour } from '../utils/xp'

/** Le niveau de l'élève en ce moment (leçons, révisions, quêtes). */
export function niveauActuel(uid) {
  return computeLevel(loadLessons(), loadRevisions(), xpQuetes(uid))
}

/**
 * Ce que rapporte une séance, plafond du jour compris, et le niveau qui en découle.
 * @param {string|null} uid
 * @param {{ libelle: string, xp: number }[]} lignes — utils/xp.js xpSeance()
 */
export function gainDeSeance(uid, lignes) {
  const brut = sommeXp(lignes)
  const xp = plafonner(brut, xpDuJour(loadRevisions()))
  const avant = niveauActuel(uid)
  const apres = computeLevel([], [{ xp: avant.xpTotal + xp }])
  return { xp, brut, lignes, plafonne: xp < brut, niveauAvant: avant.level, ...apres }
}
