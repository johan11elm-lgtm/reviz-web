import { describe, it, expect, beforeEach } from 'vitest'
import {
  GUEST_KEY, isGuestUid, readGuest, startGuest, clearGuest, guestUser, migrateGuestLocalData,
} from '../guestService'

const level = { cycle: 'college', classe: '3ème', specialites: [] }

beforeEach(() => localStorage.clear())

describe('mode essai — session invitée', () => {
  it('démarre une session avec un uid « invite-… » et pose le niveau', () => {
    const g = startGuest({ prenom: '  Léa ', level })
    expect(isGuestUid(g.uid)).toBe(true)
    expect(g.prenom).toBe('Léa')
    expect(readGuest()).toEqual(g)
    expect(JSON.parse(localStorage.getItem(`reviz-level-${g.uid}`))).toEqual(level)
  })

  it('refuse un prénom vide ou un niveau incomplet', () => {
    expect(() => startGuest({ prenom: '', level })).toThrow('GUEST_INVALID')
    expect(() => startGuest({ prenom: 'Léa', level: { cycle: 'college' } })).toThrow('GUEST_INVALID')
    expect(readGuest()).toBeNull()
  })

  it('ignore un enregistrement corrompu ou étranger', () => {
    localStorage.setItem(GUEST_KEY, '{pas du json')
    expect(readGuest()).toBeNull()
    localStorage.setItem(GUEST_KEY, JSON.stringify({ uid: 'abc', prenom: 'X' }))
    expect(readGuest()).toBeNull()
  })

  it('guestUser ressemble à un utilisateur sans jeton serveur', async () => {
    const u = guestUser(startGuest({ prenom: 'Léa', level }))
    expect(u.isGuest).toBe(true)
    expect(u.displayName).toBe('Léa')
    expect(await u.getIdToken()).toBeNull()
  })

  it('clearGuest efface la session', () => {
    startGuest({ prenom: 'Léa', level })
    clearGuest()
    expect(readGuest()).toBeNull()
  })
})

describe('mode essai — reprise sur un vrai compte', () => {
  it('recopie leçons, révisions, SRS et niveau vers le nouvel uid puis nettoie', () => {
    const g = startGuest({ prenom: 'Léa', level })
    const lessons = [{ id: 'prog-thales', metadata: { title: 'Thalès' } }]
    const revisions = [{ id: 'r1', type: 'quiz', lessonId: 'prog-thales', revisedAt: 1 }]
    localStorage.setItem(`reviz-lessons-${g.uid}`, JSON.stringify(lessons))
    localStorage.setItem(`reviz-revisions-${g.uid}`, JSON.stringify(revisions))
    localStorage.setItem(`reviz-srs-${g.uid}`, JSON.stringify({ 'prog-thales_0': { reps: 1 } }))

    const out = migrateGuestLocalData(g.uid, 'u1')

    expect(out.lessons).toEqual(lessons)
    expect(out.revisions).toEqual(revisions)
    expect(JSON.parse(localStorage.getItem('reviz-lessons-u1'))).toEqual(lessons)
    expect(JSON.parse(localStorage.getItem('reviz-srs-u1'))).toEqual({ 'prog-thales_0': { reps: 1 } })
    expect(JSON.parse(localStorage.getItem('reviz-level-u1'))).toEqual(level)
    expect(localStorage.getItem(`reviz-lessons-${g.uid}`)).toBeNull()
    expect(readGuest()).toBeNull()
  })

  it('fusionne sans écraser ce que le compte possède déjà', () => {
    const g = startGuest({ prenom: 'Léa', level })
    localStorage.setItem(`reviz-lessons-${g.uid}`, JSON.stringify([{ id: 'prog-a' }, { id: 'scan-1' }]))
    localStorage.setItem('reviz-lessons-u1', JSON.stringify([{ id: 'scan-1' }, { id: 'scan-2' }]))
    localStorage.setItem('reviz-level-u1', JSON.stringify({ cycle: 'lycee', classe: '2nde' }))

    migrateGuestLocalData(g.uid, 'u1')

    expect(JSON.parse(localStorage.getItem('reviz-lessons-u1')).map(l => l.id)).toEqual(['scan-1', 'scan-2', 'prog-a'])
    expect(JSON.parse(localStorage.getItem('reviz-level-u1'))).toEqual({ cycle: 'lycee', classe: '2nde' })
  })

  it('ne fait rien pour un uid qui n’est pas un invité', () => {
    localStorage.setItem('reviz-lessons-u0', '[{"id":"x"}]')
    expect(migrateGuestLocalData('u0', 'u1')).toEqual({ lessons: [], revisions: [] })
    expect(localStorage.getItem('reviz-lessons-u1')).toBeNull()
  })
})
