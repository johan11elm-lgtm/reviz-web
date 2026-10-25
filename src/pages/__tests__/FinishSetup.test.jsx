import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const nav = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => nav,
}))
const auth = vi.hoisted(() => ({
  currentUser: { uid: 'u1', displayName: 'Maman Dupont', email: 'parent@exemple.fr' },
  setUserLevel: vi.fn(), refreshGate: vi.fn(), updateDisplayName: vi.fn(), logout: vi.fn(async () => {}),
}))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../../services/firebaseConfig', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), setDoc: vi.fn(async () => {}) }))
vi.mock('../../services/userProfileService', () => ({ createUserProfile: vi.fn(async () => {}) }))

const { default: FinishSetup } = await import('../FinishSetup')

beforeEach(() => { nav.mockClear(); auth.logout.mockClear() })

describe('<FinishSetup /> — fin d’inscription Google, Apple…', () => {
  it('connecté avec le mauvais compte : « Me déconnecter » sort vers la bienvenue', async () => {
    render(<MemoryRouter><FinishSetup /></MemoryRouter>)
    expect(screen.getByText(/Ce n’est pas ton compte/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Me déconnecter' }))
    await waitFor(() => expect(nav).toHaveBeenCalledWith('/welcome', { replace: true }))
    expect(auth.logout).toHaveBeenCalledTimes(1)
  })
})
