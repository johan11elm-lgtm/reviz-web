import { describe, it, expect } from 'vitest'
import { estTelephone, LARGEUR_MAX_TELEPHONE, REQUETE_TELEPHONE } from '../ecran'

// Une fenêtre de `largeur` px, avec un matchMedia qui sait lire (max-width: N px).
const fenetre = (largeur, { native = false } = {}) => ({
  document: { documentElement: { classList: { contains: c => native && c === 'native' } } },
  matchMedia: q => ({ matches: largeur <= Number(/max-width: (\d+)px/.exec(q)[1]) }),
})

describe('estTelephone', () => {
  it('un iPhone Pro Max (440 px) est un téléphone, comme tout écran de moins de 600 px', () => {
    expect(REQUETE_TELEPHONE).toBe('(max-width: 599px)')
    for (const largeur of [320, 360, 390, 430, 440, 480, LARGEUR_MAX_TELEPHONE]) expect(estTelephone(fenetre(largeur)), `${largeur} px`).toBe(true)
  })
  it('une tablette ou un ordinateur n’en est pas un', () => {
    for (const largeur of [600, 744, 1024, 1440]) expect(estTelephone(fenetre(largeur)), `${largeur} px`).toBe(false)
  })
  it('l’app native est toujours en plein écran, quelle que soit la largeur', () => {
    expect(estTelephone(fenetre(820, { native: true }))).toBe(true)
  })
  it('sans fenêtre ni matchMedia : pas un téléphone', () => {
    expect(estTelephone(undefined)).toBe(false)
    expect(estTelephone({ document: { documentElement: { classList: { contains: () => false } } } })).toBe(false)
  })
})
