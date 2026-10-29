import { describe, it, expect } from 'vitest'
import { dayStartUTC, debutPeriode, nextChatUsageState, CHAT_FREE_LIMIT, CHAT_FREE_PERIODE, CHAT_PREMIUM_LIMIT, CHAT_PREMIUM_PERIODE } from '../_chatQuota.js'

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

describe('les plafonds décidés le 29/10', () => {
  it('10 par semaine en gratuit, 50 par jour en Réviz+', () => {
    expect([CHAT_FREE_LIMIT, CHAT_FREE_PERIODE]).toEqual([10, 'semaine'])
    expect([CHAT_PREMIUM_LIMIT, CHAT_PREMIUM_PERIODE]).toEqual([50, 'jour'])
  })

  it('la semaine va du lundi au dimanche (UTC), comme les scans', () => {
    const vendredi = Date.UTC(2026, 6, 3, 10, 0, 0)
    expect(debutPeriode(vendredi, 'semaine')).toBe(Date.UTC(2026, 5, 29)) // lundi 29 juin
    expect(debutPeriode(Date.UTC(2026, 6, 5, 23, 0, 0), 'semaine')).toBe(Date.UTC(2026, 5, 29)) // dimanche
    expect(debutPeriode(Date.UTC(2026, 6, 6, 0, 0, 1), 'semaine')).toBe(Date.UTC(2026, 6, 6)) // lundi suivant
  })
})

describe('nextChatUsageState', () => {
  const now = Date.UTC(2026, 6, 3, 10, 0, 0) // vendredi
  const lundi = debutPeriode(now, 'semaine')
  const today = dayStartUTC(now)

  it('gratuit : premier message de la semaine, autorisé, compteur à 1', () => {
    const s = nextChatUsageState(null, now)
    expect(s).toMatchObject({ allowed: true, used: 1, remaining: CHAT_FREE_LIMIT - 1 })
    expect(s.data).toEqual({ count: 1, debut: lundi, periode: 'semaine' })
  })

  it('gratuit : le compte court toute la semaine, puis bloque', () => {
    expect(nextChatUsageState({ count: 3, debut: lundi, periode: 'semaine' }, now + 2 * 86_400_000).used).toBe(4)
    const bloque = nextChatUsageState({ count: CHAT_FREE_LIMIT, debut: lundi, periode: 'semaine' }, now)
    expect(bloque).toMatchObject({ allowed: false, remaining: 0 })
  })

  it('gratuit : repart de zéro le lundi suivant', () => {
    const s = nextChatUsageState({ count: CHAT_FREE_LIMIT, debut: lundi, periode: 'semaine' }, now + 3 * 86_400_000)
    expect(s).toMatchObject({ allowed: true, used: 1 })
  })

  it('Réviz+ : 50 par jour, et repart de zéro le lendemain', () => {
    expect(nextChatUsageState({ count: 49, debut: today, periode: 'jour' }, now, CHAT_PREMIUM_LIMIT, 'jour').allowed).toBe(true)
    expect(nextChatUsageState({ count: 50, debut: today, periode: 'jour' }, now, CHAT_PREMIUM_LIMIT, 'jour').allowed).toBe(false)
    expect(nextChatUsageState({ count: 50, debut: today, periode: 'jour' }, now + 86_400_000, CHAT_PREMIUM_LIMIT, 'jour').used).toBe(1)
  })

  it('un doc d’avant le 29/10 ({ count, dayStart }, au jour) ne bloque pas la semaine', () => {
    // Un gratuit qui avait déjà 10 messages aujourd'hui, à l'ancien quota : la semaine repart de zéro.
    expect(nextChatUsageState({ count: 10, dayStart: today }, now).used).toBe(1)
    // Un abonné : même jour, même période (jour), le compte continue.
    expect(nextChatUsageState({ count: 7, dayStart: today }, now, CHAT_PREMIUM_LIMIT, 'jour').used).toBe(8)
  })

  it('passer à Réviz+ en cours de semaine repart de zéro sur la journée', () => {
    const s = nextChatUsageState({ count: CHAT_FREE_LIMIT, debut: lundi, periode: 'semaine' }, now, CHAT_PREMIUM_LIMIT, 'jour')
    expect(s).toMatchObject({ allowed: true, used: 1, data: { debut: today, periode: 'jour' } })
  })
})
