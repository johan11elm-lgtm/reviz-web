import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// L'annonce « Nouveau : Réviz Games » à l'ouverture de l'accueil. En essai, elle ne doit jamais
// être le premier écran : elle attend une première révision (10/11, un essai sur trois ne
// faisait que jouer puis repartait). Avec un compte, rien ne change.
const auth = vi.hoisted(() => ({ valeur: null }))
vi.mock('../../services/firebaseConfig', () => ({ db: {}, auth: {} }))
vi.mock('firebase/firestore', () => ({
  doc: (_db, ...c) => c.join('/'), updateDoc: async () => {}, getDoc: async () => ({ data: () => null }), arrayUnion: (...j) => ({ j }),
}))
vi.mock('../../services/statsService', () => ({ track: () => {} }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth.valeur }))
vi.mock('../../context/ThemeContext', () => ({ useTheme: () => ({ theme: 'defaut' }) }))
vi.mock('../../services/historyService', () => ({ loadLessons: () => [], restoreLesson: () => {}, syncFromFirestore: async () => [] }))
vi.mock('../../services/agendaService', () => ({ agendaLocal: () => ({ controles: [] }), chargerAgenda: async () => ({ controles: [] }) }))
vi.mock('../../services/programmeService', () => ({ loadCatalogue: async () => ({}) }))
vi.mock('../../services/reminderService', async importOriginal => ({ ...(await importOriginal()), refreshReminder: () => {} }))
vi.mock('../../components/ConsentBanner', () => ({ ConsentBanner: () => null }))
vi.mock('../../components/EmailBanner', () => ({ EmailBanner: () => null }))
vi.mock('../../components/GuestBanner', () => ({ GuestBanner: () => null }))
vi.mock('../../components/BottomNav', () => ({ BottomNav: () => null, EtoileIA: () => null }))
vi.mock('../../components/Pantin', () => ({ Pantin: () => null, tempsLettres: () => 0 }))
vi.mock('../../components/reviz/BulleReviz', () => ({ BulleReviz: () => null }))
const revisions = vi.hoisted(() => ({ liste: [] }))
vi.mock('../../services/revisionService', async importOriginal => ({ ...(await importOriginal()), loadRevisions: () => revisions.liste }))

const { default: Home } = await import('../Home')

const profil = (uid, isGuest) => ({ currentUser: { uid, displayName: 'Léa', isGuest }, isGuest, getUserLevel: () => null, hasRevizPlus: false, revizPlusOffert: false })
const rendre = () => render(<MemoryRouter><Home /></MemoryRouter>)
const annonce = () => screen.queryByRole('dialog', { name: 'Réviz Games' })

beforeEach(() => {
  localStorage.clear()
  revisions.liste = []
})

describe('<Home /> — annonce Réviz Games', () => {
  it('en essai, pas d’annonce tant que l’élève n’a rien révisé', () => {
    auth.valeur = profil('invite-abc', true)
    localStorage.setItem('reviz-onboarded-invite-abc', '1')
    rendre()
    expect(annonce()).toBeNull()
    // Elle n'est pas notée comme vue : elle viendra après la première révision.
    expect(localStorage.getItem('reviz-annonce-jeux-invite-abc')).toBeNull()
  })

  it('en essai, l’annonce vient après une première révision', () => {
    auth.valeur = profil('invite-abc', true)
    localStorage.setItem('reviz-onboarded-invite-abc', '1')
    revisions.liste = [{ id: '1', type: 'exercices', revisedAt: Date.now() }]
    rendre()
    expect(annonce()).toBeInTheDocument()
  })

  it('avec un compte, l’annonce s’ouvre comme avant, révision ou non', () => {
    auth.valeur = profil('abc', false)
    localStorage.setItem('reviz-onboarded-abc', '1')
    rendre()
    expect(annonce()).toBeInTheDocument()
  })
})
