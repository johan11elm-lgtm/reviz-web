import { describe, it, expect, vi, beforeEach } from 'vitest'
import { envoyerNotifs, routeAbonnement, abonnementValide, idAbonnement, preparerEnvoi } from '../_push.js'
import { notifDuJour, serieJusqua, MAX_SANS_RETOUR } from '../../src/utils/push.js'

// 27/10/2026 à 17 h, heure de Paris (16 h UTC, heure du cron).
const MAINTENANT = Date.parse('2026-10-27T16:00:00Z')
const H = 60 * 60 * 1000
const ADULTE = '2008-03-01'
const ENFANT = '2014-05-10'
const ABO = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc123', keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' } }

let users, consents, lecons, pushs
const sets = []
function makeDb() {
  return {
    collectionGroup: nom => {
      if (nom !== 'push') throw new Error(nom)
      return {
        get: async () => ({
          docs: Object.entries(pushs).flatMap(([uid, liste]) => liste.map((a, i) => ({
            data: () => a,
            ref: { parent: { parent: { id: uid } }, delete: vi.fn(async () => { liste.splice(i, 1) }) },
          }))),
        }),
      }
    },
    collection: nom => {
      if (nom !== 'users') throw new Error(nom)
      return {
        doc: uid => ({
          get: async () => ({ exists: uid in users, data: () => users[uid] }),
          set: async (m, o) => { sets.push({ uid, m, o }); users[uid] = { ...users[uid], ...m } },
          collection: sub => ({
            doc: id => ({
              get: async () => sub === 'parentalConsent'
                ? { exists: uid in consents, data: () => consents[uid] }
                : { exists: false, data: () => null },
              set: async m => { sets.push({ uid, sub, id, m }) },
              delete: async () => { sets.push({ uid, sub, id, supprime: true }) },
            }),
            orderBy: () => ({ limit: () => ({ get: async () => ({ docs: (lecons[uid] ?? []).map(l => ({ data: () => l })) }) }) }),
          }),
        }),
      }
    },
  }
}

const envoyer = vi.fn(async () => {})
const lancer = (extra = {}) => envoyerNotifs({ db: makeDb(), envoyer, maintenant: MAINTENANT, journal: () => {}, ...extra })

beforeEach(() => {
  users = {}; consents = {}; lecons = {}; pushs = {}
  sets.length = 0
  envoyer.mockReset(); envoyer.mockResolvedValue()
})

