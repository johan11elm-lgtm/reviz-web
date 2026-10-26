// -------------------------------------------------------
// Réviz — Tests du catalogue de thèmes (gating Réviz+)
// -------------------------------------------------------
import { describe, it, expect } from 'vitest'
import { THEMES, DARK_THEMES, themeById, resolveTheme, SOMBRE_DISPONIBLE, THEMES_PROPOSES, themeAffiche, MODES, modeInitial, estSombre, sombreAuDemarrage } from '../themes'

describe('catalogue', () => {
  it('expose les deux thèmes gratuits et au moins 4 premium', () => {
    const free = THEMES.filter(t => !t.premium).map(t => t.id)
    expect(free).toEqual(['light', 'dark'])
    expect(THEMES.filter(t => t.premium).length).toBeGreaterThanOrEqual(4)
  })

  it('chaque thème a un id, un label et une vignette', () => {
    for (const t of THEMES) {
      expect(t.id).toBeTruthy()
      expect(t.label).toBeTruthy()
      expect(t.preview.app).toBeTruthy()
      expect(t.preview.hero).toHaveLength(2)
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
    expect(resolveTheme('abricot', true)).toBe('abricot')
    expect(resolveTheme('carnet-kraft', true)).toBe('abricot')
    expect(resolveTheme('violet-air', true)).toBe('prune')
  })

  it('replie un thème premium sans abonnement sur « light »', () => {
    expect(resolveTheme('nuit-encre', false)).toBe('light')
    expect(resolveTheme('menthe-focus', false)).toBe('light')
    expect(resolveTheme('sauge', false)).toBe('light')
  })

  it('replie un id inconnu ou vide sur « light »', () => {
    expect(resolveTheme('vaporwave', true)).toBe('light')
    expect(resolveTheme(null, true)).toBe('light')
  })

  it('themeById retourne null pour un id inconnu', () => {
    expect(themeById('nuit-encre')?.premium).toBe(true)
    expect(themeById('nope')).toBeNull()
  })

  it('le sombre est un mode : aucun thème sombre dans les sélecteurs', () => {
    expect(THEMES_PROPOSES.map(t => t.id)).toEqual(['light', 'abricot', 'sauge', 'prune'])
  })
})

describe('mode Clair / Sombre / Auto', () => {
  it('propose les trois modes', () => {
    expect(MODES.map(m => m.id)).toEqual(['clair', 'sombre', 'auto'])
  })

  it('garde un mode mémorisé, sinon reprend un ancien thème sombre, sinon clair', () => {
    expect(modeInitial('auto', 'light')).toBe('auto')
    expect(modeInitial(null, 'dark')).toBe('sombre')
    expect(modeInitial(null, 'nuit-encre')).toBe('sombre')
    expect(modeInitial(null, 'sauge')).toBe('clair')
    expect(modeInitial('nimporte', null)).toBe('clair')
  })

  it('Auto suit l’appareil, Sombre force, Clair jamais (quand le sombre est disponible)', () => {
    if (!SOMBRE_DISPONIBLE) {
      expect(estSombre('sombre', true)).toBe(false)
      return
    }
    expect(estSombre('sombre', false)).toBe(true)
    expect(estSombre('auto', true)).toBe(true)
    expect(estSombre('auto', false)).toBe(false)
    expect(estSombre('clair', true)).toBe(false)
  })

  it('pose « dark » en sombre, garde le thème en clair, ramène un ancien thème sombre au clair', () => {
    expect(themeAffiche('sauge', true)).toBe('dark')
    expect(themeAffiche('sauge')).toBe('sauge')
    expect(themeAffiche('dark')).toBe('light')
    expect(themeAffiche('nuit-encre')).toBe('light')
    expect(themeAffiche('light')).toBe('light')
  })
})

describe('sombreAuDemarrage', () => {
  it('pose « dark » avant le rendu quand le mode Sombre est choisi (si le sombre est disponible)', () => {
    document.documentElement.removeAttribute('data-theme')
    localStorage.setItem('reviz-mode', 'sombre')
    sombreAuDemarrage()
    expect(document.documentElement.getAttribute('data-theme')).toBe(SOMBRE_DISPONIBLE ? 'dark' : null)
    localStorage.setItem('reviz-mode', 'clair')
    document.documentElement.removeAttribute('data-theme')
    sombreAuDemarrage()
    expect(document.documentElement.getAttribute('data-theme')).toBeNull()
    localStorage.removeItem('reviz-mode')
  })
})
