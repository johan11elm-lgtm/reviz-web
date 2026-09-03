// -------------------------------------------------------
// Réviz — Cache de session (démarrage optimiste)
//
// Firebase Auth ne déclenche onAuthStateChanged qu'après avoir revalidé la
// session sur le serveur (rafraîchissement du jeton + accounts:lookup),
// soit ~1,2 s mesurée au démarrage de l'app iOS, suivies des lectures
// Firestore du gate (profil, consentement). Pendant tout ce temps, l'app
// n'affichait rien.
//
// Ce module mémorise en localStorage la dernière session CONFIRMÉE par
// Firebase (identité + état du gate). Au démarrage suivant, AuthProvider
// rend l'app immédiatement à partir de ce cache, puis Firebase confirme
// ou invalide la session en arrière-plan. Le cache n'accorde aucun droit :
// Firestore (règles) et l'API (jeton vérifié) restent seuls juges.
// -------------------------------------------------------

const KEY = 'reviz-session'
const VERSION = 1
// Au-delà, on repasse par un démarrage bloquant classique.
export const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000

/**
 * Lit la session mémorisée, ou null (absente, corrompue, périmée).
 * @returns {{uid:string, displayName:string|null, email:string|null,
 *   emailVerified:boolean, providerIds:string[], isPremium:boolean,
 *   consentBlocked:boolean, needsProfileSetup:boolean} | null}
 */
export function readSessionCache(now = Date.now()) {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    if (!s || s.v !== VERSION) return null
    if (typeof s.uid !== 'string' || !s.uid) return null
    if (typeof s.savedAt !== 'number' || now - s.savedAt > MAX_AGE_MS) return null
    return {
      uid: s.uid,
      displayName: typeof s.displayName === 'string' ? s.displayName : null,
      email: typeof s.email === 'string' ? s.email : null,
      emailVerified: s.emailVerified === true,
      providerIds: Array.isArray(s.providerIds) ? s.providerIds.filter(p => typeof p === 'string') : [],
      isPremium: s.isPremium === true,
      consentBlocked: s.consentBlocked === true,
      needsProfileSetup: s.needsProfileSetup === true,
    }
  } catch {
    return null
  }
}

/**
 * Mémorise une session confirmée par Firebase et l'état du gate associé.
 * @param {object} user  utilisateur Firebase (uid, displayName, email…)
 * @param {{isPremium?:boolean, consentBlocked?:boolean, needsProfileSetup?:boolean}} gate
 */
export function writeSessionCache(user, gate = {}, now = Date.now()) {
  if (!user?.uid) return
  const providerIds = Array.isArray(user.providerData)
    ? user.providerData.map(p => p?.providerId).filter(p => typeof p === 'string')
    : []
  const payload = {
    v: VERSION,
    uid: user.uid,
    displayName: typeof user.displayName === 'string' ? user.displayName : null,
    email: typeof user.email === 'string' ? user.email : null,
    emailVerified: user.emailVerified === true,
    providerIds,
    isPremium: gate.isPremium === true,
    consentBlocked: gate.consentBlocked === true,
    needsProfileSetup: gate.needsProfileSetup === true,
    savedAt: now,
  }
  try { localStorage.setItem(KEY, JSON.stringify(payload)) }
  catch { /* stockage indisponible (mode privé, quota) : démarrage classique */ }
}

export function clearSessionCache() {
  try { localStorage.removeItem(KEY) } catch { /* rien à effacer */ }
}

/**
 * Objet « utilisateur » construit depuis le cache, avec la surface utilisée
 * par les pages (uid, displayName, email, emailVerified, providerData) et
 * les deux méthodes Firebase appelées côté UI. Ces méthodes attendent la
 * confirmation de session puis délèguent au vrai utilisateur — un tap
 * précoce (paiement, vérification d'email) n'échoue donc pas.
 * @param {object} cache  résultat de readSessionCache()
 * @param {object} auth   instance Firebase Auth (authStateReady, currentUser)
 */
export function userFromSessionCache(cache, auth) {
  const confirmedUser = async () => {
    if (typeof auth?.authStateReady === 'function') await auth.authStateReady()
    return auth?.currentUser ?? null
  }
  return {
    uid: cache.uid,
    displayName: cache.displayName,
    email: cache.email,
    emailVerified: cache.emailVerified,
    photoURL: null,
    isAnonymous: false,
    providerData: cache.providerIds.map(providerId => ({ providerId })),
    fromCache: true,
    async getIdToken(forceRefresh) {
      const u = await confirmedUser()
      return u ? u.getIdToken(forceRefresh) : null
    },
    async reload() {
      const u = await confirmedUser()
      return u ? u.reload() : undefined
    },
  }
}
