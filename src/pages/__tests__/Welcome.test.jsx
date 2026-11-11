import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Welcome from '../Welcome'

const renderWelcome = () =>
  render(
    <MemoryRouter>
      <Welcome />
    </MemoryRouter>
  )

describe('<Welcome />', () => {
  it('renders the main heading', () => {
    renderWelcome()
    expect(screen.getAllByText(/Révise mieux/i).length).toBeGreaterThan(0)
  })

  it('le bouton principal ouvre l’entrée, où Réviz pose ses questions avant le compte', () => {
    renderWelcome()
    expect(screen.getByRole('link', { name: /Commencer gratuitement/i })).toHaveAttribute('href', '/commencer')
  })

  it('shows the « J’ai déjà un compte » link pointing to /connexion', () => {
    renderWelcome()
    expect(screen.getByRole('link', { name: /J.ai déjà un compte/i })).toHaveAttribute('href', '/connexion')
  })

  it('plus d’essai sans compte (11/11)', () => {
    renderWelcome()
    expect(screen.queryByRole('link', { name: /sans compte/i })).toBeNull()
  })

  afterEach(() => localStorage.clear())

  it('un essai déjà commencé sur l’appareil est repris : direction l’app, pas un nouvel essai', () => {
    localStorage.setItem('reviz-guest', JSON.stringify({ uid: 'invite-abc', prenom: 'Léa', level: { cycle: 'college', classe: '3ème' } }))
    render(
      <MemoryRouter initialEntries={['/welcome']}>
        <Routes>
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/" element={<p>APP</p>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('APP')).toBeInTheDocument()
  })
})
