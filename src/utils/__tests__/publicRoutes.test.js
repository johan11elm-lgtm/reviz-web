import { describe, it, expect } from 'vitest'
import { isPublicPath, shouldPrefetchAuthShell } from '../publicRoutes'

describe('isPublicPath', () => {
  it('reconnaît les pages servies sans Firebase', () => {
    expect(isPublicPath('/welcome')).toBe(true)
    expect(isPublicPath('/welcome/')).toBe(true)
    expect(isPublicPath('/legal/confidentialite')).toBe(true)
    expect(isPublicPath('/legal')).toBe(true)
    expect(isPublicPath('/inscription')).toBe(true)
  })

  it('envoie tout le reste vers le cœur connecté', () => {
    for (const p of ['/', '/connexion', '/cours', '/welcomeback', '/legalese', '/inscriptions', '/profsx', ''])
      expect(isPublicPath(p)).toBe(false)
  })
})

describe('shouldPrefetchAuthShell', () => {
  it('précharge par défaut (pas d’info réseau)', () => {
    expect(shouldPrefetchAuthShell({})).toBe(true)
    expect(shouldPrefetchAuthShell(undefined)).toBe(true)
  })

  it('respecte l’économiseur de données et la 2G', () => {
    expect(shouldPrefetchAuthShell({ connection: { saveData: true, effectiveType: '4g' } })).toBe(false)
    expect(shouldPrefetchAuthShell({ connection: { effectiveType: 'slow-2g' } })).toBe(false)
    expect(shouldPrefetchAuthShell({ connection: { effectiveType: '2g' } })).toBe(false)
    expect(shouldPrefetchAuthShell({ connection: { effectiveType: '3g' } })).toBe(true)
    expect(shouldPrefetchAuthShell({ connection: { effectiveType: '4g', saveData: false } })).toBe(true)
  })
})
