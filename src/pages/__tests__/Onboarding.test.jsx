// Onboarding : trois écrans (supports, deux façons de réviser, premier geste),
// « Passer » à tout moment, et le dernier écran mène au programme ou au scan.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const nav = vi.hoisted(() => vi.fn())
const auth = vi.hoisted(() => ({ level: { cycle: 'college', classe: '3ème' } }))
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => nav,
}))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'u1', displayName: 'Léa Martin' },
    getUserLevel: () => auth.level,
  }),
}))

const { default: Onboarding } = await import('../Onboarding')

function allerAuDernierEcran() {
  vi.useFakeTimers()
  fireEvent.click(screen.getByRole('button', { name: /Continuer/ }))
  act(() => { vi.advanceTimersByTime(200) })
  fireEvent.click(screen.getByRole('button', { name: /Continuer/ }))
  act(() => { vi.advanceTimersByTime(200) })
  vi.useRealTimers()
}

describe('<Onboarding />', () => {
  beforeEach(() => {
    localStorage.clear()
    nav.mockClear()
    auth.level = { cycle: 'college', classe: '3ème' }
  })

  it('salue par le prénom, montre les quatre supports et la classe', () => {
    render(<MemoryRouter><Onboarding /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Salut Léa' })).toBeInTheDocument()
    expect(screen.getByText('3ème')).toBeInTheDocument()
    for (const f of ['Résumé', 'Flashcards', 'Carte mentale', 'Quiz']) {
      expect(screen.getByText(f)).toBeInTheDocument()
    }
    expect(screen.getByLabelText('Étape 1 sur 3')).toBeInTheDocument()
    expect(screen.queryByText(/coach IA/)).not.toBeInTheDocument()
  })

  it('« Passer » marque l’onboarding vu et renvoie à l’accueil', () => {
    render(<MemoryRouter><Onboarding /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Passer' }))
    expect(localStorage.getItem('reviz-onboarded-u1')).toBe('1')
    expect(nav).toHaveBeenCalledWith('/', { replace: true })
  })

  it('au collège : le programme de la classe d’abord, le scan ensuite', () => {
    render(<MemoryRouter><Onboarding /></MemoryRouter>)
    allerAuDernierEcran()
    expect(screen.getByRole('heading', { name: 'On commence ?' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Passer' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Ouvrir mon programme/ }))
    expect(localStorage.getItem('reviz-onboarded-u1')).toBe('1')
    expect(nav).toHaveBeenCalledWith('/programme', { replace: false })
  })

  it('le deuxième écran nomme les chapitres de la classe', () => {
    render(<MemoryRouter><Onboarding /></MemoryRouter>)
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: /Continuer/ }))
    act(() => { vi.advanceTimersByTime(200) })
    vi.useRealTimers()
    expect(screen.getByText('Mon programme')).toBeInTheDocument()
    expect(screen.getByText(/Les chapitres de 3ème, déjà prêts/)).toBeInTheDocument()
    expect(screen.getByText('Scanner une leçon')).toBeInTheDocument()
  })

  it('au lycée : le scan d’abord, le programme de 3ème en second', () => {
    auth.level = { cycle: 'lycee', classe: 'Terminale', specialites: ['Maths'] }
    render(<MemoryRouter><Onboarding /></MemoryRouter>)
    allerAuDernierEcran()
    fireEvent.click(screen.getByRole('button', { name: /Scanner ma première leçon/ }))
    expect(nav).toHaveBeenCalledWith('/scan', { replace: false })
    expect(screen.getByRole('button', { name: /Voir le programme de 3ème/ })).toBeInTheDocument()
  })

  it('déjà vu : renvoie à l’accueil sans rien afficher de plus', () => {
    localStorage.setItem('reviz-onboarded-u1', '1')
    render(<MemoryRouter><Onboarding /></MemoryRouter>)
    expect(nav).toHaveBeenCalledWith('/', { replace: true })
  })
})
