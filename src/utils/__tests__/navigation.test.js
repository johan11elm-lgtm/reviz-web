import { describe, it, expect, vi, afterEach } from 'vitest'
import { DEPUIS_FICHE, fermerVersFiche, versExercice, revenir } from '../navigation.js'
import { noterBattleDuJour, battleFaiteAujourdhui } from '../../services/battleDuJour.js'

const historique = idx => window.history.replaceState({ idx }, '')
afterEach(() => { window.history.replaceState(null, ''); vi.useRealTimers(); localStorage.clear() })

describe('fermerVersFiche', () => {
  it('ouvert depuis la fiche : revient d’un cran (la fiche est juste derrière)', () => {
    historique(2)
    const navigate = vi.fn()
    fermerVersFiche(navigate, { state: DEPUIS_FICHE })
    expect(navigate).toHaveBeenCalledWith(-1)
  })

  it('ouvert d’ailleurs (accueil, lien) : la fiche remplace l’exercice, rien ne s’empile', () => {
    historique(2)
    const navigate = vi.fn()
    fermerVersFiche(navigate, { state: null })
    expect(navigate).toHaveBeenCalledWith('/analyse', { replace: true })
  })

  it('depuis la fiche mais sans historique (rechargé, app rouverte) : la fiche, sans sortir de l’app', () => {
    historique(0)
    const navigate = vi.fn()
    fermerVersFiche(navigate, { state: DEPUIS_FICHE })
    expect(navigate).toHaveBeenCalledWith('/analyse', { replace: true })
  })
})

describe('versExercice', () => {
  it('remplace l’exercice et garde d’où il a été ouvert', () => {
    const navigate = vi.fn()
    versExercice(navigate, { state: DEPUIS_FICHE }, '/flashcards')
    expect(navigate).toHaveBeenCalledWith('/flashcards', { replace: true, state: DEPUIS_FICHE })
  })
})

describe('revenir', () => {
  it('de l’historique dans l’app : un cran en arrière', () => {
    historique(3)
    const navigate = vi.fn()
    revenir(navigate, '/profil')
    expect(navigate).toHaveBeenCalledWith(-1)
  })

  it('première page (lien direct, app installée) : la page parente, en remplaçant', () => {
    historique(0)
    const navigate = vi.fn()
    revenir(navigate, '/profil')
    expect(navigate).toHaveBeenCalledWith('/profil', { replace: true })
  })
})

describe('battleDuJour', () => {
  it('une Battle finie compte pour la journée, pas pour le lendemain', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-25T15:00:00'))
    expect(battleFaiteAujourdhui()).toBe(false)
    noterBattleDuJour()
    expect(battleFaiteAujourdhui()).toBe(true)
    vi.setSystemTime(new Date('2026-10-26T08:00:00'))
    expect(battleFaiteAujourdhui()).toBe(false)
  })
})
