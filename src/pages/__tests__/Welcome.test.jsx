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
    expect(screen.getAllByText(/Révise mieux/i).length).toBeGreaterThan(0)
  })

  it('shows the primary CTA pointing to /inscription', () => {
    renderWelcome()
    const cta = screen.getByRole('link', { name: /Commencer gratuitement/i })
    expect(cta).toBeInTheDocument()
    expect(cta).toHaveAttribute('href', '/inscription')
  })

  it('shows the « J’ai déjà un compte » link pointing to /connexion', () => {
    renderWelcome()
    expect(screen.getByRole('link', { name: /J.ai déjà un compte/i })).toHaveAttribute('href', '/connexion')
  })

  it('shows the « Essayer sans compte » link pointing to /essai', () => {
    renderWelcome()
    expect(screen.getByRole('link', { name: /Essayer sans compte/i })).toHaveAttribute('href', '/essai')
  })
})
