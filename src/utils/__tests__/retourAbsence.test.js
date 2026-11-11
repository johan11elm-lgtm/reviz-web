import { describe, it, expect, beforeEach } from 'vitest'
import { joursSansReviser, retourAProposer, noterRetourVu, ABSENCE_JOURS } from '../retourAbsence'

const MIDI = Date.parse('2026-11-11T12:00:00+01:00')
// Comme revisionService : revisedAt en millisecondes.
const il = j => ({ revisedAt: MIDI - j * 86_400_000 })

describe('retour après une absence', () => {
  beforeEach(() => localStorage.clear())

  it('compte les jours depuis la dernière révision', () => {
    expect(joursSansReviser([], MIDI)).toBeNull()
    expect(joursSansReviser([il(5), il(2)], MIDI)).toBe(2)
  })
  it(`propose l’accueil du retour à partir de ${ABSENCE_JOURS} jours, une fois par absence`, () => {
    expect(retourAProposer('u1', [il(2)], MIDI)).toBeNull()
    const r = retourAProposer('u1', [il(9), il(4)], MIDI)
    expect(r).toEqual({ jours: 4, repere: '2026-11-07' })
    noterRetourVu('u1', r.repere)
    expect(retourAProposer('u1', [il(9), il(4)], MIDI)).toBeNull()
    // Une nouvelle absence, après une nouvelle révision : on le revoit.
    expect(retourAProposer('u1', [il(4), il(-1)], MIDI + 5 * 86_400_000)).toMatchObject({ jours: 4 })
  })
  it('accepte aussi une date en texte ISO', () => {
    expect(joursSansReviser([{ revisedAt: new Date(MIDI - 4 * 86_400_000).toISOString() }], MIDI)).toBe(4)
  })
  it('jamais sans révision connue (nouvel appareil), ni sans élève', () => {
    expect(retourAProposer('u1', [], MIDI)).toBeNull()
    expect(retourAProposer(null, [il(10)], MIDI)).toBeNull()
  })
})
