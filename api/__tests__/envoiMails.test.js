import { describe, it, expect, vi } from 'vitest'
import { envoiBorne, adressesRejetees, adressesBloqueesBrevo } from '../_envoiMails.js'

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
  it('signale quand le budget est épuisé, pour que les boucles s’arrêtent', async () => {
    const e = envoiBorne(async () => ({}), { budget: 1 })
    expect(e.epuise()).toBe(false)
    await e({ to: 'a@x.fr' })
    expect(e.epuise()).toBe(true)
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

describe('plafond d’une boucle dans le budget commun (18/11)', () => {
  it('une boucle plafonnée s’arrête à son plafond et laisse le reste du budget aux suivantes', async () => {
    const envoyer = vi.fn(async () => ({}))
    const e = envoiBorne(envoyer, { budget: 5 })
    const relances = e.plafond(3)
    for (const a of ['a', 'b', 'c']) await relances({ to: `${a}@x.fr` })
    expect(relances.epuise()).toBe(true)
    await expect(relances({ to: 'd@x.fr' })).rejects.toThrow('BUDGET_ATTEINT')
    expect(e.epuise()).toBe(false)
    await e({ to: 'fin-essai@x.fr' })
    await e({ to: 'bilan@x.fr' })
    expect(e.compte()).toBe(5)
    expect(envoyer).toHaveBeenCalledTimes(5)
  })
  it('le plafond ne dépasse jamais le budget commun', async () => {
    const e = envoiBorne(async () => ({}), { budget: 1 })
    const relances = e.plafond(10)
    await relances({ to: 'a@x.fr' })
    expect(relances.epuise()).toBe(true)
    await expect(relances({ to: 'b@x.fr' })).rejects.toThrow('BUDGET_ATTEINT')
  })
  it('une adresse rejetée ne consomme pas le plafond', async () => {
    const e = envoiBorne(async () => ({}), { budget: 5, rejetees: new Set(['mort@x.fr']) })
    const relances = e.plafond(1)
    await expect(relances({ to: 'mort@x.fr' })).rejects.toThrow('ADRESSE_REJETEE')
    expect(relances.compte()).toBe(0)
    await relances({ to: 'vivant@x.fr' })
    expect(relances.compte()).toBe(1)
  })
  it('un envoi refusé par le fournisseur compte (il a été tenté)', async () => {
    const e = envoiBorne(async () => ({ error: { message: 'refus' } }), { budget: 5 })
    const relances = e.plafond(1)
    await expect(relances({ to: 'a@x.fr' })).rejects.toThrow('refus')
    expect(relances.epuise()).toBe(true)
  })
})

describe('adresses bloquées chez Brevo', () => {
  const page = contacts => ({ ok: true, json: async () => ({ contacts, count: contacts.length }) })
  it('lit les contacts bloqués page après page, en minuscules', async () => {
    const pleine = Array.from({ length: 100 }, (_, i) => ({ email: `X${i}@x.fr` }))
    const f = vi.fn().mockResolvedValueOnce(page(pleine)).mockResolvedValueOnce(page([{ email: 'Rebond@Y.fr' }]))
    const r = await adressesBloqueesBrevo({ cle: 'k', fetch: f })
    expect(r.size).toBe(101)
    expect(r.has('rebond@y.fr')).toBe(true)
    expect(f.mock.calls[1][0]).toContain('offset=100')
    expect(f.mock.calls[0][1].headers['api-key']).toBe('k')
  })
  it('sans clé ou si Brevo ne répond pas : personne d’écarté', async () => {
    expect((await adressesBloqueesBrevo({ cle: '' })).size).toBe(0)
    expect((await adressesBloqueesBrevo({ cle: 'k', fetch: async () => { throw new Error('réseau') } })).size).toBe(0)
    expect((await adressesBloqueesBrevo({ cle: 'k', fetch: async () => ({ ok: false }) })).size).toBe(0)
  })
})
