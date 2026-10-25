import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { LESSON_TEXT_MAX } from '../../utils/lessonText'

const nav = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => nav,
}))
const auth = vi.hoisted(() => ({ guest: false, plus: false }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ isPremium: false, isGuest: auth.guest, hasRevizPlus: auth.plus, getUserLevel: () => ({ cycle: 'college', classe: '3ème' }) }),
}))
const quota = vi.hoisted(() => ({ statut: null }))
vi.mock('../../services/scanLimitService', () => ({ getScanStatus: () => quota.statut }))
vi.mock('../../services/billingService', () => ({ startCheckout: vi.fn() }))
const ai = vi.hoisted(() => ({ startAnalysis: vi.fn(), startAnalysisFromImage: vi.fn() }))
vi.mock('../../services/aiService', () => ai)
// happy-dom fait 1024 px de large : on choisit explicitement mobile ou ordinateur par test.
const screenMode = vi.hoisted(() => ({ desktop: false }))
vi.mock('../../hooks/useMediaQuery', () => ({ useIsDesktop: () => screenMode.desktop, useMediaQuery: () => screenMode.desktop }))

const { default: Scan } = await import('../Scan')

const renderAt = (path = '/scan') => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/scan" element={<Scan />} /></Routes>
  </MemoryRouter>
)

const LIBRE = { canScan: true, remaining: 2, used: 1, limit: 3, isPremium: false }
const colle = (texte) => {
  fireEvent.click(screen.getByRole('button', { name: /Coller le texte/ }))
  fireEvent.change(screen.getByLabelText('Texte de ta leçon'), { target: { value: texte } })
}

describe('<Scan /> — Scanner une leçon', () => {
  beforeEach(() => {
    localStorage.clear()
    nav.mockReset(); ai.startAnalysis.mockReset(); ai.startAnalysisFromImage.mockReset()
    screenMode.desktop = false
    auth.guest = false; auth.plus = false
    quota.statut = LIBRE
  })

  it('choix : photo, import, texte et le quota de la semaine', () => {
    renderAt()
    expect(screen.getByRole('heading', { name: 'Scanner une leçon' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Prendre une photo/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Importer une photo/ })).toBeInTheDocument()
    expect(screen.getByText('2 scans restants cette semaine')).toBeInTheDocument()
  })

  it('texte trop court : le bouton attend 200 caractères', () => {
    renderAt()
    colle('Une leçon trop courte.')
    expect(screen.getByRole('button', { name: /Analyser ce texte/ })).toBeDisabled()
    expect(screen.getByText(/sur 200/)).toBeInTheDocument()
  })

  it('texte assez long : « Assez long », puis l’analyse part avec le texte tel quel', () => {
    const texte = 'La photosynthèse. '.repeat(15)
    renderAt()
    colle(texte)
    expect(screen.getByText('Assez long')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Analyser ce texte/ }))
    expect(ai.startAnalysis).toHaveBeenCalledWith(texte, expect.anything())
    expect(nav).toHaveBeenCalledWith('/analyse', { replace: true, state: { depuisScan: true } })
  })

  it('texte trop long : prévient, et n’envoie que le début coupé proprement', () => {
    const texte = 'Phrase de leçon. '.repeat(Math.ceil(LESSON_TEXT_MAX / 17) + 50)
    renderAt()
    colle(texte)
    expect(screen.getByText(/j’analyse les 15.000 premiers caractères/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Analyser les 15.000 premiers caractères/ }))
    const envoye = ai.startAnalysis.mock.calls[0][0]
    expect(envoye.length).toBeLessThanOrEqual(LESSON_TEXT_MAX)
    expect(texte.startsWith(envoye.trimEnd().slice(0, 100))).toBe(true)
  })

  it('?mode=texte : le texte collé revient, prêt à corriger', () => {
    localStorage.setItem('reviz-lesson-text', 'Texte à corriger')
    renderAt('/scan?mode=texte')
    expect(screen.getByLabelText('Texte de ta leçon')).toHaveValue('Texte à corriger')
  })

  it('ordinateur : zone de dépôt, texte et conseils côte à côte', () => {
    screenMode.desktop = true
    renderAt()
    expect(screen.getByText('Glisse la photo de ta leçon ici, ou choisis-la')).toBeInTheDocument()
    expect(screen.getByLabelText('Texte de ta leçon')).toBeInTheDocument()
    expect(screen.getByText('Pour un bon scan')).toBeInTheDocument()
    expect(screen.getByText('Cadre droit.')).toBeInTheDocument()
  })

  it('Réviz+ : scans illimités', () => {
    auth.plus = true
    quota.statut = { canScan: true, remaining: Infinity, used: 0, limit: 3, isPremium: true }
    renderAt()
    expect(screen.getByText('Scans illimités')).toBeInTheDocument()
  })

  it('quota atteint : la carte calme remplace le choix', () => {
    quota.statut = { canScan: false, remaining: 0, used: 3, limit: 3, isPremium: false }
    renderAt()
    expect(screen.getByRole('heading', { name: 'Tu as utilisé tes scans de la semaine.' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Réviser mon programme en attendant' }))
    expect(nav).toHaveBeenCalledWith('/programme')
  })

  it('mode essai : le scan demande un compte gratuit', () => {
    auth.guest = true
    renderAt()
    expect(screen.getByRole('heading', { name: 'Garde tes leçons' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte gratuit' }))
    expect(nav).toHaveBeenCalledWith('/inscription')
  })
})
