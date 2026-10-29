import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Flashcards from '../Flashcards'

// Régression du bug SRS : Flashcards écrivait l'état des cartes sous la clé
// 'default' (lecture de reviz-ai-data.lessonId, jamais écrit) alors que Home/Cours
// comptent les cartes dues avec l'id réel de la leçon (reviz-current-lesson-id).
// Résultat : compteurs « à revoir » faux + collisions entre leçons.

const AI_DATA = {
  metadata: { title: 'Théorème de Thalès', subject: 'Maths' },
  flashcards: [
    { front: 'Q0', back: 'R0' },
    { front: 'Q1', back: 'R1' },
  ],
  quiz: [{ question: 'q', choices: ['a', 'b'], correct: 0, explanation: 'e' }],
}
const DAY = 86400000

function renderFlashcards() {
  return render(
    <MemoryRouter>
      <Flashcards />
    </MemoryRouter>
  )
}
// Retourner la carte, puis se noter (la note n'existe qu'au verso).
function noter(note) {
  fireEvent.click(screen.getByRole('button', { name: /Voir la réponse/ }))
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`${note}$`) }))
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('reviz-ai-data', JSON.stringify(AI_DATA))
})

describe('<Flashcards /> — clé SRS', () => {
  it('écrit l\'état SRS sous l\'id réel de la leçon, pas sous "default"', () => {
    localStorage.setItem('reviz-current-lesson-id', 'lesson-real-123')
    renderFlashcards()
    noter('Je sais')
    const srs = JSON.parse(localStorage.getItem('reviz-srs') || '{}')
    expect(Object.keys(srs)).toContain('lesson-real-123_0')
    expect(Object.keys(srs)).not.toContain('default_0')
  })

  it('retombe sur "default" uniquement quand aucune leçon courante n\'est posée', () => {
    renderFlashcards()
    noter('Je sais')
    const srs = JSON.parse(localStorage.getItem('reviz-srs') || '{}')
    expect(Object.keys(srs)).toContain('default_0')
  })
})

describe('<Flashcards /> — série', () => {
  it('la note n’est possible qu’au verso', () => {
    renderFlashcards()
    expect(screen.queryByRole('button', { name: /Je sais$/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Voir la réponse/ }))
    expect(screen.getByRole('button', { name: /Je sais$/ })).toBeInTheDocument()
  })

  it('« Presque » au verso garde la carte pour demain sans la remettre à zéro', () => {
    localStorage.setItem('reviz-current-lesson-id', 'l1')
    renderFlashcards()
    noter('Presque')
    const etat = JSON.parse(localStorage.getItem('reviz-srs'))['l1_0']
    expect(etat.interval).toBe(1)
    expect(etat.nextReview).toBeGreaterThan(Date.now())
  })

  it('la série du jour ne garde que les cartes dues et nouvelles, puis la fin de série', async () => {
    localStorage.setItem('reviz-current-lesson-id', 'l1')
    // Q0 revue et pas encore due : hors de la série du jour.
    localStorage.setItem('reviz-srs', JSON.stringify({ l1_0: { interval: 3, reps: 2, ease: 2.5, nextReview: Date.now() + 3 * DAY } }))
    renderFlashcards()
    expect(screen.getByText('Carte 1 sur 1')).toBeInTheDocument()
    expect(screen.getAllByText('Q1').length).toBeGreaterThan(0)
    expect(screen.getByText('Nouvelle')).toBeInTheDocument()
    noter('À revoir')
    await act(() => new Promise(r => setTimeout(r, 400)))
    expect(screen.getByRole('heading', { name: 'Série terminée' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refaire les cartes à revoir (1)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Passer aux exercices/ })).toBeInTheDocument()
  })

  it('rien à revoir aujourd’hui : la prochaine révision, et « Revoir quand même »', () => {
    localStorage.setItem('reviz-current-lesson-id', 'l1')
    const plusTard = { interval: 3, reps: 2, ease: 2.5, nextReview: Date.now() + 2 * DAY }
    localStorage.setItem('reviz-srs', JSON.stringify({ l1_0: plusTard, l1_1: plusTard }))
    renderFlashcards()
    expect(screen.getByText('Prochaine révision')).toBeInTheDocument()
    expect(screen.getByText('2 cartes prévues')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Revoir quand même' }))
    expect(screen.getByText('Carte 1 sur 2')).toBeInTheDocument()
  })
})
