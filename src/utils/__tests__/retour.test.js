import { describe, it, expect } from 'vitest'
import { entreeSansSession } from '../retour'
import { suiteApresConnexion } from '../../pages/Connexion'

describe('entreeSansSession', () => {
  it('nouveau visiteur : l’accueil', () => {
    expect(entreeSansSession({ pathname: '/cours', search: '' })).toBe('/welcome')
    expect(entreeSansSession({ pathname: '/programme', search: '?via=tiktok' })).toBe('/welcome')
  })

  it.each([
    ['/cours', '?via=rappel'],
    ['/programme', '?via=rappel'],
    ['/', '?via=rappel'],
    ['/agenda', '?via=push'],
  ])('venu d’un rappel (%s%s) : la connexion, puis retour sur la page du lien', (pathname, search) => {
    const cible = entreeSansSession({ pathname, search })
    expect(cible).toMatch(/^\/connexion\?next=/)
    // Connexion accepte la page et y renvoie après la connexion.
    expect(suiteApresConnexion(cible.slice('/connexion'.length))).toBe(pathname + search)
  })
})
