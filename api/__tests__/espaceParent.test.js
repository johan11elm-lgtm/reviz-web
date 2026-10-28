import { describe, it, expect, vi } from 'vitest'
import { lienEspaceParent, lienParentValide, donneesEspaceParent, routeEspaceParent, aRevizPlus, DUREE_LIEN_MS } from '../_espaceParent.js'

const SECRET = 'secret-de-test'
const UID = 'abcdefghij1234'
const MAINTENANT = new Date('2026-10-28T12:00:00+01:00').getTime()
const JOUR = 86_400_000

function fauxDb({ profil, revisions = [], lecons = {} }) {
  const ref = {
    get: async () => ({ exists: !!profil, data: () => profil }),
    collection: nom => nom === 'revisions'
      ? { where: () => ({ get: async () => ({ docs: revisions.map(r => ({ data: () => r })) }) }) }
      : { doc: id => ({ get: async () => ({ exists: !!lecons[id], data: () => lecons[id] }) }) },
  }
  return { collection: () => ({ doc: () => ref }) }
}

const reponse = () => {
  const r = { statut: 0, corps: null, headers: {} }
  r.status = s => { r.statut = s; return r }
  r.json = c => { r.corps = c; return r }
  r.setHeader = (k, v) => { r.headers[k] = v }
  return r
}
const params = lien => Object.fromEntries(new URL(lien).searchParams)

describe('lien de l’espace parent', () => {
  it('signé, valable 60 jours, refusé une fois expiré ou modifié', () => {
    const lien = lienEspaceParent(UID, { maintenant: MAINTENANT, secret: SECRET })
    expect(lien).toMatch(/^https:\/\/app\.revizapp\.fr\/parent\?u=abcdefghij1234&e=\d+&t=[0-9a-f]{32}$/)
    const { u, e, t } = params(lien)
    expect(lienParentValide(u, e, t, { maintenant: MAINTENANT, secret: SECRET })).toBe(true)
    expect(lienParentValide(u, e, t, { maintenant: MAINTENANT + DUREE_LIEN_MS + 1000, secret: SECRET })).toBe(false)
    expect(lienParentValide(u, String(Number(e) + 1), t, { maintenant: MAINTENANT, secret: SECRET })).toBe(false)
    expect(lienParentValide('autreuid12345', e, t, { maintenant: MAINTENANT, secret: SECRET })).toBe(false)
    expect(lienParentValide(u, e, t, { maintenant: MAINTENANT, secret: 'autre' })).toBe(false)
  })
  it('pas de lien sans secret', () => {
    expect(lienEspaceParent(UID, { maintenant: MAINTENANT, secret: '' })).toBeNull()
  })
})

describe('donneesEspaceParent', () => {
  it('révisions des 30 jours, chapitres sans les notes, contrôles et préparation, Réviz+', async () => {
    const db = fauxDb({
      profil: {
        prenom: 'Léa', level: { classe: '3ème' }, plan: 'premium', subscriptionStatus: 'active',
        jeux: { jours: ['2026-10-20', '2026-09-01'] },
        agenda: { controles: [
          { id: 'c1', matiere: 'maths', titre: 'Thalès', date: '2026-11-03', plan: { flash: '2026-10-28' } },
          { id: 'c0', matiere: 'svt', titre: '', date: '2026-10-01' },
        ] },
      },
      revisions: [
        { revisedAt: MAINTENANT - JOUR, lessonId: 'l1', type: 'quiz', total: 10, score: 4 },
        { revisedAt: MAINTENANT - 2 * JOUR, lessonId: 'l1', type: 'flashcards' },
      ],
      lecons: { l1: { metadata: { title: 'Le théorème de Thalès' }, matiere: 'Maths' } },
    })
    const d = await donneesEspaceParent({ db, uid: UID, maintenant: MAINTENANT })
    expect(d).toMatchObject({ prenom: 'Léa', classe: '3ème', joursRevision: 3, quizTermines: 1, parties: 1, revizPlus: true })
    expect(d.jours).toEqual(['2026-10-20', '2026-10-26', '2026-10-27'])
    expect(d.chapitres).toEqual([{ titre: 'Le théorème de Thalès', matiere: 'Maths', formats: ['quiz', 'flashcards'], quizTermine: true, derniere: MAINTENANT - JOUR }])
    expect(JSON.stringify(d)).not.toContain('score')
    expect(d.controles).toEqual([{ matiere: 'Maths', titre: 'Thalès', date: '2026-11-03', etat: 'En bonne voie', etapesFaites: 1, etapes: 3 }])
  })
  it('null si le compte n’existe pas', async () => {
    expect(await donneesEspaceParent({ db: fauxDb({ profil: null }), uid: UID, maintenant: MAINTENANT })).toBeNull()
  })
  it('Réviz+ seulement avec un abonnement en cours', () => {
    expect(aRevizPlus({ plan: 'premium', subscriptionStatus: 'canceled' })).toBe(false)
    expect(aRevizPlus({ plan: 'free' })).toBe(false)
  })
})

