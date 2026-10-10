// -------------------------------------------------------
// Réviz — Lancement : Réviz+ offert à tout le monde
// Tant que LANCEMENT_OFFERT vaut true, chaque compte a les avantages Réviz+
// sans payer, avec des plafonds larges qui protègent le coût de l'IA.
// Importé par l'API ET par l'app (src/) : une seule source de vérité.
// Pour rebrancher le paywall : passer à false (rien d'autre à toucher).
// -------------------------------------------------------

export const LANCEMENT_OFFERT = true

// Plafonds pendant le lancement (les vrais abonnés gardent les leurs).
export const LANCEMENT_SCAN_LIMIT = 30 // leçons analysées par semaine
export const LANCEMENT_CHAT_LIMIT = 50 // messages au coach par jour

// Membres fondateurs : les comptes créés pendant le lancement. Le jour où le
// paywall revient, mettre ici la date de fin (ISO, ex. '2026-12-01') : les
// comptes plus récents ne sont plus fondateurs, les autres le restent.
export const FONDATEURS_JUSQU_AU = null
