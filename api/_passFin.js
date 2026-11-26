// -------------------------------------------------------
// Réviz — Fin du Pass brevet (api/_offres.js) : passé PASS_BREVET.fin, le Pass ne donne plus
// Réviz+. L'app le sait déjà d'elle-même (passJusquau) ; le cron quotidien remet le profil
// en gratuit pour le serveur (quotas de scan et de Réviz IA). Un abonnement Stripe ou Apple
// pris entre-temps a écrit sa propre formule : seuls les profils encore en « pass » changent.
// -------------------------------------------------------

export async function finirPassExpires({ db, maintenant = Date.now() }) {
  const snap = await db.collection('users').where('passJusquau', '<=', maintenant).get()
  let pass = 0
  for (const doc of snap.docs) {
    const u = doc.data()
    if (u.plan !== 'premium' || u.formule !== 'pass') continue
    await doc.ref.set({ plan: 'free', subscriptionStatus: 'canceled', planUpdatedAt: maintenant }, { merge: true })
    pass++
  }
  return { passFinis: pass }
}
