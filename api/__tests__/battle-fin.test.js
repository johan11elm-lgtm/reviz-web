import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'

// ── Faux Firebase en mémoire ──
const verifyIdToken = vi.fn()
let salons = {}          // Realtime Database : chemin → valeur
let docs = {}            // Firestore : 'collection/id' → données
const rtdbSet = vi.fn()

function lireChemin(chemin) {
  const [, code, ...reste] = chemin.split('/')
  let v = salons[code]
  for (const k of reste) v = v?.[k]
  return v ?? null
}

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { increment: n => ({ __increment: n }), serverTimestamp: () => 'HORODATAGE' },
}))

function appliquer(donnees, maj) {
  const out = structuredClone(donnees)
  for (const [cle, val] of Object.entries(maj)) {
    const parts = cle.split('.')
    let cible = out
    for (const p of parts.slice(0, -1)) cible = cible[p] ??= {}
    const fin = parts.at(-1)
    cible[fin] = val?.__increment !== undefined ? (cible[fin] ?? 0) + val.__increment : val
  }
  return out
}

const fauxDb = {
  collection: col => ({ doc: id => ({ chemin: `${col}/${id}` }) }),
  runTransaction: async fn => {
    const ecritures = []
    const tx = {
      get: async ref => ({ exists: ref.chemin in docs, data: () => docs[ref.chemin] }),
      update: (ref, maj) => ecritures.push(() => { docs[ref.chemin] = appliquer(docs[ref.chemin], maj) }),
      set: (ref, val) => ecritures.push(() => { docs[ref.chemin] = val }),
    }
    const res = await fn(tx)
    ecritures.forEach(e => e())
    return res
  },
}

vi.mock('../_firebaseAdmin.js', () => ({
  getAuthAdmin: () => ({ verifyIdToken }),
  getDb: () => fauxDb,
  getRtdb: async () => ({
    ref: chemin => ({
      get: async () => ({ val: () => lireChemin(chemin) }),
      set: async v => { rtdbSet(chemin, v); const [, code, cle] = chemin.split('/'); salons[code][cle] = v },
    }),
  }),
}))

const { default: handler, dateParis } = await import('../battle-fin.js')

// ── Une vraie partie sur un vrai chapitre du programme ──
const QUIZ = JSON.parse(readFileSync('public/programme/4eme/svt/mouvement-commande-nerveuse.json', 'utf8')).quiz
const CHAPITRE = { classe: '4ème', matiere: 'SVT', id: 'mouvement-commande-nerveuse' }
const juste = (n, ms = 2000) => ({ choix: QUIZ[n].correct, ms })
const faux = n => ({ choix: (QUIZ[n].correct + 1) % 4, ms: 1500 })

// Johan (h) gagne 3–2 contre Léa (i) : rounds 1, 3, 5 pour h ; 2, 4 pour i.
function salonTermine(extra = {}) {
  const r = (n, rh, ri) => ({ debut: 1000 * n, reponses: { h: rh, i: ri } })
  return {
    etat: 'fin', creeLe: 1791380000000, chapitre: CHAPITRE, questions: [0, 1, 2, 3, 4, 5], round: 5,
    hote: { uid: 'h', prenom: 'Johan', present: true },
    invite: { uid: 'i', prenom: 'Léa', present: true },
    rounds: { 1: r(1, juste(0), faux(0)), 2: r(2, faux(1), juste(1)), 3: r(3, juste(2, 1000), juste(2)), 4: r(4, juste(3, 3000), juste(3, 1000)), 5: r(5, juste(4), faux(4)) },
    ...extra,
  }
}

function appel(body) {
  const res = { statusCode: 0, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } }
  return handler({ method: 'POST', body }, res).then(() => res)
}

beforeEach(() => {
  verifyIdToken.mockReset()
  verifyIdToken.mockImplementation(async t => ({ uid: t.replace('jeton-', '') }))
  rtdbSet.mockReset()
  salons = { K7RM: salonTermine() }
  docs = { 'users/h': { prenom: 'Johan', aura: 100 }, 'users/i': { prenom: 'Léa', aura: 5 } }
})

