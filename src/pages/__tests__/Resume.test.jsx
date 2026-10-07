import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Resume from '../Resume'

const AI_DATA = {
  metadata: { title: 'La Révolution française', subject: 'Histoire' },
  flashcards: [
    { front: 'Q0', back: 'R0' },
    { front: 'Q1', back: 'R1' },
    { front: 'Q2', back: 'R2' },
    { front: 'Q3', back: 'R3' },
  ],
  resume: {
    intro: 'De 1789 à 1799, la monarchie absolue tombe.',
    keyPoints: ['14 juillet 1789 : prise de la Bastille', '26 août 1789 : DDHC'],
    sections: [
      { title: '1. 1789', content: 'Le tiers état conteste les privilèges.', exemple: 'Serment du Jeu de paume, 20 juin 1789.' },
      { title: '2. La République', content: 'La République est proclamée en 1792.', exemple: null },
    ],
    methode: { titre: 'Comment construire une frise', etapes: ['Tracer la flèche', 'Placer les dates'] },
    pieges: ['La prise de la Bastille ne met pas fin à la monarchie.'],
    keyTerms: [
      { term: 'tiers état', def: 'Ceux qui ne sont ni nobles ni clercs.' },
      { term: 'privilèges', def: 'Droits réservés à la noblesse et au clergé.' },
    ],
  },
}

const renderResume = () => render(<MemoryRouter><Resume /></MemoryRouter>)

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('reviz-ai-data', JSON.stringify(AI_DATA))
  localStorage.setItem('reviz-current-lesson-id', 'prog-revolution')
})

describe('<Resume /> — fiche enrichie', () => {
  it('affiche exemple, méthode et pièges, avec le numéro des sections en pastille', () => {
    renderResume()
    expect(screen.getByText('Serment du Jeu de paume, 20 juin 1789.')).toBeInTheDocument()
    expect(screen.getByText('Comment construire une frise')).toBeInTheDocument()
    expect(screen.getByText('Placer les dates')).toBeInTheDocument()
    expect(screen.getByText('La prise de la Bastille ne met pas fin à la monarchie.')).toBeInTheDocument()
    // « 1. 1789 » → titre « 1789 », le numéro passe dans la pastille
    expect(screen.getByRole('heading', { name: '1789' })).toBeInTheDocument()
  })

  it('reste lisible sur une leçon ancienne, sans les nouvelles rubriques', () => {
    const { methode, pieges, ...ancien } = AI_DATA.resume
    localStorage.setItem('reviz-ai-data', JSON.stringify({ ...AI_DATA, resume: ancien }))
    renderResume()
    expect(screen.queryByText('La méthode')).not.toBeInTheDocument()
    expect(screen.queryByText('Pièges à éviter')).not.toBeInTheDocument()
    expect(screen.getByText('Le cours')).toBeInTheDocument()
  })

  it('un terme du cours se touche et montre sa définition', () => {
    renderResume()
    fireEvent.click(screen.getByRole('button', { name: 'privilèges' }))
    expect(screen.getByRole('status')).toHaveTextContent('Droits réservés à la noblesse et au clergé.')
    fireEvent.click(screen.getByRole('button', { name: 'Fermer la définition' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('« Me tester » masque les points à retenir et les définitions jusqu\'au toucher', () => {
    renderResume()
    fireEvent.click(screen.getAllByRole('button', { name: 'Me tester' })[0])
    const point = screen.getByRole('button', { name: /Point 1 : masqué/ })
    expect(screen.getByRole('button', { name: /Définition de tiers état : masqué/ })).toBeInTheDocument()
    fireEvent.click(point)
    expect(screen.queryByRole('button', { name: /Point 1 : masqué/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Point 2 : masqué/ })).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Tout afficher' })[0])
    expect(screen.queryByRole('button', { name: /masqué/ })).not.toBeInTheDocument()
  })

  it('« Vérifie-toi » nourrit la répétition espacée des flashcards', () => {
    renderResume()
    // 4 cartes → début, milieu, fin : Q0, Q2, Q3
    expect(screen.getByText('Q0')).toBeInTheDocument()
    expect(screen.queryByText('Q1')).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Voir la réponse' })[1])
    expect(screen.getByText('R2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /À revoir/ }))
    const srs = JSON.parse(localStorage.getItem('reviz-srs') || '{}')
    expect(Object.keys(srs)).toEqual(['prog-revolution_2'])
    expect(screen.getByText(/dès demain dans tes flashcards/)).toBeInTheDocument()
  })
})
