// -------------------------------------------------------
// Réviz — Réviz+ offert à tous ? (côté serveur)
// Recalculé à chaque requête : une instance restée chaude passe minuit le
// 26 octobre sans attendre un redémarrage (voir api/_lancement.js).
// -------------------------------------------------------
import { lancementOffert } from './_lancement.js'

export async function revizPlusOffertServeur() {
  return lancementOffert()
}
