// -------------------------------------------------------
// Réviz — Tests du catalogue de thèmes (gating Réviz+)
// -------------------------------------------------------
import { describe, it, expect } from 'vitest'
import { THEMES, DARK_THEMES, themeById, resolveTheme } from '../themes'

describe('catalogue', () => {
  it('expose les deux thèmes gratuits et au moins 4 premium', () => {
    const free = THEMES.filter(t => !t.premium).map(t => t.id)
    expect(free).toEqual(['light', 'dark'])
    expect(THEMES.filter(t => t.premium).length).toBeGreaterThanOrEqual(4)
  })

  it('chaque thème a un id, un label et deux couleurs de pastille', () => {
    for (const t of THEMES) {
      expect(t.id).toBeTruthy()
      expect(t.label).toBeTruthy()
      expect(t.swatch).toHaveLength(2)
    }
  })

  it('les thèmes sombres sont recensés dans DARK_THEMES', () => {
    expect(DARK_THEMES).toContain('dark')
    expect(DARK_THEMES).toContain('nuit-encre')
    expect(DARK_THEMES).not.toContain('light')
  })
})

describe('resolveTheme (repli abonnement)', () => {
  it('laisse passer les thèmes gratuits, premium ou pas', () => {
    expect(resolveTheme('light', false)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('autorise un thème premium avec Réviz+ actif', () => {
    expect(resolveTheme('nuit-encre', true)).toBe('nuit-encre')
    expect(resolveTheme('carnet-kraft', true)).toBe('carnet-kraft')
  })

  it('replie un thème premium sans abonnement sur « light »', () => {
    expect(resolveTheme('nuit-encre', false)).toBe('light')
    expect(resolveTheme('menthe-focus', false)).toBe('light')
  })

  it('replie un id inconnu ou vide sur « light »', () => {
    expect(resolveTheme('vaporwave', true)).toBe('light')
    expect(resolveTheme(null, true)).toBe('light')
  })

  it('themeById retourne null pour un id inconnu', () => {
    expect(themeById('nuit-encre')?.premium).toBe(true)
    expect(themeById('nope')).toBeNull()
  })
})
