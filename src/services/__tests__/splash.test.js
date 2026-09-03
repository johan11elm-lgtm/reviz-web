import { describe, it, expect, beforeEach, vi } from 'vitest'

const state = vi.hoisted(() => ({ native: false, hide: vi.fn(async () => {}) }))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => state.native } }))
vi.mock('@capacitor/splash-screen', () => ({ SplashScreen: { hide: state.hide } }))

describe('hideSplash', () => {
  beforeEach(() => { vi.resetModules(); state.hide.mockClear() })

  it('web : inerte', async () => {
    state.native = false
    const { hideSplash } = await import('../splash')
    await hideSplash()
    expect(state.hide).not.toHaveBeenCalled()
  })

  it('natif : masque en fondu, une seule fois', async () => {
    state.native = true
    const { hideSplash } = await import('../splash')
    await hideSplash()
    await hideSplash()
    expect(state.hide).toHaveBeenCalledTimes(1)
    expect(state.hide).toHaveBeenCalledWith({ fadeOutDuration: 250 })
  })

  it('natif : plugin en échec → aucune exception', async () => {
    state.native = true
    state.hide.mockRejectedValueOnce(new Error('boom'))
    const { hideSplash } = await import('../splash')
    await expect(hideSplash()).resolves.toBeUndefined()
  })
})
