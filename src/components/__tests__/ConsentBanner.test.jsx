import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('posthog-js', () => ({
  default: { init: vi.fn(), capture: vi.fn(), opt_out_capturing: vi.fn(), reset: vi.fn(), opt_in_capturing: vi.fn() },
}))

const KEY = 'reviz-analytics-consent'
let ConsentBanner
let svc

async function load({ configured = true } = {}) {
  vi.stubEnv('VITE_POSTHOG_KEY', configured ? 'phc_test' : '')
  vi.resetModules()
  svc = await import('../../services/analyticsService.js')
  ;({ ConsentBanner } = await import('../ConsentBanner.jsx'))
}

function setup(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ConsentBanner />
      <Routes>
        <Route path="*" element={<div>page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

const banner = () => screen.queryByRole('region', { name: /améliorer Réviz/i })

beforeEach(async () => {
  localStorage.clear()
  await load()
})

afterEach(() => {
  cleanup()
  svc._resetAnalyticsForTests()
  vi.unstubAllEnvs()
})

describe('<ConsentBanner />', () => {
  it('s\'affiche à la première visite avec deux boutons de même poids', () => {
    setup()
    expect(banner()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refuser' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accepter' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /en savoir plus/i })).toHaveAttribute('href', '/legal/confidentialite')
  })

  it('« Refuser » enregistre le refus et ferme la bannière', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Refuser' }))
    expect(localStorage.getItem(KEY)).toBe('denied')
    expect(banner()).not.toBeInTheDocument()
  })

  it('« Accepter » enregistre l\'accord et ferme la bannière', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Accepter' }))
    expect(localStorage.getItem(KEY)).toBe('granted')
    expect(banner()).not.toBeInTheDocument()
  })

  it('ne revient pas une fois le choix fait', () => {
    localStorage.setItem(KEY, 'denied')
    setup()
    expect(banner()).not.toBeInTheDocument()
  })

  it('se retire d\'elle-même si le choix est fait ailleurs (Réglages)', () => {
    setup()
    expect(banner()).toBeInTheDocument()
    act(() => { svc.setAnalyticsConsent(false) })
    expect(banner()).not.toBeInTheDocument()
  })

  it('laisse lire les pages légales sans bannière', () => {
    setup('/legal/confidentialite')
    expect(banner()).not.toBeInTheDocument()
  })

  it('n\'existe pas quand la mesure n\'est pas configurée', async () => {
    await load({ configured: false })
    setup()
    expect(banner()).not.toBeInTheDocument()
  })

  it('descend au ras de l\'écran sur les pages sans barre de navigation', () => {
    setup('/welcome')
    expect(banner()).toHaveClass('consent-banner--low')
  })
})
