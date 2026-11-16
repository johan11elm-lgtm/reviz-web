// -------------------------------------------------------
// Réviz — Fournisseurs d'e-mails (16/11)
//
// Resend gratuit = 100 e-mails par jour, et la tâche de 17 h en consomme 60 à elle seule : le soir,
// au pic des inscriptions, les demandes d'accord parental échouaient. Second fournisseur gratuit :
// Brevo (300 e-mails par jour), branché par BREVO_API_KEY (domaine revizapp.fr authentifié chez Brevo).
//   - envois en lot (tâche de 17 h) : Brevo d'abord, Resend en secours ;
//   - envois immédiats (demande d'accord, cadeau…) : Resend d'abord, Brevo en secours.
// Sans BREVO_API_KEY, tout passe par Resend, comme avant.
// La réponse garde la forme de Resend : { data, error } (jamais d'exception).
// -------------------------------------------------------

import { Resend } from 'resend'

/** 'Réviz <noreply@revizapp.fr>' → { name: 'Réviz', email: 'noreply@revizapp.fr' } */
export function adresse(brut) {
  const s = String(brut ?? '').trim()
  const m = s.match(/^(.*?)\s*<([^>]+)>$/)
  if (!m) return { email: s }
  const name = m[1].replace(/^"|"$/g, '').trim()
  return name ? { name, email: m[2].trim() } : { email: m[2].trim() }
}

/** Envoi par l'API Brevo, réponse au format Resend. */
export async function envoyerBrevo(message, { cle = process.env.BREVO_API_KEY, fetch: f = globalThis.fetch } = {}) {
  if (!cle) return { data: null, error: { name: 'missing_api_key', message: 'BREVO_API_KEY absente' } }
  const corps = {
    sender: adresse(message.from),
    to: [].concat(message.to ?? []).map(a => ({ email: adresse(a).email })),
    subject: message.subject,
    htmlContent: message.html,
    ...(message.text ? { textContent: message.text } : {}),
    ...(message.replyTo ? { replyTo: { email: adresse([].concat(message.replyTo)[0]).email } } : {}),
  }
  try {
    const r = await f('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': cle, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(corps),
    })
    const json = await r.json().catch(() => ({}))
    if (!r.ok) return { data: null, error: { name: `brevo_${r.status}`, message: json.message || `Brevo ${r.status}` } }
    return { data: { id: json.messageId ?? null, fournisseur: 'brevo' }, error: null }
  } catch (err) {
    return { data: null, error: { name: 'brevo_injoignable', message: err?.message || 'Brevo injoignable' } }
  }
}

/** Envoi par Resend, sans exception. */
export async function envoyerResend(message, { cle = process.env.RESEND_API_KEY } = {}) {
  try {
    const r = await new Resend(cle).emails.send(message)
    return r ?? { data: null, error: { name: 'vide', message: 'Resend sans réponse' } }
  } catch (err) {
    return { data: null, error: { name: 'resend_injoignable', message: err?.message || 'Resend injoignable' } }
  }
}

// Refus qui viennent de l'adresse elle-même : un autre fournisseur n'y changera rien.
const REFUS_DEFINITIFS = new Set(['validation_error', 'invalid_to_address'])

/**
 * Un `envoyer(message)` qui essaie les fournisseurs dans l'ordre et passe au suivant si l'un refuse.
 * @param {{ lot?: boolean, brevo?: Function, resend?: Function, brevoActif?: boolean }} o
 */
export function envoyeurMail({
  lot = false,
  brevo = envoyerBrevo,
  resend = envoyerResend,
  brevoActif = Boolean(process.env.BREVO_API_KEY),
} = {}) {
  const ordre = !brevoActif ? [resend] : lot ? [brevo, resend] : [resend, brevo]
  return async message => {
    let dernier = null
    for (const f of ordre) {
      const r = await f(message)
      if (!r?.error) return r
      dernier = r
      console.error('[mail]', r.error.name, r.error.message)
      if (REFUS_DEFINITIFS.has(r.error.name)) break
    }
    return dernier
  }
}
