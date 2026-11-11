// Paiement Réviz+ (11/11) : le titre reprend ce qui a bloqué l'élève, l'annuel ramené à la
// semaine, et le compte à rebours jusqu'au retour du quota. (Le DOM de test lit les espaces
// insécables comme des espaces simples.)
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ consent: {}, isGuest: false }) }))
vi.mock('../../../services/billingService', () => ({ startCheckout: vi.fn(), demanderAuParent: vi.fn() }))
vi.mock('../../../../api/_lancement.js', async orig => ({ ...(await orig()), tarifFondateurOuvert: () => false }))

const { DecouvrirRevizPlus, LimiteAtteinte } = await import('../RevizPlusOffre')
const ecrire = el => render(<MemoryRouter>{el}</MemoryRouter>)

describe('paiement Réviz+', () => {
  afterEach(() => vi.useRealTimers())

  it('le titre reprend ce qui a bloqué l’élève', () => {
    ecrire(<DecouvrirRevizPlus lieu="limite_exercices" onClose={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Continue tes exercices' })).toBeInTheDocument()
    expect(screen.getByText(/Tes 3 séances du jour sont faites/)).toBeInTheDocument()
  })
  it('sans blocage connu, le titre habituel', () => {
    ecrire(<DecouvrirRevizPlus lieu="badge" onClose={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Réviz+' })).toBeInTheDocument()
  })
  it('l’annuel ramené à la semaine', () => {
    ecrire(<DecouvrirRevizPlus lieu="coach" onClose={() => {}} />)
    expect(screen.getByText('soit 0,94 € par semaine')).toBeInTheDocument()
  })
  it('la limite d’exercices dit dans combien de temps les séances reviennent', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-11T19:48:00+01:00'))
    ecrire(<LimiteAtteinte type="exercices" onClose={() => {}} />)
    expect(screen.getByText('Tu as fait tes 3 séances d’exercices du jour. Elles reviennent dans 4 h 12 min.')).toBeInTheDocument()
  })
  it('les scans de la semaine : « lundi » tant que c’est loin, puis le compte à rebours', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-11T10:00:00+01:00'))
    const { unmount } = ecrire(<LimiteAtteinte type="scan" onClose={() => {}} />)
    expect(screen.getByText(/Ils reviennent lundi\./)).toBeInTheDocument()
    unmount()
    vi.setSystemTime(new Date('2026-11-15T22:30:00+01:00'))
    ecrire(<LimiteAtteinte type="scan" onClose={() => {}} />)
    expect(screen.getByText(/Ils reviennent dans 1 h 30 min\./)).toBeInTheDocument()
  })
  it('depuis la limite, l’offre garde le blocage dans son titre', () => {
    ecrire(<LimiteAtteinte type="ia" onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '50 questions par jour avec Réviz+' }))
    expect(screen.getByRole('heading', { name: 'Pose toutes tes questions' })).toBeInTheDocument()
  })
})
