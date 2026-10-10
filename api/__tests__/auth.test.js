import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const verifyIdToken = vi.fn()
const createCustomToken = vi.fn(async (uid) => `custom-${uid}`)
const getUser = vi.fn()
const createUser = vi.fn()
const setCustomUserClaims = vi.fn()

vi.mock('../_firebaseAdmin.js', () => ({
  getAuthAdmin: () => ({ verifyIdToken, createCustomToken, getUser, createUser, setCustomUserClaims }),
}))

const { default: handler } = await import('../auth.js')

function mockRes() {
  return {
    statusCode: 0, payload: null, headers: {},
    status(c) { this.statusCode = c; return this },
    json(b) { this.payload = b; return this },
    setHeader(k, v) { this.headers[k.toLowerCase()] = v },
    end() { return this },
  }
}
const now = () => Math.floor(Date.now() / 1000)

beforeEach(() => {
  verifyIdToken.mockReset(); createCustomToken.mockClear(); getUser.mockReset(); createUser.mockReset()
  setCustomUserClaims.mockReset()
  getUser.mockResolvedValue({ customClaims: undefined })
  vi.stubEnv('TIKTOK_CLIENT_KEY', 'ck')
  vi.stubEnv('TIKTOK_CLIENT_SECRET', 'cs')
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('auth — session native (Microsoft iOS)', () => {
  const post = (body) => { const res = mockRes(); return handler({ method: 'POST', body }, res).then(() => res) }

  it('refuse (401) sans idToken', async () => {
    expect((await post({ action: 'natif' })).statusCode).toBe(401)
  })

  it('refuse (401) un jeton invalide', async () => {
    verifyIdToken.mockRejectedValue(new Error('bad'))
    expect((await post({ action: 'natif', idToken: 'x' })).statusCode).toBe(401)
  })

  it('refuse (403) un autre fournisseur que Microsoft', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u', auth_time: now(), firebase: { sign_in_provider: 'password' } })
    const res = await post({ action: 'natif', idToken: 'x' })
    expect(res.statusCode).toBe(403)
    expect(createCustomToken).not.toHaveBeenCalled()
  })

  it('refuse (401) une connexion trop ancienne', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u', auth_time: now() - 3600, firebase: { sign_in_provider: 'microsoft.com' } })
    expect((await post({ action: 'natif', idToken: 'x' })).statusCode).toBe(401)
  })

  it('renvoie un jeton personnalisé pour le même uid', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u42', auth_time: now(), firebase: { sign_in_provider: 'microsoft.com' } })
    const res = await post({ action: 'natif', idToken: 'x' })
    expect(verifyIdToken).toHaveBeenCalledWith('x', true)
    expect(res.statusCode).toBe(200)
    expect(res.payload).toEqual({ customToken: 'custom-u42' })
    expect(setCustomUserClaims).toHaveBeenCalledWith('u42', { reviz_social: true })
  })

  it('garde les claims existants et ne réécrit pas un compte déjà marqué', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u42', auth_time: now(), firebase: { sign_in_provider: 'microsoft.com' } })
    getUser.mockResolvedValue({ customClaims: { reviz_social: true, autre: 1 } })
    await post({ action: 'natif', idToken: 'x' })
    expect(setCustomUserClaims).not.toHaveBeenCalled()
  })
})

describe('auth — TikTok', () => {
  const get = (query, cookie) => {
    const res = mockRes()
    return handler({ method: 'GET', query, headers: cookie ? { cookie } : {} }, res).then(() => res)
  }

  it('départ : redirige vers TikTok avec un state mémorisé en cookie', async () => {
    const res = await get({ action: 'tiktok' })
    expect(res.statusCode).toBe(302)
    const url = new URL(res.headers.location)
    expect(url.origin + url.pathname).toBe('https://www.tiktok.com/v2/auth/authorize/')
    expect(url.searchParams.get('client_key')).toBe('ck')
    expect(url.searchParams.get('redirect_uri')).toBe('https://app.revizapp.fr/api/auth')
    const state = url.searchParams.get('state')
    expect(res.headers['set-cookie']).toContain(`reviz_tiktok_state=${state}`)
    expect(res.headers['set-cookie']).toContain('HttpOnly')
  })

  it('départ sans configuration → retour connexion en erreur', async () => {
    vi.stubEnv('TIKTOK_CLIENT_KEY', '')
    const res = await get({ action: 'tiktok' })
    expect(res.headers.location).toBe('https://app.revizapp.fr/connexion#tiktok_erreur=config')
  })

  it('retour : state différent du cookie → refusé, TikTok jamais appelé', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const res = await get({ code: 'c', state: 'a' }, 'reviz_tiktok_state=b')
    expect(res.headers.location).toBe('https://app.revizapp.fr/connexion#tiktok_erreur=state')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('retour : crée le compte tiktok:<open_id> et renvoie un jeton', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => ({
      ok: true,
      json: async () => (String(url).includes('/oauth/token/')
        ? { access_token: 'at', open_id: 'oid' }
        : { data: { user: { display_name: 'Lina' } } }),
    })))
    getUser.mockRejectedValueOnce(Object.assign(new Error('nf'), { code: 'auth/user-not-found' }))
    const res = await get({ code: 'c', state: 's' }, 'reviz_tiktok_state=s')
    expect(createUser).toHaveBeenCalledWith({ uid: 'tiktok:oid', displayName: 'Lina' })
    expect(setCustomUserClaims).toHaveBeenCalledWith('tiktok:oid', { reviz_social: true })
    expect(createCustomToken).toHaveBeenCalledWith('tiktok:oid', { provider: 'tiktok' })
    expect(res.headers.location).toBe(`https://app.revizapp.fr/connexion#tiktok=${encodeURIComponent('custom-tiktok:oid')}`)
  })

  it('retour : échange de code refusé → retour connexion en erreur', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({ error: 'invalid_grant' }) })))
    const res = await get({ code: 'c', state: 's' }, 'reviz_tiktok_state=s')
    expect(res.headers.location).toBe('https://app.revizapp.fr/connexion#tiktok_erreur=serveur')
    expect(createCustomToken).not.toHaveBeenCalled()
  })
})
