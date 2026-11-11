import { describe, it, expect, beforeEach } from 'vitest'
import { normaliserCodeCadeau, ecrireCodeCadeau, lienCadeau, capterCodeCadeau, codeCadeauEnAttente, oublierCodeCadeau, messageErreurCadeau } from '../cadeau'

describe('code cadeau', () => {
  beforeEach(() => localStorage.clear())
  it('normalise et affiche le code', () => {
    expect(normaliserCodeCadeau(' abcd-efgh ')).toBe('ABCDEFGH')
    expect(normaliserCodeCadeau('ABC123')).toBeNull()
    expect(ecrireCodeCadeau('ABCDEFGH')).toBe('ABCD-EFGH')
    expect(lienCadeau('ABCDEFGH')).toBe('https://app.revizapp.fr/?cadeau=ABCDEFGH')
  })
  it('garde le code du lien jusqu’à l’activation', () => {
    expect(capterCodeCadeau('?cadeau=abcd-efgh')).toBe('ABCDEFGH')
    expect(codeCadeauEnAttente()).toBe('ABCDEFGH')
    oublierCodeCadeau()
    expect(codeCadeauEnAttente()).toBeNull()
    expect(capterCodeCadeau('?parrain=ABC234')).toBeNull()
  })
  it('explique les refus', () => {
    expect(messageErreurCadeau('DEJA_ABONNE')).toMatch(/remboursement/)
    expect(messageErreurCadeau('COMPTE')).toMatch(/Crée ton compte/)
  })
})
