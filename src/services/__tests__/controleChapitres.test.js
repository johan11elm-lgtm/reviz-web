import { describe, it, expect, vi, beforeEach } from 'vitest'

const etat = vi.hoisted(() => ({ lessons: [], erreurs: {}, maitrises: new Set() }))
vi.mock('../programmeService', () => ({
  chapterProgress: vi.fn((ch, lessons, lessonId) => ({ state: etat.maitrises.has(lessonId) ? 'maitrise' : 'en-cours' })),
  openChapter: vi.fn(async () => ({})),
}))
vi.mock('../historyService', () => ({
  loadLessons: () => etat.lessons,
  restoreLesson: vi.fn(id => etat.lessons.some(l => l.id === id)),
}))
vi.mock('../erreursService', () => ({
  erreursDe: (uid, id) => etat.erreurs[id] ?? [],
  preparerQuizErreurs: vi.fn(() => false),
}))

const { leconDuChapitre, chapitreAReviser, ouvrirChapitreDuControle, cibleRevision, cibleQuizErreurs } = await import('../controleChapitres')
const { openChapter } = await import('../programmeService')
const { restoreLesson } = await import('../historyService')

const scan = { id: '1730000000000', titre: 'Mon cours sur Thalès', scan: true }
const thales = { id: 'thales', titre: 'Le théorème de Thalès' }
const controle = { matiere: 'maths', classe: '3ème', programme: 'Maths', chapitres: [scan, thales] }

describe('contrôle : les cours scannés parmi ses chapitres', () => {
  beforeEach(() => { etat.lessons = [{ id: scan.id }]; etat.erreurs = {}; etat.maitrises = new Set(); vi.clearAllMocks() })

  it('un cours scanné garde l’id de sa leçon ; un chapitre du programme, l’id du programme', () => {
    expect(leconDuChapitre(scan)).toBe(scan.id)
    expect(leconDuChapitre(thales)).not.toBe('thales')
  })

  it('« Réviser » ouvre le cours scanné tel quel, sans passer par le programme', async () => {
    expect(chapitreAReviser(controle)).toBe(scan)
    expect(await cibleRevision(controle)).toBe('/analyse')
    expect(restoreLesson).toHaveBeenCalledWith(scan.id)
    expect(openChapter).not.toHaveBeenCalled()
  })

  it('un cours scanné effacé depuis ne compte plus : on passe au chapitre suivant', async () => {
    etat.lessons = []
    expect(chapitreAReviser(controle)).toBe(thales)
    await expect(ouvrirChapitreDuControle(controle, scan)).rejects.toThrow()
  })

  it('un cours maîtrisé laisse la place au chapitre encore à travailler', () => {
    etat.maitrises = new Set([scan.id])
    expect(chapitreAReviser(controle)).toBe(thales)
  })

  it('J-3 : les questions ratées du cours scanné', async () => {
    etat.erreurs = { [scan.id]: [{ question: 'q' }] }
    expect(await cibleQuizErreurs('u1', controle)).toBe('/quiz?erreurs=1')
    expect(restoreLesson).toHaveBeenCalledWith(scan.id)
  })
})
