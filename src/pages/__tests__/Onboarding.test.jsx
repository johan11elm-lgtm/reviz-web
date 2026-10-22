// Découverte (handoff du 22/10) : bonjour, deux façons de réviser, on
// commence. La classe est déjà connue (demandée au 1er écran si absente). « Passer » à tout moment ; le dernier écran mène au
// programme ou au scan.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const nav = vi.hoisted(() => vi.fn())
const auth = vi.hoisted(() => ({ level: { cycle: 'college', classe: '3ème' }, setUserLevel: vi.fn() }))
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => nav,
}))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'u1', displayName: 'Léa Martin' },
    getUserLevel: () => auth.level,
    setUserLevel: auth.setUserLevel,
  }),
}))

// Le pantin charge ses calques par le réseau : hors sujet ici.
vi.mock('../../components/Pantin', () => ({ Pantin: () => null }))

const { default: Onboarding } = await import('../Onboarding')

const continuer = () => fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
function allerAuDernierEcran(n = 2) {
  for (let i = 0; i < n; i++) continuer()
}

describe('<Onboarding />', () => {
  beforeEach(() => {
    localStorage.clear()
    nav.mockClear()
    auth.level = { cycle: 'college', classe: '3ème' }
  })

  it('Réviz se présente et salue par le prénom', () => {
    render(<MemoryRouter><Onboarding /></MemoryRouter>)
    expect(screen.getByText("Salut Léa, moi c'est Réviz. Je suis là pour tes révisions.")).toBeInTheDocument()
    expect(screen.getByText(/résumés, flashcards, quiz et cartes mentales/)).toBeInTheDocument()
    expect(screen.getByLabelText('Étape 1 sur 3')).toBeInTheDocument()
  })

  it('la classe est déjà connue : pas de choix de classe', () => {
    render(<MemoryRouter><Onboarding /></MemoryRouter>)
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('profil sans classe : la classe se choisit au premier écran puis s’enregistre', () => {
    auth.level = null
    auth.setUserLevel.mockClear()
    render(<MemoryRouter><Onboarding /></MemoryRouter>)
    continuer()
    expect(screen.getByRole('alert')).toHaveTextContent('Choisis ta classe.')
    fireEvent.click(screen.getByRole('radio', { name: '5e' }))
    continuer()
    expect(auth.setUserLevel).toHaveBeenCalledWith({ cycle: 'college', classe: '5ème' })
    expect(screen.getByText(/Les chapitres de 5e, déjà prêts/)).toBeInTheDocument()
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
    expect(screen.getByText('On commence ? Chaque révision compte pour ton niveau et ta série de jours.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Passer' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Ouvrir mon programme/ }))
    expect(localStorage.getItem('reviz-onboarded-u1')).toBe('1')
    expect(nav).toHaveBeenCalledWith('/programme', { replace: false })
  })

  it('le deuxième écran nomme les chapitres de la classe', () => {
    render(<MemoryRouter><Onboarding /></MemoryRouter>)
    continuer()
    expect(screen.getByText('Ton programme')).toBeInTheDocument()
    expect(screen.getByText(/Les chapitres de 3e, déjà prêts/)).toBeInTheDocument()
    expect(screen.getByText('Scanner une leçon')).toBeInTheDocument()
  })

  it('au lycée : le scan d’abord, le programme de 3ème en second', () => {
    auth.level = { cycle: 'lycee', classe: 'Terminale', specialites: ['Maths'] }
    render(<MemoryRouter><Onboarding /></MemoryRouter>)
    allerAuDernierEcran()
    expect(screen.getByLabelText('Étape 3 sur 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /voir le programme de 3e/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Scanner ma première leçon/ }))
    expect(nav).toHaveBeenCalledWith('/scan', { replace: false })
  })

  it('déjà vu : renvoie à l’accueil sans rien afficher de plus', () => {
    localStorage.setItem('reviz-onboarded-u1', '1')
    render(<MemoryRouter><Onboarding /></MemoryRouter>)
    expect(nav).toHaveBeenCalledWith('/', { replace: true })
  })
})
