// -------------------------------------------------------
// Réviz — Limite d'exercices du jour en gratuit (08/11)
// LIMITE_EXERCICES_GRATUIT séances commencées par jour (heure de Paris), comptées
// sur les révisions « exercices » de l'appareil (synchronisées depuis Firestore).
// La séance d'accueil ne compte pas. Limite douce, côté app : l'app iOS 1.0, qui
// n'a pas ce code, n'est jamais bloquée par le serveur.
// -------------------------------------------------------
import { jourParis } from './retour.js'
import { SOURCE_DECOUVERTE } from './seanceAccueil.js'
import { LIMITE_EXERCICES_GRATUIT } from '../../api/_essaiPlus.js'

export { LIMITE_EXERCICES_GRATUIT }

/** Séances d'exercices commencées aujourd'hui (la séance d'accueil exclue). */
export function seancesDuJour(revisions, maintenant = Date.now()) {
  const jour = jourParis(new Date(maintenant))
  return (revisions ?? []).filter(r =>
    r?.type === 'exercices'
    && r.source !== SOURCE_DECOUVERTE
    && Number.isFinite(r.revisedAt)
    && jourParis(new Date(r.revisedAt)) === jour,
  ).length
}

/** La prochaine séance dépasse-t-elle la limite gratuite ? */
export function limiteExercicesAtteinte(revisions, maintenant = Date.now()) {
  return seancesDuJour(revisions, maintenant) >= LIMITE_EXERCICES_GRATUIT
}
