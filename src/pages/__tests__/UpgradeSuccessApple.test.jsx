// Bienvenue après un achat dans l'app iPhone : prix de l'App Store, renouvellement, résiliation
// dans les réglages de l'iPhone, et ce que Réviz+ débloque, expliqué (Johan, 18/11).
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const auth = { currentUser: { displayName: 'Johan Test' }, refreshPremium: vi.fn(async () => {}), isPremium: true,
  abonnement: { source: 'apple', formule: 'mensuel', periodeFin: Date.parse('2026-12-18T12:00:00Z'), annuleLe: null } }
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../../hooks/useMediaQuery', () => ({ useIsDesktop: () => false }))
vi.mock('../../components/Pantin', async () => { const { forwardRef } = await import('react'); return { Pantin: forwardRef(() => null) } })
const mesurer = vi.fn()
vi.mock('../../services/mesure', () => ({ mesurer: (...a) => mesurer(...a) }))

const { default: UpgradeSuccess } = await import('../UpgradeSuccess')

describe('UpgradeSuccess — achat App Store', () => {
  it('montre le prix Apple, le renouvellement et la résiliation dans l’iPhone', () => {
    render(<MemoryRouter initialEntries={['/upgrade-success?magasin=apple&formule=mensuel&prix=7%2C99%20%E2%82%AC']}><UpgradeSuccess /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Bienvenue dans Réviz+, Johan.' })).toBeInTheDocument()
    expect(screen.getByText('7,99 €')).toBeInTheDocument()
    expect(screen.queryByText('6,99 €')).not.toBeInTheDocument()
    expect(screen.getByText('Prochain renouvellement')).toBeInTheDocument()
    expect(screen.getByText(/réglages de l’iPhone/)).toBeInTheDocument()
    expect(screen.getByText('Séances d’exercices illimitées')).toBeInTheDocument()
    expect(screen.getByText(/Au lieu de 10 par semaine/)).toBeInTheDocument()
    expect(mesurer).not.toHaveBeenCalled()
  })
})
