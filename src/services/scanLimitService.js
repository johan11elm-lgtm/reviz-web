// -------------------------------------------------------
// Réviz — Service de limite de scans hebdomadaire
// -------------------------------------------------------
// Free : 5 scans / semaine (lundi → dimanche)
// Premium : illimité
// -------------------------------------------------------

let _uid = null
let _isPremium = false

const FREE_LIMIT = 5

export function setScanLimitUser(uid) { _uid = uid }
export function setPremiumStatus(isPremium) { _isPremium = isPremium }

function getKey() {
  return _uid ? `reviz-scan-limit-${_uid}` : 'reviz-scan-limit'
}

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(getKey()) || 'null')
  } catch {
    return null
  }
}

function saveData(data) {
  localStorage.setItem(getKey(), JSON.stringify(data))
}

/**
 * Retourne { canScan, remaining, used, limit, isPremium }
 */
export function getScanStatus() {
  if (_isPremium) {
    return { canScan: true, remaining: Infinity, used: 0, limit: FREE_LIMIT, isPremium: true }
  }

  const now = Date.now()
  const currentWeek = getMonday(now)
  let data = loadData()

  if (!data || data.weekStart !== currentWeek) {
    data = { count: 0, weekStart: currentWeek }
    saveData(data)
  }

  const remaining = Math.max(0, FREE_LIMIT - data.count)
  return {
    canScan: data.count < FREE_LIMIT,
    remaining,
    used: data.count,
    limit: FREE_LIMIT,
    isPremium: false,
  }
}

/**
 * Incrémente le compteur de scans (appelé après un scan réussi)
 */
export function incrementScanCount() {
  if (_isPremium) return 0

  const now = Date.now()
  const currentWeek = getMonday(now)
  let data = loadData()

  if (!data || data.weekStart !== currentWeek) {
    data = { count: 0, weekStart: currentWeek }
  }

  data.count += 1
  saveData(data)
  return data.count
}
