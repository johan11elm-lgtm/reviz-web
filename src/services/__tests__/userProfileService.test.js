import { describe, it, expect, vi } from 'vitest'

const setDoc = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('firebase/firestore', () => ({
  doc: (db, ...path) => path.join('/'),
  getDoc: vi.fn(),
  setDoc,
  serverTimestamp: () => 'maintenant',
}))
vi.mock('../firebaseConfig', () => ({ db: {} }))

import { createUserProfile } from '../userProfileService'

describe('createUserProfile', () => {
  it('écrit le profil sans champ de facturation (refusé par les règles si la fiche existe déjà)', async () => {
    const level = { cycle: 'college', classe: '4ème', specialites: [] }
    await createUserProfile('u1', { prenom: 'Léa', email: 'l@f.fr', birthDate: '2012-05-04', level })
    expect(setDoc).toHaveBeenCalledWith('users/u1', {
      prenom: 'Léa', email: 'l@f.fr', birthDate: '2012-05-04', level, createdAt: 'maintenant',
    }, { merge: true })
    expect(setDoc.mock.calls[0][1]).not.toHaveProperty('plan')
  })
})
