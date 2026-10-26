import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  estErreurDeChunk, rechargerUneFois, dejaTente, ecouterErreurDeChunk, DELAI_GARDE, _reinitialiser,
} from '../rechargement.js'

beforeEach(() => { _reinitialiser() })

describe('estErreurDeChunk', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://app.revizapp.fr/assets/Jeux-abc.js', // Chrome
    'error loading dynamically imported module: https://app.revizapp.fr/assets/Jeux-abc.js', // Firefox
    'Importing a module script failed.', // Safari
    'Unable to preload CSS for /assets/Jeux-abc.css',
  ])('reconnaît « %s »', (message) => {
    expect(estErreurDeChunk(new TypeError(message))).toBe(true)
  })

  it('reconnaît ChunkLoadError par son nom', () => {
    const e = new Error('Loading chunk 7 failed.')
    e.name = 'ChunkLoadError'
    expect(estErreurDeChunk(e)).toBe(true)
  })

  it('laisse passer les vraies erreurs de code', () => {
    expect(estErreurDeChunk(new TypeError("Cannot read properties of undefined (reading 'map')"))).toBe(false)
    expect(estErreurDeChunk(null)).toBe(false)
    expect(estErreurDeChunk(undefined)).toBe(false)
  })
})

describe('rechargerUneFois', () => {
  it('recharge la première fois, jamais la deuxième dans le délai (pas de boucle)', () => {
    const recharger = vi.fn()
    expect(rechargerUneFois(recharger, 1_000)).toBe(true)
    expect(recharger).toHaveBeenCalledTimes(1)
    expect(dejaTente(2_000)).toBe(true)
  })

  it('après un rechargement qui ne règle rien (nouvelle page, même session), ne recharge plus', () => {
    const recharger = vi.fn()
    rechargerUneFois(recharger, 1_000)
    // La page rechargée recommence à zéro côté module mais garde sessionStorage.
    vi.resetModules()
    return import('../rechargement.js').then((m) => {
      expect(m.rechargerUneFois(recharger, 1_000 + 5_000)).toBe(false)
      expect(recharger).toHaveBeenCalledTimes(1)
    })
  })

  it('autorise un nouveau rechargement une fois le délai écoulé (autre mise à jour, plus tard)', () => {
    sessionStorage.setItem('reviz-rechargement', '1000')
    const recharger = vi.fn()
    expect(rechargerUneFois(recharger, 1_000 + DELAI_GARDE + 1)).toBe(true)
    expect(recharger).toHaveBeenCalledTimes(1)
  })

  it('ne recharge pas si sessionStorage est inutilisable (pas de garde, donc pas de risque de boucle)', () => {
    const lire = vi.spyOn(sessionStorage, 'getItem').mockImplementation(() => { throw new Error('bloqué') })
    const recharger = vi.fn()
    expect(rechargerUneFois(recharger)).toBe(false)
    expect(recharger).not.toHaveBeenCalled()
    lire.mockRestore()
  })
})

describe('ecouterErreurDeChunk', () => {
  const lancer = (payload) => {
    const e = new Event('vite:preloadError', { cancelable: true })
    e.payload = payload
    window.dispatchEvent(e)
    return e
  }

  it('recharge une fois sur un chunk manquant, sans bloquer l\'erreur', () => {
    const recharger = vi.fn()
    const loc = vi.spyOn(window, 'location', 'get').mockReturnValue({ reload: recharger })
    const arreter = ecouterErreurDeChunk()
    const e = lancer(new TypeError('Failed to fetch dynamically imported module: /assets/Jeux-x.js'))
    lancer(new TypeError('Failed to fetch dynamically imported module: /assets/Jeux-x.js'))
    expect(recharger).toHaveBeenCalledTimes(1)
    expect(e.defaultPrevented).toBe(false)
    arreter(); loc.mockRestore()
  })

  it('ignore une autre erreur', () => {
    const recharger = vi.fn()
    const loc = vi.spyOn(window, 'location', 'get').mockReturnValue({ reload: recharger })
    const arreter = ecouterErreurDeChunk()
    lancer(new Error('autre chose'))
    expect(recharger).not.toHaveBeenCalled()
    arreter(); loc.mockRestore()
  })
})
