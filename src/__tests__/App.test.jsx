import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('<App />', () => {
  beforeEach(() => {
    // Force la route publique /welcome — pas besoin de Firebase/Auth pour ce render.
    window.history.replaceState({}, '', '/welcome')
  })

  it('renders the welcome page at /welcome', () => {
    render(<App />)
    // La phrase est dans la bulle de Réviz (texte lu + lettres tapées) : plusieurs nœuds.
    expect(screen.getAllByText(/Révise mieux/i).length).toBeGreaterThan(0)
  })
})
