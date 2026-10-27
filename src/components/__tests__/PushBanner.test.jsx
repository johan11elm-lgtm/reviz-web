import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const auth = vi.hoisted(() => ({ currentUser: { uid: 'u1', isAnonymous: false }, isGuest: false }))
const push = vi.hoisted(() => ({ etat: 'proposables', activer: vi.fn(), resync: vi.fn() }))
const revisions = vi.hoisted(() => ({ liste: [{ type: 'quiz' }] }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../../services/revisionService', () => ({ loadRevisions: () => revisions.liste }))
vi.mock('../../services/pushService', () => ({
  etatPush: () => push.etat,
  activerPush: (...a) => push.activer(...a),
  resynchroniserPush: () => push.resync(),
}))

const { PushBanner } = await import('../PushBanner')

beforeEach(() => {
  auth.currentUser = { uid: 'u1', isAnonymous: false }
  auth.isGuest = false
  push.etat = 'proposables'
  push.activer = vi.fn(async () => { push.etat = 'autorisees'; return { ok: true } })
  push.resync = vi.fn()
  revisions.liste = [{ type: 'quiz' }]
})

describe('<PushBanner />', () => {
  it('propose le rappel de 17 h à un compte qui a déjà révisé', async () => {
    const { container } = render(<PushBanner />)
    expect(screen.getByText('Un rappel à 17 h')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Activer' }))
    await waitFor(() => expect(container).toBeEmptyDOMElement())
    expect(push.activer).toHaveBeenCalledWith('accueil')
  })

  it('rien avant la première révision, en mode essai, ou une fois la réponse donnée', () => {
    revisions.liste = []
    expect(render(<PushBanner />).container).toBeEmptyDOMElement()
    revisions.liste = [{ type: 'quiz' }]
    auth.isGuest = true
    expect(render(<PushBanner />).container).toBeEmptyDOMElement()
    auth.isGuest = false
    for (const etat of ['autorisees', 'refusees', 'installer', 'indisponible']) {
      push.etat = etat
      expect(render(<PushBanner />).container).toBeEmptyDOMElement()
    }
  })

  it('renvoie l’abonnement déjà autorisé au serveur', () => {
    push.etat = 'autorisees'
    render(<PushBanner />)
    expect(push.resync).toHaveBeenCalled()
  })
})
