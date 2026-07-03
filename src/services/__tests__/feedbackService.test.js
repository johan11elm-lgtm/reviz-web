import { describe, it, expect, vi, beforeEach } from 'vitest'

const addDoc = vi.fn()
vi.mock('firebase/firestore', () => ({
  addDoc: (...args) => addDoc(...args),
  collection: vi.fn((db, name) => ({ name })),
  serverTimestamp: () => 'ts',
}))
vi.mock('../firebaseConfig', () => ({
  db: {},
  auth: { currentUser: { uid: 'u1' } },
}))

const { sendFormatFeedback, hasGivenFeedback } = await import('../feedbackService')

beforeEach(() => {
  addDoc.mockReset()
  addDoc.mockResolvedValue({ id: 'doc1' })
  localStorage.clear()
  localStorage.setItem('reviz-current-lesson-id', 'lesson-42')
  localStorage.setItem('reviz-ai-data', JSON.stringify({
    metadata: { title: 'Théorème de Thalès', subject: 'Maths' },
  }))
  localStorage.setItem('reviz-level-u1', JSON.stringify({ cycle: 'college', classe: '4ème' }))
})

describe('sendFormatFeedback', () => {
  it('écrit le document avec les métadonnées de la leçon courante', async () => {
    const ok = await sendFormatFeedback('quiz', 'up')
    expect(ok).toBe(true)
    expect(addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'aiFeedback' }),
      expect.objectContaining({
        uid: 'u1',
        format: 'quiz',
        rating: 'up',
        lessonTitle: 'Théorème de Thalès',
        subject: 'Maths',
        classe: '4ème',
      }),
    )
  })

  it('marque le feedback comme donné pour (leçon, format)', async () => {
    expect(hasGivenFeedback('quiz')).toBe(false)
    await sendFormatFeedback('quiz', 'down')
    expect(hasGivenFeedback('quiz')).toBe(true)
    // Autre format sur la même leçon : toujours sollicitable
    expect(hasGivenFeedback('resume')).toBe(false)
    // Nouvelle leçon : le quiz redevient sollicitable
    localStorage.setItem('reviz-current-lesson-id', 'lesson-43')
    expect(hasGivenFeedback('quiz')).toBe(false)
  })

  it('rejette rating ou format invalide sans appeler Firestore', async () => {
    expect(await sendFormatFeedback('quiz', 'super')).toBe(false)
    expect(await sendFormatFeedback('dictée', 'up')).toBe(false)
    expect(addDoc).not.toHaveBeenCalled()
  })

  it('retourne false sur échec Firestore (UI optimiste, pas de crash)', async () => {
    addDoc.mockRejectedValue(new Error('offline'))
    expect(await sendFormatFeedback('quiz', 'meh')).toBe(false)
    // Pas marqué comme donné : on repropose la prochaine fois
    expect(hasGivenFeedback('quiz')).toBe(false)
  })

  it('gère des métadonnées absentes (leçon legacy)', async () => {
    localStorage.removeItem('reviz-ai-data')
    const ok = await sendFormatFeedback('mindmap', 'up')
    expect(ok).toBe(true)
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lessonTitle: null, subject: null }),
    )
  })
})
