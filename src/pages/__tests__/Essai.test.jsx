import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const nav = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => nav,
}))
const auth = vi.hoisted(() => ({ loginAsGuest: vi.fn(), currentUser: null, isGuest: false }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }))
const prog = vi.hoisted(() => ({ loadCatalogue: vi.fn(), openChapter: vi.fn() }))
vi.mock('../../services/programmeService', () => prog)
const THALES = { id: 'theoreme-de-thales', titre: 'Théorème de Thalès', pret: true, quiz: 8 }

const { default: Essai } = await import('../Essai')

const renderPage = (url = '/essai') => render(<MemoryRouter initialEntries={[url]}><Essai /></MemoryRouter>)

beforeEach(() => {
  nav.mockClear(); auth.loginAsGuest.mockClear(); auth.currentUser = null; auth.isGuest = false; localStorage.clear()
  prog.loadCatalogue.mockReset().mockResolvedValue({ matieres: [{ slug: 'maths', matiere: 'Maths', chapitres: [THALES] }] })
  prog.openChapter.mockReset().mockResolvedValue({})
})

describe('<Essai /> — mode essai', () => {
  it('demande un prénom puis une classe', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /C'est parti/ }))
    expect(screen.getByRole('alert')).toHaveTextContent('Entre ton prénom.')
    fireEvent.change(screen.getByLabelText('Ton prénom'), { target: { value: 'Léa' } })
    fireEvent.click(screen.getByRole('button', { name: /C'est parti/ }))
    expect(screen.getByRole('alert')).toHaveTextContent('Choisis ta classe.')
    expect(auth.loginAsGuest).not.toHaveBeenCalled()
  })

  it('démarre la session d’essai et ouvre Mon programme', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Ton prénom'), { target: { value: 'Léa' } })
    fireEvent.click(screen.getByRole('button', { name: '3ème' }))
    fireEvent.click(screen.getByRole('button', { name: /C'est parti/ }))
    expect(auth.loginAsGuest).toHaveBeenCalledWith({ prenom: 'Léa', level: { cycle: 'college', classe: '3ème', specialites: [] } })
    expect(nav).toHaveBeenCalledWith('/programme', { replace: true })
  })

  it('un élève venu d’une fiche publique sans chapitre a sa classe cochée et ouvre la matière', () => {
    renderPage('/essai?classe=3%C3%A8me&matiere=maths&via=pinterest')
    expect(screen.getByRole('button', { name: '3ème' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.change(screen.getByLabelText('Ton prénom'), { target: { value: 'Léa' } })
    fireEvent.click(screen.getByRole('button', { name: /C'est parti/ }))
    expect(auth.loginAsGuest).toHaveBeenCalledWith({ prenom: 'Léa', level: { cycle: 'college', classe: '3ème', specialites: [] } })
    expect(nav).toHaveBeenCalledWith('/programme?matiere=maths', { replace: true })
  })

  it('venu d’une fiche avec son chapitre : le prénom suffit, et le quiz du chapitre s’ouvre', async () => {
    renderPage('/essai?classe=3%C3%A8me&matiere=maths&chapitre=theoreme-de-thales&via=fiche')
    expect(await screen.findByRole('heading', { name: 'Teste-toi sur ce chapitre' })).toBeInTheDocument()
    expect(screen.getByText('Théorème de Thalès')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '3ème' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Ton prénom'), { target: { value: 'Léa' } })
    fireEvent.click(screen.getByRole('button', { name: /Lancer le quiz/ }))
    expect(auth.loginAsGuest).toHaveBeenCalledWith({ prenom: 'Léa', level: { cycle: 'college', classe: '3ème', specialites: [] } })
    expect(prog.openChapter).toHaveBeenCalledWith('3ème', 'Maths', THALES)
    await waitFor(() => expect(nav).toHaveBeenCalledWith('/quiz', { replace: true }))
  })

  it('un chapitre inconnu retombe sur le formulaire habituel et la matière', async () => {
    renderPage('/essai?classe=3%C3%A8me&matiere=maths&chapitre=inconnu')
    await waitFor(() => expect(prog.loadCatalogue).toHaveBeenCalled())
    expect(await screen.findByRole('button', { name: '3ème' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.change(screen.getByLabelText('Ton prénom'), { target: { value: 'Léa' } })
    fireEvent.click(screen.getByRole('button', { name: /C'est parti/ }))
    expect(prog.openChapter).not.toHaveBeenCalled()
    expect(nav).toHaveBeenCalledWith('/programme?matiere=maths', { replace: true })
  })

  it('un essai déjà commencé ouvre directement le quiz du chapitre de la fiche', async () => {
    auth.currentUser = { uid: 'guest-1' }
    auth.isGuest = true
    renderPage('/essai?classe=3%C3%A8me&matiere=maths&chapitre=theoreme-de-thales')
    await waitFor(() => expect(nav).toHaveBeenCalledWith('/quiz', { replace: true }))
    expect(auth.loginAsGuest).not.toHaveBeenCalled()
    expect(prog.openChapter).toHaveBeenCalledTimes(1)
  })

  it('une matière mal formée ou une classe de lycée dans le lien sont ignorées', () => {
    renderPage('/essai?classe=Terminale&matiere=../hack')
    expect(screen.getByRole('button', { name: '3ème' })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.change(screen.getByLabelText('Ton prénom'), { target: { value: 'Léa' } })
    fireEvent.click(screen.getByRole('button', { name: '4ème' }))
    fireEvent.click(screen.getByRole('button', { name: /C'est parti/ }))
    expect(nav).toHaveBeenCalledWith('/programme', { replace: true })
  })

  it('annonce le lycée « à venir » sans l’ouvrir : Mon programme s’arrête en 3e', () => {
    renderPage()
    const lycee = screen.getByRole('tab', { name: /Lycée/ })
    expect(lycee).toBeDisabled()
    expect(lycee).toHaveTextContent('à venir')
    fireEvent.click(lycee)
    expect(screen.getByRole('button', { name: '3ème' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Terminale' })).not.toBeInTheDocument()
  })

  it('un enseignant venu de /profs ouvre directement le programme de la classe choisie', () => {
    renderPage('/essai?prof=1&classe=4%C3%A8me')
    expect(auth.loginAsGuest).toHaveBeenCalledWith({ prenom: 'Prof', level: { cycle: 'college', classe: '4ème', specialites: [] } })
    expect(nav).toHaveBeenCalledWith('/programme', { replace: true })
    expect(localStorage.getItem('reviz-decouverte-prof')).toBe('1')
    expect(screen.queryByLabelText('Ton prénom')).not.toBeInTheDocument()
  })

  it('une classe inconnue retombe sur le formulaire, et un essai d’élève sort du mode découverte', () => {
    localStorage.setItem('reviz-decouverte-prof', '1')
    renderPage('/essai?prof=1&classe=CM2')
    expect(auth.loginAsGuest).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Ton prénom'), { target: { value: 'Léa' } })
    fireEvent.click(screen.getByRole('button', { name: '5ème' }))
    fireEvent.click(screen.getByRole('button', { name: /C'est parti/ }))
    expect(localStorage.getItem('reviz-decouverte-prof')).toBeNull()
  })

  it('un utilisateur déjà connecté est renvoyé à l’accueil', () => {
    auth.currentUser = { uid: 'u1' }
    renderPage()
    expect(nav).toHaveBeenCalledWith('/', { replace: true })
  })
})
