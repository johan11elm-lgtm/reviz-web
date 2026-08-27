import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const sendCoachMessage = vi.fn()
const startCheckout = vi.fn()

vi.mock('../../services/chatService', () => ({
  CHAT_MAX_MESSAGE_LENGTH: 1000,
  sendCoachMessage: (...a) => sendCoachMessage(...a),
}))
vi.mock('../../services/billingService', () => ({
  startCheckout: (...a) => startCheckout(...a),
}))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    isPremium: false,
    getUserLevel: () => ({ cycle: 'college', classe: '3ème' }),
  }),
}))

const { CoachChat, renderCoachText } = await import('../CoachChat')

function setup() {
  const onClose = vi.fn()
  render(
    <MemoryRouter>
      <CoachChat isOpen onClose={onClose} lessonId="l1" lessonTitle="Pythagore" />
    </MemoryRouter>
  )
  return { onClose }
}

describe('renderCoachText', () => {
  it('rend **gras** en <strong> et garde le reste en texte', () => {
    render(<p>{renderCoachText('La **combustion** produit du CO₂.')}</p>)
    const strong = screen.getByText('combustion')
    expect(strong.tagName).toBe('STRONG')
    expect(screen.getByText(/produit du CO₂/)).toBeInTheDocument()
  })

  it('convertit les puces "- " en "• "', () => {
    render(<p>{renderCoachText('Il faut :\n- du carbone\n- de l\'oxygène')}</p>)
    expect(screen.getByText(/• du carbone/)).toBeInTheDocument()
  })

  it('laisse tel quel un ** non refermé (stream en cours)', () => {
    render(<p>{renderCoachText('Le point clé : **la combu')}</p>)
    expect(screen.getByText(/\*\*la combu/)).toBeInTheDocument()
  })
})

describe('<CoachChat />', () => {
  beforeEach(() => {
    sendCoachMessage.mockReset()
    startCheckout.mockReset()
    sessionStorage.clear()
  })

  it('expose role="dialog" aria-modal, l\'accueil du coach et les amorces', () => {
    setup()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText(/Pose-moi ta question/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Explique-moi ça simplement' })).toBeInTheDocument()
    expect(screen.getByLabelText('Ta question sur la leçon')).toBeInTheDocument()
  })

  it('Échap déclenche onClose', () => {
    const { onClose } = setup()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('envoie la question et affiche la réponse streamée', async () => {
    sendCoachMessage.mockResolvedValue({ text: 'Voilà mon explication !', remaining: 9 })
    setup()

    fireEvent.change(screen.getByLabelText('Ta question sur la leçon'), { target: { value: 'Explique c²' } })
    fireEvent.click(screen.getByLabelText('Envoyer la question'))

    expect(await screen.findByText('Voilà mon explication !')).toBeInTheDocument()
    expect(screen.getByText('Explique c²')).toBeInTheDocument()
    expect(sendCoachMessage).toHaveBeenCalledWith(expect.objectContaining({
      lessonId: 'l1',
      history: [{ role: 'user', content: 'Explique c²' }],
      level: { cycle: 'college', classe: '3ème' },
    }))
    // Conversation persistée pour réouverture dans la même session
    expect(JSON.parse(sessionStorage.getItem('reviz-coach-l1'))).toHaveLength(2)
  })

  it('une amorce cliquée part comme un message', async () => {
    sendCoachMessage.mockResolvedValue({ text: 'Réponse', remaining: 8 })
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Donne-moi un exemple concret' }))
    expect(await screen.findByText('Réponse')).toBeInTheDocument()
  })

  it('quota épuisé (CHAT_LIMIT) : message dédié + CTA Réviz+ pour un compte free', async () => {
    sendCoachMessage.mockRejectedValue(new Error('CHAT_LIMIT'))
    setup()

    fireEvent.change(screen.getByLabelText('Ta question sur la leçon'), { target: { value: 'Encore une !' } })
    fireEvent.click(screen.getByLabelText('Envoyer la question'))

    expect(await screen.findByText(/tous tes messages du jour/)).toBeInTheDocument()
    const upgrade = screen.getByRole('button', { name: /Passer à Réviz\+/ })
    fireEvent.click(upgrade)
    expect(startCheckout).toHaveBeenCalledTimes(1)
    // La saisie est désactivée tant que le quota est épuisé
    expect(screen.getByLabelText('Ta question sur la leçon')).toBeDisabled()
  })

  it('erreur réseau : notice affichée et question restaurée dans le champ', async () => {
    sendCoachMessage.mockRejectedValue(new Error('NETWORK_ERROR'))
    setup()

    fireEvent.change(screen.getByLabelText('Ta question sur la leçon'), { target: { value: 'Ma question' } })
    fireEvent.click(screen.getByLabelText('Envoyer la question'))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Pas de connexion/)
    expect(screen.getByLabelText('Ta question sur la leçon')).toHaveValue('Ma question')
  })
})
