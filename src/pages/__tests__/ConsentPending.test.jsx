import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

const auth = { current: null }
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth.current }))
vi.mock('../../services/consentService', () => ({
  sendParentalConsent: vi.fn(async () => ({ ok: true })),
  consentErrorMessage: () => 'erreur',
  lienPourParent: vi.fn(async () => ({ ok: true, lien: 'https://app.revizapp.fr/api/approve-consent?uid=u1&e=1&s=x' })),
  messagePourParent: () => 'Coucou',
}))
vi.mock('../../services/statsService', () => ({ track: vi.fn() }))
vi.mock('../../services/mesure', () => ({ mesurer: vi.fn() }))
vi.mock('../../hooks/useMediaQuery', () => ({ useIsDesktop: () => false }))

const { default: ConsentPending } = await import('../ConsentPending.jsx')
const { ConsentBanner } = await import('../../components/ConsentBanner.jsx')

function SuiteConnexion() {
  const { search } = useLocation()
  return <p>Connexion, puis {new URLSearchParams(search).get('next')}</p>
}

function monter(element, chemin = '/consent-pending') {
  return render(
    <MemoryRouter initialEntries={[chemin]}>
      <Routes>
        <Route path="/consent-pending" element={element} />
        <Route path="/" element={<p>Accueil</p>} />
        <Route path="/connexion" element={<SuiteConnexion />} />
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
    // Dans le texte de la carte et sous « Plus tard ».
    expect(screen.getAllByText(/il te reste 12 jours/i)).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: /plus tard/i }))
    expect(screen.getByText('Accueil')).toBeInTheDocument()
  })

  it('pas l’adresse en tête : le lien part par message, puis « Continuer à réviser »', async () => {
    const partage = vi.fn(async () => {})
    Object.defineProperty(navigator, 'share', { value: partage, configurable: true, writable: true })
    try {
      auth.current = connecte({ status: 'a-fournir', parentEmail: null, joursRestants: 12 })
      monter(<ConsentPending />)
      fireEvent.click(screen.getByRole('button', { name: /Pas son adresse \? Envoie-lui un lien/ }))
      await waitFor(() => expect(partage).toHaveBeenCalledWith({ text: 'Coucou', url: expect.stringContaining('approve-consent?uid=u1') }))
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Ton parent n’a plus qu’à ouvrir le lien'))
      // Le lien est parti : plus de « Plus tard », on continue.
      expect(screen.queryByRole('button', { name: /plus tard/i })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Continuer à réviser' }))
      expect(screen.getByText('Accueil')).toBeInTheDocument()
    } finally { delete navigator.share }
  })

  it('compte en pause : le lien part, puis « vérifier » quand le parent a répondu', async () => {
    const partage = vi.fn(async () => {})
    Object.defineProperty(navigator, 'share', { value: partage, configurable: true, writable: true })
    try {
      auth.current = connecte({ status: 'a-demander', parentEmail: null, joursRestants: null }, true)
      monter(<ConsentPending />)
      fireEvent.click(screen.getByRole('button', { name: /Pas son adresse \? Envoie-lui un lien/ }))
      await waitFor(() => expect(partage).toHaveBeenCalled())
      const verifier = await screen.findByRole('button', { name: /Il a accepté : vérifier/ })
      fireEvent.click(verifier)
      await waitFor(() => expect(auth.current.refreshGate).toHaveBeenCalled())
      expect(screen.queryByRole('button', { name: 'Continuer à réviser' })).toBeNull()
    } finally { delete navigator.share }
  })

  it('délai écoulé : compte en pause, sans « Plus tard »', () => {
    auth.current = connecte({ status: 'a-demander', parentEmail: null, joursRestants: null }, true)
    monter(<ConsentPending />)
    // La phrase est dans la bulle de Réviz (texte lu + lettres tapées).
    expect(screen.getAllByText(/ton compte est en pause/i).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /plus tard/i })).toBeNull()
  })

  it('lien du rappel ouvert sans session : la connexion, puis retour sur cet écran', () => {
    auth.current = { currentUser: null, consentBlocked: false, consent: null, refreshGate: vi.fn(), logout: vi.fn() }
    monter(<ConsentPending />, '/consent-pending?via=rappel')
    expect(screen.getByText('Connexion, puis /consent-pending?via=rappel')).toBeInTheDocument()
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
    expect(screen.getByText(/montre tes révisions à un parent/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /le faire/i })).toHaveAttribute('href', '/consent-pending')
  })
})
