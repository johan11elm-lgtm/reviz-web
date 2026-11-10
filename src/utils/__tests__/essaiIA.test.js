import { describe, it, expect, beforeEach } from 'vitest'
import { essaiIA, noterEssaiIA, QUESTIONS_SANS_EMAIL } from '../essaiIA'

beforeEach(() => localStorage.clear())

describe('questions d’essai de Réviz IA (mémoire de l’appli)', () => {
  it('rien de noté : tout l’essai est devant lui', () => {
    expect(QUESTIONS_SANS_EMAIL).toBe(3)
    expect(essaiIA('u1')).toEqual({ restant: 3, fini: false })
    expect(essaiIA(undefined)).toEqual({ restant: 3, fini: false })
  })

  it('retient ce que le serveur répond, par élève', () => {
    noterEssaiIA('u1', 2)
    expect(essaiIA('u1')).toEqual({ restant: 2, fini: false })
    expect(essaiIA('u2')).toEqual({ restant: 3, fini: false })
    noterEssaiIA('u1', 0)
    expect(essaiIA('u1')).toEqual({ restant: 0, fini: true })
  })

  it('ignore une valeur qui n’a pas de sens', () => {
    noterEssaiIA('u1', -1)
    noterEssaiIA('u1', 1.5)
    noterEssaiIA(null, 1)
    expect(essaiIA('u1')).toEqual({ restant: 3, fini: false })
    localStorage.setItem('reviz-ia-essai-u1', '"abc"')
    expect(essaiIA('u1')).toEqual({ restant: 3, fini: false })
    localStorage.setItem('reviz-ia-essai-u1', '{')
    expect(essaiIA('u1')).toEqual({ restant: 3, fini: false })
  })
})
