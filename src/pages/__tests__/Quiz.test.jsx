import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const authState = vi.hoisted(() => ({ isGuest: false }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ isGuest: authState.isGuest, hasRevizPlus: false, getUserLevel: () => null }),
}))
const { default: Quiz } = await import('../Quiz')
const { quizScore } = await import('../../services/revisionService')

const AI_DATA = {
  metadata: { title: 'Puissances', subject: 'Maths' },
  flashcards: [{ front: 'Q', back: 'R' }],
  quiz: [
    { question: 'Que vaut 5⁰ ?', choices: ['0', '1', '5', '50'], correct: 1, explanation: 'Tout nombre non nul à la puissance 0 vaut 1.' },
    { question: 'Que vaut 10⁻³ ?', choices: ['0,001', '1 000', '−1 000', '0,01'], correct: 0, explanation: '10⁻³ = 1 / 10³.' },
  ],
}
const renderQuiz = () => render(<MemoryRouter><Quiz /></MemoryRouter>)

beforeEach(() => {
  localStorage.clear()
  authState.isGuest = false
  localStorage.setItem('reviz-ai-data', JSON.stringify(AI_DATA))
  localStorage.setItem('reviz-current-lesson-id', 'prog-puissances')
})

describe('<Quiz /> corrigé', () => {
  it('une bonne réponse : correction et question suivante', () => {
    renderQuiz()
    expect(screen.getByText('Question 1 sur 2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^B : 1/ }))
    expect(screen.getByText('Bonne réponse', { selector: '.qz-verdict' })).toBeInTheDocument()
    expect(screen.getByText('Tout nombre non nul à la puissance 0 vaut 1.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Pourquoi/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Question suivante/ }))
    expect(screen.getByText('Question 2 sur 2')).toBeInTheDocument()
  })

  it('une erreur propose de demander pourquoi à Réviz IA (pas en mode essai)', () => {
    renderQuiz()
    fireEvent.click(screen.getByRole('button', { name: /^A : 0/ }))
    expect(screen.getByText('Pas tout à fait')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pourquoi \? Demande à Réviz IA/ })).toBeInTheDocument()
  })

  it('en mode essai, pas de « Pourquoi ? »', () => {
    authState.isGuest = true
    renderQuiz()
    fireEvent.click(screen.getByRole('button', { name: /^A : 0/ }))
    expect(screen.queryByRole('button', { name: /Pourquoi/ })).not.toBeInTheDocument()
  })

  it('la fin enregistre le score pour la fiche chapitre et liste les erreurs', () => {
    renderQuiz()
    fireEvent.click(screen.getByRole('button', { name: /^B : 1/ }))
    fireEvent.click(screen.getByRole('button', { name: /Question suivante/ }))
    fireEvent.click(screen.getByRole('button', { name: /^D : 0,01/ }))
    fireEvent.click(screen.getByRole('button', { name: /Voir mon score/ }))
    expect(screen.getByText('Quiz terminé')).toBeInTheDocument()
    expect(screen.getByText('+10 XP')).toBeInTheDocument()
    expect(quizScore('prog-puissances')).toEqual({ dernier: { score: 1, total: 2 }, meilleur: { score: 1, total: 2 } })
    expect(screen.getByText('Bonne réponse : 0,001')).toBeInTheDocument()
    // Une erreur : « Refaire mes erreurs » d'abord, et « Tout le quiz » pour tout reprendre.
    expect(screen.getByRole('button', { name: 'Refaire mes erreurs' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tout le quiz' }))
    expect(screen.getByText('Question 1 sur 2')).toBeInTheDocument()
  })
})
