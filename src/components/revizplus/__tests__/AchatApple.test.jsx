// Réviz+ dans l'app iOS (18/11) : prix de l'App Store, achat intégré, « Demander l'achat »
// (Partage familial), « Restaurer mes achats », et jamais de lien vers le paiement Stripe.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const refreshPremium = vi.fn(async () => {})
const auth = { consent: {}, isGuest: false, refreshPremium }
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../../../services/billingService', () => ({ startCheckout: vi.fn(), demanderAuParent: vi.fn(), lienPourOffrir: vi.fn(), MESSAGE_OFFRIR: '' }))
vi.mock('../../../services/mesure', () => ({ mesurer: vi.fn() }))
vi.mock('../../../../api/_lancement.js', async orig => ({ ...(await orig()), tarifFondateurOuvert: () => false }))
vi.mock('../../../utils/achat', () => ({ ACHAT_DANS_L_APP: true, ACHAT_APPLE: true, ACHAT_STRIPE: false }))
const FORMULES = {
  annuel: { prix: '54,99 €', centimes: 5499, devise: 'EUR', produit: { identifier: 'com.reviz.app.plus.annuel' } },
  mensuel: { prix: '7,99 €', centimes: 799, devise: 'EUR', produit: { identifier: 'com.reviz.app.plus.mensuel' } },
}
const formulesApple = vi.fn(async () => FORMULES)
const acheterApple = vi.fn()
const restaurerApple = vi.fn()
vi.mock('../../../services/achatApple', () => ({ formulesApple: () => formulesApple(), acheterApple: (...a) => acheterApple(...a), restaurerApple: () => restaurerApple() }))

const { DecouvrirRevizPlus, DemanderParent } = await import('../RevizPlusOffre')
const ecrire = el => render(<MemoryRouter>{el}</MemoryRouter>)

describe('Réviz+ dans l’app iOS', () => {
  beforeEach(() => { acheterApple.mockReset(); restaurerApple.mockReset(); refreshPremium.mockClear() })

  it('affiche les prix de l’App Store, les conditions et « Restaurer »', async () => {
    ecrire(<DecouvrirRevizPlus lieu="coach" onClose={() => {}} />)
    expect(await screen.findByText('54,99 €')).toBeInTheDocument()
    expect(screen.getByText('7,99 €')).toBeInTheDocument()
    expect(screen.getByText(/renouvelé automatiquement au même prix/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Conditions d’utilisation' })).toHaveAttribute('href', '/legal/cgu')
    expect(screen.getByRole('button', { name: 'Restaurer mes achats' })).toBeInTheDocument()
    expect(screen.queryByText(/Stripe/)).not.toBeInTheDocument()
  })

  it('achat réussi : Réviz+ relu, écran de bienvenue', async () => {
    acheterApple.mockResolvedValue('achete')
    ecrire(<DecouvrirRevizPlus lieu="coach" onClose={() => {}} />)
    fireEvent.click(await screen.findByRole('radio', { name: /Au mois/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Passer à Réviz+' }))
    expect(await screen.findByRole('heading', { name: 'Bienvenue dans Réviz+' })).toBeInTheDocument()
    expect(acheterApple).toHaveBeenCalledWith('mensuel', FORMULES)
    expect(refreshPremium).toHaveBeenCalled()
  })

  it('« Demander l’achat » : le parent valide, l’élève est prévenu', async () => {
    acheterApple.mockResolvedValue('en_attente')
    ecrire(<DecouvrirRevizPlus lieu="coach" onClose={() => {}} />)
    await screen.findByText('54,99 €')
    fireEvent.click(screen.getByRole('button', { name: 'Passer à Réviz+' }))
    expect(await screen.findByRole('heading', { name: 'Demande envoyée' })).toBeInTheDocument()
  })

  it('achat annulé : l’offre reste là, sans message', async () => {
    acheterApple.mockResolvedValue('annule')
    ecrire(<DecouvrirRevizPlus lieu="coach" onClose={() => {}} />)
    await screen.findByText('54,99 €')
    fireEvent.click(screen.getByRole('button', { name: 'Passer à Réviz+' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Passer à Réviz+' })).not.toBeDisabled())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('restaurer sans abonnement : le dit', async () => {
    restaurerApple.mockResolvedValue(false)
    ecrire(<DecouvrirRevizPlus lieu="coach" onClose={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Restaurer mes achats' }))
    expect(await screen.findByText('Aucun abonnement Réviz+ trouvé sur ce compte Apple.')).toBeInTheDocument()
  })

  it('App Store injoignable : message, pas de bouton actif', async () => {
    formulesApple.mockRejectedValueOnce(new Error('INDISPONIBLE'))
    ecrire(<DecouvrirRevizPlus lieu="coach" onClose={() => {}} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('L’App Store ne répond pas')
    expect(screen.getByRole('button', { name: 'Passer à Réviz+' })).toBeDisabled()
  })

  it('pas de « demander à un parent » par lien (paiement Stripe)', () => {
    const { container } = ecrire(<DemanderParent lieu="coach" enBouton />)
    expect(container).toBeEmptyDOMElement()
  })
})
