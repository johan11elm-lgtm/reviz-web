import { describe, it, expect, vi, beforeEach } from 'vitest'

const add = vi.fn(async () => ({ id: 'x' }))
const collection = vi.fn(() => ({ add }))
vi.mock('../_firebaseAdmin.js', () => ({ getDb: () => ({ collection }) }))

const { default: handler, buildAvis, MAX_TEXTE } = await import('../avis.js')

function mockRes() {
  return {
    statusCode: 0, payload: null,
    status(c) { this.statusCode = c; return this },
    send(b) { this.payload = b; return this },
    json(b) { this.payload = b; return this },
  }
}

const NOW = new Date('2026-10-06T18:00:00Z')

beforeEach(() => { add.mockClear(); collection.mockClear() })

describe('buildAvis', () => {
  it('garde les champs utiles et nettoie les textes', () => {
    expect(buildAvis({
      profil: 'enseignant', discipline: 'SVT', conseil: 'oui',
      plait: '  Les quiz  ', manque: 'Une erreur en 4e', email: ' prof@exemple.fr ',
      source: 'affiche-profs', device: 'mobile',
    }, NOW)).toEqual({
      avis: {
        profil: 'enseignant', discipline: 'SVT', conseil: 'oui',
        plait: 'Les quiz', manque: 'Une erreur en 4e', email: 'prof@exemple.fr',
        source: 'affiche-profs', device: 'mobile', createdAt: NOW,
      },
    })
  })

  it('ignore la discipline hors enseignant, les valeurs inconnues et les champs en trop', () => {
    const { avis } = buildAvis({
      profil: 'eleve', discipline: 'SVT', conseil: 'bof', manque: 'Plus de 3e',
      source: 'pub', device: 'frigo', prenom: 'Léa',
    }, NOW)
    expect(avis).toEqual({ profil: 'eleve', manque: 'Plus de 3e', source: 'direct', createdAt: NOW })
  })

  it('coupe les textes trop longs', () => {
    const { avis } = buildAvis({ profil: 'parent', plait: 'a'.repeat(MAX_TEXTE + 50) }, NOW)
    expect(avis.plait).toHaveLength(MAX_TEXTE)
  })

  it('refuse un profil manquant, un avis vide ou un e-mail invalide', () => {
    expect(buildAvis({ conseil: 'oui' })).toEqual({ error: 'PROFIL' })
    expect(buildAvis({ profil: 'autre', plait: '   ' })).toEqual({ error: 'VIDE' })
    expect(buildAvis({ profil: 'autre', conseil: 'non', email: 'pas-un-mail' })).toEqual({ error: 'EMAIL' })
    expect(buildAvis(null)).toEqual({ error: 'BAD_BODY' })
  })

  it('repère le champ piège des robots', () => {
    expect(buildAvis({ profil: 'autre', conseil: 'oui', site: 'http://spam' })).toEqual({ spam: true })
  })
})

describe('handler', () => {
  it('enregistre l\'avis dans la collection avis et répond 204', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: { profil: 'enseignant', conseil: 'peut-etre' } }, res)
    expect(res.statusCode).toBe(204)
    expect(collection).toHaveBeenCalledWith('avis')
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ profil: 'enseignant', conseil: 'peut-etre', source: 'direct' }))
  })

  it('accepte un corps en texte', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: JSON.stringify({ profil: 'eleve', plait: 'Top' }) }, res)
    expect(res.statusCode).toBe(204)
    expect(add).toHaveBeenCalledTimes(1)
  })

  it('répond 204 au robot sans rien enregistrer', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: { profil: 'autre', conseil: 'oui', site: 'x' } }, res)
    expect(res.statusCode).toBe(204)
    expect(add).not.toHaveBeenCalled()
  })

  it('rejette les requêtes invalides', async () => {
    const vide = mockRes()
    await handler({ method: 'POST', body: { profil: 'autre' } }, vide)
    expect(vide.statusCode).toBe(400)
    expect(vide.payload).toEqual({ error: 'VIDE' })

    const json = mockRes()
    await handler({ method: 'POST', body: '{pas du json' }, json)
    expect(json.statusCode).toBe(400)

    const gros = mockRes()
    await handler({ method: 'POST', body: { profil: 'autre', plait: 'a'.repeat(20000) } }, gros)
    expect(gros.statusCode).toBe(413)

    const get = mockRes()
    await handler({ method: 'GET' }, get)
    expect(get.statusCode).toBe(405)
    expect(add).not.toHaveBeenCalled()
  })

  it('répond 500 si Firestore échoue', async () => {
    add.mockRejectedValueOnce(new Error('down'))
    const res = mockRes()
    await handler({ method: 'POST', body: { profil: 'parent', conseil: 'oui' } }, res)
    expect(res.statusCode).toBe(500)
  })
})
