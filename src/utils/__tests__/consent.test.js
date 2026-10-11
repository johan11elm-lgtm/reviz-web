import { describe, it, expect } from 'vitest'
import { consentGate, DELAI_REPONSE_MS } from '../consent.js'

const DAY = 24 * 60 * 60 * 1000
const now = 1_800_000_000_000
const gate = (consent, under15 = true) => consentGate({ under15, consent, now })

describe('consentGate', () => {
  it('15 ans et plus : jamais bloqué, même sans consentement', () => {
    expect(gate(null, false)).toMatchObject({ status: 'ok', blocked: false })
  })

  it('accord du parent → accès ouvert', () => {
    expect(gate({ status: 'approved' })).toMatchObject({ status: 'ok', blocked: false })
  })

  it('aucun email parti (doc absent ou trace du signup) → à demander, bloqué', () => {
    expect(gate(null)).toMatchObject({ status: 'a-demander', blocked: true })
    expect(gate({ status: 'pending', createdAt: now })).toMatchObject({ status: 'a-demander', blocked: true })
  })

  it('email parti, délai en cours → accès ouvert avec les jours restants', () => {
    const c = { status: 'pending', parentEmail: 'p@f.fr', createdAt: now, firstRequestedAt: now - 2 * DAY }
    expect(gate(c)).toEqual({ status: 'en-attente', blocked: false, parentEmail: 'p@f.fr', joursRestants: 8 })
  })

  it('le délai part de la première demande, pas du dernier renvoi', () => {
    const c = { status: 'pending', parentEmail: 'p@f.fr', createdAt: now, firstRequestedAt: now - DELAI_REPONSE_MS }
    expect(gate(c)).toMatchObject({ status: 'sans-reponse', blocked: true })
  })

  it('ancienne demande sans firstRequestedAt → délai depuis createdAt', () => {
    expect(gate({ status: 'pending', parentEmail: 'p@f.fr', createdAt: now - 11 * DAY }))
      .toMatchObject({ status: 'sans-reponse', blocked: true })
  })

  it('refus du parent → bloqué', () => {
    expect(gate({ status: 'refused', parentEmail: 'p@f.fr' })).toMatchObject({ status: 'refuse', blocked: true, parentEmail: 'p@f.fr' })
  })
})
