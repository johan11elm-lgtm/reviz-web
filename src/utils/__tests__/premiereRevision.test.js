import { describe, it, expect } from 'vitest'
import { chapitreDuMoment, trimestreDuJour, questionsPremiere, NB_QUESTIONS_PREMIERE } from '../premiereRevision'

const ch = (id, ordre, periode) => ({ id, titre: id, ordre, periode })
const catalogue = {
  matieres: [
    { matiere: 'Français', chapitres: [ch('fr1', 1, 'T1')] },
    { matiere: 'Maths', chapitres: [ch('m4', 4, 'T1'), ch('m1', 1, 'T1'), ch('m2', 2, 'T1'), ch('m3', 3, 'T1'), ch('m5', 5, 'T2'), ch('m6', 6, 'T3')] },
  ],
}

describe('trimestreDuJour', () => {
  it('fin octobre : milieu du T1', () => {
    const t = trimestreDuJour(new Date(2026, 9, 26))
    expect(t.periode).toBe('T1')
    expect(t.avance).toBeGreaterThan(0.4)
    expect(t.avance).toBeLessThan(0.6)
  })
  it('février : T2, mai : T3', () => {
    expect(trimestreDuJour(new Date(2027, 1, 10)).periode).toBe('T2')
    expect(trimestreDuJour(new Date(2027, 4, 10)).periode).toBe('T3')
  })
  it('vacances : fin du T1 à Noël, début du T1 l\'été', () => {
    expect(trimestreDuJour(new Date(2026, 11, 28))).toEqual({ periode: 'T1', avance: 1 })
    expect(trimestreDuJour(new Date(2026, 6, 14))).toEqual({ periode: 'T1', avance: 0 })
  })
})

describe('chapitreDuMoment', () => {
  it('prend les maths, le chapitre du T1 qui correspond à la date', () => {
    expect(chapitreDuMoment(catalogue, new Date(2026, 8, 2))).toMatchObject({ matiere: 'Maths', chapitre: { id: 'm1' } })
    expect(chapitreDuMoment(catalogue, new Date(2026, 9, 26)).chapitre.id).toBe('m2')
    expect(chapitreDuMoment(catalogue, new Date(2026, 11, 28)).chapitre.id).toBe('m4')
  })
  it('passe au T2 en janvier', () => {
    expect(chapitreDuMoment(catalogue, new Date(2027, 0, 15)).chapitre.id).toBe('m5')
  })
  it('sans maths, la première matière ; catalogue vide : null', () => {
    expect(chapitreDuMoment({ matieres: [catalogue.matieres[0]] }, new Date(2026, 9, 26)).matiere).toBe('Français')
    expect(chapitreDuMoment({ matieres: [] })).toBeNull()
    expect(chapitreDuMoment(null)).toBeNull()
  })
})

describe('questionsPremiere', () => {
  it('garde les 5 premières questions', () => {
    expect(questionsPremiere([1, 2, 3, 4, 5, 6, 7])).toHaveLength(NB_QUESTIONS_PREMIERE)
    expect(questionsPremiere([1, 2])).toEqual([1, 2])
  })
})
