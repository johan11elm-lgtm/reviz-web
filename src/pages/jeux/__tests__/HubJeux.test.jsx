import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'

vi.mock('../../../services/firebaseConfig', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({ doc: () => ({}), updateDoc: async () => {}, getDoc: async () => ({ data: () => ({}) }), arrayUnion: () => ({}) }))
vi.mock('../../../services/statsService', () => ({ track: () => {} }))
const { HubJeux } = await import('../HubJeux')
const { jourParis } = await import('../../../services/retourService')

const rendre = jour => render(<HubJeux jour={jour} onJouer={() => {}} onFermer={() => {}} isDesktop={false} />)
const etat = (o = {}) => ({ jour: jourParis(), faite: false, score: null, serie: 0, record: 0, jours: [], ...o })

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

describe('<HubJeux /> — partie du jour', () => {
  it('3 — partie faite sur un autre appareil, score inconnu : pas de « Ton score : 0 », un texte qui tient', () => {
    rendre(etat({ faite: true, score: null, serie: 1, record: 9000, jours: [jourParis()] }))
    expect(screen.queryByText(/Ton score/)).toBeNull()
    expect(screen.getByText(/Partie du jour faite/)).toBeInTheDocument()
  })

  it('le score s’affiche quand il est connu, même 0', () => {
    rendre(etat({ faite: true, score: 0, serie: 1, jours: [jourParis()] }))
    expect(screen.getByText(/Ton score/).textContent).toMatch(/Ton score\s*:\s*0/)
  })

  it('5 — resté ouvert après minuit : au retour au premier plan, plus de « Faite ! » et la série tient', () => {
    const hier = '2020-01-01'
    const veille = '2019-12-31'
    // Le hub a été ouvert « hier », partie faite ; aujourd'hui (jourParis) est un autre jour.
    const { container } = rendre({ jour: hier, faite: true, score: 1200, serie: 2, record: 1200, jours: [veille, hier] })
    // Au premier rendu le jour est celui de l'horloge : l'état périmé est déjà recalculé.
    expect(screen.queryByText(/Ton score/)).toBeNull()
    expect(container.querySelector('.hb-jour--faite')).toBeNull()
  })

  it('5 — le jour change pendant que le hub est caché : le retour au premier plan recalcule', () => {
    const jours = ['2026-10-22', '2026-10-23']
    const faux = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-23T20:00:00Z'))
    const { container } = rendre({ jour: '2026-10-23', faite: true, score: 1200, serie: 2, record: 1200, jours })
    expect(screen.getByText(/Ton score/)).toBeInTheDocument()
    faux.mockReturnValue(Date.parse('2026-10-24T08:00:00Z'))
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(screen.queryByText(/Ton score/)).toBeNull()
    expect(container.querySelector('.hb-jour--faite')).toBeNull()
    expect(screen.getByText('2 jours de suite')).toBeInTheDocument()
  })
})
