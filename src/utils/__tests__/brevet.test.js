import { describe, it, expect } from 'vitest'
import { controleContinu, moyenneEpreuves, mentionBrevet, noteFinale, epreuvesNecessaires, formatNote } from '../brevet'

describe('controleContinu', () => {
  it('fait la moyenne des moyennes annuelles, cases vides ignorées', () => {
    expect(controleContinu([12, 14, null, 10])).toBe(12)
    expect(controleContinu([])).toBeNull()
  })
  it('ajoute les points au-dessus de 10 du facultatif, sans dépasser 20', () => {
    expect(controleContinu([12, 12, 12, 12], 16)).toBe(13.5) // (48 + 6) / 4
    expect(controleContinu([12, 12], 8)).toBe(12) // pas de points sous 10
    expect(controleContinu([19.5, 19.5], 20)).toBe(20)
  })
})

describe('moyenneEpreuves', () => {
  it('pondère par les coefficients officiels (total 10)', () => {
    // 2×10 + 2×16 + 1,5×12 + 0,5×20 + 2×8 + 2×14 = 124 → 12,4
    expect(moyenneEpreuves({ francais: 10, maths: 16, histoireGeo: 12, emc: 20, sciences: 8, oral: 14 })).toBeCloseTo(12.4)
  })
  it('null tant qu’une épreuve manque', () => {
    expect(moyenneEpreuves({ francais: 10 })).toBeNull()
  })
})

describe('noteFinale et mentions', () => {
  it('40 % contrôle continu, 60 % épreuves', () => {
    expect(noteFinale(15, 10)).toBe(12)
  })
  it('donne la mention', () => {
    expect(mentionBrevet(9.99)).toBeNull()
    expect(mentionBrevet(10).label).toBe('Admis')
    expect(mentionBrevet(13.9).label).toBe('Assez bien')
    expect(mentionBrevet(16).label).toBe('Très bien')
    expect(mentionBrevet(18.2).label).toBe('Très bien, félicitations du jury')
  })
})

describe('epreuvesNecessaires', () => {
  it('ce qu’il faut aux épreuves pour un seuil', () => {
    expect(epreuvesNecessaires(13, 10)).toBeCloseTo(8)
    expect(epreuvesNecessaires(20, 10)).toBeCloseTo(3.33, 2) // (10 - 8) / 0,6
    expect(epreuvesNecessaires(5, 18)).toBeNull() // (18 - 2) / 0,6 > 20
    expect(epreuvesNecessaires(20, 6)).toBe(0)
  })
  it('formate à la française', () => {
    expect(formatNote(12.4)).toBe('12,4')
    expect(formatNote(8)).toBe('8')
  })
})
