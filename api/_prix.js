// -------------------------------------------------------
// Réviz — Prix de Réviz+ (décidés le 2026-10-11, docs/prix-revizplus.md)
// Importé par l'API (checkout) ET par l'app (affichage) : une seule source.
// Les prix Stripe sont retrouvés par leur lookup_key, identique en test et
// en réel : passer en réel = créer les mêmes prix (scripts/stripe-prix.sh),
// sans toucher au code.
// -------------------------------------------------------

export const FORMULES = ['annuel', 'mensuel']
export const FORMULE_PAR_DEFAUT = 'annuel'

export const PRIX = {
  annuel: { lookupKey: 'revizplus_annuel', centimes: 4900, montant: '49 €', cadence: '/an', parMois: '4,08 €' },
  mensuel: { lookupKey: 'revizplus_mensuel', centimes: 699, montant: '6,99 €', cadence: '/mois' },
}

// Membres fondateurs (comptes créés pendant le lancement, voir _lancement.js) :
// prix gardé tant que l'abonnement court.
export const PRIX_FONDATEUR = {
  annuel: { lookupKey: 'revizplus_fondateur_annuel', centimes: 2900, montant: '29 €', cadence: '/an', parMois: '2,42 €' },
  mensuel: { lookupKey: 'revizplus_fondateur_mensuel', centimes: 399, montant: '3,99 €', cadence: '/mois' },
}

/** Prix d'une formule, au tarif fondateur ou non. Formule inconnue → annuel. */
export function prixDe(formule, fondateur = false) {
  const f = FORMULES.includes(formule) ? formule : FORMULE_PAR_DEFAUT
  return (fondateur ? PRIX_FONDATEUR : PRIX)[f]
}

/** Remise du tarif fondateur sur une formule, en pourcentage entier (ex. 40). */
export function remiseFondateur(formule = FORMULE_PAR_DEFAUT) {
  return Math.floor((1 - prixDe(formule, true).centimes / prixDe(formule).centimes) * 100)
}
