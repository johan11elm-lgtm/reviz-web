import { describe, it, expect } from 'vitest'
import { coursDemo, estLienDemo } from '../edtDemo'
import { matiereDuCours, nomDuCours, joursDeLaSemaine } from '../agenda'

describe('emploi du temps de démonstration', () => {
  it('reconnaît le lien caché, pas les liens Pronote', () => {
    expect(estLienDemo(' DEMO:reviz ')).toBe(true)
    expect(estLienDemo('https://0123456a.index-education.net/pronote/ical/x.ics')).toBe(false)
  })

  it('remplit la semaine demandée, du lundi au vendredi', () => {
    const cours = coursDemo({ du: '2026-10-12', au: '2026-10-18' })
    expect(cours[0]).toMatchObject({ debut: '2026-10-12T08:00', fin: '2026-10-12T09:00' })
    expect(joursDeLaSemaine('2026-10-12', cours)).toHaveLength(5)
    expect(cours.filter(c => c.debut.startsWith('2026-10-14')).every(c => c.fin <= '2026-10-14T12:15')).toBe(true)
    expect(cours.some(c => c.annule)).toBe(true)
  })

  it('a des titres que l’agenda sait lire', () => {
    const cours = coursDemo({ du: '2026-10-12', au: '2026-10-18' })
    expect(matiereDuCours(cours[0].titre)).toBe('maths')
    expect(nomDuCours('SCIENCES DE LA VIE ET DE LA TERRE - MME PETIT')).toBe('SVT')
    expect(matiereDuCours('EDUCATION PHYSIQUE ET SPORTIVE - M. GARCIA')).toBe(null)
  })
})
