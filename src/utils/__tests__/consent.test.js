import { describe, it, expect } from 'vitest'
import { consentGate, DELAI_ADRESSE_MS, DELAI_REPONSE_MS } from '../consent.js'

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

  it('pas encore d\'email parent, inscrit aujourd\'hui → à fournir, accès ouvert 15 jours', () => {
    expect(gate({ status: 'pending', createdAt: now }))
      .toEqual({ status: 'a-fournir', blocked: false, parentEmail: null, joursRestants: 15 })
  })

  it('compte Google sans doc : le délai part de la création du compte', () => {
    expect(consentGate({ under15: true, consent: null, inscritLe: now - 4 * DAY, now }))
      .toMatchObject({ status: 'a-fournir', blocked: false, joursRestants: 11 })
  })

  it('pas d\'email parent après 15 jours → à demander, bloqué', () => {
    expect(gate({ status: 'pending', createdAt: now - DELAI_ADRESSE_MS })).toMatchObject({ status: 'a-demander', blocked: true })
    expect(consentGate({ under15: true, consent: null, inscritLe: now - 16 * DAY, now })).toMatchObject({ status: 'a-demander', blocked: true })
  })

  it('aucune date connue → à demander, bloqué', () => {
    expect(gate(null)).toMatchObject({ status: 'a-demander', blocked: true })
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
