// Plan de révision : la note estimée en tête (11/11), ou l'invitation à faire une séance.
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlanRevision } from '../PlanRevision'

const dans = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const controle = { id: 'c1', matiere: 'maths', date: dans(4), chapitres: [
  { id: '3eme-maths-theoreme-de-thales', titre: 'Le théorème de Thalès' },
  { id: '3eme-maths-pythagore', titre: 'Le théorème de Pythagore' },
] }

describe('<PlanRevision /> : note estimée', () => {
  beforeEach(() => localStorage.clear())

  it('sans séance : l’invitation', () => {
    render(<PlanRevision controle={controle} agenda={{}} hasRevizPlus onLancer={() => {}} />)
    expect(screen.getByText(/Fais une séance sur ce contrôle/)).toBeInTheDocument()
  })
  it('avec des séances : la note, ce sur quoi elle repose, le chapitre à revoir', () => {
    localStorage.setItem('reviz-revisions', JSON.stringify([
      { type: 'exercices', lessonId: 'prog-3eme-maths-theoreme-de-thales', score: 9, total: 10, revisedAt: Date.now() - 3_600_000 },
    ]))
    render(<PlanRevision controle={controle} agenda={{}} hasRevizPlus onLancer={() => {}} />)
    expect(screen.getByText('Note estimée')).toBeInTheDocument()
    expect(screen.getByText('13,5')).toBeInTheDocument()
    expect(screen.getByText(/D’après ta séance\./)).toBeInTheDocument()
    expect(screen.getByText(/Revois « Le théorème de Pythagore » : tu peux viser 17,5\./)).toBeInTheDocument()
  })
})
