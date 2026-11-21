// Paiement Réviz+ (11/11) : le titre reprend ce qui a bloqué l'élève, l'annuel ramené à la
// semaine, et le compte à rebours jusqu'au retour du quota. (Le DOM de test lit les espaces
// insécables comme des espaces simples.)
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const auth = { consent: {}, isGuest: false }
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => auth }))
const lienPourOffrir = vi.fn(async () => 'https://app.revizapp.fr/api/abonnement?op=offrir&u=x')
vi.mock('../../../services/billingService', () => ({ startCheckout: vi.fn(), demanderAuParent: vi.fn(), lienPourOffrir, MESSAGE_OFFRIR: 'Coucou :' }))
const mesurer = vi.fn()
vi.mock('../../../services/mesure', () => ({ mesurer: (...a) => mesurer(...a) }))
vi.mock('../../../../api/_lancement.js', async orig => ({ ...(await orig()), tarifFondateurOuvert: () => false }))

const { DecouvrirRevizPlus, LimiteAtteinte, FinEssaiPlus, PaiementPasAbouti, DemanderParent, finEssaiVue, joursAvantBrevet } = await import('../RevizPlusOffre')
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
  it('paiement pas terminé : rien ne part tout seul, réessayer ou envoyer le lien au parent', () => {
    mesurer.mockClear()
    ecrire(<PaiementPasAbouti onClose={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Le paiement n’est pas allé au bout' })).toBeInTheDocument()
    expect(mesurer).toHaveBeenCalledWith('offre', { etape: 'paiement_annule' })
    expect(mesurer).not.toHaveBeenCalledWith('offre', expect.objectContaining({ etape: 'demande_parent' }))
    expect(screen.getByRole('button', { name: 'Demander à un parent de me l’offrir' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(screen.getByRole('heading', { name: 'On réessaie' })).toBeInTheDocument()
  })
})

describe('demander à un parent, par message', () => {
  const LIEN = 'https://app.revizapp.fr/api/abonnement?op=offrir&u=x'
  // Écran de téléphone par défaut (le DOM de test se dit large de 1 024 px, donc « ordinateur »).
  const ecran = large => { window.matchMedia = q => ({ matches: large && q.includes('min-width: 1024px'), addEventListener() {}, removeEventListener() {} }) }
  const matchMediaAvant = window.matchMedia
  beforeEach(() => ecran(false))
  afterEach(() => { delete navigator.share; mesurer.mockClear(); lienPourOffrir.mockClear(); window.matchMedia = matchMediaAvant })

  it('sur téléphone : le lien part par la feuille de partage, et la demande est mesurée', async () => {
    const share = vi.fn(async () => {})
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    ecrire(<DemanderParent lieu="limite_exercices" />)
    fireEvent.click(screen.getByRole('button', { name: 'Demander à un parent de me l’offrir' }))
    await waitFor(() => expect(lienPourOffrir).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: 'Lui envoyer par message' }))
    await waitFor(() => expect(share).toHaveBeenCalledWith({ text: 'Coucou :', url: LIEN }))
    expect(await screen.findByText(/Ton parent n’a plus qu’à ouvrir le lien/)).toBeInTheDocument()
    expect(mesurer).toHaveBeenCalledWith('offre', { etape: 'demande_parent', lieu: 'limite_exercices', moyen: 'message' })
    expect(lienPourOffrir).toHaveBeenCalledTimes(1)
  })
  it('partage annulé : le lien reste affiché et l’e-mail reste possible', async () => {
    Object.defineProperty(navigator, 'share', { value: vi.fn(async () => { throw new Error('AbortError') }), configurable: true })
    ecrire(<DemanderParent lieu="badge" />)
    fireEvent.click(screen.getByRole('button', { name: 'Demander à un parent de me l’offrir' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Lui envoyer par message' }))
    expect(await screen.findByLabelText('Lien à envoyer à ton parent')).toHaveValue(LIEN)
    expect(screen.getByRole('button', { name: 'Envoyer la demande' })).toBeInTheDocument()
    expect(mesurer).toHaveBeenCalledWith('offre', { etape: 'demande_parent_annulee', lieu: 'badge' })
  })
  it('sur ordinateur : le message se copie', async () => {
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    ecrire(<DemanderParent lieu="badge" />)
    fireEvent.click(screen.getByRole('button', { name: 'Demander à un parent de me l’offrir' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Copier le message à lui envoyer' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`Coucou : ${LIEN}`))
    expect(await screen.findByText(/Message copié/)).toBeInTheDocument()
    expect(mesurer).toHaveBeenCalledWith('offre', { etape: 'demande_parent', lieu: 'badge', moyen: 'copie' })
  })
  it('sur ordinateur, même si le navigateur sait partager : le message se copie', async () => {
    const share = vi.fn(async () => {})
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    ecran(true)
    ecrire(<DemanderParent lieu="badge" />)
    fireEvent.click(screen.getByRole('button', { name: 'Demander à un parent de me l’offrir' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Copier le message à lui envoyer' }))
    await waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(share).not.toHaveBeenCalled()
  })
  it('lien indisponible : l’erreur s’affiche, l’e-mail reste', async () => {
    lienPourOffrir.mockRejectedValue(new Error('HTTP_500'))
    ecrire(<DemanderParent lieu="badge" />)
    fireEvent.click(screen.getByRole('button', { name: 'Demander à un parent de me l’offrir' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Copier le message à lui envoyer' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Le lien n’a pas pu être créé')
    expect(screen.getByLabelText('L’adresse e-mail d’un parent')).toBeInTheDocument()
    lienPourOffrir.mockImplementation(async () => LIEN)
  })
})
