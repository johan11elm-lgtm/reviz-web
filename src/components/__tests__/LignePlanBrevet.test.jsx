import { describe, it, expect } from 'vitest'
import { resumePlanBrevet, chapitreSuivant } from '../LignePlanBrevet'
import { semainesBrevet, chapitresFaits, etatPlanBrevet } from '../../utils/planBrevet'
import { chapterLessonId } from '../../utils/programme'
import catalogue from '../../../public/programme/3eme/index.json'

const fait = (...cs) => chapitresFaits(cs.map(c => ({ lessonId: chapterLessonId(c.ch.id) })))

describe('la ligne du plan brevet sur l’accueil', () => {
  const s = semainesBrevet(catalogue, '2026-11-11')
  it('la semaine en cours, puis le prochain chapitre de la semaine', () => {
    const faits = fait(s[0].chapitres[0])
    const e = etatPlanBrevet(s, faits, '2026-11-12')
    expect(resumePlanBrevet(e, faits)).toBe(`Cette semaine : 1 sur ${s[0].chapitres.length} chapitres`)
    expect(chapitreSuivant(s, e, faits).ch.id).toBe(s[0].chapitres[1].ch.id)
  })
  it('le retard d’abord, et il se lit', () => {
    const faits = fait()
    const e = etatPlanBrevet(s, faits, '2026-11-18')
    expect(resumePlanBrevet(e, faits)).toBe(`Cette semaine : 0 sur ${s[1].chapitres.length} chapitres · ${s[0].chapitres.length} chapitres à rattraper`)
    expect(chapitreSuivant(s, e, faits).ch.id).toBe(s[0].chapitres[0].ch.id)
  })
  it('semaine bouclée : on prend de l’avance sur la suivante', () => {
    const faits = fait(...s[0].chapitres)
    const e = etatPlanBrevet(s, faits, '2026-11-12')
    expect(resumePlanBrevet(e, faits)).toBe(`Semaine bouclée : ${s[0].chapitres.length} sur ${s[0].chapitres.length}`)
    expect(chapitreSuivant(s, e, faits).ch.id).toBe(s[1].chapitres[0].ch.id)
  })
})
