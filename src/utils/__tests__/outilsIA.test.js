import { describe, it, expect } from 'vitest'
import { momentDeLaJournee, inserer, passageAExpliquer, questionExpliquer } from '../outilsIA'

describe('petites touches de Réviz IA', () => {
  it('le moment de la journée', () => {
    expect(momentDeLaJournee(8)).toBe('ce matin')
    expect(momentDeLaJournee(15)).toBe('cet après-midi')
    expect(momentDeLaJournee(20)).toBe('ce soir')
    expect(momentDeLaJournee(2)).toBe('ce soir')
  })
  it('insère un symbole à la place de la sélection', () => {
    expect(inserer('x2 = 9', 1, 1, '²')).toEqual({ valeur: 'x²2 = 9', curseur: 2 })
    expect(inserer('aire = r', 8, 8, '²')).toEqual({ valeur: 'aire = r²', curseur: 9 })
    expect(inserer('a', undefined, undefined, 'π')).toEqual({ valeur: 'aπ', curseur: 2 })
  })
  it('un passage à expliquer : ni vide, ni un paragraphe entier', () => {
    expect(passageAExpliquer('  proportionnelles ')).toBe('proportionnelles')
    expect(passageAExpliquer('x')).toBeNull()
    expect(passageAExpliquer('a'.repeat(81))).toBeNull()
    expect(questionExpliquer('sécantes')).toBe('Explique-moi « sécantes » plus simplement, avec un exemple.')
  })
})
