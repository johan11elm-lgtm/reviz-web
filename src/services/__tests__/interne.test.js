import { describe, it, expect, beforeEach } from 'vitest'
import { lireInterne } from '../interne'

describe('lireInterne', () => {
  beforeEach(() => localStorage.clear())

  it('ne marque rien sans le paramètre', () => {
    expect(lireInterne('')).toBe(false)
    expect(localStorage.getItem('reviz-interne')).toBeNull()
  })

  it('marque l’appareil avec ?interne=1 et s’en souvient', () => {
    expect(lireInterne('?interne=1')).toBe(true)
    expect(lireInterne('')).toBe(true)
  })

  it('démarque l’appareil avec ?interne=0', () => {
    lireInterne('?interne=1')
    expect(lireInterne('?interne=0')).toBe(false)
    expect(lireInterne('')).toBe(false)
  })
})
