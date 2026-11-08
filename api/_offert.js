// -------------------------------------------------------
// Réviz — Réviz+ offert ? (côté serveur)
// Offert à tous pendant le lancement, ou à un élève pendant son essai de
// 7 jours (api/_essaiPlus.js). Recalculé à chaque requête : une instance
// restée chaude passe minuit sans attendre un redémarrage.
// -------------------------------------------------------
import { lancementOffert } from './_lancement.js'
import { essaiPlusActif } from './_essaiPlus.js'

/** @param {object|null} [profil] users/{uid} (pour l'essai de 7 jours) */
export async function revizPlusOffertServeur(profil = null) {
  return lancementOffert() || essaiPlusActif(profil)
}
