// -------------------------------------------------------
// Réviz — Accès d'un mineur <15 ans selon le consentement parental
//
// L'élève entre dans l'app dès l'inscription. Il a DELAI_ADRESSE_MS pour
// donner l'email d'un parent (« plus tard » possible), puis le parent a
// DELAI_REPONSE_MS (durée de validité du lien) pour accepter. Sans adresse à
// temps, sans réponse à temps ou en cas de refus, l'accès est suspendu
// jusqu'à l'accord du parent.
// -------------------------------------------------------

export const JOUR_MS = 24 * 60 * 60 * 1000
export const DELAI_ADRESSE_MS = 15 * JOUR_MS
export const DELAI_REPONSE_MS = 10 * JOUR_MS

/**
 * @param {{ under15:boolean, consent:object|null, inscritLe?:number|null, now?:number }} p
 *   consent = données de users/{uid}/parentalConsent/consent (ou null)
 *   inscritLe = création du compte (ms), si le doc consent n'existe pas
 * @returns {{ status:'ok'|'a-fournir'|'a-demander'|'en-attente'|'sans-reponse'|'refuse',
 *   blocked:boolean, parentEmail:string|null, joursRestants:number|null }}
 *   - a-fournir    : pas encore d'email parent, délai d'adresse en cours → accès ouvert
 *   - a-demander   : pas d'email parent, délai d'adresse écoulé (ou date inconnue) → bloqué
 *   - en-attente   : email parti, délai de réponse en cours → accès ouvert
 *   - sans-reponse : délai de réponse écoulé → bloqué
 *   - refuse       : le parent a refusé → bloqué
 */
export function consentGate({ under15, consent, inscritLe = null, now = Date.now() }) {
  const parentEmail = typeof consent?.parentEmail === 'string' ? consent.parentEmail : null
  const res = (status, blocked, joursRestants = null) => ({ status, blocked, parentEmail, joursRestants })

  if (!under15 || consent?.status === 'approved') return res('ok', false)
  if (consent?.status === 'refused') return res('refuse', true)
  // Pas d'email parent : le doc 'pending' posé à l'inscription date le début
  // du délai d'adresse ; à défaut (compte Google), la création du compte.
  if (!parentEmail) {
    const debut = consent?.createdAt ?? inscritLe
    const resteAdresse = debut ? DELAI_ADRESSE_MS - (now - debut) : 0
    if (resteAdresse <= 0) return res('a-demander', true)
    return res('a-fournir', false, Math.ceil(resteAdresse / JOUR_MS))
  }

  const depuis = consent.firstRequestedAt ?? consent.createdAt ?? now
  const reste = DELAI_REPONSE_MS - (now - depuis)
  if (reste <= 0) return res('sans-reponse', true)
  return res('en-attente', false, Math.ceil(reste / JOUR_MS))
}
