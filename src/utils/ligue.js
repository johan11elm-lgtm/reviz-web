// -------------------------------------------------------
// Réviz — Ligue côté app (serveur : api/_ligues.js). L'XP de la semaine (du lundi, heure de Paris)
// se lit sur les révisions de l'appareil, synchronisées depuis Firestore.
// -------------------------------------------------------
import { jourParis } from './retour.js'
import { lundiDe } from './agenda.js'

export const NOMS_LIGUES = { bronze: 'Bronze', argent: 'Argent', or: 'Or' }

export function xpDeLaSemaine(revisions = [], maintenant = Date.now()) {
  const lundi = lundiDe(jourParis(maintenant))
  return revisions.reduce((s, r) => {
    const t = new Date(r?.revisedAt ?? NaN).getTime()
    if (!Number.isFinite(t) || !Number.isFinite(r?.xp)) return s
    return lundiDe(jourParis(t)) === lundi ? s + r.xp : s
  }, 0)
}

/** Ce que dit la carte selon la place : montée, maintien, descente. */
export function messageLigue({ ligue, rang, zones }) {
  if (zones?.montee && rang <= zones.montee) return 'Tu es en zone de montée : garde ta place jusqu’à dimanche.'
  if (zones?.descente && rang >= zones.descente) return 'Zone de descente : quelques XP suffisent pour en sortir.'
  if (zones?.montee) {
    const n = rang - zones.montee
    return n === 1 ? 'Plus qu’une place avant la zone de montée.' : `Plus que ${n} places avant la zone de montée.`
  }
  return ligue === 'or' ? 'Tu es dans la meilleure ligue : reste devant.' : 'Gagne des XP pour monter.'
}

/** « dans 4 jours », « demain », « ce soir » : la fin de la semaine. */
export function finDeLigue(fin, maintenant = Date.now()) {
  const j = Math.floor((fin - maintenant) / 86_400_000)
  return j >= 2 ? `fin dans ${j} jours` : j === 1 ? 'fin demain soir' : 'fin ce soir'
}

const cleResultat = (uid, fin) => `reviz-ligue-resultat-${uid}-${fin}`
export function resultatVu(uid, fin) { try { return !!localStorage.getItem(cleResultat(uid, fin)) } catch { return true } }
export function noterResultatVu(uid, fin) { try { localStorage.setItem(cleResultat(uid, fin), '1') } catch { /* rien */ } }
