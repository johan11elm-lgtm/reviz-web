import { describe, it, expect, beforeEach } from 'vitest'
import { lireEntree, garderEntree, oublierEntree, niveauDeLEntree } from '../entreeAttente'

const T = 1_800_000_000_000
const JOUR = 86_400_000

describe('réponses de l’entrée, en attente du compte', () => {
  beforeEach(() => localStorage.clear())
  it('s’ajoutent au fil des écrans, puis s’oublient', () => {
    expect(lireEntree(T)).toBeNull()
    garderEntree({ prenom: ' Léa ' }, T)
    garderEntree({ classe: '3ème', controle: 'aucun' }, T + 1000)
    expect(lireEntree(T + 2000)).toMatchObject({ prenom: 'Léa', classe: '3ème', controle: 'aucun', fini: false })
    expect(niveauDeLEntree(lireEntree(T + 2000))).toEqual({ cycle: 'college', classe: '3ème', specialites: [] })
    oublierEntree()
    expect(lireEntree(T)).toBeNull()
  })
  it('oubliées après 7 jours sans réponse', () => {
    garderEntree({ prenom: 'Léa', fini: true }, T)
    expect(lireEntree(T + 6 * JOUR)).not.toBeNull()
    expect(lireEntree(T + 8 * JOUR)).toBeNull()
  })
  it('ce qui est mal formé est écarté (classe de lycée, contrôle sans date)', () => {
    localStorage.setItem('reviz-entree-attente', JSON.stringify({ le: T, prenom: 'x'.repeat(50), classe: 'Terminale', controle: { matiere: 'maths' } }))
    const e = lireEntree(T)
    expect(e.prenom).toHaveLength(30)
    expect(e.classe).toBeNull()
    expect(e.controle).toBeNull()
    expect(niveauDeLEntree(e)).toBeNull()
    localStorage.setItem('reviz-entree-attente', '{pas du json')
    expect(lireEntree(T)).toBeNull()
  })
})
