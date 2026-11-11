import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

const nav = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => nav,
}))
const auth = vi.hoisted(() => ({ loginAsGuest: vi.fn(), currentUser: null, isGuest: false }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }))
const prog = vi.hoisted(() => ({ loadCatalogue: vi.fn(), openChapter: vi.fn() }))
vi.mock('../../services/programmeService', () => prog)
const mesure = vi.hoisted(() => ({ mesurer: vi.fn() }))
vi.mock('../../services/mesure', () => mesure)
const THALES = { id: 'theoreme-de-thales', titre: 'Théorème de Thalès', pret: true, quiz: 8 }

const { default: Essai } = await import('../Essai')

const renderPage = (url = '/essai') => render(<MemoryRouter initialEntries={[url]}><Essai /></MemoryRouter>)

beforeEach(() => {
  nav.mockClear(); mesure.mesurer.mockClear(); auth.loginAsGuest.mockClear(); auth.currentUser = null; auth.isGuest = false; localStorage.clear()
  prog.loadCatalogue.mockReset().mockResolvedValue({ matieres: [{ slug: 'maths', matiere: 'Maths', chapitres: [THALES] }] })
  prog.openChapter.mockReset().mockResolvedValue({})
})

describe('<Essai /> — depuis le 11/11, plus d’essai sans compte', () => {
  function Ici() { const l = useLocation(); return <p>{`ICI ${l.pathname}${l.search}`}</p> }
  const avecRoutes = url => render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/essai" element={<Essai />} />
        <Route path="/commencer" element={<Ici />} />
        <Route path="/connexion" element={<Ici />} />
      </Routes>
    </MemoryRouter>
  )

  it('un nouveau venu passe par l’entrée, avec les paramètres de la fiche', () => {
    avecRoutes('/essai?classe=3%C3%A8me&matiere=maths&chapitre=theoreme-de-thales&via=fiche')
    expect(screen.getByText(/^ICI \/commencer\?classe=3%C3%A8me&matiere=maths&chapitre=theoreme-de-thales&via=fiche$/)).toBeInTheDocument()
    expect(auth.loginAsGuest).not.toHaveBeenCalled()
  })

  it('sans paramètre : l’entrée aussi, jamais de formulaire d’essai', () => {
    avecRoutes('/essai')
    expect(screen.getByText('ICI /commencer')).toBeInTheDocument()
    expect(screen.queryByLabelText('Ton prénom')).toBeNull()
  })

  it('venu d’un e-mail de Réviz (son compte existe) : la connexion, qui le ramène sur le quiz', () => {
    avecRoutes('/essai?classe=3%C3%A8me&matiere=maths&chapitre=theoreme-de-thales&via=rappel')
    expect(screen.getByText(/^ICI \/connexion\?next=%2Fessai%3Fclasse/)).toBeInTheDocument()
  })

  it('un essai déjà commencé ouvre directement la séance d’exercices du chapitre de la fiche', async () => {
    auth.currentUser = { uid: 'guest-1' }
    auth.isGuest = true
    renderPage('/essai?classe=3%C3%A8me&matiere=maths&chapitre=theoreme-de-thales')
    await waitFor(() => expect(nav).toHaveBeenCalledWith('/exercices', { replace: true }))
    expect(auth.loginAsGuest).not.toHaveBeenCalled()
    expect(prog.openChapter).toHaveBeenCalledTimes(1)
  })

  it('un enseignant venu de /profs ouvre directement le programme de la classe choisie', () => {
    renderPage('/essai?prof=1&classe=4%C3%A8me')
    expect(auth.loginAsGuest).toHaveBeenCalledWith({ prenom: 'Prof', level: { cycle: 'college', classe: '4ème', specialites: [] } })
    expect(nav).toHaveBeenCalledWith('/programme', { replace: true })
    expect(localStorage.getItem('reviz-decouverte-prof')).toBe('1')
    expect(screen.queryByLabelText('Ton prénom')).not.toBeInTheDocument()
  })

  it('un essai déjà commencé, sans fiche : on le reprend (l’accueil), pas de nouvel essai vide', () => {
    auth.currentUser = { uid: 'invite-1' }
    auth.isGuest = true
    renderPage()
    expect(nav).toHaveBeenCalledWith('/', { replace: true })
    expect(screen.queryByLabelText('Ton prénom')).toBeNull()
    expect(auth.loginAsGuest).not.toHaveBeenCalled()
  })

  it('un essai déjà commencé venu d’une fiche sans chapitre : sa matière', () => {
    auth.currentUser = { uid: 'invite-1' }
    auth.isGuest = true
    renderPage('/essai?classe=3%C3%A8me&matiere=maths')
    expect(nav).toHaveBeenCalledWith('/programme?matiere=maths', { replace: true })
  })

  it('un utilisateur déjà connecté est renvoyé à l’accueil', () => {
    auth.currentUser = { uid: 'u1' }
    renderPage()
    expect(nav).toHaveBeenCalledWith('/', { replace: true })
  })
})
