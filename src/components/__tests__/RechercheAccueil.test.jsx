import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('../../services/programmeService', () => ({ openChapter: vi.fn().mockResolvedValue() }))
vi.mock('../../services/historyService', () => ({ restoreLesson: () => true }))
vi.mock('../../services/statsService', () => ({ track: vi.fn() }))
const { RechercheAccueil, EXEMPLES_RECHERCHE } = await import('../RechercheAccueil')

const catalogue = JSON.parse(readFileSync(join(process.cwd(), 'public/programme/4eme/index.json'), 'utf8'))
function Coach() {
  const { state } = useLocation()
  return <p>Réviz IA : {state?.question}</p>
}
const rendre = () => render(
  <MemoryRouter initialEntries={['/']}>
    <Routes>
      <Route path="/" element={<RechercheAccueil classe="4ème" catalogue={catalogue} lecons={[]} />} />
      <Route path="/coach" element={<Coach />} />
    </Routes>
  </MemoryRouter>
)

describe('<RechercheAccueil />', () => {
  it('les chapitres de la classe, et « Demander à Réviz IA » en premier', () => {
    rendre()
    const champ = screen.getByLabelText('Chercher un chapitre ou demander à Réviz IA')
    fireEvent.focus(champ)
    fireEvent.change(champ, { target: { value: 'pythagore' } })
    expect(screen.getAllByRole('button')[0]).toHaveTextContent('Demander à Réviz IA« pythagore »')
    expect(screen.getByRole('button', { name: /Racine carrée et théorème de Pythagore/ })).toBeInTheDocument()
  })

  it('iPhone : le champ perd le focus sans le donner au bouton, le toucher envoie quand même la question', () => {
    vi.useFakeTimers()
    try {
      rendre()
      const champ = screen.getByLabelText('Chercher un chapitre ou demander à Réviz IA')
      fireEvent.focus(champ)
      fireEvent.change(champ, { target: { value: 'c’est quoi une fraction' } })
      // Ce que fait Safari : blur du champ (relatedTarget vide), puis le clic sur le bouton.
      fireEvent.blur(champ, { relatedTarget: null })
      fireEvent.click(screen.getByRole('button', { name: /Demander à Réviz IA/ }))
      expect(screen.getByText('Réviz IA : c’est quoi une fraction')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('champ vide : les exemples se tapent lettre à lettre ; touché, un exemple entier', () => {
    vi.useFakeTimers()
    try {
      rendre()
      const champ = screen.getByLabelText('Chercher un chapitre ou demander à Réviz IA')
      act(() => vi.advanceTimersByTime(600 + 45 * 4))
      expect(champ).toHaveAttribute('placeholder', EXEMPLES_RECHERCHE[0].slice(0, 5))
      act(() => vi.advanceTimersByTime(45 * 60 + 1800 + 22 * 60 + 350 + 45 * 3))
      expect(EXEMPLES_RECHERCHE[1].startsWith(champ.getAttribute('placeholder'))).toBe(true)
      fireEvent.focus(champ)
      expect(champ).toHaveAttribute('placeholder', EXEMPLES_RECHERCHE[1])
    } finally {
      vi.useRealTimers()
    }
  })

  it('le focus parti ailleurs, la liste se referme', () => {
    vi.useFakeTimers()
    try {
      rendre()
      const champ = screen.getByLabelText('Chercher un chapitre ou demander à Réviz IA')
      fireEvent.focus(champ)
      fireEvent.change(champ, { target: { value: 'pythagore' } })
      fireEvent.blur(champ, { relatedTarget: null })
      act(() => vi.advanceTimersByTime(300))
      expect(screen.queryByRole('button', { name: /Demander à Réviz IA/ })).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})
