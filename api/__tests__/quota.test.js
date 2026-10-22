import { describe, it, expect } from 'vitest'
import { weekStartUTC, nextUsageState, FREE_LIMIT, SCANS_SANS_EMAIL } from '../_quota.js'

describe('weekStartUTC', () => {
  it('renvoie le lundi 00:00 UTC de la semaine', () => {
    // mercredi 2026-05-27 15:00 UTC
    const ws = weekStartUTC(Date.UTC(2026, 4, 27, 15, 0, 0))
    expect(new Date(ws).getUTCDay()).toBe(1) // lundi
    expect(ws).toBe(Date.UTC(2026, 4, 25, 0, 0, 0))
  })

  it('rattache le dimanche à la semaine qui commence le lundi précédent', () => {
    const ws = weekStartUTC(Date.UTC(2026, 4, 31, 12, 0, 0)) // dimanche 31 mai
    expect(ws).toBe(Date.UTC(2026, 4, 25, 0, 0, 0))
  })
})

describe('nextUsageState', () => {
  const now = Date.UTC(2026, 4, 27, 12, 0, 0)
  const ws = weekStartUTC(now)

  it('démarre à 1 quand il n’y a pas d’état', () => {
    const s = nextUsageState(null, now)
    expect(s.allowed).toBe(true)
    expect(s.used).toBe(1)
    expect(s.remaining).toBe(FREE_LIMIT - 1)
    expect(s.data).toEqual({ count: 1, weekStart: ws })
  })

  it('réinitialise le compteur sur une nouvelle semaine', () => {
    const old = { count: FREE_LIMIT, weekStart: ws - 7 * 24 * 3600 * 1000 }
    const s = nextUsageState(old, now)
    expect(s.allowed).toBe(true)
    expect(s.used).toBe(1)
  })

  it('incrémente dans la même semaine', () => {
    const s = nextUsageState({ count: 2, weekStart: ws }, now)
    expect(s.used).toBe(3)
    expect(s.remaining).toBe(FREE_LIMIT - 3)
  })

  it('bloque à la limite sans incrémenter', () => {
    const s = nextUsageState({ count: FREE_LIMIT, weekStart: ws }, now)
    expect(s.allowed).toBe(false)
    expect(s.remaining).toBe(0)
    expect(s.data.count).toBe(FREE_LIMIT)
  })
})

describe('nextUsageState — scan d’essai sans email', () => {
  const now = Date.UTC(2026, 4, 27, 12, 0, 0)
  const ws = weekStartUTC(now)

  it('laisse passer le premier scan et le compte à part', () => {
    const s = nextUsageState(null, now, FREE_LIMIT, { sansEmail: true })
    expect(s.allowed).toBe(true)
    expect(s.data).toEqual({ count: 1, weekStart: ws, sansEmail: 1 })
  })

  it('refuse ensuite, marqué sansEmail, même une autre semaine', () => {
    const old = { count: 1, weekStart: ws - 7 * 24 * 3600 * 1000, sansEmail: SCANS_SANS_EMAIL }
    const s = nextUsageState(old, now, FREE_LIMIT, { sansEmail: true })
    expect(s.allowed).toBe(false)
    expect(s.sansEmail).toBe(true)
  })

  it('n’entame pas le scan d’essai pour un compte vérifié', () => {
    const s = nextUsageState({ count: 1, weekStart: ws, sansEmail: 1 }, now)
    expect(s.allowed).toBe(true)
    expect(s.data).toEqual({ count: 2, weekStart: ws })
  })
})
