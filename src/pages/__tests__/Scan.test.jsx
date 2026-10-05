import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { LESSON_TEXT_MAX } from '../../utils/lessonText'

const nav = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => nav,
}))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ isPremium: false, getUserLevel: () => ({ cycle: 'college', classe: '3ème' }) }),
}))
vi.mock('../../services/scanLimitService', () => ({
  getScanStatus: () => ({ canScan: true, remaining: 5, used: 0, limit: 5, isPremium: false }),
}))
vi.mock('../../services/billingService', () => ({ startCheckout: vi.fn() }))
const ai = vi.hoisted(() => ({ startAnalysis: vi.fn(), startAnalysisFromImage: vi.fn() }))
vi.mock('../../services/aiService', () => ai)

const { default: Scan } = await import('../Scan')

const renderAt = (path = '/scan') => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/scan" element={<Scan />} /></Routes>
  </MemoryRouter>
)

const colle = (texte) => {
  fireEvent.click(screen.getByRole('tab', { name: /Texte/ }))
  fireEvent.change(screen.getByPlaceholderText('Colle le texte de ta leçon…'), { target: { value: texte } })
}

describe('<Scan /> — mode texte et limite de longueur', () => {
  beforeEach(() => { localStorage.clear(); nav.mockClear(); ai.startAnalysis.mockClear() })

  it('texte court : compteur sur 200 et envoi tel quel', () => {
    renderAt()
    const texte = 'Le théorème de Pythagore relie les côtés. '.repeat(8).trim()
    colle(texte)
    expect(screen.getByText(`${texte.length} / 200 caractères`)).toBeInTheDocument()
    expect(screen.queryByText(/Ta leçon est longue/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Analyser' }))
    expect(ai.startAnalysis).toHaveBeenCalledWith(texte, expect.objectContaining({ cycle: 'college' }))
    expect(localStorage.getItem('reviz-lesson-text')).toBe(texte)
    expect(nav).toHaveBeenCalledWith('/analyse')
  })

  it('texte trop long : prévient, et n’envoie que le début coupé proprement', () => {
    renderAt()
    const texte = 'Une phrase de cours qui se répète encore. '.repeat(500) // ≈ 21 500 caractères
    colle(texte)
    expect(screen.getByText(/caractères max/)).toBeInTheDocument()
    expect(screen.getByText(/analysera les 15.000 premiers caractères/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Analyser les 15.000 premiers caractères/ }))
    const envoye = ai.startAnalysis.mock.calls[0][0]
    expect(envoye.length).toBeLessThanOrEqual(LESSON_TEXT_MAX)
    expect(envoye.length).toBeGreaterThan(LESSON_TEXT_MAX * 0.8)
    expect(envoye.endsWith('encore.')).toBe(true)
    expect(texte.startsWith(envoye)).toBe(true)
    expect(localStorage.getItem('reviz-lesson-text')).toBe(envoye)
    expect(nav).toHaveBeenCalledWith('/analyse')
  })

  it('?mode=texte : ouvre l’onglet Texte avec le texte collé restauré', () => {
    localStorage.setItem('reviz-lesson-text', 'Texte à corriger')
    renderAt('/scan?mode=texte')
    expect(screen.getByRole('tab', { name: /Texte/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByPlaceholderText('Colle le texte de ta leçon…')).toHaveValue('Texte à corriger')
  })

  it('sans paramètre : onglet Photo, textarea vide même si un texte traîne en stockage', () => {
    localStorage.setItem('reviz-lesson-text', 'Ancienne leçon')
    renderAt()
    expect(screen.getByRole('tab', { name: /Photo/ })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('tab', { name: /Texte/ }))
    expect(screen.getByPlaceholderText('Colle le texte de ta leçon…')).toHaveValue('')
  })
})
