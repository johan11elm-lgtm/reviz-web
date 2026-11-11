// Même règle que le webhook (planForStatus) : active, trialing, past_due → premium. Ici à part pour
// ne pas charger Stripe (et son webhook) depuis l'API cadeau.
export function planForStatusCadeau(status) {
  return status === 'active' || status === 'trialing' || status === 'past_due' ? 'premium' : 'free'
}