describe('notifications web — qui les reçoit', () => {
  it('envoie une notification, une seule fois par jour, à tous les appareils de l’élève', async () => {
    users.lea = { birthDate: ADULTE, joursActifs: ['2026-10-25'] }
    pushs.lea = [ABO, { ...ABO, endpoint: 'https://web.push.apple.com/xyz' }]
    expect(await lancer()).toEqual({ notifs: 1, abonnesPush: 1 })
    expect(envoyer).toHaveBeenCalledTimes(2)
    const [abo, charge, options] = envoyer.mock.calls[0]
    expect(abo).toEqual(ABO)
    expect(JSON.parse(charge)).toMatchObject({ title: 'La partie du jour est prête', url: 'https://app.revizapp.fr/jeux?via=push' })
    expect(options).toMatchObject({ TTL: 21600, urgency: 'normal' })
    expect(users.lea.push).toMatchObject({ dernierLe: MAINTENANT, sansRetour: 1 })
    // Le même jour, rien de plus.
    envoyer.mockClear()
    expect(await lancer()).toEqual({ notifs: 0, abonnesPush: 1 })
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('rien pour qui a déjà révisé ou ouvert l’app aujourd’hui, ni le jour du rappel par e-mail', async () => {
    users.ouvert = { birthDate: ADULTE, joursActifs: ['2026-10-27'] }
    users.revise = { birthDate: ADULTE, derniereRevisionAt: MAINTENANT - 2 * H }
    users.mail = { birthDate: ADULTE, rappelJ1Le: MAINTENANT - 60 * 1000 }
    users.coupe = { birthDate: ADULTE, notifsPush: false }
    for (const u of Object.keys(users)) pushs[u] = [ABO]
    expect((await lancer()).notifs).toBe(0)
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('moins de 15 ans : seulement avec l’autorisation d’un parent ; sans date de naissance : jamais', async () => {
    users.attente = { birthDate: ENFANT }
    users.ok = { birthDate: ENFANT }
    users.inconnu = {}
    consents.attente = { status: 'pending', parentEmail: 'p@test.fr' }
    consents.ok = { status: 'approved' }
    for (const u of Object.keys(users)) pushs[u] = [ABO]
    expect((await lancer()).notifs).toBe(1)
    expect(sets.filter(s => s.m?.push).map(s => s.uid)).toEqual(['ok'])
  })

  it('se tait après trois notifications sans retour, et reprend quand l’élève revient', async () => {
    users.lea = { birthDate: ADULTE, push: { dernierLe: MAINTENANT - 24 * H, sansRetour: MAX_SANS_RETOUR }, joursActifs: ['2026-10-20'] }
    pushs.lea = [ABO]
    expect((await lancer()).notifs).toBe(0)
    // Revenue hier soir, après la dernière notification : le compteur repart.
    users.lea.joursActifs = ['2026-10-20', '2026-10-26']
    expect((await lancer()).notifs).toBe(1)
    expect(users.lea.push.sansRetour).toBe(1)
  })

  it('oublie un abonnement que le navigateur a retiré (410), sans compter d’envoi', async () => {
    users.lea = { birthDate: ADULTE }
    pushs.lea = [ABO]
    envoyer.mockRejectedValueOnce(Object.assign(new Error('Gone'), { statusCode: 410 }))
    expect((await lancer()).notifs).toBe(0)
    expect(pushs.lea).toHaveLength(0)
    expect(users.lea.push).toBeUndefined()
  })

  it('une erreur chez un élève n’arrête pas les autres', async () => {
    users.a = { birthDate: ADULTE }
    users.b = { birthDate: ADULTE }
    pushs.a = [ABO]; pushs.b = [{ ...ABO, endpoint: 'https://fcm.googleapis.com/fcm/send/b' }]
    envoyer.mockRejectedValueOnce(Object.assign(new Error('boom'), { statusCode: 500 }))
    const journal = vi.fn()
    expect((await lancer({ journal })).notifs).toBe(1)
    expect(journal).toHaveBeenCalledWith(expect.stringContaining('boom'))
  })
})

describe('notifications web — le message du jour', () => {
  const base = { hier: '2026-10-26', demain: '2026-10-28' }
  it('1. un contrôle noté pour demain passe avant tout', () => {
    const n = notifDuJour({ ...base, agenda: { controles: [{ id: 'c', date: '2026-10-28', matiere: 'anglais', titre: 'Les verbes irréguliers' }] }, jeux: { jours: ['2026-10-25', '2026-10-26'] } })
    expect(n).toMatchObject({ title: 'Contrôle d’anglais demain'.replace('’', "'"), url: 'https://app.revizapp.fr/agenda?via=push', tag: 'reviz-controle' })
    expect(n.body).toContain('Les verbes irréguliers')
  })
  it('2. puis la série de la partie du jour (deux jours au moins, finie hier)', () => {
    expect(notifDuJour({ ...base, jeux: { jours: ['2026-10-24', '2026-10-25', '2026-10-26'] } })).toMatchObject({ title: '3 jours de suite', tag: 'reviz-serie' })
    expect(serieJusqua(['2026-10-25'], '2026-10-26')).toBe(0)
  })
  it('3. puis le dernier chapitre ouvert, avec le lien de son quiz', () => {
    const n = notifDuJour({ ...base, lecon: { source: 'programme', chapterId: 'thales', classe: '3ème', matiere: 'Maths', metadata: { title: 'Théorème de Thalès' } } })
    expect(n).toMatchObject({ title: 'Ton chapitre t\'attend', url: 'https://app.revizapp.fr/essai?classe=3%C3%A8me&matiere=maths&chapitre=thales&via=push' })
  })
  it('4. sinon la partie du jour', () => {
    expect(notifDuJour({ ...base, lecon: { source: 'scan', metadata: { title: 'Ma leçon' } } }).tag).toBe('reviz-jeux')
  })
})

describe('notifications web — abonnement', () => {
  const verifyIdToken = vi.fn()
  const auth = { verifyIdToken }
  function res() {
    return { statusCode: 0, payload: null, status(c) { this.statusCode = c; return this }, json(b) { this.payload = b; return this } }
  }
  beforeEach(() => { verifyIdToken.mockReset(); verifyIdToken.mockResolvedValue({ uid: 'lea', firebase: { sign_in_provider: 'password' } }) })

  it('enregistre l’abonnement du navigateur sous le compte du jeton', async () => {
    const r = res()
    await routeAbonnement({ method: 'POST', body: { idToken: 't', abonnement: ABO } }, r, { db: makeDb(), auth, maintenant: MAINTENANT })
    expect(r.statusCode).toBe(200)
    expect(sets).toEqual([{ uid: 'lea', sub: 'push', id: idAbonnement(ABO.endpoint), m: { ...ABO, creeLe: MAINTENANT, vuLe: MAINTENANT } }])
  })
  it('retire l’abonnement (retirer: true)', async () => {
    const r = res()
    await routeAbonnement({ method: 'POST', body: { idToken: 't', endpoint: ABO.endpoint, retirer: true } }, r, { db: makeDb(), auth })
    expect(r.statusCode).toBe(200)
    expect(sets[0]).toMatchObject({ sub: 'push', id: idAbonnement(ABO.endpoint), supprime: true })
  })
  it('refuse sans jeton, avec un jeton invalide, pour un invité anonyme, ou un abonnement mal formé', async () => {
    let r = res(); await routeAbonnement({ method: 'POST', body: { abonnement: ABO } }, r, { db: makeDb(), auth }); expect(r.statusCode).toBe(401)
    verifyIdToken.mockRejectedValueOnce(new Error('bad'))
    r = res(); await routeAbonnement({ method: 'POST', body: { idToken: 'x', abonnement: ABO } }, r, { db: makeDb(), auth }); expect(r.statusCode).toBe(401)
    verifyIdToken.mockResolvedValueOnce({ uid: 'anon', firebase: { sign_in_provider: 'anonymous' } })
    r = res(); await routeAbonnement({ method: 'POST', body: { idToken: 'x', abonnement: ABO } }, r, { db: makeDb(), auth }); expect(r.statusCode).toBe(403)
    r = res(); await routeAbonnement({ method: 'POST', body: { idToken: 'x', abonnement: { endpoint: 'http://evil', keys: {} } } }, r, { db: makeDb(), auth }); expect(r.statusCode).toBe(400)
    expect(sets).toHaveLength(0)
  })
  it('abonnementValide ne garde que l’adresse et les deux clés', () => {
    expect(abonnementValide({ ...ABO, expirationTime: null, extra: 'x' })).toEqual(ABO)
    expect(abonnementValide({ endpoint: 'https://x/y', keys: { p256dh: '<script>', auth: 'a' } })).toBeNull()
  })
  it('sans clé privée VAPID, rien ne part (pas d’erreur)', async () => {
    expect(await preparerEnvoi({})).toBeNull()
  })
})
