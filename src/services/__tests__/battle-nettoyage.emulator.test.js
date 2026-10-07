// Le nettoyage quotidien des Battles (api/battle-nettoyage.js) contre les
// émulateurs Realtime Database et Firestore, avec firebase-admin comme en prod.
// emulators:exec fournit FIREBASE_DATABASE_EMULATOR_HOST et FIRESTORE_EMULATOR_HOST.
import { describe, it, expect, afterAll } from 'vitest'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getDatabaseWithUrl } from 'firebase-admin/database'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { nettoyer } from '../../../api/battle-nettoyage.js'

const app = initializeApp({ projectId: 'demo-reviz' }, 'nettoyage-test')
const rtdb = getDatabaseWithUrl('https://demo-reviz-default-rtdb.firebaseio.com', app)
const db = getFirestore(app)
afterAll(() => deleteApp(app))

const HEURE = 3600_000

describe('nettoyage des Battles (émulateurs)', () => {
  it('ne garde que les salons récents et les marques de moins de 48 heures', async () => {
    const maintenant = Date.now()
    await rtdb.ref('battles').set({
      VIEU: { etat: 'fin', creeLe: maintenant - 30 * HEURE },
      HIER: { etat: 'jeu', creeLe: maintenant - 2 * HEURE },
      JEUX: { etat: 'jeu', creeLe: maintenant - 5 * 60_000 },
    })
    await db.collection('battlesComptees').doc('VIEU-1').set({ compteLe: Timestamp.fromMillis(maintenant - 72 * HEURE) })
    await db.collection('battlesComptees').doc('JEUX-2').set({ compteLe: Timestamp.fromMillis(maintenant - HEURE) })

    expect(await nettoyer({ rtdb, db, maintenant })).toEqual({ salons: 2, marques: 1 })
    expect(Object.keys((await rtdb.ref('battles').get()).val())).toEqual(['JEUX'])
    expect((await db.collection('battlesComptees').get()).docs.map(d => d.id)).toEqual(['JEUX-2'])
  })
})
