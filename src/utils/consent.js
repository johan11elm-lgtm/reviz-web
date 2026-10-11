// -------------------------------------------------------
// Réviz — Accès d'un mineur <15 ans selon le consentement parental
//
// L'élève entre dans l'app dès que l'email est parti chez son parent : pas
// de mur d'attente. Le parent accepte ou refuse depuis l'email. Sans réponse
// au bout de DELAI_REPONSE_MS (durée de validité du lien), ou en cas de
// refus, l'accès est suspendu jusqu'à son accord.
// -------------------------------------------------------

export const DELAI_REPONSE_MS = 7 * 24 * 60 * 60 * 1000 // 7 jours

/**
 * @param {{ under15:boolean, consent:object|null, now?:number }} p
 *   consent = données de users/{uid}/parentalConsent/consent (ou null)
 * @returns {{ status:'ok'|'a-demander'|'en-attente'|'sans-reponse'|'refuse',
 *   blocked:boolean, parentEmail:string|null, joursRestants:number|null }}
 *   - a-demander   : aucun email parti (tunnel abandonné, compte Google) → bloqué
 *   - en-attente   : email parti, délai en cours → accès ouvert
 *   - sans-reponse : délai écoulé sans réponse → bloqué
 *   - refuse       : le parent a refusé → bloqué
 */
export function consentGate({ under15, consent, now = Date.now() }) {
  const parentEmail = typeof consent?.parentEmail === 'string' ? consent.parentEmail : null
  const res = (status, blocked, joursRestants = null) => ({ status, blocked, parentEmail, joursRestants })

  if (!under15 || consent?.status === 'approved') return res('ok', false)
  if (consent?.status === 'refused') return res('refuse', true)
  // Le doc 'pending' posé au signup n'a pas d'email parent : rien n'est parti.
  if (!parentEmail) return res('a-demander', true)

  const depuis = consent.firstRequestedAt ?? consent.createdAt ?? now
  const reste = DELAI_REPONSE_MS - (now - depuis)
  if (reste <= 0) return res('sans-reponse', true)
  return res('en-attente', false, Math.ceil(reste / (24 * 60 * 60 * 1000)))
}
