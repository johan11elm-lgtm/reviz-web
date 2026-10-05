// -------------------------------------------------------
// Réviz — Mode essai (« sans compte »)
// Un élève entre son prénom et sa classe, et révise son programme sans
// créer de compte : tout vit dans le navigateur, rien ne part vers
// Firestore (les règles l'interdiraient de toute façon). À l'inscription,
// sa progression est reprise sur son vrai compte.
// -------------------------------------------------------

export const GUEST_KEY = 'reviz-guest'
const GUEST_PREFIX = 'invite-'

export function isGuestUid(uid) {
  return typeof uid === 'string' && uid.startsWith(GUEST_PREFIX)
}

export function readGuest() {
  try {
    const g = JSON.parse(localStorage.getItem(GUEST_KEY) || 'null')
    return g && isGuestUid(g.uid) && g.prenom ? g : null
  } catch {
    return null
  }
}

/**
 * Démarre une session d'essai. Pose aussi le niveau au format attendu par
 * AuthContext.getUserLevel() (clé reviz-level-{uid}).
 */
export function startGuest({ prenom, level }) {
  const clean = String(prenom ?? '').trim().slice(0, 30)
  if (!clean || !level?.cycle || !level?.classe) throw new Error('GUEST_INVALID')
  const uid = `${GUEST_PREFIX}${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
  const guest = { uid, prenom: clean, level, createdAt: Date.now() }
  localStorage.setItem(GUEST_KEY, JSON.stringify(guest))
  localStorage.setItem(`reviz-level-${uid}`, JSON.stringify(level))
  // Pas de présentation en quatre écrans en mode essai : l'élève veut réviser tout de suite.
  localStorage.setItem(`reviz-onboarded-${uid}`, '1')
  return guest
}

export function clearGuest() {
  localStorage.removeItem(GUEST_KEY)
}

/**
 * Objet « utilisateur » compatible avec ce que l'app lit sur currentUser
 * (uid, displayName, getIdToken…). getIdToken rend null : aucun appel
 * serveur authentifié n'est possible en mode essai.
 */
export function guestUser(guest) {
  return {
    uid: guest.uid,
    displayName: guest.prenom,
    email: null,
    emailVerified: false,
    photoURL: null,
    isAnonymous: true,
    isGuest: true,
    providerData: [],
    async getIdToken() { return null },
    async reload() {},
  }
}

// Clés localStorage par utilisateur dont la progression doit suivre l'élève
// quand il crée son compte (même suffixe -{uid}).
const MIGRATED_PREFIXES = [
  'reviz-lessons-', 'reviz-revisions-', 'reviz-srs-',
  'reviz-challenges-', 'reviz-daily-goal-', 'reviz-seen-badges-', 'reviz-onboarded-',
]

/**
 * Recopie les données locales de l'invité vers le nouvel uid (sans écraser
 * ce qui existerait déjà), puis rend les leçons et révisions à envoyer à
 * Firestore. Ne supprime l'invité qu'une fois la copie faite.
 */
export function migrateGuestLocalData(guestUid, uid) {
  if (!isGuestUid(guestUid) || !uid || guestUid === uid) return { lessons: [], revisions: [] }
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null } }
  for (const prefix of MIGRATED_PREFIXES) {
    const from = localStorage.getItem(`${prefix}${guestUid}`)
    if (from === null) continue
    const targetKey = `${prefix}${uid}`
    if (localStorage.getItem(targetKey) === null) {
      localStorage.setItem(targetKey, from)
    } else if (prefix === 'reviz-lessons-' || prefix === 'reviz-revisions-') {
      // Fusion : les entrées de l'invité qui manquent sont ajoutées.
      const existing = read(targetKey) ?? []
      const incoming = read(`${prefix}${guestUid}`) ?? []
      const known = new Set(existing.map(e => e.id))
      const merged = [...existing, ...incoming.filter(e => !known.has(e.id))]
      localStorage.setItem(targetKey, JSON.stringify(merged))
    }
  }
  if (!localStorage.getItem(`reviz-level-${uid}`)) {
    const lvl = localStorage.getItem(`reviz-level-${guestUid}`)
    if (lvl) localStorage.setItem(`reviz-level-${uid}`, lvl)
  }
  const lessons = read(`reviz-lessons-${guestUid}`) ?? []
  const revisions = read(`reviz-revisions-${guestUid}`) ?? []
  // Nettoyage des clés de l'invité
  for (const prefix of [...MIGRATED_PREFIXES, 'reviz-level-']) {
    localStorage.removeItem(`${prefix}${guestUid}`)
  }
  clearGuest()
  return { lessons, revisions }
}
