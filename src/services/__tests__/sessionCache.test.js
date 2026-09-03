import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  readSessionCache, writeSessionCache, clearSessionCache, userFromSessionCache, MAX_AGE_MS,
} from '../sessionCache'

const user = {
  uid: 'u1', displayName: 'Johan', email: 'j@example.com', emailVerified: true,
  providerData: [{ providerId: 'password' }, { providerId: 'google.com' }, { nope: 1 }],
}

describe('sessionCache', () => {
  beforeEach(() => localStorage.clear())

  it('aller-retour : identité + gate, sans champ superflu', () => {
    writeSessionCache(user, { isPremium: true, consentBlocked: false, needsProfileSetup: false }, 1000)
    expect(readSessionCache(2000)).toEqual({
      uid: 'u1', displayName: 'Johan', email: 'j@example.com', emailVerified: true,
      providerIds: ['password', 'google.com'],
      isPremium: true, consentBlocked: false, needsProfileSetup: false,
    })
    expect(JSON.parse(localStorage.getItem('reviz-session'))).not.toHaveProperty('photoURL')
  })

  it('absent, corrompu, mauvaise version ou sans uid → null', () => {
    expect(readSessionCache()).toBeNull()
    localStorage.setItem('reviz-session', '{oops')
    expect(readSessionCache()).toBeNull()
    localStorage.setItem('reviz-session', JSON.stringify({ v: 99, uid: 'u1', savedAt: Date.now() }))
    expect(readSessionCache()).toBeNull()
    localStorage.setItem('reviz-session', JSON.stringify({ v: 1, uid: '', savedAt: Date.now() }))
    expect(readSessionCache()).toBeNull()
  })

  it('périmé au-delà de MAX_AGE_MS → null (démarrage classique)', () => {
    writeSessionCache(user, {}, 0)
    expect(readSessionCache(MAX_AGE_MS - 1)).not.toBeNull()
    expect(readSessionCache(MAX_AGE_MS + 1)).toBeNull()
  })

  it('valeurs de gate non booléennes ramenées à false', () => {
    writeSessionCache(user, { isPremium: 'yes', consentBlocked: 1 })
    const c = readSessionCache()
    expect(c.isPremium).toBe(false)
    expect(c.consentBlocked).toBe(false)
  })

  it('utilisateur sans uid ignoré ; clear efface', () => {
    writeSessionCache({ displayName: 'x' })
    expect(localStorage.getItem('reviz-session')).toBeNull()
    writeSessionCache(user)
    clearSessionCache()
    expect(readSessionCache()).toBeNull()
  })

  it('localStorage indisponible : aucune exception', () => {
    const real = window.localStorage
    const broken = { getItem() { throw new Error('sec') }, setItem() { throw new Error('quota') }, removeItem() { throw new Error('sec') } }
    Object.defineProperty(window, 'localStorage', { value: broken, configurable: true })
    try {
      expect(() => writeSessionCache(user)).not.toThrow()
      expect(readSessionCache()).toBeNull()
      expect(() => clearSessionCache()).not.toThrow()
    } finally {
      Object.defineProperty(window, 'localStorage', { value: real, configurable: true })
    }
  })

  describe('userFromSessionCache', () => {
    it('expose la surface lue par les pages', () => {
      writeSessionCache(user, {})
      const u = userFromSessionCache(readSessionCache(), {})
      expect(u.uid).toBe('u1')
      expect(u.displayName).toBe('Johan')
      expect(u.email).toBe('j@example.com')
      expect(u.emailVerified).toBe(true)
      expect(u.providerData[0].providerId).toBe('password')
      expect(u.fromCache).toBe(true)
    })

    it('getIdToken / reload attendent la confirmation Firebase puis délèguent', async () => {
      writeSessionCache(user, {})
      const real = { getIdToken: vi.fn(async () => 'tok'), reload: vi.fn(async () => {}) }
      const auth = { currentUser: null, authStateReady: vi.fn(async () => { auth.currentUser = real }) }
      const u = userFromSessionCache(readSessionCache(), auth)
      await expect(u.getIdToken(true)).resolves.toBe('tok')
      expect(auth.authStateReady).toHaveBeenCalled()
      expect(real.getIdToken).toHaveBeenCalledWith(true)
      await u.reload()
      expect(real.reload).toHaveBeenCalled()
    })

    it('session finalement invalide : getIdToken rend null (comme currentUser?.getIdToken())', async () => {
      writeSessionCache(user, {})
      const auth = { currentUser: null, authStateReady: vi.fn(async () => {}) }
      const u = userFromSessionCache(readSessionCache(), auth)
      await expect(u.getIdToken()).resolves.toBeNull()
    })
  })
})
