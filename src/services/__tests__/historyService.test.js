import { describe, it, expect, vi, beforeEach } from 'vitest'

const setDoc = vi.fn(() => Promise.resolve())
const getDocs = vi.fn(async () => ({ docs: [] }))
vi.mock('firebase/firestore', () => ({
  setDoc: (...a) => setDoc(...a),
  deleteDoc: vi.fn(() => Promise.resolve()),
  doc: (db, ...path) => ({ path: path.join('/') }),
  collection: vi.fn(), getDocs: (...a) => getDocs(...a), query: vi.fn(), orderBy: vi.fn(),
}))
vi.mock('../firebaseConfig', () => ({ db: {} }))
const incrementScanCount = vi.fn()
vi.mock('../scanLimitService', () => ({ incrementScanCount: () => incrementScanCount() }))
const updateChallengeProgress = vi.fn()
vi.mock('../challengeService', () => ({ updateChallengeProgress: (...a) => updateChallengeProgress(...a) }))

const { saveLesson, loadLessons, setActiveUser, pushLessonsToFirestore, syncFromFirestore } = await import('../historyService')

const meta = { title: 'Le théorème de Thalès', subject: 'Maths', excerpt: '…' }
const aiData = { metadata: meta, flashcards: [{}, {}, {}], quiz: [{}, {}], resume: {}, mindmap: {} }

beforeEach(() => {
  localStorage.clear()
  setDoc.mockClear(); setDoc.mockImplementation(() => Promise.resolve())
  getDocs.mockClear(); getDocs.mockImplementation(async () => ({ docs: [] }))
  incrementScanCount.mockClear(); updateChallengeProgress.mockClear()
})

describe('syncFromFirestore', () => {
  it('attend les écritures en vol avant de lire (sinon la liste locale serait écrasée)', async () => {
    setActiveUser('u1')
    let finish
    setDoc.mockImplementation(() => new Promise(r => { finish = r }))
    const order = []
    getDocs.mockImplementation(async () => { order.push('read'); return { docs: [{ data: () => ({ id: 'prog-thales', scannedAt: 1 }) }] } })
    saveLesson(meta, aiData, { id: 'prog-thales', source: 'programme', chapterId: 'thales' })
    const sync = syncFromFirestore()
    await Promise.resolve()
    expect(order).toEqual([])        // la lecture n'a pas démarré
    order.push('write-done'); finish()
    const lessons = await sync
    expect(order).toEqual(['write-done', 'read'])
    expect(lessons[0].id).toBe('prog-thales')
  })
})

describe('syncFromFirestore — entrées locales absentes du serveur', () => {
  it('garde et renvoie une entrée récente, laisse tomber une entrée ancienne', async () => {
    setActiveUser('u1')
    const now = Date.now()
    localStorage.setItem('reviz-lessons-u1', JSON.stringify([
      { id: 'prog-recent', scannedAt: now - 5_000, metadata: { title: 'Récent' } },
      { id: 'old-deleted', scannedAt: now - 3 * 60 * 60 * 1000, metadata: { title: 'Vieux' } },
    ]))
    getDocs.mockImplementation(async () => ({ docs: [{ data: () => ({ id: 'remote-1', scannedAt: now - 60_000, metadata: { title: 'Serveur' } }) }] }))
    const lessons = await syncFromFirestore()
    expect(lessons.map(l => l.id)).toEqual(['prog-recent', 'remote-1'])
    expect(setDoc.mock.calls.map(c => c[0].path)).toEqual(['users/u1/lessons/prog-recent'])
    expect(JSON.parse(localStorage.getItem('reviz-lessons-u1')).map(l => l.id)).toEqual(['prog-recent', 'remote-1'])
  })
})

describe('saveLesson — scan (comportement historique)', () => {
  it('crée une entrée datée, compte un scan et écrit dans Firestore', () => {
    setActiveUser('u1')
    const e = saveLesson(meta, aiData)
    expect(e.source).toBe('scan')
    expect(e.flashcardsCount).toBe(3)
    expect(loadLessons()[0].id).toBe(e.id)
    expect(localStorage.getItem('reviz-current-lesson-id')).toBe(e.id)
    expect(incrementScanCount).toHaveBeenCalledTimes(1)
    expect(updateChallengeProgress).toHaveBeenCalledWith('scan')
    expect(setDoc).toHaveBeenCalledTimes(1)
    expect(setDoc.mock.calls[0][0].path).toBe(`users/u1/lessons/${e.id}`)
  })
})

describe('saveLesson — chapitre du programme', () => {
  it('id stable, pas de scan compté, origine « programme »', () => {
    setActiveUser('u1')
    const e = saveLesson(meta, aiData, { id: 'prog-thales', source: 'programme', chapterId: 'thales' })
    expect(e.id).toBe('prog-thales')
    expect(e.source).toBe('programme')
    expect(e.chapterId).toBe('thales')
    expect(incrementScanCount).not.toHaveBeenCalled()
    expect(updateChallengeProgress).not.toHaveBeenCalled()
    expect(setDoc.mock.calls[0][0].path).toBe('users/u1/lessons/prog-thales')
  })

  it('rouvrir le même chapitre remplace l’entrée au lieu de la dupliquer', () => {
    setActiveUser('u1')
    saveLesson(meta, aiData, { id: 'prog-thales', source: 'programme', chapterId: 'thales' })
    saveLesson(meta, aiData, { id: 'prog-thales', source: 'programme', chapterId: 'thales' })
    expect(loadLessons().filter(l => l.id === 'prog-thales')).toHaveLength(1)
  })

  it('un chapitre et un scan de même titre coexistent (dédoublonnage par id)', () => {
    setActiveUser('u1')
    saveLesson(meta, aiData)
    saveLesson(meta, aiData, { id: 'prog-thales', source: 'programme', chapterId: 'thales' })
    expect(loadLessons()).toHaveLength(2)
  })
})

describe('mode essai (uid invite-…)', () => {
  it('n’écrit jamais dans Firestore mais garde tout en local', () => {
    setActiveUser('invite-abc123')
    const e = saveLesson(meta, aiData, { id: 'prog-thales', source: 'programme', chapterId: 'thales' })
    expect(loadLessons()[0].id).toBe(e.id)
    expect(localStorage.getItem('reviz-lessons-invite-abc123')).toBeTruthy()
    expect(setDoc).not.toHaveBeenCalled()
    pushLessonsToFirestore([e])
    expect(setDoc).not.toHaveBeenCalled()
  })

  it('pushLessonsToFirestore envoie les entrées d’un vrai compte', () => {
    setActiveUser('u1')
    pushLessonsToFirestore([{ id: 'prog-a' }, { id: 'prog-b' }, { nope: true }])
    expect(setDoc).toHaveBeenCalledTimes(2)
    expect(setDoc.mock.calls.map(c => c[0].path)).toEqual(['users/u1/lessons/prog-a', 'users/u1/lessons/prog-b'])
  })
})
