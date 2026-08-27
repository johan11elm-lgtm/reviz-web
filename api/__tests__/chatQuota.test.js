import { describe, it, expect } from 'vitest'
import { dayStartUTC, nextChatUsageState, CHAT_FREE_LIMIT, CHAT_PREMIUM_LIMIT } from '../_chatQuota.js'

describe('dayStartUTC', () => {
  it('retourne minuit UTC du jour courant', () => {
    const ts = Date.UTC(2026, 6, 3, 15, 42, 7) // vendredi 3 juillet 2026, 15h42 UTC
    expect(dayStartUTC(ts)).toBe(Date.UTC(2026, 6, 3, 0, 0, 0))
  })

  it('est stable sur toute la journée et change au jour suivant', () => {
    const morning = Date.UTC(2026, 6, 3, 0, 0, 1)
    const night = Date.UTC(2026, 6, 3, 23, 59, 59)
    const tomorrow = Date.UTC(2026, 6, 4, 0, 0, 0)
    expect(dayStartUTC(morning)).toBe(dayStartUTC(night))
    expect(dayStartUTC(tomorrow)).not.toBe(dayStartUTC(night))
  })
})

describe('nextChatUsageState', () => {
  const now = Date.UTC(2026, 6, 3, 10, 0, 0)
  const today = dayStartUTC(now)

  it('premier message du jour : autorisé, compteur à 1', () => {
    const s = nextChatUsageState(null, now)
    expect(s.allowed).toBe(true)
    expect(s.used).toBe(1)
    expect(s.remaining).toBe(CHAT_FREE_LIMIT - 1)
    expect(s.data).toEqual({ count: 1, dayStart: today })
  })

  it('incrémente dans la même journée', () => {
    const s = nextChatUsageState({ count: 3, dayStart: today }, now)
    expect(s.allowed).toBe(true)
    expect(s.used).toBe(4)
  })

  it('bloque une fois la limite atteinte', () => {
    const s = nextChatUsageState({ count: CHAT_FREE_LIMIT, dayStart: today }, now)
    expect(s.allowed).toBe(false)
    expect(s.remaining).toBe(0)
  })

  it('repart de zéro un nouveau jour', () => {
    const yesterday = today - 86400000
    const s = nextChatUsageState({ count: CHAT_FREE_LIMIT, dayStart: yesterday }, now)
    expect(s.allowed).toBe(true)
    expect(s.used).toBe(1)
  })

  it('respecte la limite premium passée en paramètre', () => {
    const s = nextChatUsageState({ count: CHAT_FREE_LIMIT + 5, dayStart: today }, now, CHAT_PREMIUM_LIMIT)
    expect(s.allowed).toBe(true)
    const blocked = nextChatUsageState({ count: CHAT_PREMIUM_LIMIT, dayStart: today }, now, CHAT_PREMIUM_LIMIT)
    expect(blocked.allowed).toBe(false)
  })
})
