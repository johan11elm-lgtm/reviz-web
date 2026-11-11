// Accueil du retour (11/11) : ce qui a éloigné l'élève, une réponse, puis la reprise.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('../AjoutControle', () => ({
  AjoutControle: ({ onSaved }) => <div role="dialog" aria-label="Ajouter un contrôle"><button type="button" onClick={() => onSaved({ controles: [{}] })}>Ajouter</button></div>,
}))
const { RetourAbsence } = await import('../RetourAbsence')

function afficher(extra = {}) {
  const p = { uid: 'u1', prenom: 'Léa', jours: 5, repere: '2026-11-06', aControle: false, onReprendre: vi.fn(), onClose: vi.fn(), ...extra }
  render(<RetourAbsence {...p} />)
  return p
}

describe('<RetourAbsence />', () => {
  beforeEach(() => localStorage.clear())

  it('accueille par le prénom, demande ce qui l’a éloigné, et ne revient pas pour la même absence', () => {
    afficher()
    expect(screen.getByRole('dialog', { name: 'Content de te revoir' })).toHaveTextContent('Content de te revoir, Léa.')
    expect(screen.getByText(/Ça fait 5\sjours\. Qu’est-ce qui t’a éloigné\s?\?/)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Ce qui t’a éloigné' }).querySelectorAll('button')).toHaveLength(5)
    expect(localStorage.getItem('reviz-retour-vu-u1')).toBe('2026-11-06')
  })
  it('répond à la raison, puis reprend en 5 minutes', () => {
    const p = afficher()
    fireEvent.click(screen.getByRole('button', { name: 'Je ne savais pas quoi réviser' }))
    expect(screen.getByText(/Note ton prochain contrôle/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre en 5 minutes' }))
    expect(p.onClose).toHaveBeenCalled()
    expect(p.onReprendre).toHaveBeenCalled()
  })
  it('sans contrôle à venir : on peut noter le prochain', () => {
    afficher()
    fireEvent.click(screen.getByRole('button', { name: 'Pas eu le temps' }))
    fireEvent.click(screen.getByRole('button', { name: 'Noter mon prochain contrôle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect(screen.getByText(/C’est noté\s: ton plan de révision est prêt/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Noter mon prochain contrôle' })).not.toBeInTheDocument()
  })
  it('avec un contrôle à venir : seulement la reprise', () => {
    afficher({ aControle: true })
    fireEvent.click(screen.getByRole('button', { name: 'C’était les vacances' }))
    expect(screen.queryByRole('button', { name: 'Noter mon prochain contrôle' })).not.toBeInTheDocument()
  })
})
