// -------------------------------------------------------
// Réviz — Service de limite de scans hebdomadaire
// -------------------------------------------------------
// Free : 5 scans / semaine (lundi → dimanche)
// Premium : illimité
// -------------------------------------------------------

let _uid = null

const FREE_LIMIT = 5

export function setScanLimitUser(uid) { _uid = uid }

function getKey() {
  return _uid ? `reviz-scan-limit-${_uid}` : 'reviz-scan-limit'
}

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day // lundi = jour 1
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
 * Retourne { canScan, remaining, used, limit }
 */
export function getScanStatus() {
  const now = Date.now()
  const currentWeek = getMonday(now)
  let data = loadData()

  // Réinitialiser si nouvelle semaine ou pas de données
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
  }
}

/**
 * Incrémente le compteur de scans (appelé après un scan réussi)
 */
export function incrementScanCount() {
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
