import { describe, it, expect, vi } from 'vitest'
import { adresse, envoyerBrevo, envoyeurMail } from '../_fournisseurMail.js'

const ok = id => vi.fn(async () => ({ data: { id }, error: null }))
const refus = name => vi.fn(async () => ({ data: null, error: { name, message: name } }))
const msg = { from: 'Réviz <noreply@revizapp.fr>', to: 'parent@exemple.fr', subject: 'S', html: '<p>h</p>' }

describe('fournisseurs d’e-mails', () => {
  it('lit une adresse avec nom', () => {
    expect(adresse('Réviz <noreply@revizapp.fr>')).toEqual({ name: 'Réviz', email: 'noreply@revizapp.fr' })
    expect(adresse('a@b.fr')).toEqual({ email: 'a@b.fr' })
  })

  it('sans clé Brevo, tout passe par Resend', async () => {
    const resend = ok('r'), brevo = ok('b')
    await envoyeurMail({ lot: true, resend, brevo, brevoActif: false })(msg)
    expect(resend).toHaveBeenCalledOnce()
    expect(brevo).not.toHaveBeenCalled()
  })

  it('le lot part chez Brevo, Resend en secours', async () => {
    const resend = ok('r'), brevo = refus('brevo_429')
    const r = await envoyeurMail({ lot: true, resend, brevo, brevoActif: true })(msg)
    expect(brevo).toHaveBeenCalledOnce()
    expect(r.data.id).toBe('r')
  })

  it('un envoi immédiat refusé par Resend (quota) repart par Brevo', async () => {
    const resend = refus('daily_quota_exceeded'), brevo = ok('b')
    const r = await envoyeurMail({ resend, brevo, brevoActif: true })(msg)
    expect(r.data.id).toBe('b')
  })

  it('une adresse invalide n’est pas retentée ailleurs', async () => {
    const resend = refus('validation_error'), brevo = ok('b')
    const r = await envoyeurMail({ resend, brevo, brevoActif: true })(msg)
    expect(brevo).not.toHaveBeenCalled()
    expect(r.error.name).toBe('validation_error')
  })

  it('appelle l’API Brevo au bon format', async () => {
    const f = vi.fn(async () => ({ ok: true, json: async () => ({ messageId: 'm1' }) }))
    const r = await envoyerBrevo({ ...msg, replyTo: 'contact@revizapp.fr' }, { cle: 'k', fetch: f })
    expect(r).toEqual({ data: { id: 'm1', fournisseur: 'brevo' }, error: null })
    const [url, init] = f.mock.calls[0]
    expect(url).toBe('https://api.brevo.com/v3/smtp/email')
    expect(init.headers['api-key']).toBe('k')
    expect(JSON.parse(init.body)).toEqual({
      sender: { name: 'Réviz', email: 'noreply@revizapp.fr' },
      to: [{ email: 'parent@exemple.fr' }],
      subject: 'S', htmlContent: '<p>h</p>', replyTo: { email: 'contact@revizapp.fr' },
    })
  })

  it('un refus de Brevo revient en { error }', async () => {
    const f = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ message: 'Key not found' }) }))
    const r = await envoyerBrevo(msg, { cle: 'k', fetch: f })
    expect(r.error).toEqual({ name: 'brevo_401', message: 'Key not found' })
  })
})
