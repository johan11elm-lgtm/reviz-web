import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// PostHog est mocké : on vérifie qu'il n'est chargé/initialisé QUE sous consentement.
const posthogMock = {
  init: vi.fn(),
  capture: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  reset: vi.fn(),
}
vi.mock('posthog-js', () => ({ default: posthogMock }))

let svc
const KEY = 'reviz-analytics-consent'

async function load({ configured = true } = {}) {
  vi.stubEnv('VITE_POSTHOG_KEY', configured ? 'phc_test' : '')
  vi.resetModules()
  svc = await import('../analyticsService.js')
}

beforeEach(async () => {
  localStorage.clear()
  Object.values(posthogMock).forEach(fn => fn.mockClear())
  await load()
})

afterEach(() => {
  svc._resetAnalyticsForTests()
  vi.unstubAllEnvs()
})

describe('consentement', () => {
  it('vaut null tant que rien n\'est enregistré, et la bannière est due', () => {
    expect(svc.getAnalyticsConsent()).toBeNull()
    expect(svc.hasAnalyticsConsent()).toBe(false)
    expect(svc.needsAnalyticsChoice()).toBe(true)
  })

  it('ignore une valeur inconnue dans le stockage', () => {
    localStorage.setItem(KEY, 'peut-etre')
    expect(svc.getAnalyticsConsent()).toBeNull()
    expect(svc.needsAnalyticsChoice()).toBe(true)
  })

  it('enregistre le refus et ne réclame plus de choix', () => {
    svc.setAnalyticsConsent(false)
    expect(localStorage.getItem(KEY)).toBe('denied')
    expect(svc.needsAnalyticsChoice()).toBe(false)
    expect(posthogMock.init).not.toHaveBeenCalled()
  })

  it('prévient les abonnés et permet de se désabonner', () => {
    const cb = vi.fn()
    const off = svc.onAnalyticsConsentChange(cb)
    svc.setAnalyticsConsent(false)
    expect(cb).toHaveBeenCalledWith('denied')
    off()
    svc.setAnalyticsConsent(true)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('sans clé PostHog configurée : jamais de bannière, jamais de chargement', async () => {
    await load({ configured: false })
    expect(svc.needsAnalyticsChoice()).toBe(false)
    svc.setAnalyticsConsent(true)
    expect(await svc.initAnalytics()).toBeNull()
    expect(posthogMock.init).not.toHaveBeenCalled()
  })
})

describe('initAnalytics', () => {
  it('ne charge rien sans consentement', async () => {
    expect(await svc.initAnalytics()).toBeNull()
    expect(posthogMock.init).not.toHaveBeenCalled()
  })

  it('initialise PostHog une seule fois quand c\'est accepté, en mode minimal', async () => {
    svc.setAnalyticsConsent(true)
    const ph = await svc.initAnalytics()
    await svc.initAnalytics()
    expect(ph).toBe(posthogMock)
    expect(posthogMock.init).toHaveBeenCalledTimes(1)
    const [key, opts] = posthogMock.init.mock.calls[0]
    expect(key).toBe('phc_test')
    expect(opts).toMatchObject({
      api_host: 'https://eu.i.posthog.com',
      autocapture: false,
      disable_session_recording: true,
      persistence: 'localStorage',
      ip: false,
      capture_pageview: 'history_change',
    })
  })

  it('n\'initialise pas si le consentement est retiré pendant le chargement', async () => {
    svc.setAnalyticsConsent(true)
    const p = svc.initAnalytics()
    localStorage.setItem(KEY, 'denied')
    expect(await p).toBeNull()
    expect(posthogMock.init).not.toHaveBeenCalled()
  })
})

describe('retrait et événements', () => {
  it('le retrait coupe la capture et purge l\'identifiant', async () => {
    svc.setAnalyticsConsent(true)
    await svc.initAnalytics()
    svc.setAnalyticsConsent(false)
    expect(posthogMock.opt_out_capturing).toHaveBeenCalledTimes(1)
    expect(posthogMock.reset).toHaveBeenCalledTimes(1)
    svc.trackEvent('scan_done')
    expect(posthogMock.capture).not.toHaveBeenCalled()
  })

  it('un nouvel accord dans la même session réactive sans recharger', async () => {
    svc.setAnalyticsConsent(true)
    await svc.initAnalytics()
    svc.setAnalyticsConsent(false)
    svc.setAnalyticsConsent(true)
    await svc.initAnalytics()
    expect(posthogMock.init).toHaveBeenCalledTimes(1)
    expect(posthogMock.opt_in_capturing).toHaveBeenCalled()
  })

  it('trackEvent est un no-op sans PostHog chargé, et capture avec', async () => {
    svc.trackEvent('scan_done', { format: 'quiz' })
    expect(posthogMock.capture).not.toHaveBeenCalled()
    svc.setAnalyticsConsent(true)
    await svc.initAnalytics()
    svc.trackEvent('scan_done', { format: 'quiz' })
    expect(posthogMock.capture).toHaveBeenCalledWith('scan_done', { format: 'quiz' })
  })
})
