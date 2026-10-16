import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const auth = { current: null }
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth.current }))
vi.mock('../../services/consentService', () => ({
  sendParentalConsent: vi.fn(async () => ({ ok: true })),
  consentErrorMessage: () => 'erreur',
}))
vi.mock('../../hooks/useMediaQuery', () => ({ useIsDesktop: () => false }))

const { default: ConsentPending } = await import('../ConsentPending.jsx')
const { ConsentBanner } = await import('../../components/ConsentBanner.jsx')

function monter(element, chemin = '/consent-pending') {
  return render(
    <MemoryRouter initialEntries={[chemin]}>
      <Routes>
        <Route path="/consent-pending" element={element} />
        <Route path="/" element={<p>Accueil</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const connecte = (consent, consentBlocked = false) => ({
  currentUser: { uid: 'u1', displayName: 'Léa' },
  consentBlocked, consent, refreshGate: vi.fn(async () => {}), logout: vi.fn(),
})

beforeEach(() => { auth.current = null })

describe('Écran de l\'email du parent', () => {
  it('pendant les 15 jours : reste affiché et propose « Plus tard »', () => {
    auth.current = connecte({ status: 'a-fournir', parentEmail: null, joursRestants: 12 })
    monter(<ConsentPending />)
    expect(screen.getByText(/il te reste 12 jours pour la donner/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /plus tard/i }))
    expect(screen.getByText('Accueil')).toBeInTheDocument()
  })

  it('délai écoulé : compte en pause, sans « Plus tard »', () => {
    auth.current = connecte({ status: 'a-demander', parentEmail: null, joursRestants: null }, true)
    monter(<ConsentPending />)
    expect(screen.getByText(/ton compte est en pause/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /plus tard/i })).toBeNull()
  })

  it('email parti, accès ouvert : renvoie vers l\'accueil', () => {
    auth.current = connecte({ status: 'en-attente', parentEmail: 'p@f.fr', joursRestants: 9 })
    monter(<ConsentPending />)
    expect(screen.getByText('Accueil')).toBeInTheDocument()
  })
})

describe('Bandeau de l\'accueil', () => {
  it('compte à rebours avec un lien vers l\'écran parent', () => {
    auth.current = connecte({ status: 'a-fournir', parentEmail: null, joursRestants: 1 })
    render(<MemoryRouter><ConsentBanner /></MemoryRouter>)
    expect(screen.getByText(/plus que 1 jour/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /le donner/i })).toHaveAttribute('href', '/consent-pending')
  })
})
