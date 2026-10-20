import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Flashcards from '../Flashcards'

// Régression du bug SRS : Flashcards écrivait l'état des cartes sous la clé
// 'default' (lecture de reviz-ai-data.lessonId, jamais écrit) alors que Home/Cours
// comptent les cartes dues avec l'id réel de la leçon (reviz-current-lesson-id).
// Résultat : compteurs « à revoir » faux + collisions entre leçons.

const AI_DATA = {
  metadata: { title: 'Théorème de Thalès' },
  flashcards: [
    { front: 'Q0', back: 'R0' },
    { front: 'Q1', back: 'R1' },
  ],
}

function renderFlashcards() {
  return render(
    <MemoryRouter>
      <Flashcards />
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('reviz-ai-data', JSON.stringify(AI_DATA))
})

describe('<Flashcards /> — clé SRS', () => {
  it('écrit l\'état SRS sous l\'id réel de la leçon, pas sous "default"', () => {
    localStorage.setItem('reviz-current-lesson-id', 'lesson-real-123')
    renderFlashcards()

    fireEvent.click(screen.getByRole('button', { name: /^Je sais/ }))

    const srs = JSON.parse(localStorage.getItem('reviz-srs') || '{}')
    expect(Object.keys(srs)).toContain('lesson-real-123_0')
    expect(Object.keys(srs)).not.toContain('default_0')
  })

  it('retombe sur "default" uniquement quand aucune leçon courante n\'est posée', () => {
    // Pas de reviz-current-lesson-id (navigation directe / état legacy)
    renderFlashcards()

    fireEvent.click(screen.getByRole('button', { name: /^Je sais/ }))

    const srs = JSON.parse(localStorage.getItem('reviz-srs') || '{}')
    expect(Object.keys(srs)).toContain('default_0')
  })
})

describe('<Flashcards /> — notes', () => {
  it('« Presque » au verso garde la carte pour demain sans la remettre à zéro', () => {
    localStorage.setItem('reviz-current-lesson-id', 'l1')
    renderFlashcards()
    fireEvent.click(screen.getByRole('button', { name: 'Retourner' }))
    expect(screen.getByText('R0')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Presque/ }))
    const etat = JSON.parse(localStorage.getItem('reviz-srs'))['l1_0']
    expect(etat.interval).toBe(1)
    expect(etat.nextReview).toBeGreaterThan(Date.now())
  })
})
