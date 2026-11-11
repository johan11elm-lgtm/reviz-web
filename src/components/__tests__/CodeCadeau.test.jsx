// « Un parent t'a offert Réviz+ ? » dans Moi (11/11).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const ctx = vi.hoisted(() => ({ valeur: {} }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ctx.valeur }))
vi.mock('../../services/apiClient', () => ({ IS_NATIVE: false, apiFetch: vi.fn() }))
const { CodeCadeau } = await import('../moi/CodeCadeau')

describe('<CodeCadeau />', () => {
  it('rien pour un abonné', () => {
    ctx.valeur = { currentUser: { uid: 'u' }, isGuest: false, isPremium: true }
    const { container } = render(<CodeCadeau />)
    expect(container).toBeEmptyDOMElement()
  })
  it('le code du parent active Réviz+', async () => {
    const activerCadeau = vi.fn(async () => ({ ok: true }))
    ctx.valeur = { currentUser: { uid: 'u' }, isGuest: false, isPremium: false, activerCadeau }
    render(<CodeCadeau />)
    fireEvent.click(screen.getByRole('button', { name: /Un parent t’a offert Réviz\+/ }))
    fireEvent.change(screen.getByLabelText('Le code de ton parent'), { target: { value: 'abcd-efgh' } })
    fireEvent.click(screen.getByRole('button', { name: 'Activer' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Réviz+ est activé')
    expect(activerCadeau).toHaveBeenCalledWith('ABCDEFGH')
  })
  it('un refus est expliqué', async () => {
    ctx.valeur = { currentUser: { uid: 'u' }, isGuest: false, isPremium: false, activerCadeau: async () => ({ ok: false, erreur: 'DEJA_UTILISE' }) }
    render(<CodeCadeau />)
    fireEvent.click(screen.getByRole('button', { name: /Un parent t’a offert Réviz\+/ }))
    fireEvent.change(screen.getByLabelText('Le code de ton parent'), { target: { value: 'ABCDEFGH' } })
    fireEvent.click(screen.getByRole('button', { name: 'Activer' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('déjà servi')
  })
})
