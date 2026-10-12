// -------------------------------------------------------
// Réviz — « Compte vérifié » (scans, coach, paiement)
// Anti-abus des quotas gratuits : pas de comptes jetables à la chaîne.
// Vérifié = e-mail confirmé (Google et Apple le sont d'office), ou compte
// ouvert via un fournisseur qui vérifie déjà la personne, sans e-mail de
// confirmation à cliquer : Microsoft (popup web) et le claim `reviz_social`
// posé par /api/auth (TikTok, Microsoft dans l'app iOS).
// Tout vient du jeton signé, jamais du client.
// -------------------------------------------------------
export function compteVerifie(decoded) {
  if (decoded?.email_verified === true) return true
  if (decoded?.firebase?.sign_in_provider === 'microsoft.com') return true
  return decoded?.reviz_social === true
}
