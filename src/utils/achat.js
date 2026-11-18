// -------------------------------------------------------
// Réviz — Où et comment Réviz+ peut s'acheter
// Site : paiement Stripe. App iOS : achats intégrés Apple seulement (règle 3.1.1), via
// RevenueCat (src/services/achatApple.js) : aucun prix, bouton ni lien vers Stripe, et pas
// de « demander à un parent » par lien (offres hors app interdites aux mineurs) — le parent
// valide avec « Demander l'achat » du Partage familial. Les abonnés du site gardent leur
// accès dans l'app, et inversement.
// -------------------------------------------------------
import { Capacitor } from '@capacitor/core'

// VITE_SANS_ACHAT=1 : aucune vente nulle part (captures de la fiche App Store).
const SANS_ACHAT = import.meta.env.VITE_SANS_ACHAT === '1'

/** Paiement Stripe possible (site, hors app). */
export const ACHAT_STRIPE = !Capacitor.isNativePlatform() && !SANS_ACHAT

/** Achat intégré Apple possible (app iOS avec la clé RevenueCat). */
export const ACHAT_APPLE = Capacitor.getPlatform?.() === 'ios' && !!import.meta.env.VITE_REVENUECAT_IOS && !SANS_ACHAT

/** Réviz+ peut s'acheter ici, d'une façon ou d'une autre : on peut montrer l'offre. */
export const ACHAT_DANS_L_APP = ACHAT_STRIPE || ACHAT_APPLE
