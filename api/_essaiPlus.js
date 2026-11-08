// -------------------------------------------------------
// Réviz — Essai Réviz+ de 7 jours (décidé avec Johan le 08/11)
//
// La première fois qu'un élève gratuit atteint sa limite d'exercices du jour
// (LIMITE_EXERCICES_GRATUIT séances), Réviz+ lui est offert ESSAI_JOURS jours :
// une seule fois par compte. Ensuite la limite revient, avec l'offre (site) ou
// « reviens demain » (app iOS, qui ne vend rien : règle 3.1.1).
// Importé par l'API ET par l'app : une seule source de vérité.
// users/{uid}.essaiPlus = { debut, fin, origine } : écrit par le serveur seul
// (?op=essai-plus dans api/track.js), jamais par l'app.
// -------------------------------------------------------

export const ESSAI_JOURS = 7
export const ESSAI_MS = ESSAI_JOURS * 24 * 60 * 60 * 1000
// Séances d'exercices par jour en gratuit (la séance d'accueil ne compte pas).
export const LIMITE_EXERCICES_GRATUIT = 3

/** Fin de l'essai (ms) si le profil en a un, sinon null. */
export function finEssaiPlus(profil) {
  const fin = profil?.essaiPlus?.fin
  return Number.isFinite(fin) ? fin : null
}

/** L'essai est-il en cours ? */
export function essaiPlusActif(profil, maintenant = Date.now()) {
  const fin = finEssaiPlus(profil)
  return fin != null && maintenant < fin
}

/** L'élève a-t-il déjà eu son essai (en cours ou fini) ? */
export function essaiPlusDejaPris(profil) {
  return finEssaiPlus(profil) != null
}

/**
 * ?op=essai-plus (POST, jeton Firebase) : ouvre l'essai, une seule fois.
 * Réponses : 200 { fin, nouveau: true } ; 200 { fin, nouveau: false } s'il existait déjà
 * (en cours ou fini) ; 409 { error: 'ABONNE' } pour un abonné ; 401 sans jeton valable.
 */
export async function routeEssaiPlus(req, res, { db, auth, maintenant = Date.now() }) {
  const idToken = req.body?.idToken
  if (!idToken) return res.status(401).json({ error: 'UNAUTHORIZED' })
  let uid
  try { uid = (await auth.verifyIdToken(idToken)).uid } catch { return res.status(401).json({ error: 'UNAUTHORIZED' }) }
  const ref = db.collection('users').doc(uid)
  const resultat = await db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    const profil = snap.exists ? snap.data() : null
    if (profil?.plan === 'premium') return { status: 409, body: { error: 'ABONNE' } }
    if (essaiPlusDejaPris(profil)) return { status: 200, body: { fin: finEssaiPlus(profil), nouveau: false } }
    const essaiPlus = { debut: maintenant, fin: maintenant + ESSAI_MS, origine: 'limite_exercices' }
    tx.set(ref, { essaiPlus }, { merge: true })
    return { status: 200, body: { fin: essaiPlus.fin, nouveau: true } }
  })
  return res.status(resultat.status).json(resultat.body)
}
