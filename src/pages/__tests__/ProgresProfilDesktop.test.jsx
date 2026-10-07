// Progrès et Profil sur ordinateur (happy-dom fait 1024 px : useIsDesktop
// est vrai) — tableau de bord de progression, badges avec leur condition.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const nav = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => nav,
}))
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
vi.mock('../../services/scanLimitService', () => ({ incrementScanCount: vi.fn() }))
vi.mock('../../services/challengeService', () => ({ updateChallengeProgress: vi.fn() }))

const { default: Progres } = await import('../Progres')
const { default: Profile } = await import('../Profile')
const { _resetProgrammeCache } = await import('../../services/programmeService')

const catalogue = {
  classe: '3ème',
  matieres: [
    { matiere: 'Maths', slug: 'maths', chapitres: [
      { id: 'thales', titre: 'Le théorème de Thalès', ordre: 1, notions: [], pret: true },
      { id: 'trigo', titre: 'Trigonométrie', ordre: 2, notions: [], pret: true },
    ] },
    { matiere: 'Français', slug: 'francais', chapitres: [
      { id: 'argumentation', titre: "L'argumentation", ordre: 1, notions: [], pret: true },
    ] },
  ],
}

const now = Date.now(), DAY = 864e5
function seed() {
  localStorage.setItem('reviz-lessons', JSON.stringify([
    { id: 'prog-thales', scannedAt: now, source: 'programme', metadata: { title: 'Le théorème de Thalès', subject: 'Maths' }, flashcardsCount: 3 },
    { id: 'prog-argumentation', scannedAt: now - DAY, source: 'programme', metadata: { title: "L'argumentation", subject: 'Français' }, flashcardsCount: 2 },
    { id: '1700000000000', scannedAt: now - 2 * DAY, source: 'scan', metadata: { title: 'La photosynthèse', subject: 'SVT' }, flashcardsCount: 0 },
  ]))
  localStorage.setItem('reviz-srs', JSON.stringify({
    'prog-thales_0': { interval: 1, reps: 1, ease: 2.5, nextReview: now - DAY },        // à revoir
    'prog-thales_1': { interval: 3, reps: 2, ease: 2.5, nextReview: now + 3 * DAY },    // en mémoire
    'prog-argumentation_0': { interval: 3, reps: 2, ease: 2.5, nextReview: now + 3 * DAY },
    'prog-argumentation_1': { interval: 3, reps: 2, ease: 2.5, nextReview: now + 3 * DAY },
  }))
  localStorage.setItem('reviz-revisions', JSON.stringify([
    { id: '1', type: 'flashcards', lessonId: 'prog-thales', revisedAt: now },
    { id: '2', type: 'quiz', lessonId: 'prog-thales', revisedAt: now - DAY },
    { id: '3', type: 'resume', lessonId: 'prog-argumentation', revisedAt: now - DAY },
  ]))
}

beforeEach(() => {
  localStorage.clear()
  _resetProgrammeCache()
  nav.mockClear()
  vi.stubGlobal('fetch', vi.fn(async url => url === '/programme/3eme/index.json'
    ? { ok: true, status: 200, json: async () => catalogue }
    : { ok: false, status: 404, json: async () => ({}) }))
})
afterEach(() => vi.unstubAllGlobals())

describe('<Progres /> sur ordinateur', () => {
  it('montre l’avancement du programme, matière par matière, et ouvre une matière', async () => {
    seed()
    render(<MemoryRouter><Progres /></MemoryRouter>)
    // Comme sur la tuile de Mon programme : les cartes jamais vues d'un chapitre commencé comptent
    const maths = await screen.findByRole('button', { name: /^Maths : 1 \/ 2 commencé, 2 cartes à revoir/ })
    expect(screen.getByText(/chapitres commencés sur 3/)).toBeInTheDocument()
    // Français : son seul chapitre ouvert a toutes ses cartes en mémoire
    expect(screen.getByRole('button', { name: /^Français : 1 \/ 1 maîtrisé/ })).toBeInTheDocument()
    fireEvent.click(maths)
    expect(nav).toHaveBeenCalledWith('/programme/maths')
  })

  it('« Ta mémoire » compte les cartes comme l’accueil et reprend la leçon prioritaire', async () => {
    seed()
    render(<MemoryRouter><Progres /></MemoryRouter>)
    const memoire = (await screen.findByRole('heading', { name: 'Ta mémoire' })).closest('section')
    // 5 cartes : 3 en mémoire, 1 à revoir, 1 jamais vue → 2 à revoir aujourd'hui
    expect(within(memoire).getByText(/cartes à revoir aujourd'hui, sur 5/).previousSibling).toHaveTextContent('2')
    fireEvent.click(within(memoire).getByRole('button', { name: /Réviser maintenant/ }))
    expect(localStorage.getItem('reviz-current-lesson-id')).toBe('prog-thales')
    expect(nav).toHaveBeenCalledWith('/flashcards')
  })

  it('compte les leçons scannées à part et répartit les révisions par matière', async () => {
    seed()
    render(<MemoryRouter><Progres /></MemoryRouter>)
    expect(await screen.findByText('leçons ouvertes, dont 1 scannée')).toBeInTheDocument()
    const parMatiere = screen.getByRole('heading', { name: 'Révisions par matière' }).closest('section')
    expect(within(parMatiere).getByText('Maths')).toBeInTheDocument()
    expect(within(parMatiere).getByText('Français')).toBeInTheDocument()
  })

  it('sans leçon : la mémoire invite à ouvrir un chapitre', async () => {
    render(<MemoryRouter><Progres /></MemoryRouter>)
    expect(await screen.findByText('Pas encore de flashcards')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mon programme' })).toHaveAttribute('href', '/programme')
  })
})

describe('<Profile /> sur ordinateur', () => {
  it('montre les 18 badges avec ce qu’il faut faire, et le prochain à viser', async () => {
    seed()
    render(<MemoryRouter><Profile /></MemoryRouter>)
    expect(screen.getAllByRole('listitem')).toHaveLength(18)
    expect(screen.getByText('3 jours de suite')).toBeInTheDocument()
    // 3 leçons ouvertes : « Étudiant » (5 leçons) à 3 / 5
    expect(screen.getByTitle('Étudiant : 5 leçons ouvertes (3 / 5)')).toBeInTheDocument()
    expect(screen.getByTitle('Lanceur : obtenu')).toBeInTheDocument()
    expect(screen.getByText('Prochain badge')).toBeInTheDocument()
    expect(screen.queryByText(/Voir les \d+ autres/)).not.toBeInTheDocument()
  })

  it('la Battle reste accessible sans compte', () => {
    render(<MemoryRouter><Profile /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /Battle/ })).toHaveAttribute('href', '/battle')
  })
})
