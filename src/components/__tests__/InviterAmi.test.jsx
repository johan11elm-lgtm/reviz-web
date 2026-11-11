// « Invite un ami de ta classe » dans Moi, et le bandeau d'accueil qui annonce les bonnes nouvelles.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const ctx = vi.hoisted(() => ({ valeur: {} }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ctx.valeur }))
vi.mock('../../services/apiClient', () => ({ IS_NATIVE: false, apiFetch: vi.fn() }))

const { InviterAmi } = await import('../moi/InviterAmi')
const { ParrainageBanner } = await import('../ParrainageBanner')

const hier = new Date(Date.now() - 24 * 3600 * 1000).toUTCString()
function eleve(extra = {}) {
  return {
    currentUser: { uid: 'u1', metadata: { creationTime: hier } },
    isGuest: false, isPremium: false, parrainage: {},
    chargerParrainage: vi.fn(async () => ({ code: 'ABC234', filleuls: 0, fin: null })),
    utiliserCodeParrain: vi.fn(async () => ({ ok: true, fin: Date.now() + 3 * 864e5 })),
    ...extra,
  }
}

describe('<InviterAmi />', () => {
  beforeEach(() => { localStorage.clear(); ctx.valeur = eleve() })

  it('rien pour un élève en essai sans compte', () => {
    ctx.valeur = eleve({ isGuest: true })
    const { container } = render(<InviterAmi />)
    expect(container).toBeEmptyDOMElement()
  })
  it('crée le lien à la demande et l’affiche avec le code', async () => {
    render(<InviterAmi />)
    expect(screen.getByText('Invite un ami de ta classe')).toBeInTheDocument()
    expect(screen.getByText(/Il reçoit 3\sjours de Réviz\+ en créant son compte avec ton lien\. Toi aussi\./)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Inviter un ami' }))
    await waitFor(() => expect(ctx.valeur.chargerParrainage).toHaveBeenCalled())
  })
  it('lien déjà créé : copier, le code, et le bilan des amis inscrits', () => {
    ctx.valeur = eleve({ parrainage: { code: 'ABC234', filleuls: 2, fin: Date.now() + 864e5 } })
    render(<InviterAmi />)
    expect(screen.getByLabelText('Ton lien d’invitation')).toHaveValue(`${window.location.origin}/?parrain=ABC234`)
    expect(screen.getByText('2 amis inscrits avec ton lien')).toBeInTheDocument()
    expect(screen.getByText(/Réviz\+ offert jusqu’à/)).toBeInTheDocument()
    expect(screen.getByText(/Ton code\s: ABC234/)).toBeInTheDocument()
  })
  it('un abonné : la récompense est pour son ami seulement', () => {
    ctx.valeur = eleve({ isPremium: true })
    render(<InviterAmi />)
    expect(screen.queryByText(/Toi aussi/)).not.toBeInTheDocument()
  })
  it('nouveau compte : on peut taper le code d’un ami', async () => {
    render(<InviterAmi />)
    fireEvent.click(screen.getByRole('button', { name: 'Un ami t’a donné son code ?' }))
    fireEvent.change(screen.getByLabelText('Le code de ton ami'), { target: { value: 'abc' } })
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('6 lettres et chiffres')
    fireEvent.change(screen.getByLabelText('Le code de ton ami'), { target: { value: 'xyz 789' } })
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }))
    expect(await screen.findByRole('status')).toHaveTextContent(/Code accepté/)
    expect(ctx.valeur.utiliserCodeParrain).toHaveBeenCalledWith('XYZ789')
  })
  it('un refus du serveur est expliqué', async () => {
    ctx.valeur = eleve({ utiliserCodeParrain: vi.fn(async () => ({ ok: false, erreur: 'SOI_MEME' })) })
    render(<InviterAmi />)
    fireEvent.click(screen.getByRole('button', { name: 'Un ami t’a donné son code ?' }))
    fireEvent.change(screen.getByLabelText('Le code de ton ami'), { target: { value: 'ABC234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('ton propre code')
  })
  it('compte de plus d’une semaine, ou déjà parrainé : pas de saisie', () => {
    ctx.valeur = eleve({ currentUser: { uid: 'u1', metadata: { creationTime: new Date(Date.now() - 9 * 864e5).toUTCString() } } })
    const { unmount } = render(<InviterAmi />)
    expect(screen.queryByRole('button', { name: 'Un ami t’a donné son code ?' })).not.toBeInTheDocument()
    unmount()
    ctx.valeur = eleve({ parrainage: { utiliseLe: Date.now() } })
    render(<InviterAmi />)
    expect(screen.queryByRole('button', { name: 'Un ami t’a donné son code ?' })).not.toBeInTheDocument()
  })
})

describe('<ParrainageBanner />', () => {
  beforeEach(() => localStorage.clear())
  const afficher = () => render(<MemoryRouter><ParrainageBanner /></MemoryRouter>)

  it('rien sans nouvelle', () => {
    ctx.valeur = eleve({ parrainage: { code: 'ABC234', filleuls: 0 } })
    const { container } = afficher()
    expect(container).toBeEmptyDOMElement()
  })
  it('le code d’un ami accepté : annoncé une fois', () => {
    ctx.valeur = eleve({ parrainage: { utiliseLe: Date.now(), fin: Date.now() + 3 * 864e5 } })
    const { unmount } = afficher()
    expect(screen.getByRole('status')).toHaveTextContent(/Code de ton ami accepté · Réviz\+ offert jusqu’au/)
    fireEvent.click(screen.getByRole('button', { name: 'Super' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    unmount()
    afficher()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
  it('un ami inscrit avec le lien : annoncé, puis le suivant seulement', () => {
    ctx.valeur = eleve({ parrainage: { code: 'ABC234', filleuls: 1, fin: Date.now() + 3 * 864e5 } })
    const { unmount } = afficher()
    expect(screen.getByRole('status')).toHaveTextContent(/Un ami a rejoint Réviz avec ton lien/)
    fireEvent.click(screen.getByRole('button', { name: 'Super' }))
    unmount()
    ctx.valeur = eleve({ parrainage: { code: 'ABC234', filleuls: 3, fin: Date.now() + 9 * 864e5 } })
    afficher()
    expect(screen.getByRole('status')).toHaveTextContent(/2 amis ont rejoint Réviz avec ton lien/)
  })
})
