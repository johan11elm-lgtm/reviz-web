import { describe, it, expect } from 'vitest'
import { planRevision, prochaineEtape, etatPreparation, planOuvert, quandEtape } from '../planRevision'

const ctrl = (date, plan) => ({ id: 'c1', matiere: 'maths', titre: '', date, plan })

describe('planRevision', () => {
  it('place les étapes à J-5, J-3 et J-1', () => {
    const e = planRevision(ctrl('2026-11-10'), '2026-11-01')
    expect(e.map(x => x.jour)).toEqual(['2026-11-05', '2026-11-07', '2026-11-09'])
    expect(e.every(x => x.etat === 'a-venir' && !x.retard)).toBe(true)
  })

  it('ramène à aujourd’hui les étapes d’un contrôle proche', () => {
    const e = planRevision(ctrl('2026-11-03'), '2026-11-01')
    expect(e.map(x => x.jour)).toEqual(['2026-11-01', '2026-11-01', '2026-11-02'])
    expect(e.map(x => x.etat)).toEqual(['aujourdhui', 'aujourdhui', 'a-venir'])
    // Prévues avant aujourd'hui (J-5, J-3) et pas faites : en retard
    expect(e.map(x => x.retard)).toEqual([true, true, false])
  })

  it('une étape manquée revient au jour même', () => {
    const e = planRevision(ctrl('2026-11-10'), '2026-11-06')
    expect(e[0]).toMatchObject({ prevu: '2026-11-05', jour: '2026-11-06', etat: 'aujourdhui', retard: true })
  })

  it('une étape tombée avant que le contrôle soit noté n’est pas en retard', () => {
    const e = planRevision({ ...ctrl('2026-11-10'), cree: '2026-11-06' }, '2026-11-06')
    expect(e[0]).toMatchObject({ jour: '2026-11-06', etat: 'aujourdhui', retard: false })
    expect(etatPreparation({ date: '2026-11-10' }, e, '2026-11-06').id).toBe('en-voie')
    // Sans `cree`, l'id horodaté donne le jour : c + Date.now() en base 36
    const id = `c${new Date(2026, 10, 6, 12).getTime().toString(36)}`
    expect(planRevision({ ...ctrl('2026-11-10'), id }, '2026-11-07')[0].retard).toBe(false)
  })

    it('garde le jour où une étape a été faite', () => {
    const e = planRevision(ctrl('2026-11-10', { flash: '2026-11-04' }), '2026-11-06')
    expect(e[0]).toMatchObject({ fait: '2026-11-04', jour: '2026-11-04', etat: 'faite', retard: false })
    expect(prochaineEtape(e).id).toBe('quiz')
  })

  it('le jour J, tout est à faire le jour même', () => {
    const e = planRevision(ctrl('2026-11-01'), '2026-11-01')
    expect(e.map(x => x.jour)).toEqual(['2026-11-01', '2026-11-01', '2026-11-01'])
  })
})

describe('etatPreparation', () => {
  it('prêt quand tout est fait', () => {
    const c = ctrl('2026-11-10', { flash: '2026-11-05', quiz: '2026-11-07', blanc: '2026-11-09' })
    expect(etatPreparation(c, planRevision(c, '2026-11-09'), '2026-11-09').id).toBe('pret')
  })
  it('en bonne voie quand rien n’est en retard', () => {
    const c = ctrl('2026-11-10')
    expect(etatPreparation(c, planRevision(c, '2026-11-01'), '2026-11-01').id).toBe('en-voie')
  })
  it('pas encore prêt avec une étape en retard, ou la veille avec des étapes à faire', () => {
    const c = ctrl('2026-11-10')
    expect(etatPreparation(c, planRevision(c, '2026-11-06'), '2026-11-06').id).toBe('pas-pret')
    const d = ctrl('2026-11-02', { flash: '2026-11-01', quiz: '2026-11-01' })
    expect(etatPreparation(d, planRevision(d, '2026-11-01'), '2026-11-01').id).toBe('pas-pret')
  })
})

describe('planOuvert', () => {
  it('ouvert avec Réviz+, ou pour le premier contrôle noté', () => {
    expect(planOuvert({ id: 'c2' }, { planOffert: 'c1' }, true)).toBe(true)
    expect(planOuvert({ id: 'c1' }, { planOffert: 'c1' }, false)).toBe(true)
    expect(planOuvert({ id: 'c2' }, { planOffert: 'c1' }, false)).toBe(false)
    expect(planOuvert({ id: 'c2' }, {}, false)).toBe(true)
  })
})

describe('quandEtape', () => {
  it('dit quand faire l’étape', () => {
    const [flash, quiz, blanc] = planRevision(ctrl('2026-11-10'), '2026-11-06')
    expect(quandEtape(flash, '2026-11-06')).toBe('À rattraper aujourd’hui')
    expect(quandEtape(quiz, '2026-11-06')).toBe('Demain')
    expect(quandEtape(blanc, '2026-11-06')).toMatch(/^Lun\.? 9 nov/)
  })
})
