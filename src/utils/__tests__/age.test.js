import { describe, it, expect } from 'vitest'
import { isUnder15 } from '../levels.js'

describe('isUnder15', () => {
  it('détecte un enfant clairement <15 ans', () => {
    expect(isUnder15('2020-01-01')).toBe(true)
  })

  it('détecte un adulte clairement >15 ans', () => {
    expect(isUnder15('1990-06-15')).toBe(false)
  })

  it('renvoie false pour une valeur absente ou invalide', () => {
    expect(isUnder15(null)).toBe(false)
    expect(isUnder15('')).toBe(false)
    expect(isUnder15('pas-une-date')).toBe(false)
  })
})
