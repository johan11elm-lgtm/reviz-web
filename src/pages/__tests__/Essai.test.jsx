import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const nav = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => nav,
}))
const auth = vi.hoisted(() => ({ loginAsGuest: vi.fn(), currentUser: null, isGuest: false }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }))

const { default: Essai } = await import('../Essai')

const renderPage = (url = '/essai') => render(<MemoryRouter initialEntries={[url]}><Essai /></MemoryRouter>)

beforeEach(() => { nav.mockClear(); auth.loginAsGuest.mockClear(); auth.currentUser = null; auth.isGuest = false; localStorage.clear() })

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

  it('propose les classes du lycée quand on change de cycle', () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: 'Lycée' }))
    expect(screen.getByRole('button', { name: 'Terminale' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '3ème' })).not.toBeInTheDocument()
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
