import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { jourIso, ajouterJours } from '../../utils/agenda'

// La tâche du jour d'un contrôle noté (11/11) : premier raccourci de « On fait quoi aujourd'hui ? ».
const agenda = vi.hoisted(() => ({ courant: { controles: [] }, marquer: null }))
const cible = vi.hoisted(() => ({ fn: null }))
vi.mock('../../services/firebaseConfig', () => ({ db: {}, auth: {} }))
vi.mock('firebase/firestore', () => ({
  doc: (_db, ...c) => c.join('/'), updateDoc: async () => {}, getDoc: async () => ({ data: () => null }), arrayUnion: (...j) => ({ j }),
}))
vi.mock('../../services/statsService', () => ({ track: () => {} }))
vi.mock('../../services/mesure', () => ({ mesurer: () => {} }))
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'abc' }, isGuest: false, getUserLevel: () => null, hasRevizPlus: false, revizPlusOffert: false }),
}))
vi.mock('../../context/ThemeContext', () => ({ useTheme: () => ({ theme: 'defaut' }) }))
vi.mock('../../services/historyService', () => ({ loadLessons: () => [], restoreLesson: () => {}, syncFromFirestore: async () => [] }))
vi.mock('../../services/agendaService', () => ({
  agendaLocal: () => agenda.courant,
  chargerAgenda: async () => agenda.courant,
  marquerEtape: (...a) => agenda.marquer(...a),
}))
vi.mock('../../services/controleChapitres', () => ({
  cibleRevision: (...a) => cible.fn(...a),
  cibleQuizErreurs: async () => '/quiz?erreurs=1',
}))
vi.mock('../../services/programmeService', () => ({ loadCatalogue: async () => ({}) }))
vi.mock('../../services/reminderService', async importOriginal => ({ ...(await importOriginal()), refreshReminder: () => {} }))
vi.mock('../../components/ConsentBanner', () => ({ ConsentBanner: () => null }))
vi.mock('../../components/EmailBanner', () => ({ EmailBanner: () => null }))
vi.mock('../../components/GuestBanner', () => ({ GuestBanner: () => null }))
vi.mock('../../components/BottomNav', () => ({ BottomNav: () => null, EtoileIA: () => null }))
vi.mock('../../components/Pantin', () => ({ Pantin: () => null, tempsLettres: () => 0 }))
vi.mock('../../components/reviz/BulleReviz', () => ({ BulleReviz: () => null }))

const { default: Home } = await import('../Home')

const Ailleurs = () => { const l = useLocation(); return <p>page {l.pathname}{l.search}</p> }
const rendre = () => render(
  <MemoryRouter initialEntries={['/']}>
    <Routes><Route path="/" element={<Home />} /><Route path="*" element={<Ailleurs />} /></Routes>
  </MemoryRouter>,
)
const dans = n => ajouterJours(jourIso(), n)
const controle = (jours, plus = {}) => ({ id: 'c1', matiere: 'maths', titre: 'Théorème de Thalès', date: dans(jours), cree: jourIso(), chapitres: [{ id: 'thales', titre: 'Théorème de Thalès' }], ...plus })
const raccourcis = () => within(screen.getByRole('group', { name: 'Démarre en un clic' })).getAllByRole('button')

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('reviz-annonce-jeux-abc', '1')
  localStorage.setItem('reviz-onboarded-abc', '1')
  agenda.courant = { controles: [] }
  agenda.marquer = vi.fn(async () => ({}))
  cible.fn = vi.fn(async () => '/analyse')
})

describe('<Home /> — la tâche du jour du contrôle', () => {
  it('sans contrôle noté : « Prépare un contrôle » reste à sa place', () => {
    rendre()
    const [premier, second] = raccourcis()
    expect(premier).toHaveTextContent('Fais tes exercices')
    expect(second).toHaveTextContent('Prépare un contrôle')
  })

  it('contrôle dans 3 jours : la tâche passe devant et lance l’étape du jour', async () => {
    agenda.courant = { controles: [controle(3)] }
    rendre()
    const [premier, second] = raccourcis()
    expect(premier).toHaveTextContent('Ton contrôle de maths')
    expect(premier).toHaveTextContent('Dans 3 jours · 5 minutes maintenant')
    expect(second).toHaveTextContent('Fais tes exercices')
    expect(screen.queryByText('Prépare un contrôle')).toBeNull()
    fireEvent.click(premier)
    await waitFor(() => expect(screen.getByText('page /analyse')).toBeInTheDocument())
    // J-5 est passé : les flashcards tombent aujourd'hui, l'étape est notée lancée.
    expect(agenda.marquer).toHaveBeenCalledWith({ uid: 'abc' }, 'c1', 'flash')
  })

  it('contrôle dans 10 jours : cinq minutes d’avance, sans cocher d’étape', async () => {
    agenda.courant = { controles: [controle(10, { matiere: 'anglais' })] }
    rendre()
    const [premier] = raccourcis()
    expect(premier).toHaveTextContent('Ton contrôle d\'anglais')
    expect(premier).toHaveTextContent('Dans 10 jours · 5 minutes maintenant')
    fireEvent.click(premier)
    await waitFor(() => expect(screen.getByText('page /analyse')).toBeInTheDocument())
    expect(agenda.marquer).not.toHaveBeenCalled()
  })

  it('la veille, flashcards et quiz faits : le contrôle blanc', async () => {
    agenda.courant = { controles: [controle(1, { plan: { flash: dans(-3), quiz: dans(-1) } })] }
    rendre()
    const [premier] = raccourcis()
    expect(premier).toHaveTextContent('Demain · ton contrôle blanc')
    fireEvent.click(premier)
    await waitFor(() => expect(screen.getByText('page /controle?c=c1')).toBeInTheDocument())
  })

  it('étape du jour déjà faite, puis plan terminé', async () => {
    agenda.courant = { controles: [controle(4, { plan: { flash: jourIso() } })] }
    const { unmount } = rendre()
    expect(raccourcis()[0]).toHaveTextContent('Dans 4 jours · étape du jour faite')
    unmount()

    agenda.courant = { controles: [controle(2, { plan: { flash: dans(-2), quiz: dans(-1), blanc: dans(-1) } })] }
    rendre()
    const [premier] = raccourcis()
    expect(premier).toHaveTextContent('Dans 2 jours · plan terminé, tu es prêt')
    fireEvent.click(premier)
    await waitFor(() => expect(screen.getByText('page /agenda')).toBeInTheDocument())
  })
})
