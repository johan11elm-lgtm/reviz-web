import { describe, it, expect, beforeEach } from 'vitest'
import { peutDemanderControle, noterDemandeControle, noterControleNote, lireDemandes, MAX_DEMANDES, ESPACEMENT_MS } from '../demandeControle'
import { jourIso, ajouterJours } from '../agenda'

const VIDE = { controles: [] }
const t = 1_800_000_000_000

describe('demande du prochain contrôle', () => {
  beforeEach(() => localStorage.clear())

  it('au plus 3 fois sans réponse utile, espacées de 3 jours', () => {
    expect(peutDemanderControle('u1', VIDE, t)).toBe(true)
    noterDemandeControle('u1', t)
    expect(peutDemanderControle('u1', VIDE, t + ESPACEMENT_MS - 1)).toBe(false)
    expect(peutDemanderControle('u1', VIDE, t + ESPACEMENT_MS)).toBe(true)
    noterDemandeControle('u1', t + ESPACEMENT_MS)
    noterDemandeControle('u1', t + 2 * ESPACEMENT_MS)
    expect(lireDemandes('u1').fois).toBe(MAX_DEMANDES)
    expect(peutDemanderControle('u1', VIDE, t + 10 * ESPACEMENT_MS)).toBe(false)
    expect(peutDemanderControle('u2', VIDE, t)).toBe(true) // par élève
    expect(peutDemanderControle(null, VIDE, t)).toBe(false)
  })

  it('jamais tant qu’un contrôle est à venir ; un contrôle passé ne compte pas', () => {
    const auj = jourIso()
    expect(peutDemanderControle('u1', { controles: [{ id: 'c1', date: ajouterJours(auj, 3) }] })).toBe(false)
    expect(peutDemanderControle('u1', { controles: [{ id: 'c1', date: auj }] })).toBe(false)
    expect(peutDemanderControle('u1', { controles: [{ id: 'c1', date: ajouterJours(auj, -1) }] })).toBe(true)
    expect(peutDemanderControle('u1', null)).toBe(true)
  })

  it('un contrôle noté remet le compteur à zéro : le suivant sera redemandé', () => {
    noterDemandeControle('u1', t)
    noterDemandeControle('u1', t + ESPACEMENT_MS)
    noterDemandeControle('u1', t + 2 * ESPACEMENT_MS)
    expect(peutDemanderControle('u1', VIDE, t + 10 * ESPACEMENT_MS)).toBe(false)
    noterControleNote('u1')
    expect(lireDemandes('u1')).toEqual({ fois: 0, derniere: null })
    expect(peutDemanderControle('u1', VIDE, t + 2 * ESPACEMENT_MS + 1)).toBe(true)
  })

  it('un stockage illisible ne bloque rien', () => {
    localStorage.setItem('reviz-controle-demande-u1', '{pas du json')
    expect(lireDemandes('u1')).toEqual({ fois: 0, derniere: null })
    expect(peutDemanderControle('u1', VIDE, t)).toBe(true)
  })
})
