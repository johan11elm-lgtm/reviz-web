import { describe, it, expect } from 'vitest'
import {
  matiereDuCours, nomDuCours, detailDuCours, lundiDe, joursDeLaSemaine, ajouterJours,
  joursEntre, controlesAVenir, compteARebours, intituleControle, jourEnClair, heure,
} from '../agenda'

describe('matiereDuCours', () => {
  it.each([
    ['MATHEMATIQUES - PROFESSEUR M.', 'maths'],
    ['Mathématiques', 'maths'],
    ['FRANCAIS - GALLET B.', 'francais'],
    ['HISTOIRE-GEOGRAPHIE - MOREAU C.', 'histoire'],
    ['GEOGRAPHIE', 'geographie'],
    ['SCIENCES DE LA VIE ET DE LA TERRE - TESSIER A.', 'svt'],
    ['PHYSIQUE-CHIMIE', 'physique-chimie'],
    ['TECHNOLOGIE - DEJEAN Y.', 'technologie'],
    ['ANGLAIS LV1 - BROWN J.', 'anglais'],
    ['EDUCATION PHYSIQUE ET SPORTIVE - ROUX N.', null],
    ['MUSIQUE', null],
    ['', null],
  ])('%s → %s', (titre, attendu) => {
    expect(matiereDuCours(titre)).toBe(attendu)
  })

  it("ne confond pas le nom du professeur avec une matière", () => {
    expect(matiereDuCours('ARTS PLASTIQUES - MATHIEU P.')).toBeNull()
  })
})

describe('nomDuCours / detailDuCours', () => {
  it('met en forme le titre Pronote', () => {
    expect(nomDuCours('HISTOIRE-GEOGRAPHIE - MOREAU C.')).toBe('Histoire-géographie')
    expect(nomDuCours('FRANCAIS - GALLET B.')).toBe('Français')
    expect(nomDuCours('ANGLAIS LV1 - BROWN J.')).toBe('Anglais LV1')
    expect(nomDuCours('EDUCATION PHYSIQUE ET SPORTIVE - ROUX N.')).toBe('EPS')
    expect(nomDuCours('SCIENCES DE LA VIE ET DE LA TERRE')).toBe('SVT')
    expect(nomDuCours('Latin')).toBe('Latin')
    expect(nomDuCours('')).toBe('Cours')
    expect(detailDuCours('HISTOIRE-GEOGRAPHIE - MOREAU C.')).toBe('MOREAU C.')
    expect(detailDuCours('MUSIQUE')).toBe('')
  })
})

describe('jours', () => {
  it('trouve le lundi de la semaine (dimanche compris)', () => {
    expect(lundiDe('2026-10-14')).toBe('2026-10-12')
    expect(lundiDe('2026-10-12')).toBe('2026-10-12')
    expect(lundiDe('2026-10-18')).toBe('2026-10-12')
    expect(ajouterJours('2026-10-31', 1)).toBe('2026-11-01')
    expect(joursEntre('2026-10-12', '2026-10-15')).toBe(3)
  })

  it('ajoute le samedi seulement quand il y a cours', () => {
    expect(joursDeLaSemaine('2026-10-12')).toHaveLength(5)
    expect(joursDeLaSemaine('2026-10-12', [{ debut: '2026-10-17T09:00' }])).toHaveLength(6)
  })

  it('écrit les jours et les heures en clair', () => {
    expect(jourEnClair('2026-10-13')).toBe('mardi 13 octobre')
    expect(heure('2026-10-13T09:05')).toBe('09h05')
  })
})

describe('contrôles', () => {
  const controles = [
    { id: 'a', matiere: 'maths', date: '2026-10-20' },
    { id: 'b', matiere: 'anglais', date: '2026-10-14' },
    { id: 'c', matiere: 'svt', date: '2026-10-01' },
  ]

  it('garde ceux à venir, du plus proche au plus lointain', () => {
    expect(controlesAVenir(controles, '2026-10-14').map(c => c.id)).toEqual(['b', 'a'])
  })

  it('compte les jours', () => {
    expect(compteARebours('2026-10-14', '2026-10-14')).toBe("aujourd'hui")
    expect(compteARebours('2026-10-15', '2026-10-14')).toBe('demain')
    expect(compteARebours('2026-10-17', '2026-10-14')).toBe('dans 3 jours')
    expect(compteARebours('2026-11-04', '2026-10-14')).toBe('dans 3 semaines')
  })

  it("élide devant une voyelle ou un h muet", () => {
    expect(intituleControle({ matiere: 'maths' })).toBe('Contrôle de maths')
    expect(intituleControle({ matiere: 'anglais' })).toBe("Contrôle d'anglais")
    expect(intituleControle({ matiere: 'histoire' })).toBe("Contrôle d'histoire")
    expect(intituleControle({ matiere: 'svt' })).toBe('Contrôle de SVT')
    expect(intituleControle({ matiere: 'autre' })).toBe('Contrôle')
  })
})
