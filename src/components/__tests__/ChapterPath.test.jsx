import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { ChapterPath } from '../ChapterPath'

const ch = (id, ordre, periode, pret = true) => ({ id, titre: `Chapitre ${id}`, ordre, periode, notions: ['Notion A', 'Notion B'], pret, flashcards: 8, quiz: 7 })
const items = [
  { chapter: ch('a', 1, 'T1'), state: 'maitrise', dueCards: 0 },
  { chapter: ch('b', 2, 'T1'), state: 'a-revoir', dueCards: 3 },
  { chapter: ch('c', 3, 'T2'), state: 'nouveau', dueCards: 0 },
  { chapter: ch('d', 4, 'T2', false), state: 'nouveau', dueCards: 0 },
]

function Harness({ onOpen }) {
  const [sel, setSel] = useState(null)
  return <ChapterPath items={items} mascot="maths" selectedId={sel} onSelect={setSel} onOpen={onOpen} opening={null} />
}

describe('<ChapterPath />', () => {
  it('regroupe par trimestre et compte les chapitres maîtrisés', () => {
    render(<Harness onOpen={() => {}} />)
    expect(screen.getByText('1er trimestre')).toBeInTheDocument()
    expect(screen.getByText('2e trimestre')).toBeInTheDocument()
    expect(screen.getByText('1 / 2 maîtrisés')).toBeInTheDocument()
  })

  it('l’étape en cours est le premier chapitre prêt non maîtrisé', () => {
    const { container } = render(<Harness onOpen={() => {}} />)
    const current = container.querySelector('.path-step--current')
    expect(current.textContent).toContain('Chapitre b')
    expect(screen.getByText('Continuer')).toBeInTheDocument()
  })

  it('états dans le nom accessible, chapitre pas prêt désactivé', () => {
    render(<Harness onOpen={() => {}} />)
    expect(screen.getByRole('button', { name: '2. Chapitre b — 3 à revoir' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '4. Chapitre d — Bientôt' })).toBeDisabled()
  })

  it('un clic ouvre la fiche, son bouton ouvre le chapitre, Échap la ferme', () => {
    const onOpen = vi.fn()
    render(<Harness onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button', { name: /Chapitre c/ }))
    expect(screen.getByRole('dialog', { name: 'Chapitre c' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Commencer le chapitre/ }))
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'c' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
