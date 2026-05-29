import { describe, it, expect } from 'vitest'
import {
  parseLevel,
  serializeLevel,
  migrateLegacyClasse,
  isCollege,
  formatLevelLabel,
  needsSpecialites,
} from '../levels'

describe('levels utilities', () => {
  describe('serializeLevel / parseLevel', () => {
    it('roundtrips a structured level', () => {
      const level = { cycle: 'lycee', classe: 'Terminale', specialites: ['Maths', 'NSI'] }
      const serialized = serializeLevel(level)
      expect(parseLevel(serialized)).toEqual(level)
    })

    it('returns empty string for null/invalid level on serialize', () => {
      expect(serializeLevel(null)).toBe('')
      expect(serializeLevel({})).toBe('')
    })

    it('returns null for null/empty on parse', () => {
      expect(parseLevel(null)).toBeNull()
      expect(parseLevel('')).toBeNull()
    })
  })

  describe('migrateLegacyClasse', () => {
    it('migrates short form "3e" to "3ème"', () => {
      expect(migrateLegacyClasse('3e')).toEqual({ cycle: 'college', classe: '3ème' })
    })

    it('returns null for unrecognized strings', () => {
      expect(migrateLegacyClasse('Master 2')).toBeNull()
      expect(migrateLegacyClasse(null)).toBeNull()
    })

    // BUG connu : '3ème' en entrée produit '3èmème' à cause d'un replace('e', 'ème')
    // mal ciblé sur l'accent. À fixer dans un PR séparé.
    it.todo('migrates already-correct "3ème" without doubling the suffix')
  })

  describe('isCollege', () => {
    it('returns true for college level', () => {
      expect(isCollege({ cycle: 'college', classe: '3ème' })).toBe(true)
    })

    it('returns false for non-college levels', () => {
      expect(isCollege({ cycle: 'lycee', classe: 'Terminale' })).toBe(false)
      expect(isCollege(null)).toBe(false)
    })
  })

  describe('formatLevelLabel', () => {
    it('formats lycée with specialites', () => {
      const level = { cycle: 'lycee', classe: 'Terminale', specialites: ['Maths', 'NSI'] }
      expect(formatLevelLabel(level)).toBe('Terminale · Maths, NSI')
    })

    it('returns just classe for college', () => {
      expect(formatLevelLabel({ cycle: 'college', classe: '3ème' })).toBe('3ème')
    })

    it('returns just classe for lycée without specialites', () => {
      expect(formatLevelLabel({ cycle: 'lycee', classe: '2nde' })).toBe('2nde')
    })
  })

  describe('needsSpecialites', () => {
    it('returns true for 1ère and Terminale', () => {
      expect(needsSpecialites({ cycle: 'lycee', classe: '1ère' })).toBe(true)
      expect(needsSpecialites({ cycle: 'lycee', classe: 'Terminale' })).toBe(true)
    })

    it('returns false for 2nde or non-lycée', () => {
      expect(needsSpecialites({ cycle: 'lycee', classe: '2nde' })).toBe(false)
      expect(needsSpecialites({ cycle: 'college', classe: '3ème' })).toBe(false)
    })
  })
})
