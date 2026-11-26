// -------------------------------------------------------
// Réviz — Pass brevet, promo Black Friday, offre de fin d'essai (26/11/2026)
//
// Bilan du 26/11 : 2 565 comptes, 1 233 actifs sur 7 jours, 3 abonnés. Le trafic n'est plus le
// frein, la conversion l'est. Trois offres, les mêmes sur le site (Stripe) et dans l'app iOS
// (App Store), décidées avec Johan :
// - Pass brevet : Réviz+ jusqu'au brevet, payé une fois (pas d'abonnement à résilier) ;
// - Black Friday, du 27/11 au 30/11 inclus : l'annuel à 29 € la 1re année, le Pass à 19 € ;
// - fin d'essai : pendant 48 h après la fin de l'essai de 7 jours, le 1er mois à 2,99 €.
// Importé par l'API (paiement, webhooks) ET par l'app (affichage) : une seule source de vérité.
// La remise est toujours recalculée par le serveur au moment du paiement (heure du serveur,
// profil Firestore) : l'app ne fait que l'afficher.
// -------------------------------------------------------

const HEURE = 60 * 60 * 1000

/** Pass brevet : Réviz+ jusqu'au lendemain des résultats du brevet, payé une fois. */
export const PASS_BREVET = {
  formule: 'pass',
  lookupKey: 'revizplus_pass_brevet', // prix Stripe en paiement unique
  produitApple: 'com.reviz.app.passbrevet', // abonnement non renouvelable dans App Store Connect
  centimes: 2900,
  montant: '29 €',
  fin: Date.parse('2027-07-10T23:59:59+02:00'),
  finTexte: '10 juillet 2027',
}

/** Le Pass brevet donne-t-il encore Réviz+ ? */
export const passActif = (maintenant = Date.now()) => maintenant < PASS_BREVET.fin

/** Black Friday : du vendredi 27/11 au lundi 30/11 inclus, heure de Paris. */
export const BLACK_FRIDAY = {
  debut: Date.parse('2026-11-27T00:00:00+01:00'),
  fin: Date.parse('2026-12-01T00:00:00+01:00'),
  dernierJour: 'lundi 30 novembre',
  // Coupons Stripe (montant retiré une fois : la 1re année de l'annuel, le Pass).
  remises: {
    annuel: { coupon: 'bf2026-annuel', centimes: 2900, montant: '29 €', detail: 'la 1re année' },
    pass: { coupon: 'bf2026-pass', centimes: 1900, montant: '19 €', detail: 'paiement unique' },
  },
}

export const blackFridayEnCours = (maintenant = Date.now()) =>
  maintenant >= BLACK_FRIDAY.debut && maintenant < BLACK_FRIDAY.fin

/** Fin d'essai : 48 h pour garder Réviz+ avec le 1er mois à 2,99 €. */
export const OFFRE_FIN_ESSAI = {
  dureeMs: 48 * HEURE,
  offreApple: 'fin_essai_299', // offre promotionnelle de l'abonnement mensuel dans App Store Connect
  remises: {
    mensuel: { coupon: 'fin-essai-mensuel', centimes: 299, montant: '2,99 €', detail: 'le 1er mois' },
  },
}

/**
 * Jusqu'à quand l'offre de fin d'essai vaut-elle pour ce profil (ms), ou null.
 * L'essai de 7 jours doit être fini depuis moins de 48 h, et l'élève n'avoir jamais payé.
 * (L'essai prolongé par le parrainage ne compte pas : Réviz+ court encore.)
 */
export function offreFinEssaiJusquau(profil, maintenant = Date.now()) {
  const finEssai = profil?.essaiPlus?.fin
  if (!Number.isFinite(finEssai) || profil?.plan === 'premium' || profil?.upgradedAt) return null
  const parrainage = profil?.essaiPlus?.parrainage?.fin
  const fin = Math.max(finEssai, Number.isFinite(parrainage) ? parrainage : 0)
  const jusquau = fin + OFFRE_FIN_ESSAI.dureeMs
  return maintenant >= fin && maintenant < jusquau ? jusquau : null
}

/**
 * La remise qui s'applique à une formule, maintenant, pour ce profil, ou null.
 * @returns {{ coupon: string, centimes: number, montant: string, detail: string, raison: 'black_friday'|'fin_essai', jusquau: number } | null}
 */
export function remiseDe(formule, { profil = null, maintenant = Date.now(), fondateur = false } = {}) {
  if (fondateur) return null // le tarif fondateur est déjà le plus bas
  if (blackFridayEnCours(maintenant) && BLACK_FRIDAY.remises[formule]) {
    return { ...BLACK_FRIDAY.remises[formule], raison: 'black_friday', jusquau: BLACK_FRIDAY.fin }
  }
  const finEssai = offreFinEssaiJusquau(profil, maintenant)
  if (finEssai && OFFRE_FIN_ESSAI.remises[formule]) {
    return { ...OFFRE_FIN_ESSAI.remises[formule], raison: 'fin_essai', jusquau: finEssai }
  }
  return null
}

/** Le Pass brevet est-il proposé à cet élève ? (3e, et avant la fin du Pass) */
export const passPropose = (classe, maintenant = Date.now()) => classe === '3ème' && passActif(maintenant)

/**
 * Côté app : la remise à afficher, sans le profil complet (l'app connaît seulement la fin de
 * l'offre de fin d'essai, calculée par AuthContext avec offreFinEssaiJusquau).
 */
export function remiseAffichee(formule, { finEssaiJusquau = null, maintenant = Date.now(), fondateur = false } = {}) {
  if (fondateur) return null
  if (blackFridayEnCours(maintenant) && BLACK_FRIDAY.remises[formule]) {
    return { ...BLACK_FRIDAY.remises[formule], raison: 'black_friday', jusquau: BLACK_FRIDAY.fin }
  }
  if (Number.isFinite(finEssaiJusquau) && maintenant < finEssaiJusquau && OFFRE_FIN_ESSAI.remises[formule]) {
    return { ...OFFRE_FIN_ESSAI.remises[formule], raison: 'fin_essai', jusquau: finEssaiJusquau }
  }
  return null
}

/** « encore 31 h », « encore 2 jours » : le temps qui reste, en clair. */
export function tempsRestant(jusquau, maintenant = Date.now()) {
  const h = Math.ceil((jusquau - maintenant) / HEURE)
  if (h <= 0) return null
  if (h <= 48) return `encore ${h} h`
  return `encore ${Math.ceil(h / 24)} jours`
}
