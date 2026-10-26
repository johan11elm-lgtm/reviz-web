import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { jourIso, ajouterJours } from '../../utils/agenda'

const nav = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => nav }))
const auth = vi.hoisted(() => ({ guest: false }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ isGuest: auth.guest, currentUser: { uid: 'u1' }, getUserLevel: () => ({ cycle: 'college', classe: '4ème' }) }),
}))
const etat = vi.hoisted(() => ({ agenda: { controles: [], pronote: null } }))
vi.mock('../../services/agendaService', () => ({
  agendaLocal: () => etat.agenda,
  chargerAgenda: async () => etat.agenda,
  ajouterControle: vi.fn(async () => etat.agenda),
  supprimerControle: vi.fn(async () => ({ ...etat.agenda, controles: [] })),
  relierPronote: vi.fn(), delierPronote: vi.fn(),
  chargerCours: vi.fn(async () => []), coursEnCache: () => null, messageErreurPronote: () => 'Erreur',
}))
vi.mock('../../services/statsService', () => ({ track: vi.fn() }))

const { default: Agenda } = await import('../Agenda')
const renderPage = () => render(<MemoryRouter><Agenda /></MemoryRouter>)
const dans = n => ajouterJours(jourIso(), n)

describe('<Agenda />', () => {
  beforeEach(() => { nav.mockReset(); auth.guest = false; etat.agenda = { controles: [], pronote: null } })

  it('vide : Réviz explique, et on peut ajouter un contrôle', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Agenda' })).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: /Ajouter un contrôle/ })[0])
    expect(screen.getByRole('dialog', { name: 'Ajouter un contrôle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeDisabled()
  })

  it('le prochain contrôle : compte à rebours, et « Réviser » ouvre la matière', () => {
    etat.agenda = { controles: [
      { id: 'a', matiere: 'maths', titre: 'Puissances', date: dans(3) },
      { id: 'b', matiere: 'histoire', titre: 'La Révolution', date: dans(9) },
    ], pronote: null }
    renderPage()
    expect(screen.getByText('J-3')).toBeInTheDocument()
    expect(screen.getByText('Maths · Puissances')).toBeInTheDocument()
    expect(screen.getByText('Dans 9 jours')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Réviser/ }))
    expect(nav).toHaveBeenCalledWith('/programme?matiere=maths')
  })

  it('la veille : « Demain »', () => {
    etat.agenda = { controles: [{ id: 'a', matiere: 'maths', titre: '', date: dans(1) }], pronote: null }
    renderPage()
    expect(screen.getByText('Demain')).toBeInTheDocument()
  })

  it('Pronote pas relié : les étapes et « Coller le lien »', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /Relie ton emploi du temps Pronote|Relie Pronote/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Coller le lien' })).toBeInTheDocument()
  })

  it('mode essai : relier Pronote demande un compte gratuit', () => {
    auth.guest = true
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte gratuit' }))
    expect(nav).toHaveBeenCalledWith('/inscription')
  })
})
