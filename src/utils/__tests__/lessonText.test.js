import { describe, it, expect } from 'vitest'
import { LESSON_TEXT_MAX, isLessonTextTooLong, truncateLessonText } from '../lessonText'

describe('lessonText', () => {
  it('la limite client est celle du serveur (api/analyse.js)', () => {
    expect(LESSON_TEXT_MAX).toBe(15000)
  })

  it('isLessonTextTooLong : strictement au-delà de la limite', () => {
    expect(isLessonTextTooLong('a'.repeat(LESSON_TEXT_MAX))).toBe(false)
    expect(isLessonTextTooLong('a'.repeat(LESSON_TEXT_MAX + 1))).toBe(true)
    expect(isLessonTextTooLong(null)).toBe(false)
  })

  it('rend le texte intact quand il tient dans la limite', () => {
    const court = 'Le théorème de Pythagore.'
    expect(truncateLessonText(court)).toBe(court)
    const juste = 'b'.repeat(LESSON_TEXT_MAX)
    expect(truncateLessonText(juste)).toBe(juste)
  })

  it('coupe à la fin d’un paragraphe quand il y en a un assez loin', () => {
    const paragraphe = 'Une phrase de leçon qui se répète. '.repeat(10).trim() + '\n'
    const texte = paragraphe.repeat(60) // ≈ 21 000 caractères
    const coupe = truncateLessonText(texte)
    expect(coupe.length).toBeLessThanOrEqual(LESSON_TEXT_MAX)
    expect(coupe.length).toBeGreaterThanOrEqual(LESSON_TEXT_MAX * 0.8)
    expect(coupe.endsWith('.')).toBe(true)
    expect(texte.startsWith(coupe)).toBe(true)
    // la coupure tombe sur une frontière de paragraphe du texte d'origine
    expect(texte[coupe.length]).toBe('\n')
  })

  it('sinon coupe après une fin de phrase', () => {
    const texte = 'Ceci est une phrase courte. '.repeat(800) // 22 400 caractères, aucun saut de ligne
    const coupe = truncateLessonText(texte)
    expect(coupe.length).toBeLessThanOrEqual(LESSON_TEXT_MAX)
    expect(coupe.endsWith('courte.')).toBe(true)
    expect(texte.startsWith(coupe)).toBe(true)
  })

  it('sinon coupe entre deux mots, jamais au milieu d’un mot', () => {
    const texte = 'motdeleçon '.repeat(2000) // sans ponctuation
    const coupe = truncateLessonText(texte)
    expect(coupe.length).toBeLessThanOrEqual(LESSON_TEXT_MAX)
    expect(coupe.endsWith('motdeleçon')).toBe(true)
    expect(texte[coupe.length]).toBe(' ')
  })

  it('sans aucun espace : coupe net à la limite', () => {
    const texte = 'x'.repeat(LESSON_TEXT_MAX + 500)
    expect(truncateLessonText(texte)).toBe('x'.repeat(LESSON_TEXT_MAX))
  })

  it('ignore une frontière trop tôt dans le texte (perte > 20 %)', () => {
    const texte = 'Début. ' + 'y'.repeat(LESSON_TEXT_MAX + 100)
    const coupe = truncateLessonText(texte)
    expect(coupe.length).toBe(LESSON_TEXT_MAX)
    expect(coupe.startsWith('Début. yyy')).toBe(true)
  })

  it('accepte une limite personnalisée', () => {
    // fenêtre de 14 : l'espace après « trois » (index 13) est dans les 20 % finaux
    expect(truncateLessonText('un deux trois quatre', 14)).toBe('un deux trois')
    // fenêtre de 12 : la seule frontière (index 7) est trop tôt → coupe nette
    expect(truncateLessonText('un deux trois quatre', 12)).toBe('un deux troi')
  })
})
