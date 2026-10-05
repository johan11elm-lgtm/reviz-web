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

  it('un élève de 4e voit le programme de 3e avec une note', async () => {
    authState.level = { cycle: 'college', classe: '4ème' }
    renderPage()
    expect(await screen.findByText('Maths')).toBeInTheDocument()
    expect(screen.getByText(/Le programme de 4ème arrive bientôt/)).toBeInTheDocument()
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
