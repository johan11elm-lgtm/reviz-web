import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../../services/chatService', () => ({ CHAT_MAX_MESSAGE_LENGTH: 1000, sendCoachMessage: vi.fn() }))
vi.mock('../../services/billingService', () => ({ startCheckout: vi.fn() }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ isPremium: false, getUserLevel: () => ({ cycle: 'college', classe: '3ème' }) }),
}))
const lessons = vi.hoisted(() => ({ list: [] }))
vi.mock('../../services/historyService', () => ({ loadLessons: () => lessons.list }))

const { default: Coach } = await import('../Coach')

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/coach" element={<Coach />} /></Routes>
  </MemoryRouter>
)

describe('<Coach /> (page)', () => {
  beforeEach(() => { sessionStorage.clear() })

  it('ouvre sur la leçon demandée avec la conversation', () => {
    lessons.list = [
      { id: 'l1', metadata: { title: 'Pythagore' } },
      { id: 'l2', metadata: { title: 'Combustion' } },
    ]
    renderAt('/coach?lesson=l2')
    expect(screen.getByRole('heading', { name: 'Coach Réviz' })).toBeInTheDocument()
    expect(screen.getByText(/À propos de « Combustion »/)).toBeInTheDocument()
    expect(screen.getByLabelText('Ta question sur la leçon')).toBeInTheDocument()
    expect(screen.getByText('Explique-moi ça simplement')).toBeInTheDocument()
  })

  it('sans paramètre : dernière leçon scannée', () => {
    lessons.list = [{ id: 'l1', metadata: { title: 'Pythagore' } }]
    renderAt('/coach')
    expect(screen.getByText(/À propos de « Pythagore »/)).toBeInTheDocument()
  })

  it('sans leçon : état vide et CTA scan', () => {
    lessons.list = []
    renderAt('/coach')
    expect(screen.getByText(/Scanne une leçon pour lui poser tes questions/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Scanner une leçon' })).toHaveAttribute('href', '/scan')
    expect(screen.queryByLabelText('Ta question sur la leçon')).toBeNull()
  })
})
