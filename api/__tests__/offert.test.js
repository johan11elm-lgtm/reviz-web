import { describe, it, expect, vi, beforeEach } from 'vitest'

const getUser = vi.fn()
vi.mock('../_firebaseAdmin.js', () => ({ getAuthAdmin: () => ({ getUser }) }))
const reglage = vi.hoisted(() => ({ offert: true }))
vi.mock('../_lancement.js', async importOriginal => {
  const vrai = await importOriginal()
  return { ...vrai, get LANCEMENT_OFFERT() { return reglage.offert } }
})

const { revizPlusOffertServeur } = await import('../_offert.js')

describe('revizPlusOffertServeur', () => {
  beforeEach(() => { getUser.mockReset() })

  it('pendant le lancement : offert sans interroger Firebase', async () => {
    reglage.offert = true
    expect(await revizPlusOffertServeur('u1')).toBe(true)
    expect(getUser).not.toHaveBeenCalled()
  })

  it('après la bascule : suit la date de création du compte', async () => {
    reglage.offert = false
    vi.useFakeTimers({ now: new Date('2026-10-30T12:00:00+01:00') })
    getUser.mockResolvedValue({ metadata: { creationTime: 'Fri, 02 Oct 2026 10:00:00 GMT' } })
    expect(await revizPlusOffertServeur('fondateur')).toBe(true)
    getUser.mockResolvedValue({ metadata: { creationTime: 'Tue, 27 Oct 2026 10:00:00 GMT' } })
    expect(await revizPlusOffertServeur('nouveau')).toBe(false)
    vi.useRealTimers()
  })

  it('après la bascule : refuse si Firebase échoue', async () => {
    reglage.offert = false
    getUser.mockRejectedValue(new Error('down'))
    expect(await revizPlusOffertServeur('u1')).toBe(false)
  })
})
