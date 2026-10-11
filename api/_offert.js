// -------------------------------------------------------
// Réviz — Réviz+ offert à ce compte ? (côté serveur)
// Même règle que l'app (src/utils/revizPlus.js) : à tous pendant le
// lancement, puis aux fondateurs jusqu'à la fin du délai de grâce. La date
// de création vient de Firebase Auth, jamais du client.
// -------------------------------------------------------
import { getAuthAdmin } from './_firebaseAdmin.js'
import { LANCEMENT_OFFERT } from './_lancement.js'
import { revizPlusOffertPour } from '../src/utils/revizPlus.js'

export async function revizPlusOffertServeur(uid) {
  if (LANCEMENT_OFFERT) return true
  try {
    const user = await getAuthAdmin().getUser(uid)
    return revizPlusOffertPour(user?.metadata?.creationTime)
  } catch {
    return false
  }
}
