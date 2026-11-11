import { describe, it, expect, beforeEach } from 'vitest'
import { capterCodeParrain, codeParrainEnAttente, oublierCodeParrain, parrainageVu, noterParrainageVu, messageErreurParrainage } from '../parrainage'

describe('parrainage côté app', () => {
  beforeEach(() => localStorage.clear())

  it('garde le code du lien jusqu’à la création du compte', () => {
    expect(capterCodeParrain('?parrain=abc234&utm=x')).toBe('ABC234')
    expect(codeParrainEnAttente()).toBe('ABC234')
    // Un autre lien sans code ne l'efface pas.
    expect(capterCodeParrain('?utm=tiktok')).toBeNull()
    expect(codeParrainEnAttente()).toBe('ABC234')
    oublierCodeParrain()
    expect(codeParrainEnAttente()).toBeNull()
  })
  it('ignore un code mal formé', () => {
    expect(capterCodeParrain('?parrain=<script>')).toBeNull()
    expect(codeParrainEnAttente()).toBeNull()
  })
  it('retient ce qui a déjà été annoncé', () => {
    expect(parrainageVu('u1')).toEqual({ recu: false, filleuls: 0 })
    noterParrainageVu('u1', { recu: true, filleuls: 2 })
    expect(parrainageVu('u1')).toEqual({ recu: true, filleuls: 2 })
  })
  it('explique chaque refus du serveur', () => {
    expect(messageErreurParrainage('SOI_MEME')).toMatch(/ton propre code/)
    expect(messageErreurParrainage('TROP_TARD')).toMatch(/semaine/)
    expect(messageErreurParrainage('???')).toMatch(/Réessaie/)
  })
})
