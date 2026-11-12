// -------------------------------------------------------
// Réviz — Envoi des e-mails de la tâche de 17 h (12/11)
//
// Resend gratuit : 100 e-mails par jour, validations d'adresse et demandes d'accord comprises.
// Le 11/11, la tâche de 17 h en a envoyé ~80 d'un coup, puis tout a échoué jusqu'à minuit (heure
// de Londres), validations d'adresse comprises. Désormais :
//   - au plus BUDGET envois par passage (le reste attend demain : rien n'est marqué envoyé) ;
//   - pas d'envoi aux adresses qui ont déjà rebondi ou que Resend bloque (taux de rebond > 4 %
//     = risque de suspension du compte) ;
//   - un refus de Resend ({ error }, que le SDK ne lève pas) devient une erreur : l'envoi n'est
//     pas noté comme fait et sera retenté.
// L'ordre des envois de la tâche fait la priorité : accord parental d'abord, rappels ensuite.
// -------------------------------------------------------

export const BUDGET_PAR_DEFAUT = 60
const ETATS_REJETES = new Set(['bounced', 'suppressed', 'complained'])
const RETENTION_MS = 30 * 86_400_000

/** Les adresses à ne plus écrire, d'après l'historique Resend (30 jours). Vide si Resend ne répond pas. */
export async function adressesRejetees({ cle = process.env.RESEND_API_KEY, fetch: f = globalThis.fetch, maintenant = Date.now(), pagesMax = 40 } = {}) {
  const rejetees = new Set()
  if (!cle) return rejetees
  let apres = null
  try {
    for (let i = 0; i < pagesMax; i++) {
      const url = `https://api.resend.com/emails?limit=100${apres ? `&after=${apres}` : ''}`
      const r = await f(url, { headers: { Authorization: `Bearer ${cle}` } })
      if (!r.ok) break
      const { data = [], has_more: plus } = await r.json()
      for (const e of data) {
        if (ETATS_REJETES.has(e.last_event)) for (const a of [].concat(e.to ?? [])) rejetees.add(String(a).toLowerCase())
      }
      const dernier = data.at(-1)
      if (!plus || !dernier || maintenant - Date.parse(String(dernier.created_at).replace(' ', 'T').replace(/\+00$/, 'Z')) > RETENTION_MS) break
      apres = dernier.id
    }
  } catch { /* Resend injoignable : on envoie quand même, le plafond protège */ }
  return rejetees
}

/** Un `envoyer` borné : budget par passage, adresses rejetées écartées, refus de Resend levés. */
export function envoiBorne(envoyer, { budget = BUDGET_PAR_DEFAUT, rejetees = new Set() } = {}) {
  let envoyes = 0
  const borne = async message => {
    const to = [].concat(message.to ?? []).map(a => String(a).toLowerCase())
    if (to.some(a => rejetees.has(a))) throw new Error('ADRESSE_REJETEE')
    if (envoyes >= budget) throw new Error('BUDGET_ATTEINT')
    envoyes++
    const r = await envoyer(message)
    if (r?.error) throw new Error(r.error.message || 'envoi refusé')
    return r
  }
  borne.compte = () => envoyes
  return borne
}
