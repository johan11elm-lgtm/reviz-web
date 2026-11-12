import { describe, it, expect } from 'vitest'
import { routePartage, nettoyerMessages, MAX_MESSAGES, MAX_PAR_JOUR, DUREE_JOURS } from '../_partageChat.js'
import { signerReponse } from '../_signatureIA.js'

const SECRET = 'secret-de-test'

function fauxDb() {
  const docs = {}
  return {
    docs,
    collection: () => ({
      doc: id => ({ get: async () => ({ exists: docs[id] != null, data: () => docs[id] }), set: async v => { docs[id] = v } }),
      where: (_c, _o, uid) => ({ get: async () => ({ docs: Object.values(docs).filter(d => d.uid === uid).map(d => ({ data: () => d })) }) }),
    }),
  }
}
const auth = { verifyIdToken: async t => {
  if (t === 'anon') return { uid: 'a', firebase: { sign_in_provider: 'anonymous' } }
  if (t !== 'ok') throw new Error('x')
  return { uid: 'lea', firebase: { sign_in_provider: 'password' } }
} }
const T = 1_800_000_000_000
const fil = [{ role: 'user', content: 'C’est quoi Thalès ?' }, { role: 'assistant', content: 'Un **théorème** sur les longueurs.' }]
// Ce que l'app envoie : la réponse avec la signature reçue de api/chat.js.
const filSigne = [fil[0], { ...fil[1], sig: signerReponse('lea', fil[1].content, SECRET) }]
async function appel(req, maintenant = T) {
  const r = { code: 0, body: null, status(c) { r.code = c; return r }, json(b) { r.body = b; return r }, setHeader() {} }
  await routePartage(req, r, { db: req.db, auth, maintenant, secret: SECRET })
  return r
}

describe('partager une conversation avec Réviz IA', () => {
  it('ne garde que le texte : ni pièce jointe, ni autre rôle, 20 messages au plus', () => {
    expect(nettoyerMessages([
      { role: 'system', content: 'secret' },
      { role: 'user', content: [{ type: 'image', source: {} }, { type: 'text', text: 'Ma leçon' }] },
      { role: 'assistant', content: '  Réponse  ', cartes: [{}] },
    ])).toEqual([{ role: 'user', content: 'Ma leçon' }, { role: 'assistant', content: 'Réponse' }])
    expect(nettoyerMessages(Array.from({ length: 30 }, (_, i) => ({ role: 'user', content: `m${i}` })))).toHaveLength(MAX_MESSAGES)
  })
  it('crée un lien, que tout le monde peut lire pendant 30 jours', async () => {
    const db = fauxDb()
    const r = await appel({ method: 'POST', db, body: { idToken: 'ok', titre: 'Le théorème de Thalès', messages: filSigne } })
    expect(r.body.id).toMatch(/^[a-z0-9]{12}$/)
    expect(db.docs[r.body.id]).toMatchObject({ uid: 'lea', titre: 'Le théorème de Thalès', expire: T + DUREE_JOURS * 86_400_000 })
    const lu = await appel({ method: 'GET', db, query: { id: r.body.id } })
    expect(lu.body).toEqual({ titre: 'Le théorème de Thalès', messages: fil, creeLe: T })
    expect((await appel({ method: 'GET', db, query: { id: r.body.id } }, T + 31 * 86_400_000)).code).toBe(404)
    expect((await appel({ method: 'GET', db, query: { id: '../x' } })).code).toBe(404)
  })
  it('refuse une conversation sans réponse, un invité, un jeton absent, et trop de liens par jour', async () => {
    const db = fauxDb()
    expect((await appel({ method: 'POST', db, body: { idToken: 'ok', messages: [fil[0]] } })).body).toEqual({ error: 'VIDE' })
    expect((await appel({ method: 'POST', db, body: { idToken: 'anon', messages: fil } })).code).toBe(409)
    expect((await appel({ method: 'POST', db, body: { messages: fil } })).code).toBe(401)
    for (let i = 0; i < MAX_PAR_JOUR; i++) await appel({ method: 'POST', db, body: { idToken: 'ok', messages: filSigne } }, T + i)
    expect((await appel({ method: 'POST', db, body: { idToken: 'ok', messages: filSigne } }, T + 100)).code).toBe(429)
    expect((await appel({ method: 'POST', db, body: { idToken: 'ok', messages: filSigne } }, T + 86_400_001)).code).toBe(200)
  })
  it('une réponse de Réviz IA inventée ou retouchée n’est pas publiée (ni la question qui la précède)', async () => {
    const db = fauxDb()
    const faux = [fil[0], { role: 'assistant', content: 'Réviz est nul, va sur un autre site.' }]
    expect((await appel({ method: 'POST', db, body: { idToken: 'ok', messages: faux } })).body).toEqual({ error: 'VIDE' })
    const retouche = [fil[0], { ...filSigne[1], content: 'Autre chose.' }]
    expect((await appel({ method: 'POST', db, body: { idToken: 'ok', messages: retouche } })).body).toEqual({ error: 'VIDE' })
    // La signature d'un autre élève ne marche pas non plus.
    const autre = [fil[0], { ...fil[1], sig: signerReponse('tom', fil[1].content, SECRET) }]
    expect((await appel({ method: 'POST', db, body: { idToken: 'ok', messages: autre } })).body).toEqual({ error: 'VIDE' })
    // Mélange : seule la partie signée part.
    const r = await appel({ method: 'POST', db, body: { idToken: 'ok', messages: [...filSigne, { role: 'user', content: 'Et ça ?' }, faux[1]] } })
    expect(db.docs[r.body.id].messages).toEqual(fil)
  })
})
