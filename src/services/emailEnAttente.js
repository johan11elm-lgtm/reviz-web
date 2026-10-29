// -------------------------------------------------------
// Réviz — adresse corrigée en attente du clic sur son lien
// La carte d'activation la montre ; la connexion la propose si Firebase ferme la
// session au changement d'adresse (CarteEmail, Connexion).
// -------------------------------------------------------
const CLE = 'reviz-email-en-attente'

export function noterEmailEnAttente(uid, email) {
  try { localStorage.setItem(CLE, JSON.stringify({ uid, email })) } catch { /* stockage indisponible */ }
}

/** L'adresse corrigée dont le lien n'est pas encore cliqué (tout compte si uid est omis), ou null. */
export function emailEnAttente(uid) {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) ?? 'null')
    return v?.email && (!uid || v.uid === uid) ? v.email : null
  } catch { return null }
}

export function oublierEmailEnAttente() {
  try { localStorage.removeItem(CLE) } catch { /* rien à effacer */ }
}
