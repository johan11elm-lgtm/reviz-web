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

const renderPage = () => render(<MemoryRouter initialEntries={['/essai']}><Essai /></MemoryRouter>)

beforeEach(() => { nav.mockClear(); auth.loginAsGuest.mockClear(); auth.currentUser = null; auth.isGuest = false })

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

  it('un utilisateur déjà connecté est renvoyé à l’accueil', () => {
    auth.currentUser = { uid: 'u1' }
    renderPage()
    expect(nav).toHaveBeenCalledWith('/', { replace: true })
  })
})
