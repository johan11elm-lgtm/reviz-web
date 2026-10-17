import { describe, it, expect, vi, beforeEach } from 'vitest'

const setDoc = vi.fn(() => Promise.resolve())
const getDoc = vi.fn(async () => ({ exists: () => false, data: () => null }))
vi.mock('firebase/firestore', () => ({
  setDoc: (...a) => setDoc(...a),
  getDoc: (...a) => getDoc(...a),
  doc: (db, ...path) => ({ path: path.join('/') }),
  collection: vi.fn(), getDocs: vi.fn(async () => ({ docs: [] })), query: vi.fn(), orderBy: vi.fn(),
}))
vi.mock('../firebaseConfig', () => ({ db: {} }))
vi.mock('../challengeService', () => ({ updateChallengeProgress: vi.fn() }))
const trackStat = vi.fn()
vi.mock('../statsService', () => ({ track: (...a) => trackStat(...a) }))
const planifierRappelLendemain = vi.fn(async () => {})
vi.mock('../reminderService', () => ({ planifierRappelLendemain: (...a) => planifierRappelLendemain(...a) }))

const { recordRevision, markRevisionDone, lierEssai, setActiveUser } = await import('../revisionService')
const { setActiveUser: setLessonUser } = await import('../historyService')

const ESSAI = 'invite-ab12cd34mgx1y2z3'
const chapitre = { id: 'prog-pythagore', source: 'programme', chapterId: 'pythagore', classe: '4ème', matiere: 'Maths', metadata: { title: 'Le théorème de Pythagore' } }

function utilisateur(uid) {
  setActiveUser(uid); setLessonUser(uid)
  localStorage.setItem(`reviz-lessons-${uid}`, JSON.stringify([chapitre]))
  localStorage.setItem('reviz-current-lesson-id', 'prog-pythagore')
}
const ecrit = chemin => setDoc.mock.calls.filter(c => c[0].path === chemin).map(c => c[1])
const flush = () => new Promise(r => setTimeout(r, 0))

beforeEach(() => {
  localStorage.clear()
  setDoc.mockClear(); getDoc.mockClear(); trackStat.mockClear(); planifierRappelLendemain.mockClear()
  getDoc.mockImplementation(async () => ({ exists: () => false, data: () => null }))
})

describe('recordRevision — compte', () => {
  it('enregistre la révision du programme avec son chapitre, et la première session sur le profil', async () => {
    utilisateur('u1')
    const entry = recordRevision('quiz')
    expect(entry).toMatchObject({ type: 'quiz', lessonId: 'prog-pythagore', source: 'programme', chapterId: 'pythagore', classe: '4ème', matiere: 'Maths' })
    expect(ecrit(`users/u1/revisions/${entry.id}`)).toEqual([entry])
    await flush()
    const [profil] = ecrit('users/u1')
    expect(profil.derniereRevisionAt).toBe(entry.revisedAt)
    expect(profil.premiereSession).toMatchObject({ chapterId: 'pythagore', classe: '4ème', matiere: 'Maths', titre: 'Le théorème de Pythagore' })
    expect(profil.premiereSession.jour).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // Aucun identifiant n'accompagne le compteur d'un compte.
    expect(trackStat).toHaveBeenCalledWith('revision', expect.objectContaining({ source: 'programme' }), {})
    // Première session aujourd'hui : notification du lendemain posée.
    expect(planifierRappelLendemain).toHaveBeenCalledWith({ titre: 'Le théorème de Pythagore' })
  })

  it('ne réécrit pas la première session déjà notée (autre appareil)', async () => {
    utilisateur('u2')
    getDoc.mockImplementation(async () => ({ exists: () => true, data: () => ({ premiereSession: { jour: '2026-10-01' } }) }))
    recordRevision('flashcards')
    await flush()
    const [profil] = ecrit('users/u2')
    expect(profil.premiereSession).toBeUndefined()
    expect(planifierRappelLendemain).toHaveBeenCalledWith(null)
    recordRevision('quiz')
    await flush()
    expect(getDoc).toHaveBeenCalledTimes(1)
  })
})

describe('recordRevision — essai', () => {
  it('rien dans Firestore, mais la révision part avec l’identifiant d’essai, sans prénom', () => {
    utilisateur(ESSAI)
    const entry = recordRevision('quiz')
    expect(setDoc).not.toHaveBeenCalled()
    const [, , extra] = trackStat.mock.calls[0]
    expect(extra).toEqual({ essai: { id: ESSAI, revision: { id: entry.id, type: 'quiz', source: 'programme', chapterId: 'pythagore', classe: '4ème', matiere: 'Maths' } } })
  })

  it('pas d’identifiant en mode découverte (enseignant)', () => {
    utilisateur(ESSAI)
    localStorage.setItem('reviz-decouverte-prof', '1')
    recordRevision('quiz')
    expect(trackStat.mock.calls[0][2]).toEqual({})
  })
})

describe('markRevisionDone', () => {
  it('complète l’entrée ouverte avec la fin et le score', () => {
    utilisateur('u3')
    const entry = recordRevision('quiz')
    setDoc.mockClear()
    const fin = markRevisionDone('quiz', { score: 7, total: 10 })
    expect(fin).toMatchObject({ id: entry.id, score: 7, total: 10 })
    expect(fin.termineAt).toBeGreaterThanOrEqual(entry.revisedAt)
    expect(ecrit(`users/u3/revisions/${entry.id}`)[0]).toMatchObject({ termineAt: fin.termineAt })
    expect(trackStat).toHaveBeenLastCalledWith('revision_terminee', { format: 'quiz', source: 'programme' }, {})
    // Une seconde fin (quiz recommencé) ne réécrit rien.
    expect(markRevisionDone('quiz', { score: 9, total: 10 })).toBeNull()
  })

  it('sans révision ouverte pour ce format : rien', () => {
    utilisateur('u4')
    recordRevision('resume')
    expect(markRevisionDone('quiz')).toBeNull()
  })
})

describe('lierEssai', () => {
  it('note l’identifiant d’essai sur le profil du nouveau compte', () => {
    setActiveUser('u5')
    lierEssai(ESSAI)
    expect(ecrit('users/u5')).toEqual([{ essaiId: ESSAI }])
    lierEssai('pas-un-essai')
    expect(ecrit('users/u5')).toHaveLength(1)
  })
})
