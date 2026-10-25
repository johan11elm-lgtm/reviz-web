import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// La carte « Réviz Games » de l'accueil : état du jour, synchro au montage, minuit.
let compte = null
const getDoc = vi.fn(async () => ({ data: () => compte }))
vi.mock('../../services/firebaseConfig', () => ({ db: {}, auth: {} }))
vi.mock('firebase/firestore', () => ({
  doc: (_db, ...c) => c.join('/'), updateDoc: async () => {}, getDoc: (...a) => getDoc(...a), arrayUnion: (...j) => ({ j }),
}))
vi.mock('../../services/statsService', () => ({ track: () => {} }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'abc' }, isGuest: false, getUserLevel: () => null, hasRevizPlus: false, revizPlusOffert: false }),
}))
vi.mock('../../context/ThemeContext', () => ({ useTheme: () => ({ theme: 'defaut' }) }))
vi.mock('../../services/historyService', () => ({ loadLessons: () => [], restoreLesson: () => {}, syncFromFirestore: async () => [] }))
vi.mock('../../services/agendaService', () => ({ agendaLocal: () => ({ controles: [] }), chargerAgenda: async () => ({ controles: [] }) }))
vi.mock('../../services/programmeService', () => ({ loadCatalogue: async () => ({}) }))
vi.mock('../../services/reminderService', async importOriginal => ({ ...(await importOriginal()), refreshReminder: () => {} }))
vi.mock('../../components/ConsentBanner', () => ({ ConsentBanner: () => null }))
vi.mock('../../components/EmailBanner', () => ({ EmailBanner: () => null }))
vi.mock('../../components/GuestBanner', () => ({ GuestBanner: () => null }))
vi.mock('../../components/BottomNav', () => ({ BottomNav: () => null }))
vi.mock('../../components/Pantin', () => ({ Pantin: () => null, tempsLettres: () => 0 }))
vi.mock('../../components/reviz/BulleReviz', () => ({ BulleReviz: () => null }))

const { default: Home } = await import('../Home')
const { jourParis } = await import('../../services/retourService')

const rendre = () => render(<MemoryRouter><Home /></MemoryRouter>)

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('reviz-annonce-jeux-abc', '1') // la popup « Nouveau : Réviz Games » reprend les mêmes mots que la carte
  localStorage.setItem('reviz-onboarded-abc', '1')
  compte = null
  getDoc.mockClear()
})
afterEach(() => vi.restoreAllMocks())

describe('<Home /> — carte Réviz Games', () => {
  it('4 — reprend la partie faite sur un autre appareil au montage, sans « points » vide (3)', async () => {
    const auj = jourParis()
    compte = { jeux: { jours: [auj], record: 700 } } // faite ailleurs, score non transmis
    rendre()
    await waitFor(() => expect(screen.getByText(/Reviens demain, ou fais une Partie rapide/)).toBeInTheDocument())
    const texte = screen.getByText(/Reviens demain, ou fais une Partie rapide/).textContent
    expect(texte).not.toMatch(/points/)
    expect(texte).not.toMatch(/Faite\s*!\s{2}/)
    expect(getDoc).toHaveBeenCalledWith('users/abc')
  })

  it('3 — score connu : « Faite ! 1 200 points. »', async () => {
    const auj = jourParis()
    compte = { jeux: { jours: [auj], record: 1200, scores: { [auj]: 1200 } } }
    rendre()
    await waitFor(() => expect(screen.getByText(/Faite/).textContent).toMatch(/1\s?200\s+points\./))
  })

  it('5 — resté ouvert après minuit : au retour au premier plan, « Faite ! » disparaît', async () => {
    const faux = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-23T20:00:00Z'))
    localStorage.setItem('reviz-jeux-jour-abc', JSON.stringify({ jours: ['2026-10-23'], record: 500, scores: { '2026-10-23': 500 } }))
    compte = { jeux: { jours: ['2026-10-23'], record: 500, scores: { '2026-10-23': 500 } } }
    rendre()
    expect(screen.getByText(/Faite/)).toBeInTheDocument()
    faux.mockReturnValue(Date.parse('2026-10-24T08:00:00Z'))
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(screen.queryByText(/Faite/)).toBeNull()
    expect(screen.getByText(/la même partie pour tout le monde/)).toBeInTheDocument()
  })
})
