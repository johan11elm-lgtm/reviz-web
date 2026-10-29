import { describe, it, expect } from 'vitest'
import { suggererEmail, adresseExemple, boiteMail } from '../adresseEmail'

describe('suggererEmail — fautes de frappe vues dans les envois (octobre 2026)', () => {
  it.each([
    ['lea@s.frfr', 'lea@sfr.fr'],
    ['lea@hormail.fr', 'lea@hotmail.fr'],
    ['lea@gmial.com', 'lea@gmail.com'],
    ['lea@gmai.com', 'lea@gmail.com'],
    ['lea@gmail.fr', 'lea@gmail.com'],
    ['lea@gmail.comcom', 'lea@gmail.com'],
    ['lea@gmail.con', 'lea@gmail.com'],
    ['lea@hotmial.com', 'lea@hotmail.com'],
    ['lea@outlok.fr', 'lea@outlook.fr'],
    ['lea@yahooo.fr', 'lea@yahoo.fr'],
    ['lea@icloud.fr', 'lea@icloud.com'],
    ['Lea@GMIAL.com', 'lea@gmail.com'],
  ])('%s → %s', (tape, attendu) => {
    expect(suggererEmail(tape)).toBe(attendu)
  })

  it.each([
    'lea@gmail.com', 'lea@hotmail.fr', 'lea@live.be', 'lea@ymail.com', 'lea@mail.com', 'lea@googlemail.com',
    'lea@ac-lyon.fr', 'lea@e2e.reviz.test', 'lea@famille.test', 'lea@nordnet.fr', 'pas-une-adresse', '', 'lea@exemple.com',
  ])('rien à proposer pour %s', tape => {
    expect(suggererEmail(tape)).toBeNull()
  })
})

describe('adresseExemple', () => {
  it.each(['lucas@exemple.com', 'lucas@exmenple.com', 'lucas@example.fr', 'parent@exemple.fr'])('%s est un exemple recopié', e => {
    expect(adresseExemple(e)).toBe(true)
  })
  it.each(['lucas@gmail.com', 'lucas@ac-paris.fr', 'lucas'])('%s est une vraie adresse (ou pas une adresse)', e => {
    expect(adresseExemple(e)).toBe(false)
  })
})

describe('boiteMail', () => {
  it('ouvre la messagerie de l’adresse, Gmail sur notre expéditeur, spams compris', () => {
    expect(boiteMail('lea@gmail.com')).toEqual({ nom: 'Gmail', url: expect.stringContaining('in%3Aanywhere+from%3Arevizapp.fr') })
    expect(boiteMail('lea@hotmail.fr').nom).toBe('Outlook')
    expect(boiteMail('lea@orange.fr').nom).toBe('Mail Orange')
  })
  it('rien pour un domaine inconnu', () => {
    expect(boiteMail('lea@ac-lyon.fr')).toBeNull()
    expect(boiteMail('')).toBeNull()
  })
})
