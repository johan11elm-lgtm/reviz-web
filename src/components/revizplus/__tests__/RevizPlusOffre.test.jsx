// Paiement Réviz+ (11/11) : le titre reprend ce qui a bloqué l'élève, l'annuel ramené à la
// semaine, et le compte à rebours jusqu'au retour du quota. (Le DOM de test lit les espaces
// insécables comme des espaces simples.)
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const auth = { consent: {}, isGuest: false }
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../../../services/billingService', () => ({ startCheckout: vi.fn(), demanderAuParent: vi.fn() }))
vi.mock('../../../../api/_lancement.js', async orig => ({ ...(await orig()), tarifFondateurOuvert: () => false }))

const { DecouvrirRevizPlus, LimiteAtteinte, FinEssaiPlus, finEssaiVue, joursAvantBrevet } = await import('../RevizPlusOffre')
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

  it('l’offre s’adresse à l’élève et rappelle le brevet en 3e', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-17T12:00:00+01:00'))
    auth.currentUser = { displayName: 'Ethan Martin' }
    auth.getUserLevel = () => ({ classe: '3ème' })
    const { unmount } = ecrire(<DecouvrirRevizPlus lieu="badge" onClose={() => {}} />)
    expect(screen.getByText('Pour Ethan · brevet dans 219 jours')).toBeInTheDocument()
    unmount()
    auth.getUserLevel = () => ({ classe: '5ème' })
    ecrire(<DecouvrirRevizPlus lieu="badge" onClose={() => {}} />)
    expect(screen.getByText('Pour Ethan')).toBeInTheDocument()
    delete auth.currentUser; delete auth.getUserLevel
  })
  it('pas de brevet hors 3e ni une fois passé', () => {
    expect(joursAvantBrevet('4ème')).toBeNull()
    expect(joursAvantBrevet('3ème', Date.parse('2027-07-01'))).toBeNull()
  })
  it('rassure et explique pourquoi ce n’est pas gratuit', () => {
    ecrire(<DecouvrirRevizPlus lieu="badge" onClose={() => {}} />)
    expect(screen.getByText('Sans publicité')).toBeInTheDocument()
    expect(screen.getByText('Pourquoi Réviz+ n’est pas gratuit ?')).toBeInTheDocument()
    expect(screen.getByText(/moins cher que deux heures de cours particulier/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: /Au mois/ }))
    expect(screen.queryByText(/deux heures de cours particulier/)).not.toBeInTheDocument()
  })
  it('fin d’essai : dit ce qui revient, une seule fois, puis mène à l’offre', () => {
    localStorage.clear()
    expect(finEssaiVue('u1')).toBe(false)
    ecrire(<FinEssaiPlus uid="u1" onClose={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Ta semaine de Réviz+ est finie' })).toBeInTheDocument()
    expect(finEssaiVue('u1')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Garder Réviz+' }))
    expect(screen.getByRole('heading', { name: 'Garde Réviz+' })).toBeInTheDocument()
  })
})
