import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const nav = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => nav,
}))
const google = { uid: 'u1', displayName: 'Maman Dupont', email: 'parent@exemple.fr', providerData: [{ providerId: 'google.com' }] }
const lea = { uid: 'u2', displayName: 'Léa', email: 'lea@exemple.fr', providerData: [{ providerId: 'password' }] }
const auth = vi.hoisted(() => ({
  currentUser: null, getUserLevel: vi.fn(),
  setUserLevel: vi.fn(), refreshGate: vi.fn(), updateDisplayName: vi.fn(), logout: vi.fn(async () => {}),
}))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../../services/firebaseConfig', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), setDoc: vi.fn(async () => {}) }))
vi.mock('../../services/userProfileService', () => ({ createUserProfile: vi.fn(async () => {}) }))

const { default: FinishSetup } = await import('../FinishSetup')

beforeEach(() => {
  nav.mockClear(); auth.logout.mockClear()
  auth.currentUser = google
  auth.getUserLevel.mockReturnValue(null)
})

describe('<FinishSetup /> — fin d’inscription Google, Apple…', () => {
  it('nouveau compte Google : naissance, puis classe et CGU (deux étapes)', () => {
    render(<MemoryRouter><FinishSetup /></MemoryRouter>)
    expect(screen.getByText('Étape 1 sur 2')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeInTheDocument()
  })

  it('compte e-mail au profil vide, classe connue : seulement la naissance, sans CGU, en une étape', () => {
    auth.currentUser = lea
    auth.getUserLevel.mockReturnValue({ cycle: 'college', classe: '4ème', specialites: [] })
    render(<MemoryRouter><FinishSetup /></MemoryRouter>)
    expect(screen.getAllByText(/Content de te revoir, Léa/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Il me manque ta date de naissance/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Quand es-tu né·e/)).toBeInTheDocument()
    expect(screen.queryByText(/Étape/)).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByLabelText('Ton prénom')).toBeNull()
  })

  it('compte e-mail sans classe connue : naissance puis classe, toujours sans CGU', () => {
    auth.currentUser = lea
    render(<MemoryRouter><FinishSetup /></MemoryRouter>)
    expect(screen.getAllByText(/Il me manque deux infos/).length).toBeGreaterThan(0)
    expect(screen.getByText('Étape 1 sur 2')).toBeInTheDocument()
  })

  it('connecté avec le mauvais compte : « Me déconnecter » sort vers la bienvenue', async () => {
    render(<MemoryRouter><FinishSetup /></MemoryRouter>)
    expect(screen.getByText(/Ce n’est pas ton compte/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Me déconnecter' }))
    await waitFor(() => expect(nav).toHaveBeenCalledWith('/welcome', { replace: true }))
    expect(auth.logout).toHaveBeenCalledTimes(1)
  })
})
