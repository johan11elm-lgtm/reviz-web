// firestore.rules contre l'émulateur (npm run test:emulateur) : l'aura de la
// Battle n'est écrite que par le serveur (api/battle-fin.js).
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { initializeApp, deleteApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc } from 'firebase/firestore'

const apps = []
function eleve(uid) {
  const app = initializeApp({ projectId: 'demo-reviz', apiKey: 'demo' }, `fs-${apps.length}`)
  apps.push(app)
  const db = getFirestore(app)
  connectFirestoreEmulator(db, '127.0.0.1', 8080, { mockUserToken: { sub: uid, user_id: uid } })
  return db
}

const refuse = promesse => expect(promesse).rejects.toThrow(/permission/i)

beforeEach(async () => {
  await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-reviz/databases/(default)/documents', {
    method: 'DELETE', headers: { Authorization: 'Bearer owner' },
  })
})
afterAll(() => Promise.all(apps.map(app => deleteApp(app))))

describe('firestore.rules — aura', () => {
  it('un élève crée son profil, mais pas avec de l’aura', async () => {
    const db = eleve('u1')
    await refuse(setDoc(doc(db, 'users/u1'), { prenom: 'Léa', aura: 9999 }))
    await refuse(setDoc(doc(db, 'users/u1'), { prenom: 'Léa', battles: { jouees: 50, gagnees: 50 } }))
    await setDoc(doc(db, 'users/u1'), { prenom: 'Léa' })
  })

  it('il modifie son profil, jamais son aura ni ses compteurs de battle', async () => {
    const db = eleve('u1')
    await setDoc(doc(db, 'users/u1'), { prenom: 'Léa' })
    await updateDoc(doc(db, 'users/u1'), { prenom: 'Léa M.' })
    await refuse(updateDoc(doc(db, 'users/u1'), { aura: 500 }))
    await refuse(updateDoc(doc(db, 'users/u1'), { 'battles.gagnees': 10 }))
    await refuse(updateDoc(doc(db, 'users/u1'), { auraJour: { date: '2026-10-07', parties: 0, adversaires: {} } }))
  })
})
