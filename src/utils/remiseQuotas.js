// -------------------------------------------------------
// Réviz — Quand les quotas gratuits reviennent (11/11, repris de Knowunity : le compte à rebours
// sous chaque limite). Exercices : chaque jour à minuit ; scans et questions à Réviz IA : le lundi
// à minuit. Heure de Paris, changement d'heure compris.
// -------------------------------------------------------
import { jourParis } from './retour.js'

const JOUR = 86_400_000

/** Minuit (heure de Paris) au début du jour « AAAA-MM-JJ », en ms. */
export function minuitParis(jour) {
  for (const decalage of ['+02:00', '+01:00']) {
    const t = Date.parse(`${jour}T00:00:00${decalage}`)
    if (jourParis(t) === jour && jourParis(t - 1) !== jour) return t
  }
  return Date.parse(`${jour}T00:00:00+01:00`)
}

const lendemain = jour => new Date(Date.parse(`${jour}T12:00:00Z`) + JOUR).toISOString().slice(0, 10)

/** Instant (ms) où le quota revient : 'exercices' demain à minuit ; 'scan' et 'ia' lundi à minuit. */
export function prochaineRemise(type, maintenant = Date.now()) {
  let jour = lendemain(jourParis(maintenant))
  if (type !== 'exercices') {
    while (new Date(`${jour}T12:00:00Z`).getUTCDay() !== 1) jour = lendemain(jour)
  }
  return minuitParis(jour)
}

/** « dans 4 h 12 min », « dans 35 min », ou null au-delà de 24 h (on dit alors « lundi »). */
export function dansCombien(fin, maintenant = Date.now()) {
  const reste = fin - maintenant
  if (!(reste > 0) || reste > JOUR) return null
  const minutes = Math.max(1, Math.ceil(reste / 60_000))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `dans ${h} h${m ? ` ${m} min` : ''}` : `dans ${m} min`
}

/** Prix annuel ramené à la semaine : 4900 centimes → « 0,94 € ». */
export function parSemaine(centimesParAn) {
  return `${(Math.round(centimesParAn / 52) / 100).toFixed(2).replace('.', ',')} €`
}
