import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const nav = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => nav,
}))
const authState = vi.hoisted(() => ({ isGuest: false }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ getUserLevel: () => ({ cycle: 'college', classe: '4ème' }), isGuest: authState.isGuest }),
}))
vi.mock('firebase/firestore', () => ({
  setDoc: vi.fn(() => Promise.resolve()), deleteDoc: vi.fn(), doc: vi.fn(() => ({})),
  collection: vi.fn(), getDocs: vi.fn(), query: vi.fn(), orderBy: vi.fn(),
}))
vi.mock('../../services/firebaseConfig', () => ({ db: {}, auth: {} }))
vi.mock('../../services/scanLimitService', () => ({ incrementScanCount: vi.fn(), getScanStatus: () => ({ canScan: true }) }))
vi.mock('../../services/challengeService', () => ({ updateChallengeProgress: vi.fn() }))

const { default: Analyse } = await import('../Analyse')

const ID = 'prog-puissances'
const aiData = {
  metadata: { title: 'Puissances et notation scientifique', subject: 'Maths', excerpt: 'Les puissances.' },
  flashcards: Array.from({ length: 4 }, (_, i) => ({ front: `Q${i}`, back: `R${i}` })),
  quiz: Array.from({ length: 3 }, () => ({ question: 'q', choices: ['a', 'b'], correct: 0, explanation: 'e' })),
  resume: { intro: 'i', keyPoints: ['aⁿ : n facteurs égaux à a.', '10⁻ⁿ = 1/10ⁿ.'], sections: [], methode: null, pieges: [], keyTerms: [] },
  mindmap: { branches: [] },
}
const renderPage = () => render(
  <MemoryRouter initialEntries={['/analyse']}>
    <Routes><Route path="/analyse" element={<Analyse />} /></Routes>
  </MemoryRouter>
)
const DAY = 86400000

beforeEach(() => {
  localStorage.clear()
  nav.mockClear()
  authState.isGuest = false
  localStorage.setItem('reviz-ai-data', JSON.stringify(aiData))
  localStorage.setItem('reviz-current-lesson-id', ID)
})

describe('<Analyse /> fiche chapitre', () => {
  it('à découvrir : Réviz propose le résumé, rien n’est fait sur le parcours', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Puissances et notation scientifique' })).toBeInTheDocument()
    expect(screen.getByText('À découvrir')).toBeInTheDocument()
    expect(screen.getByText('Nouveau chapitre. On commence par le résumé ?')).toBeInTheDocument()
    expect(screen.getByText('Lis le résumé')).toBeInTheDocument()
    expect(screen.getByText('0 / 3')).toBeInTheDocument()
    // L'essentiel : les points clés du résumé.
    expect(screen.getByText('aⁿ : n facteurs égaux à a.')).toBeInTheDocument()
  })

  it('en cours : cartes vues, à revoir, et le parcours qui avance', () => {
    const now = Date.now()
    localStorage.setItem('reviz-revisions', JSON.stringify([{ id: 'r1', type: 'resume', lessonId: ID, revisedAt: now }]))
    localStorage.setItem('reviz-srs', JSON.stringify({
      [`${ID}_0`]: { interval: 3, reps: 2, ease: 2.5, nextReview: now + 3 * DAY },
      [`${ID}_1`]: { interval: 1, reps: 1, ease: 2.5, nextReview: now - DAY },
    }))
    renderPage()
    expect(screen.getByText('1 carte à travailler')).toBeInTheDocument()
    expect(screen.getByText('2 cartes sur 4 déjà vues. On revoit tes cartes ?')).toBeInTheDocument()
    expect(screen.getByText('Revois ta carte')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Résumé : Lu, fait' })).toHaveAttribute('href', '/resume')
    expect(screen.getByRole('link', { name: 'Flashcards : 2 / 4 vues' })).toHaveAttribute('href', '/flashcards')
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('maîtrisé : toutes les cartes sues, quiz et carte mentale ouverts', () => {
    const now = Date.now()
    localStorage.setItem('reviz-revisions', JSON.stringify(['quiz', 'mindmap', 'resume'].map((type, i) => ({ id: `r${i}`, type, lessonId: ID, revisedAt: now }))))
    localStorage.setItem('reviz-srs', JSON.stringify(Object.fromEntries(
      [0, 1, 2, 3].map(i => [`${ID}_${i}`, { interval: 6, reps: 3, ease: 2.5, nextReview: now + 5 * DAY }]))))
    renderPage()
    expect(screen.getByText('Maîtrisé')).toBeInTheDocument()
    expect(screen.getByText('Chapitre maîtrisé. Une révision rapide dans une semaine.')).toBeInTheDocument()
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
    expect(screen.getByLabelText('vue')).toBeInTheDocument()
  })

  it('Réviz IA reçoit la question posée depuis la fiche (ordinateur)', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Ta question à Réviz IA'), { target: { value: 'Pourquoi 10⁰ = 1 ?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer à Réviz IA' }))
    expect(nav).toHaveBeenCalledWith(`/coach?lesson=${ID}`, { state: { question: 'Pourquoi 10⁰ = 1 ?' } })
  })

  it('en mode essai, pas d’accès à Réviz IA', () => {
    authState.isGuest = true
    renderPage()
    expect(screen.queryByLabelText('Ta question à Réviz IA')).not.toBeInTheDocument()
    expect(document.querySelector('a[href^="/coach"]')).toBeNull()
  })
})
