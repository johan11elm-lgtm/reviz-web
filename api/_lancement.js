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

// Calendrier de la bascule (décidé le 2026-10-11, docs/prix-revizplus.md).
// LANCEMENT_OFFERT reste l'interrupteur : il faut le passer à false le jour
// de la bascule (avec Stripe en réel). Les dates servent à l'affichage, au
// statut de fondateur et au délai de grâce.
export const FIN_LANCEMENT = '2026-10-26T00:00:00+01:00' // premier jour payant
export const DERNIER_JOUR_OFFERT = '25\u00a0octobre'

// Membres fondateurs : les comptes créés avant la bascule. Ils gardent le
// tarif fondateur (api/_prix.js) tant que leur abonnement court.
export const FONDATEURS_JUSQU_AU = FIN_LANCEMENT

// Délai de grâce : après la bascule, les fondateurs gardent Réviz+ offert
// encore quatorze jours, le temps de s'abonner.
export const FIN_GRACE_FONDATEURS = '2026-11-09T00:00:00+01:00'
export const DERNIER_JOUR_GRACE = '8\u00a0novembre'
