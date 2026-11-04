import { describe, it, expect } from 'vitest'
import { SEANCE_ACCUEIL, SOURCE_DECOUVERTE } from '../seanceAccueil'
import { NOMS_FORMATS } from '../../pages/exercices/formats'

describe('séance d’accueil', () => {
  it('3 exercices, trois formats différents, le plus ludique en premier', () => {
    expect(SEANCE_ACCUEIL).toHaveLength(3)
    expect(SEANCE_ACCUEIL.map(e => e.type)).toEqual(['vraifaux', 'intrus', 'qcm'])
    expect(new Set(SEANCE_ACCUEIL.map(e => e.id)).size).toBe(3)
    expect(SOURCE_DECOUVERTE).toBe('decouverte')
  })

  it('chaque exercice a ce que son format et l’écran de fin lisent', () => {
    for (const ex of SEANCE_ACCUEIL) {
      expect(NOMS_FORMATS[ex.type]).toBeTruthy()
      expect(ex.consigne && ex.bulle && ex.pose && ex.explication).toBeTruthy()
      expect(ex.aRetenir.question && ex.aRetenir.bonne).toBeTruthy()
    }
    const [vf, intrus, qcm] = SEANCE_ACCUEIL
    expect(typeof vf.vrai).toBe('boolean')
    expect(vf.titre && vf.affirmation).toBeTruthy()
    expect(intrus.cartes).toHaveLength(4)
    expect(intrus.cartes[intrus.bonne]).toBe(intrus.aRetenir.bonne)
    expect(qcm.choix[qcm.bonne]).toBe(qcm.aRetenir.bonne)
    expect(qcm.choix[qcm.bonne]).toBe(String(7 * 8))
  })
})
