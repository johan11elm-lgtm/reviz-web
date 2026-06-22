import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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
    expect(screen.getByText(/Révise mieux/i)).toBeInTheDocument()
  })

  it('shows the primary CTA pointing to /inscription', () => {
    renderWelcome()
    const cta = screen.getByRole('link', { name: /Commencer gratuitement/i })
    expect(cta).toBeInTheDocument()
    expect(cta).toHaveAttribute('href', '/inscription')
  })

  it('shows login links pointing to /connexion', () => {
    renderWelcome()
    const loginLinks = screen.getAllByRole('link', { name: /Se connecter/i })
    expect(loginLinks.length).toBeGreaterThan(0)
    loginLinks.forEach((link) => expect(link).toHaveAttribute('href', '/connexion'))
  })
})
