// -------------------------------------------------------
// Réviz — Plan de révision d'un contrôle (Réviz+, docs/offre-revizplus.md)
//
// Dès qu'un contrôle est noté, Réviz découpe les jours qui restent :
// flashcards (J-5), quiz sur les points ratés (J-3), contrôle blanc (J-1).
// Une étape pas faite à sa date revient au jour même : on rattrape, on ne
// perd rien. Les étapes faites sont gardées dans le contrôle :
//   controle.plan = { flash: '2026-10-28', quiz: …, blanc: … } (jour fait)
// -------------------------------------------------------
import { ajouterJours, joursEntre, jourIso } from './agenda'

export const ETAPES_PLAN = [
  { id: 'flash', avant: 5, quoi: 'Flashcards', detail: 'Les notions à retenir, en cartes', pose: 'flashcard' },
  { id: 'quiz', avant: 3, quoi: 'Quiz sur les points ratés', detail: 'Ce que tu rates, en priorité', pose: 'quiz' },
  { id: 'blanc', avant: 1, quoi: 'Contrôle blanc', detail: 'Un quiz complet, comme le jour J', pose: 'examen' },
]

/** Jour où le contrôle a été noté : `cree`, sinon l'horodatage de son id (« c » + Date.now() en base 36). */
function jourDeCreation(controle) {
  if (typeof controle?.cree === 'string') return controle.cree
  const t = parseInt(String(controle?.id ?? '').slice(1), 36)
  return Number.isFinite(t) && t > 1e12 ? jourIso(new Date(t)) : null
}

/**
 * Les étapes du plan d'un contrôle, chacune à son jour.
 * `prevu` : le jour prévu (J-5, J-3, J-1) ; `jour` : le jour où la faire, ramené à
 * aujourd'hui si la date est passée sans qu'elle soit faite, ou si le contrôle est proche.
 * `etat` : 'faite' | 'aujourdhui' | 'a-venir' ; `retard` : prévue avant aujourd'hui, pas faite
 * (sauf si elle tombait avant que le contrôle soit noté : l'élève n'y pouvait rien).
 */
export function planRevision(controle, aujourdhui = jourIso()) {
  const faites = controle?.plan ?? {}
  const cree = jourDeCreation(controle)
  return ETAPES_PLAN.map(e => {
    const prevu = ajouterJours(controle.date, -e.avant)
    const fait = typeof faites[e.id] === 'string' ? faites[e.id] : null
    let jour = fait ?? (prevu < aujourdhui ? aujourdhui : prevu)
    if (jour > controle.date) jour = controle.date
    const etat = fait ? 'faite' : jour <= aujourdhui ? 'aujourdhui' : 'a-venir'
    return { ...e, prevu, jour, fait, etat, retard: !fait && prevu < aujourdhui && (!cree || prevu >= cree), avantControle: joursEntre(jour, controle.date) }
  })
}

/** La première étape pas encore faite (null si tout est fait). */
export function prochaineEtape(etapes) {
  return etapes.find(e => !e.fait) ?? null
}

/**
 * Où en est l'élève : « Prêt » (tout est fait), « Pas encore prêt » (une étape en retard,
 * ou le contrôle est aujourd'hui ou demain avec des étapes à faire), sinon « En bonne voie ».
 */
export function etatPreparation(controle, etapes, aujourdhui = jourIso()) {
  const restantes = etapes.filter(e => !e.fait).length
  if (restantes === 0) return { id: 'pret', label: 'Prêt' }
  const proche = joursEntre(aujourdhui, controle.date) <= 1
  if (etapes.some(e => e.retard) || proche) return { id: 'pas-pret', label: 'Pas encore prêt' }
  return { id: 'en-voie', label: 'En bonne voie' }
}

/**
 * Le plan est-il ouvert en entier ? Avec Réviz+, toujours ; sans, seulement pour le premier
 * contrôle noté (`agenda.planOffert`). Sinon seule la première étape est ouverte.
 */
export function planOuvert(controle, agenda, hasRevizPlus) {
  if (hasRevizPlus) return true
  return !agenda?.planOffert || agenda.planOffert === controle.id
}

/** « Aujourd'hui », « Demain », « Lun. 2 nov. » : quand faire l'étape. */
export function quandEtape(e, aujourdhui = jourIso()) {
  if (e.fait) return 'Fait'
  const n = joursEntre(aujourdhui, e.jour)
  if (n <= 0) return e.retard ? 'À rattraper aujourd’hui' : 'Aujourd’hui'
  if (n === 1) return 'Demain'
  const d = new Date(`${e.jour}T12:00`)
  const txt = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}
