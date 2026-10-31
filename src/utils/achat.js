// -------------------------------------------------------
// Réviz — Où Réviz+ peut s'acheter
// L'App Store refuse un abonnement numérique payé hors de ses achats intégrés
// (règle 3.1.1) : dans l'app iOS, aucun prix, aucun bouton ni lien vers le
// paiement Stripe. Les abonnés du site gardent leur accès dans l'app.
// -------------------------------------------------------
import { Capacitor } from '@capacitor/core'

export const ACHAT_DANS_L_APP = !Capacitor.isNativePlatform()
