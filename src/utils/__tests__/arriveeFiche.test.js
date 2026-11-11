import { describe, it, expect, beforeEach } from 'vitest'
import { noterArrivee, arriveeRecente, oublierArrivee } from '../arriveeFiche'

const T = 1_800_000_000_000
const J = 864e5

describe('chapitre d’arrivée (fiche publique)', () => {
  beforeEach(() => localStorage.clear())
  it('gardé 7 jours, pour la même classe', () => {
    noterArrivee({ classe: '3ème', matiere: 'maths', chapitre: 'theoreme-de-thales' }, T)
    expect(arriveeRecente('3ème', T + 6 * J)).toEqual({ classe: '3ème', matiere: 'maths', chapitre: 'theoreme-de-thales' })
    expect(arriveeRecente('4ème', T)).toBeNull()
    expect(arriveeRecente('3ème', T + 8 * J)).toBeNull()
  })
  it('ignore un lien mal formé, s’oublie', () => {
    noterArrivee({ classe: '3ème', matiere: 'maths', chapitre: '<script>' }, T)
    expect(arriveeRecente(null, T)).toBeNull()
    noterArrivee({ classe: '3ème', matiere: 'maths', chapitre: 'pythagore' }, T)
    oublierArrivee()
    expect(arriveeRecente(null, T)).toBeNull()
  })
})
