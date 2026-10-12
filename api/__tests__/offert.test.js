import { describe, it, expect, vi } from 'vitest'

const reglage = vi.hoisted(() => ({ offert: true }))
vi.mock('../_lancement.js', async importOriginal => ({
  ...(await importOriginal()),
  lancementOffert: () => reglage.offert,
}))

const { revizPlusOffertServeur } = await import('../_offert.js')

describe('revizPlusOffertServeur', () => {
  it('suit la règle du lancement à chaque appel', async () => {
    reglage.offert = true
    expect(await revizPlusOffertServeur()).toBe(true)
    reglage.offert = false
    expect(await revizPlusOffertServeur()).toBe(false)
  })
})
