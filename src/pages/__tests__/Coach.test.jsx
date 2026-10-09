import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../../services/chatService', () => ({ CHAT_MAX_MESSAGE_LENGTH: 1000, sendCoachMessage: vi.fn() }))
vi.mock('../../services/billingService', () => ({ startCheckout: vi.fn() }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ isPremium: false, getUserLevel: () => ({ cycle: 'college', classe: '3ème' }) }),
}))
const lessons = vi.hoisted(() => ({ list: [] }))
vi.mock('../../services/historyService', () => ({ loadLessons: () => lessons.list }))
const screenSize = vi.hoisted(() => ({ desktop: false }))
vi.mock('../../hooks/useMediaQuery', () => ({ useIsDesktop: () => screenSize.desktop }))

const { default: Coach } = await import('../Coach')

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/coach" element={<Coach />} /></Routes>
  </MemoryRouter>
)

describe('<Coach /> (page)', () => {
  beforeEach(() => { sessionStorage.clear(); screenSize.desktop = false })

  it('ouvre sur la leçon demandée avec la conversation', () => {
    lessons.list = [
      { id: 'l1', metadata: { title: 'Pythagore', subject: 'Maths' } },
      { id: 'l2', metadata: { title: 'Combustion', subject: 'Physique-Chimie' } },
    ]
    renderAt('/coach?lesson=l2')
    expect(screen.getByRole('heading', { name: 'Combustion' })).toBeInTheDocument()
    expect(screen.getByText(/Je connais ta leçon « Combustion »/)).toBeInTheDocument()
    expect(screen.getByLabelText('Ta question sur la leçon')).toBeInTheDocument()
    expect(screen.getByText('Explique-moi ça simplement')).toBeInTheDocument()
  })

  it('sans paramètre (téléphone) : la liste des conversations, un tap ouvre la leçon', () => {
    lessons.list = [
      { id: 'l1', metadata: { title: 'Pythagore', subject: 'Maths' } },
      { id: 'l2', metadata: { title: 'Combustion', subject: 'Physique-Chimie' } },
    ]
    renderAt('/coach')
    expect(screen.getByRole('heading', { name: 'Coach Réviz' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Ta question sur la leçon')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Combustion/ }))
    expect(screen.getByRole('heading', { name: 'Combustion' })).toBeInTheDocument()
    expect(screen.getByLabelText('Ta question sur la leçon')).toBeInTheDocument()
  })

  it('sans paramètre (ordinateur) : liste à gauche et dernière leçon ouverte', () => {
    screenSize.desktop = true
    lessons.list = [{ id: 'l1', metadata: { title: 'Pythagore', subject: 'Maths' } }]
    renderAt('/coach')
    expect(screen.getByRole('complementary', { name: 'Tes conversations' })).toBeInTheDocument()
    expect(screen.getByText(/Je connais ta leçon « Pythagore »/)).toBeInTheDocument()
  })

  it('les discussions entamées remontent, avec leur dernier message', () => {
    lessons.list = [
      { id: 'l1', metadata: { title: 'Pythagore', subject: 'Maths' } },
      { id: 'l2', metadata: { title: 'Combustion', subject: 'Physique-Chimie' } },
    ]
    sessionStorage.setItem('reviz-coach-l2', JSON.stringify([
      { role: 'user', content: 'C’est quoi un réactif ?' },
      { role: 'assistant', content: 'Un **réactif** est consommé pendant la réaction.' },
    ]))
    renderAt('/coach')
    expect(screen.getByRole('heading', { name: 'Tes discussions' })).toBeInTheDocument()
    const items = screen.getAllByRole('button', { name: /Pythagore|Combustion/ })
    expect(items[0]).toHaveTextContent('Combustion')
    expect(items[0]).toHaveTextContent('Coach : Un réactif est consommé pendant la réaction.')
  })

  it('sans leçon : état vide, programme et scan proposés', () => {
    lessons.list = []
    renderAt('/coach')
    expect(screen.getByText(/Ouvre une leçon pour lui poser tes questions/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ouvrir mon programme' })).toHaveAttribute('href', '/programme')
    expect(screen.getByRole('link', { name: 'Scanner une leçon' })).toHaveAttribute('href', '/scan')
    expect(screen.queryByLabelText('Ta question sur la leçon')).toBeNull()
  })
})
