import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const auth = vi.hoisted(() => ({ isGuest: true }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }))

const { GuestBanner } = await import('../GuestBanner')

const renderBanner = () => render(<MemoryRouter><GuestBanner /></MemoryRouter>)

beforeEach(() => { localStorage.clear(); auth.isGuest = true })

describe('<GuestBanner />', () => {
  it('propose de créer un compte en mode essai', () => {
    renderBanner()
    expect(screen.getByRole('link', { name: 'Créer mon compte' })).toHaveAttribute('href', '/inscription')
  })

  it('propose de donner son avis en mode découverte (enseignant)', () => {
    localStorage.setItem('reviz-decouverte-prof', '1')
    renderBanner()
    expect(screen.getByText('Mode découverte')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Donner mon avis' })).toHaveAttribute('href', '/avis?src=affiche-profs')
    expect(screen.queryByRole('link', { name: 'Créer mon compte' })).toBeNull()
  })

  it('ne rend rien hors mode essai', () => {
    auth.isGuest = false
    const { container } = renderBanner()
    expect(container).toBeEmptyDOMElement()
  })
})
