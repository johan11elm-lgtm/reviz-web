// Rappel du lendemain (api/_rappels.js) et révisions d'essai (api/track.js)
// contre l'émulateur Firestore, avec firebase-admin comme en prod : la
// requête sur le champ imbriqué premiereSession.jour tourne sans index publié.
import { describe, it, expect, afterAll } from 'vitest'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { relancerLendemain } from '../../../api/_rappels.js'
import { jourParis } from '../../utils/retour.js'

const app = initializeApp({ projectId: 'demo-reviz' }, 'rappels-test')
const db = getFirestore(app)
afterAll(() => deleteApp(app))

describe('rappel J+1 (émulateur)', () => {
  it('écrit au compte commencé hier, pas au moins de 15 ans sans autorisation', async () => {
    const maintenant = Date.now()
    const hier = jourParis(new Date(maintenant - 24 * 3600_000))
    await db.collection('users').doc('rappelAdulte01').set({
      prenom: 'Léa', birthDate: '2008-01-01',
      premiereSession: { jour: hier, chapterId: 'pythagore', classe: '4ème', matiere: 'Maths', titre: 'Le théorème de Pythagore' },
    })
    await db.collection('users').doc('rappelEnfant01').set({ birthDate: '2014-01-01', premiereSession: { jour: hier } })
    await db.collection('users').doc('rappelEnfant01').collection('parentalConsent').doc('consent').set({ status: 'pending' })

    const envois = []
    const envoyer = async m => { envois.push(m) }
    const emailDe = async uid => `${uid}@test.fr`
    expect(await relancerLendemain({ db, envoyer, emailDe, maintenant, secret: 's' })).toEqual({ rappelsJ1: 1 })
    expect(envois.map(e => e.to)).toEqual(['rappelAdulte01@test.fr'])
    expect((await db.collection('users').doc('rappelAdulte01').get()).data().rappelJ1Le).toBe(maintenant)
    expect(await relancerLendemain({ db, envoyer, emailDe, maintenant, secret: 's' })).toEqual({ rappelsJ1: 0 })
  })
})
