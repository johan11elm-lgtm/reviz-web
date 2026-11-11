// -------------------------------------------------------
// Réviz — Mode concentration (11/11, repris de Knowunity : leur minuteur de révision avec bilan).
// L'élève choisit une durée ; un minuteur le suit dans l'app (pause, arrêt) ; à la fin, le bilan de
// ce qu'il a fait pendant la séance, lu sur ses révisions. Gardé sur l'appareil, par élève.
// -------------------------------------------------------
export const DUREES = [15, 25, 45]
export const EVENEMENT = 'reviz-concentration'
const cle = uid => `reviz-concentration-${uid}`

export function lireConcentration(uid) {
  try { return JSON.parse(localStorage.getItem(cle(uid)) || 'null') } catch { return null }
}
function ecrire(uid, valeur) {
  try { valeur ? localStorage.setItem(cle(uid), JSON.stringify(valeur)) : localStorage.removeItem(cle(uid)) } catch { /* rien */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENEMENT))
}

export function demarrer(uid, minutes, maintenant = Date.now()) {
  ecrire(uid, { debut: maintenant, duree: minutes * 60_000, pauseLe: null, pauses: 0 })
}
export function mettreEnPause(uid, maintenant = Date.now()) {
  const c = lireConcentration(uid)
  if (c && !c.pauseLe) ecrire(uid, { ...c, pauseLe: maintenant })
}
export function reprendre(uid, maintenant = Date.now()) {
  const c = lireConcentration(uid)
  if (c?.pauseLe) ecrire(uid, { ...c, pauses: c.pauses + (maintenant - c.pauseLe), pauseLe: null })
}
export function arreter(uid) { ecrire(uid, null) }

/** { restant (ms), ecoule (ms de concentration), enPause, fini } ou null. */
export function etatConcentration(c, maintenant = Date.now()) {
  if (!c) return null
  const fin = c.pauseLe ?? maintenant
  const ecoule = Math.max(0, fin - c.debut - c.pauses)
  const restant = Math.max(0, c.duree - ecoule)
  return { restant, ecoule: Math.min(ecoule, c.duree), enPause: !!c.pauseLe, fini: restant === 0 }
}

export const minuteur = ms => {
  const s = Math.ceil(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** Ce que l'élève a fait pendant la séance : séances par format et XP gagnée. */
export function bilanConcentration(revisions = [], debut, maintenant = Date.now()) {
  const pendant = revisions.filter(r => {
    const t = new Date(r?.revisedAt ?? NaN).getTime()
    return Number.isFinite(t) && t >= debut && t <= maintenant
  })
  const compter = types => pendant.filter(r => types.includes(r.type)).length
  return {
    exercices: compter(['exercices']),
    quiz: compter(['quiz', 'controle']),
    flashcards: compter(['flashcards']),
    lectures: compter(['resume', 'mindmap']),
    xp: pendant.reduce((s, r) => s + (Number.isFinite(r.xp) ? r.xp : 0), 0),
  }
}
