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
// Prochain état d'une carte selon la réponse, sans l'enregistrer.
// outcome : 'got' (je sais) | 'presque' (revoir demain, sans repartir de zéro) | 'again'
function etatSuivant(state, outcome, now = Date.now()) {
  const DAY = 24 * 60 * 60 * 1000
  const s = { ...state }
  if (outcome === 'got') {
    s.reps     = (s.reps || 0) + 1
    s.ease     = Math.max(EASE_MIN, (s.ease || EASE_DEFAULT) + 0.1)
    if (s.reps === 1)      s.interval = 1
    else if (s.reps === 2) s.interval = 3
    else                   s.interval = Math.round((s.interval || INTERVAL_INIT) * s.ease)
  } else if (outcome === 'presque') {
    s.ease     = Math.max(EASE_MIN, (s.ease || EASE_DEFAULT) - 0.15)
    s.interval = 1
  } else {
    // 'again' — on remet à zéro
    s.reps     = 0
    s.ease     = Math.max(EASE_MIN, (s.ease || EASE_DEFAULT) - 0.2)
    s.interval = INTERVAL_INIT
  }
  s.nextReview = now + s.interval * DAY // 'again' : revoir demain
  return s
}

export function updateCardState(lessonId, cardIndex, outcome) {
  const data  = loadData()
  const key   = cardKey(lessonId, cardIndex)
  const state = data[key] ?? { interval: INTERVAL_INIT, reps: 0, ease: EASE_DEFAULT, nextReview: null }
  data[key] = etatSuivant(state, outcome)
  saveData(data)
  return data[key]
}

/** Dans combien de jours la carte reviendrait pour cette réponse (aperçu des boutons). */
export function joursAvantRetour(lessonId, cardIndex, outcome) {
  const state = loadData()[cardKey(lessonId, cardIndex)] ?? { interval: INTERVAL_INIT, reps: 0, ease: EASE_DEFAULT, nextReview: null }
  return etatSuivant(state, outcome).interval
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

// ── État des cartes de toutes les leçons (page Progrès, ordinateur) ──
// Une seule lecture du stockage. « Dues » suit la même règle que
// countDueCards (jamais vues comprises), donc le même chiffre que l'accueil.
export function summarizeCards(lessons) {
  const data = loadData()
  const now  = Date.now()
  const summary = { total: 0, nouvelles: 0, aRevoir: 0, enMemoire: 0, dues: 0, lecons: [] }
  for (const lesson of lessons) {
    const total = lesson.flashcardsCount ?? lesson.aiData?.flashcards?.length ?? 0
    let nouvelles = 0, aRevoir = 0
    for (let i = 0; i < total; i++) {
      const state = data[cardKey(lesson.id, i)]
      if (!state) nouvelles++
      else if (!state.nextReview || state.nextReview <= now) aRevoir++
    }
    summary.total     += total
    summary.nouvelles += nouvelles
    summary.aRevoir   += aRevoir
    summary.enMemoire += total - nouvelles - aRevoir
    if (nouvelles + aRevoir > 0) summary.lecons.push({ lesson, nouvelles, aRevoir, dues: nouvelles + aRevoir })
  }
  summary.dues = summary.nouvelles + summary.aRevoir
  // Les cartes déjà vues et arrivées à échéance passent avant les nouvelles.
  summary.lecons.sort((a, b) => (b.aRevoir - a.aRevoir) || (b.dues - a.dues))
  return summary
}
