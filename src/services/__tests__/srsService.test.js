import { describe, it, expect, beforeEach } from 'vitest'
import {
  setSrsUser,
  updateCardState,
  getCardState,
  getDueCards,
  countDueCards,
} from '../srsService'

const CARDS = [
  { front: 'Q0', back: 'R0' },
  { front: 'Q1', back: 'R1' },
  { front: 'Q2', back: 'R2' },
]

beforeEach(() => {
  localStorage.clear()
  setSrsUser(null)
})

describe('srsService — contrat de clé write/read', () => {
  it('une leçon jamais vue : toutes les cartes sont dues', () => {
    expect(countDueCards('lessonA', CARDS.length)).toBe(3)
    expect(getDueCards('lessonA', CARDS).every(c => c.isDue)).toBe(true)
  })

  it('marquer "got" sous un lessonId est relu sous le MÊME lessonId (régression clé default)', () => {
    updateCardState('lessonA', 0, 'got')

    // La carte 0 n'est plus due aujourd'hui — la clé d'écriture matche la clé de lecture.
    expect(countDueCards('lessonA', CARDS.length)).toBe(2)
    expect(getCardState('lessonA', 0)).not.toBeNull()
    expect(getDueCards('lessonA', CARDS).find(c => c.index === 0).isDue).toBe(false)
  })

  it('deux leçons distinctes ne collisionnent pas (le bug d\'origine : tout sous "default")', () => {
    updateCardState('lessonA', 0, 'got')
    updateCardState('lessonA', 1, 'got')

    // lessonB est indépendante : aucune carte consommée.
    expect(countDueCards('lessonA', CARDS.length)).toBe(1)
    expect(countDueCards('lessonB', CARDS.length)).toBe(3)
    expect(getCardState('lessonB', 0)).toBeNull()
  })

  it('"got" répété allonge l\'intervalle (SM-2 simplifié)', () => {
    const s1 = updateCardState('lessonA', 0, 'got')
    expect(s1.interval).toBe(1)
    const s2 = updateCardState('lessonA', 0, 'got')
    expect(s2.interval).toBe(3)
    const s3 = updateCardState('lessonA', 0, 'got')
    expect(s3.interval).toBeGreaterThan(3)
  })

  it('"again" remet la carte à zéro (reps=0, intervalle initial)', () => {
    updateCardState('lessonA', 0, 'got')
    updateCardState('lessonA', 0, 'got')
    const s = updateCardState('lessonA', 0, 'again')
    expect(s.reps).toBe(0)
    expect(s.interval).toBe(1)
  })

  it('l\'état est isolé par utilisateur (clé reviz-srs-{uid})', () => {
    setSrsUser('user1')
    updateCardState('lessonA', 0, 'got')
    setSrsUser('user2')
    expect(countDueCards('lessonA', CARDS.length)).toBe(3) // user2 ne voit pas l'état de user1
    setSrsUser('user1')
    expect(countDueCards('lessonA', CARDS.length)).toBe(2)
  })
})
