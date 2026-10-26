import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const nav = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => nav,
}))
const authState = vi.hoisted(() => ({ level: { cycle: 'college', classe: '3ème' }, isGuest: false }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ getUserLevel: () => authState.level, isGuest: authState.isGuest }),
}))
vi.mock('firebase/firestore', () => ({
  setDoc: vi.fn(() => Promise.resolve()), deleteDoc: vi.fn(), doc: vi.fn(() => ({})),
  collection: vi.fn(), getDocs: vi.fn(), query: vi.fn(), orderBy: vi.fn(),
}))
vi.mock('../../services/firebaseConfig', () => ({ db: {} }))
vi.mock('../../services/scanLimitService', () => ({ incrementScanCount: vi.fn() }))
vi.mock('../../services/challengeService', () => ({ updateChallengeProgress: vi.fn() }))

const { default: Programme } = await import('../Programme')
const { _resetProgrammeCache } = await import('../../services/programmeService')

const catalogue = {
  classe: '3ème',
  matieres: [
    { matiere: 'Maths', slug: 'maths', chapitres: [
      { id: 'thales', titre: 'Le théorème de Thalès', ordre: 1, notions: [], pret: true },
      { id: 'trigo', titre: 'Trigonométrie', ordre: 2, notions: [], pret: false },
    ] },
    { matiere: 'Français', slug: 'francais', chapitres: [
      { id: 'argumentation', titre: "L'argumentation", ordre: 1, notions: [], pret: true },
    ] },
  ],
}

const renderPage = () => render(
  <MemoryRouter initialEntries={['/programme']}>
    <Routes><Route path="/programme" element={<Programme />} /></Routes>
  </MemoryRouter>
)

beforeEach(() => {
  localStorage.clear()
  _resetProgrammeCache()
  nav.mockClear()
  authState.level = { cycle: 'college', classe: '3ème' }
  authState.isGuest = false
  vi.stubGlobal('fetch', vi.fn(async url => url === '/programme/3eme/index.json'
    ? { ok: true, status: 200, json: async () => catalogue }
    : { ok: false, status: 404, json: async () => ({}) }))
})
afterEach(() => vi.unstubAllGlobals())

describe('<Programme />', () => {
  it('montre les matières en anneaux et les chapitres de la matière choisie sur la route', async () => {
    renderPage()
    expect(await screen.findByRole('radio', { name: 'Maths : 0 sur 2 chapitres faits' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Français : 0 sur 1 chapitres faits' })).toBeInTheDocument()
    expect(screen.getByText('0 % du programme')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Chapitres · Maths' })).toBeInTheDocument()
    // Rien d'ouvert : la case en cours est le premier chapitre, annoncé comme le prochain.
    expect(screen.getByRole('heading', { level: 3, name: 'Le théorème de Thalès' })).toBeInTheDocument()
    expect(screen.getByText('2 chapitres en maths. On commence par le premier ?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "C'est parti" })).toBeEnabled()
    // Un chapitre pas encore prêt ne se lance pas.
    fireEvent.click(screen.getByRole('button', { name: /^Chapitre 2 : Trigonométrie/ }))
    expect(screen.getByRole('button', { name: 'Bientôt' })).toBeDisabled()
    // Changer de matière remet la case choisie sur le chapitre en cours.
    fireEvent.click(screen.getByRole('radio', { name: /^Français/ }))
    expect(screen.getByRole('heading', { name: 'Chapitres · Français' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: "L'argumentation" })).toBeInTheDocument()
  })

  it('montre l’avancement de chaque matière et le chapitre en cours', async () => {
    const now = Date.now(), DAY = 86400000
    localStorage.setItem('reviz-lessons', JSON.stringify([
      { id: 'prog-thales', title: 'Le théorème de Thalès', subject: 'Maths', flashcardsCount: 2, source: 'programme' },
      { id: 'prog-argumentation', title: "L'argumentation", subject: 'Français', flashcardsCount: 1, source: 'programme' },
    ]))
    localStorage.setItem('reviz-srs', JSON.stringify({
      'prog-thales_0': { interval: 1, reps: 1, ease: 2.5, nextReview: now - DAY },
      'prog-thales_1': { interval: 3, reps: 2, ease: 2.5, nextReview: now + 3 * DAY },
      'prog-argumentation_0': { interval: 3, reps: 2, ease: 2.5, nextReview: now + 3 * DAY },
    }))
    renderPage()
    expect(await screen.findByRole('radio', { name: 'Français : 1 sur 1 chapitres faits' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Maths : 0 sur 2 chapitres faits' })).toBeInTheDocument()
    // Thalès compte pour moitié (ouvert, pas maîtrisé), l'argumentation en entier : 1,5 sur 3.
    expect(screen.getByText('50 % du programme')).toBeInTheDocument()
    expect(screen.getByText('0 chapitre sur 2 en maths. Prochain : le théorème de Thalès.')).toBeInTheDocument()
    expect(screen.getAllByText('En cours')).toHaveLength(2) // sous la case et dans le détail
    expect(screen.getByText('1 carte à revoir')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: /^Français/ }))
    expect(screen.getByText('Tout est fait en français. On révise pour garder ça ?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Réviser' })).toBeInTheDocument()
  })

  it('un lycéen voit le programme de 3e avec une note', async () => {
    authState.level = { cycle: 'lycee', classe: '2nde' }
    renderPage()
    expect(await screen.findByText('Maths')).toBeInTheDocument()
    expect(screen.getByText(/Le programme de 2nde arrive bientôt/)).toBeInTheDocument()
  })

  it('en mode essai, les leçons scannées demandent un compte gratuit', async () => {
    authState.isGuest = true
    renderPage()
    expect(await screen.findByText('Maths')).toBeInTheDocument()
    expect(screen.getByText('Avec un compte gratuit')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Mes leçons scannées/ }))
    expect(nav).toHaveBeenCalledWith('/scan')
  })

  it('affiche un état d’erreur si le catalogue ne charge pas', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })))
    renderPage()
    expect(await screen.findByText('Programme indisponible')).toBeInTheDocument()
  })
})
