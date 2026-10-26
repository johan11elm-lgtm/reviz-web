import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const nav = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => nav,
}))
const authState = vi.hoisted(() => ({ isGuest: false }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ isGuest: authState.isGuest, getUserLevel: () => ({ cycle: 'college', classe: '4ème' }) }),
}))
vi.mock('firebase/firestore', () => ({
  setDoc: vi.fn(() => Promise.resolve()), deleteDoc: vi.fn(() => Promise.resolve()), doc: vi.fn(() => ({})),
  collection: vi.fn(), getDocs: vi.fn(), query: vi.fn(), orderBy: vi.fn(),
}))
vi.mock('../../services/firebaseConfig', () => ({ db: {}, auth: {} }))
vi.mock('../../services/scanLimitService', () => ({ getScanStatus: () => ({ canScan: true, remaining: 2, used: 3, limit: 5 }) }))

const { default: Cours } = await import('../Cours')

const DAY = 86400000
const L = (id, subject, title, jours, fc = 4, source = 'scan') => ({
  id, source, scannedAt: Date.now() - jours * DAY, metadata: { title, subject }, flashcardsCount: fc, quizCount: 3,
  aiData: { metadata: { title, subject }, flashcards: [], quiz: [] },
})
const renderPage = () => render(<MemoryRouter><Cours /></MemoryRouter>)

beforeEach(() => {
  localStorage.clear()
  nav.mockReset()
  authState.isGuest = false
  localStorage.setItem('reviz-lessons', JSON.stringify([
    L('a', 'Maths', 'Puissances et notation scientifique', 1),
    L('b', 'Histoire-géo', 'La Révolution française, 1789-1799', 3),
    L('c', 'Maths', 'Théorème de Pythagore', 9),
    L('p', 'Maths', 'Chapitre du programme', 0, 4, 'programme'),
  ]))
})

describe('<Cours /> — Mes leçons scannées', () => {
  it('liste les leçons scannées par matière, sans les chapitres du programme', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: /^Mes leçons/ })).toBeInTheDocument()
    expect(screen.getByText('3 leçons · 2 matières')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Maths' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Histoire-géo' })).toBeInTheDocument()
    expect(screen.queryByText('Chapitre du programme')).not.toBeInTheDocument()
    expect(screen.getAllByText('À découvrir').length).toBe(4) // 3 leçons + « À reprendre »
  })

  it('montre le scan et son quota, et ouvre le scan', () => {
    renderPage()
    expect(screen.getByText('2 scans restants cette semaine')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Scanner une leçon/ }))
    expect(nav).toHaveBeenCalledWith('/scan')
  })

  it('la recherche ignore les accents et surligne le passage trouvé', () => {
    renderPage()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Chercher une leçon' }), { target: { value: 'revo' } })
    expect(screen.getByText('1 résultat pour « revo »')).toBeInTheDocument()
    expect(screen.getByText('Révo').tagName).toBe('MARK')
    expect(screen.queryByText('Théorème de Pythagore')).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Chercher une leçon' }), { target: { value: 'zzz' } })
    expect(screen.getByText('Aucune leçon ne correspond.')).toBeInTheDocument()
  })

  it('filtrer par matière', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /^Histoire-géo/, pressed: false }))
    expect(screen.queryByText('Théorème de Pythagore')).not.toBeInTheDocument()
    expect(screen.getAllByText(/La Révolution française/).length).toBeGreaterThan(0)
  })

  it('supprimer demande confirmation, puis retire la leçon', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Options de Théorème de Pythagore' }))
    fireEvent.click(screen.getByRole('button', { name: /Supprimer la leçon/ }))
    const dialogue = screen.getByRole('dialog')
    expect(within(dialogue).getByText('« Théorème de Pythagore »')).toBeInTheDocument()
    fireEvent.click(within(dialogue).getByRole('button', { name: 'Supprimer' }))
    expect(screen.queryByText('Théorème de Pythagore')).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('reviz-lessons')).map(l => l.id)).not.toContain('c')
  })

  it('reprendre ouvre la dernière leçon scannée', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Reprendre/ }))
    expect(localStorage.getItem('reviz-current-lesson-id')).toBe('a')
    expect(nav).toHaveBeenCalledWith('/resume')
  })

  it('vide : Réviz explique et montre ce qu’il prépare', async () => {
    localStorage.setItem('reviz-lessons', '[]')
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Ce que Réviz prépare' })).toBeInTheDocument()
  })

  it('mode essai : le scan demande un compte gratuit', () => {
    authState.isGuest = true
    localStorage.setItem('reviz-lessons', '[]')
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte gratuit' }))
    expect(nav).toHaveBeenCalledWith('/inscription')
  })
})
