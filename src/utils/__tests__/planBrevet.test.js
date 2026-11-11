import { describe, it, expect, beforeEach } from 'vitest'
import { chapitresBrevet, semainesBrevet, chapitresFaits, etatPlanBrevet, debutPlanBrevet, DERNIERE_SEMAINE } from '../planBrevet'
import { chapterLessonId } from '../programme'
import catalogue from '../../../public/programme/3eme/index.json'

describe('plan brevet', () => {
  beforeEach(() => localStorage.clear())
  it('les chapitres des écrits seulement, dans l’ordre de l’année, matières alternées', () => {
    const l = chapitresBrevet(catalogue)
    expect(l.some(c => c.slug === 'anglais')).toBe(false)
    expect(l.length).toBeGreaterThan(80)
    const periodes = l.map(c => c.ch.periode)
    expect(periodes.indexOf('T2')).toBeGreaterThan(periodes.lastIndexOf('T1'))
    expect(new Set(l.slice(0, 7).map(c => c.slug)).size).toBe(7)
  })
  it('réparti du lundi de départ au 7 juin, sans semaine vide ni chapitre perdu', () => {
    const s = semainesBrevet(catalogue, '2026-11-11')
    expect(s[0].debut).toBe('2026-11-09')
    expect(s.at(-1).debut).toBe(DERNIERE_SEMAINE)
    expect(s.every(x => x.chapitres.length >= 2 && x.chapitres.length <= 4)).toBe(true)
    expect(s.flatMap(x => x.chapitres)).toHaveLength(chapitresBrevet(catalogue).length)
  })
  it('la semaine en cours et ce qui reste à rattraper', () => {
    const s = semainesBrevet(catalogue, '2026-11-11')
    const [a, b] = s[0].chapitres
    const faits = chapitresFaits([{ lessonId: chapterLessonId(a.ch.id) }])
    const e = etatPlanBrevet(s, faits, '2026-11-18')
    expect(e.enCours).toBe(1)
    expect(e.aRattraper.map(c => c.ch.id)).toContain(b.ch.id)
    expect(e.aRattraper.map(c => c.ch.id)).not.toContain(a.ch.id)
    expect(e.faits).toBe(1)
    expect(etatPlanBrevet(s, faits, '2027-06-20').enCours).toBe(s.length - 1)
  })
  it('le départ reste celui de la première ouverture', () => {
    expect(debutPlanBrevet('u', '2026-11-11')).toBe('2026-11-09')
    expect(debutPlanBrevet('u', '2026-12-02')).toBe('2026-11-09')
  })
})