describe('routeEspaceParent', () => {
  it('GET op=parent : 403 sur un lien invalide, les données sinon', async () => {
    const db = fauxDb({ profil: { prenom: 'Léa' } })
    let res = reponse()
    await routeEspaceParent({ query: { op: 'parent', u: UID, e: '1', t: 'x' } }, res, { db, maintenant: MAINTENANT, secret: SECRET })
    expect(res.statut).toBe(403)
    const { u, e, t } = params(lienEspaceParent(UID, { maintenant: MAINTENANT, secret: SECRET }))
    res = reponse()
    await routeEspaceParent({ query: { op: 'parent', u, e, t } }, res, { db, maintenant: MAINTENANT, secret: SECRET })
    expect(res.statut).toBe(200)
    expect(res.corps.prenom).toBe('Léa')
    expect(res.headers['Cache-Control']).toBe('no-store')
  })
  it('POST op=lien-parent : un lien pour l’élève connecté, jamais pour un compte anonyme', async () => {
    const auth = { verifyIdToken: vi.fn(async jeton => (jeton === 'anon' ? { uid: 'x', firebase: { sign_in_provider: 'anonymous' } } : { uid: UID, firebase: {} })) }
    let res = reponse()
    await routeEspaceParent({ query: { op: 'lien-parent' }, body: {} }, res, { db: null, auth, maintenant: MAINTENANT, secret: SECRET })
    expect(res.statut).toBe(401)
    res = reponse()
    await routeEspaceParent({ query: { op: 'lien-parent' }, body: { idToken: 'anon' } }, res, { db: null, auth, maintenant: MAINTENANT, secret: SECRET })
    expect(res.statut).toBe(403)
    res = reponse()
    await routeEspaceParent({ query: { op: 'lien-parent' }, body: JSON.stringify({ idToken: 'ok' }) }, res, { db: null, auth, maintenant: MAINTENANT, secret: SECRET })
    expect(res.statut).toBe(200)
    expect(res.corps.lien).toContain(`/parent?u=${UID}&e=`)
  })
})

describe('bilan J+3 au parent', () => {
  it('porte le lien de l’espace parent quand il est fourni', async () => {
    const { mailBilanParent } = await import('../_bilanParent.js')
    const resume = { chapitres: [{ titre: 'Thalès', matiere: 'Maths', formats: new Set(['quiz']), quizTermine: true }], joursRevision: 2, quizTermines: 1, parties: 0 }
    const base = { prenom: 'Léa', classe: '3ème', depuis: MAINTENANT - 4 * JOUR, maintenant: MAINTENANT, resume }
    const lien = lienEspaceParent(UID, { maintenant: MAINTENANT, secret: SECRET })
    expect(mailBilanParent({ ...base, espace: lien }).html).toContain('Ouvrir l\'espace parent')
    expect(mailBilanParent({ ...base, espace: lien }).html).toContain(lien.replace(/&/g, '&amp;'))
    expect(mailBilanParent(base).html).not.toContain('espace parent')
  })
})
