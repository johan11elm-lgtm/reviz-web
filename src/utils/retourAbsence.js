// -------------------------------------------------------
// Réviz — Le retour après une absence (11/11, repris de Knowunity : leur écran
// « resurrected user »). Un élève qui revient après ABSENCE_JOURS jours sans
// réviser voit un accueil à part : ce qui l'a éloigné, puis une reprise de
// 5 minutes. Une fois par absence (la dernière révision sert de repère), compté
// par élève et par appareil. Jamais sans révision connue sur l'appareil : un
// nouvel appareil n'a pas encore l'historique, on ne parlerait pas d'absence à tort.
// -------------------------------------------------------
import { jourParis } from './retour.js'

export const ABSENCE_JOURS = 3

export const RAISONS_ABSENCE = [
  { id: 'temps', label: 'Pas eu le temps', reponse: '5 minutes suffisent pour garder le fil.' },
  { id: 'quoi', label: 'Je ne savais pas quoi réviser', reponse: 'Note ton prochain contrôle : je te dis quoi faire chaque jour.' },
  { id: 'oubli', label: 'J’ai oublié Réviz', reponse: 'Ça arrive. On reprend doucement, 5 minutes.' },
  { id: 'vacances', label: 'C’était les vacances', reponse: 'Bonne reprise. On commence doucement, 5 minutes.' },
  { id: 'autre', label: 'Autre chose', reponse: 'Pas de souci. On reprend doucement, 5 minutes.' },
]

const cle = uid => `reviz-retour-vu-${uid}`
// revisedAt est en millisecondes (revisionService) ; un texte ISO reste accepté.
const instant = r => new Date(r?.revisedAt ?? NaN).getTime()
const ecart = (de, a) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000)

/** Jours entiers depuis la dernière révision (heure de Paris), ou null sans révision. */
export function joursSansReviser(revisions = [], maintenant = Date.now()) {
  const dates = revisions.map(instant).filter(Number.isFinite)
  if (!dates.length) return null
  return ecart(jourParis(Math.max(...dates)), jourParis(maintenant))
}

/** { jours, repere } s'il faut proposer l'accueil du retour, sinon null. */
export function retourAProposer(uid, revisions = [], maintenant = Date.now()) {
  if (!uid) return null
  const jours = joursSansReviser(revisions, maintenant)
  if (jours == null || jours < ABSENCE_JOURS) return null
  const dates = revisions.map(instant).filter(Number.isFinite)
  const repere = jourParis(Math.max(...dates))
  try { if (localStorage.getItem(cle(uid)) === repere) return null } catch { /* stockage indisponible */ }
  return { jours, repere }
}

export function noterRetourVu(uid, repere) {
  try { localStorage.setItem(cle(uid), repere) } catch { /* rien */ }
}
