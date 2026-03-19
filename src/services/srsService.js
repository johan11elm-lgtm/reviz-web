// -------------------------------------------------------
// Réviz — Service de répétition espacée (SM-2 simplifié)
// -------------------------------------------------------
// Structure stockée en localStorage : reviz-srs-{uid}
// { [lessonId_cardIndex]: { interval, nextReview, reps, ease } }
//
// interval  : jours avant la prochaine révision
// nextReview: timestamp Date.now() de la prochaine révision
// reps      : nombre de fois consécutives réussies
// ease      : facteur de facilité (commence à 2.5)
// -------------------------------------------------------

const EASE_DEFAULT  = 2.5
const EASE_MIN      = 1.3
const INTERVAL_INIT = 1 // jour

let _uid = null

export function setSrsUser(uid) { _uid = uid }

function storageKey() {
  return _uid ? `reviz-srs-${_uid}` : 'reviz-srs'
}

function loadData() {
  try { return JSON.parse(localStorage.getItem(storageKey()) || '{}') } catch { return {} }
}

function saveData(data) {
  try { localStorage.setItem(storageKey(), JSON.stringify(data)) } catch {}
}

function cardKey(lessonId, cardIndex) {
  return `${lessonId}_${cardIndex}`
}

// ── Lire l'état d'une carte ──────────────────────────────
export function getCardState(lessonId, cardIndex) {
  const data = loadData()
  return data[cardKey(lessonId, cardIndex)] ?? null
}

// ── Mettre à jour une carte après révision ───────────────
export function updateCardState(lessonId, cardIndex, outcome) {
  // outcome : 'got' | 'again'
  const data  = loadData()
  const key   = cardKey(lessonId, cardIndex)
  const state = data[key] ?? { interval: INTERVAL_INIT, reps: 0, ease: EASE_DEFAULT, nextReview: null }

  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000

  if (outcome === 'got') {
    state.reps     = (state.reps || 0) + 1
    state.ease     = Math.max(EASE_MIN, (state.ease || EASE_DEFAULT) + 0.1)
    if (state.reps === 1)      state.interval = 1
    else if (state.reps === 2) state.interval = 3
    else                       state.interval = Math.round((state.interval || INTERVAL_INIT) * state.ease)
    state.nextReview = now + state.interval * DAY
  } else {
    // 'again' — on remet à zéro
    state.reps     = 0
    state.ease     = Math.max(EASE_MIN, (state.ease || EASE_DEFAULT) - 0.2)
    state.interval = INTERVAL_INIT
    state.nextReview = now + DAY // revoir demain
  }

  data[key] = state
  saveData(data)
  return state
}

// ── Obtenir les cartes triées (dues en premier) ──────────
export function getDueCards(lessonId, flashcards) {
  const data = loadData()
  const now  = Date.now()

  return flashcards
    .map((card, index) => {
      const state = data[cardKey(lessonId, index)] ?? null
      const isDue = !state || !state.nextReview || state.nextReview <= now
      return { ...card, index, isDue, nextReview: state?.nextReview ?? null, reps: state?.reps ?? 0 }
    })
    .sort((a, b) => {
      // Cartes dues (ou jamais vues) en premier
      if (a.isDue && !b.isDue) return -1
      if (!a.isDue && b.isDue) return 1
      return 0
    })
}

// ── Compter les cartes dues pour une leçon ───────────────
export function countDueCards(lessonId, totalCards) {
  const data = loadData()
  const now  = Date.now()
  let count  = 0
  for (let i = 0; i < totalCards; i++) {
    const state = data[cardKey(lessonId, i)]
    if (!state || !state.nextReview || state.nextReview <= now) count++
  }
  return count
}
