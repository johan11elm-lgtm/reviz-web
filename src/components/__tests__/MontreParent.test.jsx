import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

const auth = vi.hoisted(() => ({}))
const envoi = vi.hoisted(() => ({ fn: vi.fn() }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }))
const lien = vi.hoisted(() => ({ fn: vi.fn() }))
vi.mock('../../services/consentService', () => ({
  sendParentalConsent: (...a) => envoi.fn(...a),
  consentErrorMessage: c => (c === 'PARENT_EMAIL_IS_CHILD' ? "Utilise l'adresse d'un parent, pas la tienne." : 'Impossible d\'envoyer l\'email. Réessaie.'),
  lienPourParent: (...a) => lien.fn(...a),
  messagePourParent: r => (r ? `score ${r.score}/${r.total}` : 'sans score'),
}))
vi.mock('../../services/statsService', () => ({ track: vi.fn() }))
vi.mock('../../services/mesure', () => ({ mesurer: vi.fn() }))

const { MontreParent } = await import('../MontreParent')
const LECON = { id: 'prog-theoreme-de-thales', chapterId: 'theoreme-de-thales', classe: '3ème', matiere: 'Maths' }

beforeEach(() => {
  Object.assign(auth, { consent: { status: 'a-fournir', joursRestants: 12 }, isGuest: false, currentUser: { uid: 'u', displayName: 'Léa' }, refreshGate: vi.fn(async () => {}) })
  envoi.fn = vi.fn(async () => ({ ok: true }))
  // Le lien à partager est préparé à l'affichage de la carte.
  lien.fn = vi.fn(async () => ({ ok: true, lien: 'https://app.revizapp.fr/api/approve-consent?uid=u&e=1&s=x' }))
})

describe('<MontreParent />', () => {
  it('sans l’adresse en tête : le score part par message, avec le lien d’accord', async () => {
    lien.fn = vi.fn(async () => ({ ok: true, lien: 'https://app.revizapp.fr/api/approve-consent?uid=u&e=1&s=x&n=6&t=7' }))
    const partage = vi.fn(async () => {})
    Object.defineProperty(navigator, 'share', { value: partage, configurable: true, writable: true })
    try {
      render(<MontreParent score={6} total={7} lecon={LECON} />)
      // Demandé dès l'affichage, avec le score : au toucher, le partage part sans attendre.
      await waitFor(() => expect(lien.fn).toHaveBeenCalledWith({ score: 6, total: 7 }))
      await act(async () => {})
      fireEvent.click(screen.getByRole('button', { name: /Tu ne connais pas son adresse/ }))
      await waitFor(() => expect(partage).toHaveBeenCalled())
      expect(lien.fn).toHaveBeenCalledTimes(1)
      expect(partage.mock.calls[0][0]).toEqual({ text: 'score 6/7', url: expect.stringContaining('n=6&t=7') })
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Ton parent n’a plus qu’à ouvrir le lien'))
      expect(envoi.fn).not.toHaveBeenCalled()
    } finally { delete navigator.share }
  })

  it('propose d’envoyer le score à un parent, puis confirme', async () => {
    render(<MontreParent score={6} total={7} lecon={LECON} />)
    expect(screen.getByText('Montre ça à tes parents')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Adresse e-mail d\'un parent'), { target: { value: 'maman@test.fr' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    await waitFor(() => expect(screen.getByText('C\'est parti')).toBeInTheDocument())
    expect(envoi.fn).toHaveBeenCalledWith('maman@test.fr', 'Léa', { score: 6, total: 7, chapitre: { classe: '3ème', matiere: 'maths', id: 'theoreme-de-thales' } })
    expect(screen.getByText(/m•••@test\.fr/)).toBeInTheDocument()
    expect(auth.refreshGate).toHaveBeenCalled()
  })

  it('refuse une adresse mal tapée, et affiche l’erreur du serveur', async () => {
    render(<MontreParent score={6} total={7} lecon={LECON} />)
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Adresse e-mail invalide.')
    envoi.fn = vi.fn(async () => { throw new Error('PARENT_EMAIL_IS_CHILD') })
    fireEvent.change(screen.getByLabelText('Adresse e-mail d\'un parent'), { target: { value: 'lea@test.fr' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('pas la tienne'))
  })

  it('leçon scannée : le score seul, sans chapitre', async () => {
    render(<MontreParent score={3} total={5} lecon={{ id: '123', source: 'scan' }} />)
    fireEvent.change(screen.getByLabelText('Adresse e-mail d\'un parent'), { target: { value: 'papa@test.fr' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    await waitFor(() => expect(envoi.fn).toHaveBeenCalledWith('papa@test.fr', 'Léa', { score: 3, total: 5 }))
  })

  it('rien sous la moitié des points, en mode essai, ou quand l’adresse est déjà donnée', () => {
    expect(render(<MontreParent score={2} total={7} />).container).toBeEmptyDOMElement()
    auth.isGuest = true
    expect(render(<MontreParent score={6} total={7} />).container).toBeEmptyDOMElement()
    auth.isGuest = false
    for (const status of ['ok', 'en-attente', 'refuse', undefined]) {
      auth.consent = status ? { status } : null
      expect(render(<MontreParent score={6} total={7} />).container).toBeEmptyDOMElement()
    }
  })
})
