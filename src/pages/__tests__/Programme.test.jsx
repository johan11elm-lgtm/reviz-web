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
  it('liste les matières de la classe avec leur nombre de chapitres et ouvre une matière', async () => {
    renderPage()
    expect(await screen.findByText('Maths')).toBeInTheDocument()
    expect(screen.getByText('2 chapitres')).toBeInTheDocument()
    expect(screen.getByText('1 chapitre')).toBeInTheDocument()
    expect(screen.getByText(/3ème · 3 chapitres/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Maths/ }))
    expect(nav).toHaveBeenCalledWith('/programme/maths')
  })

  it('montre l’avancement de chaque matière : cartes à revoir, tout maîtrisé, une encoche par chapitre', async () => {
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
    const { container } = renderPage()
    expect(await screen.findByText('1 carte à revoir')).toBeInTheDocument()
    expect(screen.getByText('Tout maîtrisé')).toBeInTheDocument()
    expect(screen.getByText(/3ème · 2 chapitres commencés sur 3/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Maths : 2 chapitres · 1 commencé · 1 carte à revoir/ })).toBeInTheDocument()
    expect(container.querySelectorAll('.programme-strip-seg--a-revoir')).toHaveLength(1)
    expect(container.querySelectorAll('.programme-strip-seg--bientot')).toHaveLength(1)
    expect(container.querySelectorAll('.programme-strip-seg--maitrise')).toHaveLength(1)
    // Prochaine étape : le premier chapitre prêt et non maîtrisé ; aucune pour une matière finie.
    expect(screen.getAllByText('Prochaine étape')).toHaveLength(1)
  })

  it('un lycéen voit le programme de 3e avec une note', async () => {
    authState.level = { cycle: 'lycee', classe: '2nde' }
    renderPage()
    expect(await screen.findByText('Maths')).toBeInTheDocument()
    expect(screen.getByText(/Le programme de 2nde arrive bientôt/)).toBeInTheDocument()
  })

  it('en mode essai, le bandeau rappelle que la progression reste sur l’appareil', async () => {
    authState.isGuest = true
    renderPage()
    expect(await screen.findByText('Maths')).toBeInTheDocument()
    expect(screen.getByText('Mode essai')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Créer mon compte' })).toHaveAttribute('href', '/inscription')
  })

  it('affiche un état d’erreur si le catalogue ne charge pas', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })))
    renderPage()
    expect(await screen.findByText('Programme indisponible')).toBeInTheDocument()
  })
})
