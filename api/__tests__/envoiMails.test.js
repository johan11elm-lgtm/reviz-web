import { describe, it, expect, vi } from 'vitest'
import { envoiBorne, adressesRejetees } from '../_envoiMails.js'

describe('e-mails de la tâche de 17 h : bornés', () => {
  it('au plus « budget » envois ; au-delà, une erreur (rien n’est noté envoyé)', async () => {
    const envoyer = vi.fn(async () => ({ data: { id: 'x' } }))
    const e = envoiBorne(envoyer, { budget: 2 })
    await e({ to: 'a@x.fr' })
    await e({ to: 'b@x.fr' })
    await expect(e({ to: 'c@x.fr' })).rejects.toThrow('BUDGET_ATTEINT')
    expect(envoyer).toHaveBeenCalledTimes(2)
    expect(e.compte()).toBe(2)
  })
  it('un refus de Resend ({ error }, pas levé par le SDK) devient une erreur', async () => {
    const e = envoiBorne(async () => ({ data: null, error: { message: 'daily_quota_exceeded' } }))
    await expect(e({ to: 'a@x.fr' })).rejects.toThrow('daily_quota_exceeded')
  })
  it('rien aux adresses qui ont rebondi, et ça ne compte pas dans le budget', async () => {
    const envoyer = vi.fn(async () => ({}))
    const e = envoiBorne(envoyer, { budget: 1, rejetees: new Set(['mort@x.fr']) })
    await expect(e({ to: ['Mort@X.fr'] })).rejects.toThrow('ADRESSE_REJETEE')
    await e({ to: 'vivant@x.fr' })
    expect(envoyer).toHaveBeenCalledTimes(1)
  })
})

describe('adresses rejetées, d’après l’historique Resend', () => {
  const T = Date.parse('2026-11-12T12:00:00Z')
  const page = (data, plus) => ({ ok: true, json: async () => ({ data, has_more: plus }) })
  it('rebonds, blocages et plaintes sur 30 jours, page après page', async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(page([
        { id: '1', to: ['ok@x.fr'], last_event: 'delivered', created_at: '2026-11-12 10:00:00.0+00' },
        { id: '2', to: ['Rebond@x.fr'], last_event: 'bounced', created_at: '2026-11-11 10:00:00.0+00' },
      ], true))
      .mockResolvedValueOnce(page([
        { id: '3', to: ['bloque@x.fr'], last_event: 'suppressed', created_at: '2026-11-01 10:00:00.0+00' },
      ], false))
    const r = await adressesRejetees({ cle: 'k', fetch: f, maintenant: T })
    expect([...r].sort()).toEqual(['bloque@x.fr', 'rebond@x.fr'])
    expect(f.mock.calls[1][0]).toContain('after=2')
  })
  it('sans clé ou si Resend ne répond pas : personne d’écarté', async () => {
    expect((await adressesRejetees({ cle: '' })).size).toBe(0)
    expect((await adressesRejetees({ cle: 'k', fetch: async () => { throw new Error('réseau') } })).size).toBe(0)
  })
})
