// -------------------------------------------------------
// Réviz — Réviz+ offert par un parent (11/11, repris de Knowunity : le parent paie seul,
// puis transmet un code à son enfant). Partagé par l'app et l'API (api/_cadeau.js).
// Le code : 8 caractères sans 0/O ni 1/I/L, affiché « ABCD-EFGH ». Le lien porte
// ?cadeau=CODE ; l'app le garde jusqu'à la création du compte, puis l'active.
// -------------------------------------------------------
export const ALPHABET_CADEAU = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE_CADEAU_RE = /^[A-HJKMNP-Z2-9]{8}$/

/** « abcd-efgh » → « ABCDEFGH », ou null. */
export function normaliserCodeCadeau(saisie) {
  if (typeof saisie !== 'string') return null
  const code = saisie.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return CODE_CADEAU_RE.test(code) ? code : null
}

export const ecrireCodeCadeau = code => `${code.slice(0, 4)}-${code.slice(4)}`

export function lienCadeau(code, origine = 'https://app.revizapp.fr') {
  return `${origine}/?cadeau=${code}`
}

const CLE = 'reviz-cadeau'
export function capterCodeCadeau(search = typeof window !== 'undefined' ? window.location.search : '') {
  let code = null
  try { code = normaliserCodeCadeau(new URLSearchParams(search).get('cadeau')) } catch { /* adresse illisible */ }
  if (!code) return null
  try { localStorage.setItem(CLE, code) } catch { /* stockage indisponible */ }
  return code
}
export function codeCadeauEnAttente() {
  try { return normaliserCodeCadeau(localStorage.getItem(CLE)) } catch { return null }
}
export function oublierCodeCadeau() {
  try { localStorage.removeItem(CLE) } catch { /* rien */ }
}

export function messageErreurCadeau(code) {
  switch (code) {
    case 'CODE_INVALIDE': return 'Un code cadeau, c’est 8 lettres et chiffres (ABCD-EFGH).'
    case 'CODE_INCONNU': return 'Ce code n’existe pas. Vérifie-le avec ton parent.'
    case 'DEJA_UTILISE': return 'Ce code a déjà servi sur un autre compte.'
    case 'DEJA_ABONNE': return 'Tu as déjà Réviz+ : ton parent peut demander le remboursement de ce code en répondant à son e-mail.'
    case 'EXPIRE': return 'Cet abonnement a été arrêté. Demande à ton parent.'
    case 'COMPTE': return 'Crée ton compte gratuit d’abord, puis le code s’active.'
    default: return 'Le code n’a pas pu être vérifié. Réessaie dans un instant.'
  }
}
