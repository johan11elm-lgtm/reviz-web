import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('firebase/firestore', () => ({
  setDoc: vi.fn(() => Promise.resolve()), deleteDoc: vi.fn(() => Promise.resolve()),
  doc: vi.fn(() => ({})), collection: vi.fn(), getDocs: vi.fn(), query: vi.fn(), orderBy: vi.fn(),
}))
vi.mock('../firebaseConfig', () => ({ db: {} }))
vi.mock('../scanLimitService', () => ({ incrementScanCount: vi.fn() }))
vi.mock('../challengeService', () => ({ updateChallengeProgress: vi.fn() }))

const { loadCatalogue, loadChapterContent, openChapter, chapterProgress, matiereProgress, illustrationsAJour, _resetProgrammeCache } = await import('../programmeService')
const { setActiveUser, loadLessons } = await import('../historyService')
const { setSrsUser, updateCardState } = await import('../srsService')

const catalogue = {
  classe: '3ème',
  matieres: [{
    matiere: 'Maths', slug: 'maths', chapitres: [
      { id: 'thales', titre: 'Le théorème de Thalès', ordre: 1, notions: ['Énoncé'], pret: true },
      { id: 'trigo', titre: 'Trigonométrie', ordre: 2, notions: [], pret: false },
    ],
  }],
}
const content = {
  metadata: { title: 'Titre IA à ignorer', subject: 'Mathématiques', excerpt: 'Proportionnalité des longueurs.' },
  flashcards: [{ front: 'a', back: 'b' }, { front: 'c', back: 'd' }],
  quiz: [{ question: 'q', choices: ['a', 'b', 'c', 'd'], correct: 0 }],
  resume: { intro: 'i', keyPoints: [], sections: [], keyTerms: [] },
  mindmap: { branches: [] },
  programme: { classe: '3ème', matiere: 'Maths', chapitreId: 'thales' },
}

function mockFetch(routes) {
  return vi.fn(async url => {
    const hit = routes[url]
    if (!hit) return { ok: false, status: 404, json: async () => ({}) }
    return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(hit)) }
  })
}

beforeEach(() => {
  localStorage.clear()
  _resetProgrammeCache()
  setActiveUser('u1')
  setSrsUser('u1')
  vi.stubGlobal('fetch', mockFetch({
    '/programme/3eme/index.json': catalogue,
    '/programme/3eme/maths/thales.json': content,
  }))
})
afterEach(() => vi.unstubAllGlobals())

describe('chargement', () => {
  it('lit le catalogue une seule fois (cache mémoire)', async () => {
    const a = await loadCatalogue('3ème')
    const b = await loadCatalogue('3ème')
    expect(a.matieres[0].matiere).toBe('Maths')
    expect(b).toBe(a)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('signale un chapitre absent', async () => {
    await expect(loadChapterContent('3ème', 'Maths', 'inconnu')).rejects.toThrow('CHAPITRE_INDISPONIBLE')
  })
})

describe('openChapter', () => {
  it('pose la leçon pour Analyse et l’enregistre sous un id stable, titre et matière du catalogue', async () => {
    localStorage.setItem('reviz-lesson-text', 'ancien texte collé')
    const entry = await openChapter('3ème', 'Maths', catalogue.matieres[0].chapitres[0])
    expect(entry.id).toBe('prog-thales')
    expect(entry.source).toBe('programme')
    expect(entry.metadata).toMatchObject({ title: 'Le théorème de Thalès', subject: 'Maths', excerpt: 'Proportionnalité des longueurs.' })
    const aiData = JSON.parse(localStorage.getItem('reviz-ai-data'))
    expect(aiData.metadata.subject).toBe('Maths')
    expect(aiData.programme).toBeUndefined()
    expect(localStorage.getItem('reviz-lesson-text')).toBeNull()
    expect(localStorage.getItem('reviz-current-lesson-id')).toBe('prog-thales')
    expect(loadLessons()[0].id).toBe('prog-thales')
  })
})

describe('progression', () => {
  const ch = catalogue.matieres[0].chapitres[0]

  it('nouveau → commencé → à revoir → maîtrisé', async () => {
    expect(chapterProgress(ch, loadLessons()).state).toBe('nouveau')
    await openChapter('3ème', 'Maths', ch)
    expect(chapterProgress(ch, loadLessons()).state).toBe('commence')
    updateCardState('prog-thales', 0, 'got')          // 1 carte revue, l'autre jamais vue → due
    expect(chapterProgress(ch, loadLessons())).toMatchObject({ state: 'a-revoir', dueCards: 1 })
    updateCardState('prog-thales', 1, 'got')
    expect(chapterProgress(ch, loadLessons()).state).toBe('maitrise')
  })

  it('compte les chapitres d’une matière', async () => {
    expect(matiereProgress(catalogue.matieres[0])).toEqual({ total: 2, commences: 0, maitrises: 0 })
    await openChapter('3ème', 'Maths', ch)
    expect(matiereProgress(catalogue.matieres[0])).toEqual({ total: 2, commences: 1, maitrises: 0 })
  })
})

describe('illustrations', () => {
  const ch = catalogue.matieres[0].chapitres[0]
  const figure = {
    id: 'thales', src: '/programme/illustrations/3eme/maths/thales.svg', alt: 'Configuration de Thalès', ancre: 'resume.sections[0]',
  }

  it('openChapter retient la classe et la matière du chapitre', async () => {
    await openChapter('3ème', 'Maths', ch)
    expect(loadLessons()[0]).toMatchObject({ chapterId: 'thales', classe: '3ème', matiere: 'Maths' })
  })

  it('relit les illustrations ajoutées au chapitre après sa première ouverture', async () => {
    await openChapter('3ème', 'Maths', ch)
    expect(await illustrationsAJour()).toEqual([])
    _resetProgrammeCache()
    vi.stubGlobal('fetch', mockFetch({ '/programme/3eme/maths/thales.json': { ...content, illustrations: [figure] } }))
    const liste = await illustrationsAJour()
    expect(liste.map(i => i.src)).toEqual(['/programme/illustrations/3eme/maths/thales.svg'])
  })

  it('ne relit rien pour une leçon scannée ou une entrée enregistrée sans classe', async () => {
    expect(await illustrationsAJour('1700000000000')).toBeNull()
    await openChapter('3ème', 'Maths', ch)
    // eslint-disable-next-line no-unused-vars
    const lessons = loadLessons().map(({ classe, ...l }) => l)
    localStorage.setItem('reviz-lessons-u1', JSON.stringify(lessons))
    expect(await illustrationsAJour('prog-thales')).toBeNull()
  })
})
