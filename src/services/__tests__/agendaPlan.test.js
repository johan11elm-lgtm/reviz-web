import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../firebaseConfig', () => ({ auth: {}, db: {} }))
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn() }))
vi.mock('../reminderService', () => ({ planifierRappelsControles: vi.fn(async () => {}) }))

const { ajouterControle, marquerEtape, agendaLocal } = await import('../agendaService')
const invite = { uid: 'guest_u1', isGuest: true }
const dansJours = n => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

describe('agenda : plan de révision', () => {
  beforeEach(() => localStorage.clear())

  it('le premier contrôle noté a son plan offert, et le garde', async () => {
    const a = await ajouterControle(invite, { matiere: 'maths', titre: '', date: dansJours(6) })
    const premier = a.controles[0].id
    expect(a.planOffert).toBe(premier)
    expect(a.controles[0].cree).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const b = await ajouterControle(invite, { matiere: 'svt', titre: '', date: dansJours(3) })
    expect(b.planOffert).toBe(premier)
  })

  it('agenda d’avant le plan : le plus proche des contrôles déjà notés a le plan offert', async () => {
    localStorage.setItem('reviz-agenda-guest_u1', JSON.stringify({ pronote: null, controles: [
      { id: 'cloin', matiere: 'maths', date: dansJours(9) },
      { id: 'cproche', matiere: 'svt', date: dansJours(2) },
    ] }))
    const a = await ajouterControle(invite, { matiere: 'anglais', titre: '', date: dansJours(1) })
    expect(a.planOffert).toBe('cproche')
  })

  it('note une étape faite aujourd’hui', async () => {
    const a = await ajouterControle(invite, { matiere: 'maths', titre: '', date: dansJours(6) })
    const id = a.controles[0].id
    await marquerEtape(invite, id, 'flash')
    expect(agendaLocal('guest_u1').controles[0].plan.flash).toBe(dansJours(0))
  })
})
