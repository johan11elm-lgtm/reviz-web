// -------------------------------------------------------
// Réviz — Calcul de la note du brevet (DNB), sessions 2026 et 2027
//
// Sources (vérifiées le 28/10/2026) :
// - Note de service du 2-9-2025, BO n° 33 du 4/09/2025 (MENE2515977N) :
//   moyenne finale = 60 % épreuves terminales + 40 % contrôle continu ;
//   contrôle continu = moyenne des moyennes annuelles des enseignements
//   obligatoires de 3e, plus les points au-dessus de 10 du meilleur
//   enseignement facultatif (sans dépasser 20) ; coefficients : français 2,
//   maths 2, histoire-géographie 1,5, EMC 0,5, sciences 2, oral 2.
// - Note de service du 11-9-2026 (MENE2623228N), session 2027 : mêmes
//   coefficients.
// - education.gouv.fr, « Le diplôme national du brevet » : reçu à 10/20 ;
//   mentions assez bien 12, bien 14, très bien 16, félicitations du jury 18.
// -------------------------------------------------------

export const EPREUVES_BREVET = [
  { id: 'francais', label: 'Français', coef: 2, detail: 'Écrit, 3 h' },
  { id: 'maths', label: 'Mathématiques', coef: 2, detail: 'Écrit, 2 h' },
  { id: 'histoireGeo', label: 'Histoire-géographie', coef: 1.5, detail: 'Écrit, avec l’EMC' },
  { id: 'emc', label: 'Enseignement moral et civique', coef: 0.5, detail: 'Écrit, avec l’histoire-géo' },
  { id: 'sciences', label: 'Sciences', coef: 2, detail: 'Écrit, 2 disciplines sur 3' },
  { id: 'oral', label: 'Oral', coef: 2, detail: 'Soutenance, 15 min' },
]

export const MENTIONS_BREVET = [
  { seuil: 18, label: 'Très bien, félicitations du jury' },
  { seuil: 16, label: 'Très bien' },
  { seuil: 14, label: 'Bien' },
  { seuil: 12, label: 'Assez bien' },
  { seuil: 10, label: 'Admis' },
]

const note = v => (typeof v === 'number' && Number.isFinite(v) ? Math.min(20, Math.max(0, v)) : null)

/**
 * Contrôle continu sur 20 : la moyenne des moyennes annuelles des enseignements obligatoires
 * (les cases vides ne comptent pas), avec les points au-dessus de 10 d'un enseignement
 * facultatif ajoutés à la somme, sans dépasser 20. null s'il n'y a aucune moyenne.
 */
export function controleContinu(moyennes = [], facultatif = null) {
  const notes = moyennes.map(note).filter(v => v !== null)
  if (!notes.length) return null
  const bonus = Math.max(0, (note(facultatif) ?? 0) - 10)
  return Math.min(20, (notes.reduce((s, v) => s + v, 0) + bonus) / notes.length)
}

/** Moyenne des épreuves terminales sur 20, pondérée par les coefficients ; null si incomplète. */
export function moyenneEpreuves(epreuves = {}) {
  let somme = 0
  let coefs = 0
  for (const e of EPREUVES_BREVET) {
    const v = note(epreuves[e.id])
    if (v === null) return null
    somme += v * e.coef
    coefs += e.coef
  }
  return somme / coefs
}

/** La mention d'une moyenne finale (null sous 10). */
export function mentionBrevet(finale) {
  return MENTIONS_BREVET.find(m => finale >= m.seuil) ?? null
}

/** Moyenne finale sur 20 : 40 % contrôle continu, 60 % épreuves. */
export function noteFinale(cc, epreuves) {
  return 0.4 * cc + 0.6 * epreuves
}

/**
 * Ce qu'il faut de moyenne aux épreuves pour atteindre `seuil` avec ce contrôle continu
 * (0 si c'est déjà acquis, null si c'est hors d'atteinte, au-dessus de 20).
 */
export function epreuvesNecessaires(cc, seuil) {
  const besoin = (seuil - 0.4 * cc) / 0.6
  if (besoin > 20) return null
  return Math.max(0, besoin)
}

/** « 12,5 » : une décimale, virgule française, sans « ,0 ». */
export function formatNote(v) {
  return (Math.round(v * 10) / 10).toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}
