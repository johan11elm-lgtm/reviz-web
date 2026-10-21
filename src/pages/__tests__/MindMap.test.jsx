import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Mindmap from '../MindMap'

const AI_DATA = {
  metadata: { title: 'Puissances', subject: 'Maths' },
  flashcards: [{ front: 'Q', back: 'R' }, { front: 'Q2', back: 'R2' }],
  mindmap: {
    branches: [
      { label: 'Définition', detail: 'Un produit de facteurs identiques.', children: ['aⁿ = a × … × a', 'a⁰ = 1'] },
      { label: 'Règles', detail: 'On calcule sur les exposants.', children: ['aᵐ × aⁿ = aᵐ⁺ⁿ'] },
    ],
  },
}

function renderCarte() {
  return render(<MemoryRouter><Mindmap /></MemoryRouter>)
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('reviz-ai-data', JSON.stringify(AI_DATA))
})

describe('<Mindmap />', () => {
  it('affiche le chapitre et une branche par rond, avec le compte d’idées', () => {
    renderCarte()
    expect(screen.getAllByText('Puissances').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Définition, 2 idées' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Règles, 1 idée' })).toBeInTheDocument()
    expect(screen.getByText('0 / 2 explorées')).toBeInTheDocument()
  })

  it('ouvrir une branche la marque explorée et montre ses idées', () => {
    renderCarte()
    fireEvent.click(screen.getByRole('button', { name: 'Définition, 2 idées' }))
    expect(screen.getByText('Un produit de facteurs identiques.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Définition, 2 idées, explorée' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Branche suivante/ })).toBeInTheDocument()
  })

  it('Teste-toi cache les idées, un toucher les révèle', () => {
    renderCarte()
    fireEvent.click(screen.getByRole('switch', { name: 'Teste-toi' }))
    fireEvent.click(screen.getByRole('button', { name: 'Définition, 2 idées' }))
    const cachee = screen.getByRole('button', { name: /Idée 1 : masquée/ })
    fireEvent.click(cachee)
    expect(screen.queryByRole('button', { name: /Idée 1 : masquée/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Idée 2 : masquée/ })).toBeInTheDocument()
  })

  it('la dernière branche mène à l’écran de fin', () => {
    renderCarte()
    fireEvent.click(screen.getByRole('button', { name: 'Définition, 2 idées' }))
    fireEvent.click(screen.getByRole('button', { name: /Branche suivante/ }))
    fireEvent.click(screen.getByRole('button', { name: /Terminer la carte/ }))
    expect(screen.getByRole('heading', { name: 'Carte explorée' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Passer aux flashcards · 2 cartes/ })).toBeInTheDocument()
  })
})
