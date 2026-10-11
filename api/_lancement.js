// -------------------------------------------------------
// Réviz — Lancement et ouverture des ventes de Réviz+
// Importé par l'API ET par l'app (src/) : une seule source de vérité.
// Décidé le 2026-10-11 (docs/prix-revizplus.md) :
// - les ventes ouvrent dès que Stripe est en réel (VENTES_OUVERTES) ;
// - Réviz+ est offert à tous jusqu'au 25 octobre inclus ;
// - un abonnement pris avant le 26 octobre a le tarif fondateur et n'est
//   prélevé que le 26 octobre (api/_checkout.js) ;
// - le 26, la gratuité s'arrête toute seule, sans délai de grâce.
// -------------------------------------------------------

// Interrupteur des ventes : true seulement quand Stripe est en réel (clé,
// prix, webhook). Tant qu'il est false, rien ne se vend et Réviz+ reste
// offert même après la date (on ne coupe pas la gratuité sans rien à vendre).
export const VENTES_OUVERTES = true

export const FIN_LANCEMENT = '2026-10-26T00:00:00+01:00' // premier jour payant
export const DERNIER_JOUR_OFFERT = '25\u00a0octobre'
export const PREMIER_PRELEVEMENT = '26\u00a0octobre'

// Réviz+ offert à tous : jusqu'à la date, et tant que les ventes sont fermées.
// L'API appelle la fonction à chaque requête (une instance chaude passe donc
// minuit) ; la constante sert à l'affichage, calculée au chargement de l'app.
export function lancementOffert(now = Date.now()) {
  return !VENTES_OUVERTES || now < Date.parse(FIN_LANCEMENT)
}
export const LANCEMENT_OFFERT = lancementOffert()

// Tarif fondateur : un abonnement pris avant la bascule, prélevé le 26.
export function tarifFondateurOuvert(now = Date.now()) {
  return now < Date.parse(FIN_LANCEMENT)
}

// Plafonds pendant le lancement (les vrais abonnés gardent les leurs).
// Réviz+ est « illimité » : ce sont des garde-fous anti-abus, jamais
// affichés et très au-dessus d'un usage normal.
export const LANCEMENT_SCAN_LIMIT = 100 // leçons analysées par semaine
export const LANCEMENT_CHAT_LIMIT = 200 // messages au coach par jour

// Membres fondateurs (sceau « Membre fondateur ») : comptes créés pendant le
// lancement. Le tarif fondateur, lui, dépend de la date de l'abonnement.
export const FONDATEURS_JUSQU_AU = FIN_LANCEMENT
