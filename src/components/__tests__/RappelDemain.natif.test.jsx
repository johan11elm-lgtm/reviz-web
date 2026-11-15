// La carte « Je te rappelle demain ? » dans l'app iPhone (15/11) : notification locale à 18 h 30,
// et plus le Web Push, que l'app native n'a pas.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const auth = vi.hoisted(() => ({ currentUser: { uid: 'u1', isAnonymous: false }, isGuest: false }))
const rappel = vi.hoisted(() => ({ actif: false, refuse: false, enable: vi.fn() }))
const mesures = vi.hoisted(() => [])
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../../services/apiClient', () => ({ IS_NATIVE: true }))
vi.mock('../../services/pushService', () => ({
  etatPush: () => 'indisponible',
  activerPush: vi.fn(),
}))
vi.mock('../../services/reminderService', () => ({
  HEURE_RAPPEL_NATIF: '18 h 30',
  isReminderEnabled: () => rappel.actif,
  rappelRefuse: () => rappel.refuse,
  enableReminder: (...a) => rappel.enable(...a),
}))
vi.mock('../../services/historyService', () => ({ loadLessons: () => [{ id: 'l1', flashcardsCount: 4 }] }))
vi.mock('../../services/srsService', () => ({ countDueCards: () => 3 }))
vi.mock('../../services/mesure', () => ({ mesurer: (nom, props) => mesures.push({ nom, props }) }))

const { RappelDemain } = await import('../RappelDemain')
const { activerPush } = await import('../../services/pushService')

const carte = () => render(<MemoryRouter><RappelDemain /></MemoryRouter>)

beforeEach(() => {
  localStorage.clear()
  mesures.length = 0
  rappel.actif = false
  rappel.refuse = false
  rappel.enable = vi.fn(async () => ({ ok: true }))
})

describe('<RappelDemain /> dans l’app iPhone', () => {
  it('propose le rappel de 18 h 30 et l’active par une notification locale', async () => {
    carte()
    expect(screen.getByText('Je te rappelle demain ?')).toBeInTheDocument()
    expect(screen.getByText(/18 h 30/)).toBeInTheDocument()
    expect(mesures[0]).toEqual({ nom: 'rappel_propose', props: { lieu: 'fin_seance', etat: 'natif' } })
    fireEvent.click(screen.getByRole('button', { name: 'Oui, rappelle-moi' }))
    await waitFor(() => expect(screen.getByText(/C’est noté : un rappel à 18 h 30/)).toBeInTheDocument())
    // Fin de séance : l'élève vient de réviser, pas de rappel ce soir.
    expect(rappel.enable).toHaveBeenCalledWith(3, { faitAujourdhui: true })
    expect(activerPush).not.toHaveBeenCalled()
    expect(mesures.at(-1)).toEqual({ nom: 'push_activees', props: { emplacement: 'fin_seance', plateforme: 'ios' } })
  })

  it('refus d’iOS : renvoie vers les Réglages de l’iPhone', async () => {
    rappel.enable = vi.fn(async () => ({ ok: false, reason: 'denied' }))
    carte()
    fireEvent.click(screen.getByRole('button', { name: 'Oui, rappelle-moi' }))
    await waitFor(() => expect(screen.getByText(/Réglages de ton iPhone/)).toBeInTheDocument())
    expect(mesures.at(-1).nom).toBe('push_refusees')
  })

  it('rien si le rappel est déjà actif, ou déjà refusé sur cet appareil', () => {
    rappel.actif = true
    expect(carte().container).toBeEmptyDOMElement()
    rappel.actif = false
    rappel.refuse = true
    expect(carte().container).toBeEmptyDOMElement()
  })
})