describe('api/battle-fin — accès', () => {
  it('refuse sans jeton, avec un mauvais code ou un jeton invalide', async () => {
    expect((await appel({ code: 'K7RM' })).statusCode).toBe(401)
    expect((await appel({ idToken: 'jeton-h', code: 'K0RM' })).statusCode).toBe(400)
    verifyIdToken.mockRejectedValueOnce(new Error('faux'))
    expect((await appel({ idToken: 'pirate', code: 'K7RM' })).statusCode).toBe(401)
    const res = { statusCode: 0, status(c) { this.statusCode = c; return this }, json() { return this } }
    await handler({ method: 'GET' }, res)
    expect(res.statusCode).toBe(405)
  })

  it('salon inconnu, élève qui n’a pas joué, partie en cours', async () => {
    expect((await appel({ idToken: 'jeton-h', code: 'ABCD' })).statusCode).toBe(404)
    expect((await appel({ idToken: 'jeton-x', code: 'K7RM' })).statusCode).toBe(403)
    salons.K7RM.etat = 'jeu'
    expect((await appel({ idToken: 'jeton-h', code: 'K7RM' })).statusCode).toBe(409)
  })

  it('refuse un id de chapitre qui sortirait du dossier du programme', async () => {
    salons.K7RM.chapitre = { ...CHAPITRE, id: '../../api/battle-fin' }
    expect((await appel({ idToken: 'jeton-h', code: 'K7RM' })).body).toEqual({ error: 'BAD_CHAPTER' })
  })
})

describe('api/battle-fin — aura', () => {
  it('recalcule la partie et écrit l’aura des deux comptes', async () => {
    const res = await appel({ idToken: 'jeton-i', code: 'k7rm' })
    expect(res.statusCode).toBe(200)
    // Johan : 20 − 10 + 20 + 0 + 20 + 30 = 80 ; Léa : −10 + 20 + 0 + 20 − 10 = 20
    expect(res.body.compte).toEqual({
      h: { delta: 80, aura: 180, comptee: true },
      i: { delta: 20, aura: 25, comptee: true },
    })
    expect(docs['users/h']).toMatchObject({ aura: 180, battles: { jouees: 1, gagnees: 1 } })
    expect(docs['users/i']).toMatchObject({ aura: 25, battles: { jouees: 1, gagnees: 0 } })
    expect(docs['users/h'].auraJour).toEqual({ date: dateParis(), parties: 1, adversaires: { i: 1 } })
    expect(rtdbSet).toHaveBeenCalledWith('battles/K7RM/compte', res.body.compte)
  })

  it('ne compte jamais deux fois la même partie', async () => {
    await appel({ idToken: 'jeton-h', code: 'K7RM' })
    await appel({ idToken: 'jeton-i', code: 'K7RM' })
    // Même si le résultat n'avait pas été recopié dans le salon :
    delete salons.K7RM.compte
    await appel({ idToken: 'jeton-i', code: 'K7RM' })
    expect(docs['users/h'].aura).toBe(180)
    expect(docs['users/h'].battles.jouees).toBe(1)
  })

  it('un salon rouvert sous le même code est une autre partie', async () => {
    await appel({ idToken: 'jeton-h', code: 'K7RM' })
    salons.K7RM = salonTermine({ creeLe: 1791390000000 })
    await appel({ idToken: 'jeton-h', code: 'K7RM' })
    expect(docs['users/h'].battles.jouees).toBe(2)
  })

  it('l’aura ne descend pas sous 0', async () => {
    docs['users/i'].aura = 0
    // Léa perd tout : 5 erreurs
    salons.K7RM.rounds = Object.fromEntries([1, 2, 3, 4, 5].map(n => [n, { debut: n, reponses: { h: juste(n - 1), i: faux(n - 1) } }]))
    const res = await appel({ idToken: 'jeton-i', code: 'K7RM' })
    expect(res.body.compte.i).toEqual({ delta: 0, aura: 0, comptee: true })
  })

  it('au-delà de 2 parties contre la même personne dans la journée : partie amicale', async () => {
    docs['users/h'].auraJour = { date: dateParis(), parties: 2, adversaires: { i: 2 } }
    const res = await appel({ idToken: 'jeton-h', code: 'K7RM' })
    expect(res.body.compte.h).toEqual({ delta: 0, aura: 100, comptee: false })
    expect(res.body.compte.i.comptee).toBe(true)
    expect(docs['users/h'].battles.jouees).toBe(1)
  })

  it('un invité sans compte joue, mais son aura n’est gardée nulle part', async () => {
    delete docs['users/i']
    const res = await appel({ idToken: 'jeton-h', code: 'K7RM' })
    expect(res.body.compte.i).toEqual({ delta: 20, comptee: false, sansCompte: true })
    expect(docs['users/i']).toBeUndefined()
    expect(res.body.compte.h.aura).toBe(180)
  })

  it('forfait : le bonus de victoire va à celui qui reste', async () => {
    salons.K7RM = salonTermine({ etat: 'abandon', abandonPar: 'i' })
    const res = await appel({ idToken: 'jeton-h', code: 'K7RM' })
    expect(res.body.compte.h.delta).toBe(80)
  })
})

describe('date des plafonds', () => {
  it('suit l’heure de Paris : 23 h 30 UTC le 7 octobre, c’est déjà le 8', () => {
    expect(dateParis(new Date('2026-10-07T23:30:00Z'))).toBe('2026-10-08')
  })
})
