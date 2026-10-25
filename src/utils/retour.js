// -------------------------------------------------------
// Réviz — Retour des élèves : ce que partagent l'app et le serveur
// La première session d'un élève (jour, chapitre) est notée sur son profil ;
// le lendemain, un rappel le ramène sur ce chapitre (e-mail par le cron de
// api/send-parental-consent.js, notification locale dans l'app native).
// -------------------------------------------------------
import { PROGRAMME_CLASSES, matiereSlug } from './programme.js'

export const ESSAI_ID_RE = /^invite-[a-z0-9]{6,40}$/
export const CHAPITRE_ID_RE = /^[a-z0-9-]{1,80}$/

/** Date du jour à Paris, au format AAAA-MM-JJ. */
export function jourParis(date = new Date()) {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

/**
 * Lien qui rouvre directement le quiz d'un chapitre du programme (le même que
 * celui des fiches publiques, voir pages/Essai.jsx). null hors programme.
 */
export function lienChapitre({ classe, matiere, chapterId }, via = 'rappel') {
  if (!PROGRAMME_CLASSES.includes(classe) || !matiere || !CHAPITRE_ID_RE.test(chapterId ?? '')) return null
  const p = new URLSearchParams({ classe, matiere: matiereSlug(matiere), chapitre: chapterId, via })
  return `https://app.revizapp.fr/essai?${p}`
}

