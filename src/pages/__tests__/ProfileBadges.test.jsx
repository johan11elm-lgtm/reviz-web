// Profil sur mobile : badges en tuiles, prochain badge à viser, détail au toucher.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const nav = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => nav,
}))
vi.mock('../../hooks/useMediaQuery', () => ({ useIsDesktop: () => false, useMediaQuery: () => false }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: null, displayName: 'Léa' },
    getUserLevel: () => ({ cycle: 'college', classe: '3ème' }),
    setUserLevel: vi.fn(),
    updateDisplayName: vi.fn(),
    isGuest: true,
  }),
}))
vi.mock('firebase/firestore', () => ({
  setDoc: vi.fn(() => Promise.resolve()), deleteDoc: vi.fn(), doc: vi.fn(() => ({})),
  collection: vi.fn(), getDocs: vi.fn(), query: vi.fn(), orderBy: vi.fn(), getDoc: vi.fn(),
}))
vi.mock('../../services/firebaseConfig', () => ({ db: {} }))
vi.mock('../../services/userProfileService', () => ({ getUserProfile: vi.fn(() => Promise.resolve(null)) }))

const { default: Profile } = await import('../Profile')

const now = Date.now(), DAY = 864e5
function seed() {
  localStorage.setItem('reviz-lessons', JSON.stringify([
    { id: 'prog-thales', scannedAt: now, source: 'programme', metadata: { title: 'Thalès', subject: 'Maths' }, flashcardsCount: 3 },
    { id: 'prog-argu', scannedAt: now - DAY, source: 'programme', metadata: { title: "L'argumentation", subject: 'Français' }, flashcardsCount: 2 },
    { id: '1700000000000', scannedAt: now - 2 * DAY, source: 'scan', metadata: { title: 'La photosynthèse', subject: 'SVT' }, flashcardsCount: 0 },
  ]))
  localStorage.setItem('reviz-revisions', JSON.stringify([
    { id: 'r1', lessonId: 'prog-thales', type: 'quiz', revisedAt: now },
    { id: 'r2', lessonId: 'prog-thales', type: 'flashcards', revisedAt: now - DAY },
  ]))
}

describe('<Profile /> — Moi, badges sur téléphone', () => {
  beforeEach(() => { localStorage.clear(); nav.mockClear() })

  it('débutant : Réviz accueille, tout est à faire et le prochain badge est annoncé', () => {
    render(<MemoryRouter><Profile /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: 'Léa' })).toBeInTheDocument()
    expect(screen.getByText(/^0 sur \d+ obtenu$/)).toBeInTheDocument()
    expect(screen.getByText('Prochain badge')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lanceur : 1re leçon ouverte (0 / 1)' })).toBeInTheDocument()
    expect(screen.getByText(/Mode essai/)).toBeInTheDocument()
  })

  it('un badge obtenu se distingue, et le toucher ouvre son détail', () => {
    seed()
    render(<MemoryRouter><Profile /></MemoryRouter>)
    const lanceur = screen.getByRole('button', { name: 'Lanceur : obtenu' })
    expect(lanceur.className).not.toContain('is-verrou')
    fireEvent.click(lanceur)
    const feuille = screen.getByRole('dialog', { name: 'Lanceur' })
    expect(within(feuille).getByText('1re leçon ouverte')).toBeInTheDocument()
    expect(within(feuille).getByText('Obtenu')).toBeInTheDocument()
  })

  it('un badge pas encore obtenu montre sa condition et sa progression', () => {
    seed()
    render(<MemoryRouter><Profile /></MemoryRouter>)
    const etudiant = screen.getByRole('button', { name: 'Étudiant : 5 leçons ouvertes (3 / 5)' })
    expect(etudiant.className).toContain('is-verrou')
    fireEvent.click(etudiant)
    const feuille = screen.getByRole('dialog', { name: 'Étudiant' })
    expect(within(feuille).getByRole('progressbar', { name: 'Étudiant : 3 sur 5' })).toHaveAttribute('aria-valuenow', '3')
    fireEvent.click(within(feuille).getByRole('button', { name: 'Fermer' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
