import { describe, it, expect, vi, afterEach } from 'vitest'

// Mock pilotable de @capacitor/core : chaque test choisit la plateforme
// avant un import dynamique (IS_NATIVE est figé au chargement du module).
const mocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(() => false),
  request: vi.fn(),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: mocks.isNativePlatform },
  CapacitorHttp: { request: mocks.request },
}))

async function loadApiClient({ native = false, apiBase = '' } = {}) {
  vi.resetModules()
  mocks.isNativePlatform.mockReturnValue(native)
  vi.stubEnv('VITE_API_BASE', apiBase)
  return import('../apiClient')
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  mocks.request.mockReset()
})

describe('apiUrl — préfixage VITE_API_BASE', () => {
  it('préfixe un chemin relatif avec la base', async () => {
    const { apiUrl } = await loadApiClient({ apiBase: 'https://reviz.example' })
    expect(apiUrl('/api/generate')).toBe('https://reviz.example/api/generate')
  })

  it('sans base configurée, le chemin reste same-origin', async () => {
    const { apiUrl } = await loadApiClient()
    expect(apiUrl('/api/generate')).toBe('/api/generate')
  })

  it('laisse les URLs http(s) absolues intactes, casse comprise', async () => {
    const { apiUrl } = await loadApiClient({ apiBase: 'https://reviz.example' })
    expect(apiUrl('https://autre.example/x')).toBe('https://autre.example/x')
    expect(apiUrl('HTTP://autre.example/x')).toBe('HTTP://autre.example/x')
  })
})

describe('apiFetch — web (non natif)', () => {
  it('délègue à fetch(url, init) tel quel', async () => {
    const fakeResponse = new Response('ok', { status: 200 })
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse)
    vi.stubGlobal('fetch', fetchMock)

    const { apiFetch } = await loadApiClient({ native: false })
    const init = { method: 'POST', body: '{"a":1}' }
    const res = await apiFetch('/api/chat', init)

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/chat', init)
    expect(res).toBe(fakeResponse)
    expect(mocks.request).not.toHaveBeenCalled()
  })
})

describe('apiFetch — natif (CapacitorHttp)', () => {
  it('POST : body transmis en string telle quelle, un seul timeout de 120 s', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: 'ok', headers: {} })
    const { apiFetch } = await loadApiClient({ native: true, apiBase: 'https://reviz.example' })

    await apiFetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson: 'x' }),
    })

    // Forme exacte : pas de readTimeout (iOS prendrait min(connect, read))
    expect(mocks.request).toHaveBeenCalledExactlyOnceWith({
      url: 'https://reviz.example/api/generate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: '{"lesson":"x"}',
      responseType: 'text',
      connectTimeout: 120000,
    })
  })

  it('corps non-JSON : transmis tel quel, sans JSON.parse', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: 'ok', headers: {} })
    const { apiFetch } = await loadApiClient({ native: true })

    await apiFetch('/api/upload', { method: 'POST', body: 'texte brut' })

    expect(mocks.request.mock.calls[0][0].data).toBe('texte brut')
  })

  it('body sans en-têtes → Content-Type JSON par défaut (sinon corps perdu en natif)', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: 'ok', headers: {} })
    const { apiFetch } = await loadApiClient({ native: true })

    await apiFetch('/api/generate', { method: 'POST', body: '{}' })

    expect(mocks.request.mock.calls[0][0].headers).toEqual({
      'Content-Type': 'application/json',
    })
  })

  it('le Content-Type de l’appelant prime sur le défaut', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: 'ok', headers: {} })
    const { apiFetch } = await loadApiClient({ native: true })

    await apiFetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'X-Extra': '1' },
      body: 'texte brut',
    })

    expect(mocks.request.mock.calls[0][0].headers).toEqual({
      'Content-Type': 'text/plain',
      'X-Extra': '1',
    })
  })

  it('GET sans body : method GET par défaut, data absent', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: 'ok', headers: {} })
    const { apiFetch } = await loadApiClient({ native: true })

    await apiFetch('/api/ping')

    expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/api/ping',
      method: 'GET',
      headers: {},
      data: undefined,
    }))
  })

  it('init.signal est ignoré sans crash', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: 'ok', headers: {} })
    const { apiFetch } = await loadApiClient({ native: true })

    const res = await apiFetch('/api/ping', { signal: new AbortController().signal })

    expect(res.status).toBe(200)
    expect(mocks.request.mock.calls[0][0]).not.toHaveProperty('signal')
  })

  it('res.data string → corps restitué tel quel, headers propagés', async () => {
    mocks.request.mockResolvedValue({
      status: 201,
      data: '{"id":"abc"}',
      headers: { 'x-req': '1' },
    })
    const { apiFetch } = await loadApiClient({ native: true })

    const res = await apiFetch('/api/save', { method: 'POST', body: '{}' })

    expect(res.status).toBe(201)
    expect(res.headers.get('x-req')).toBe('1')
    await expect(res.text()).resolves.toBe('{"id":"abc"}')
  })

  it('res.data objet (plugin ayant déjà parsé) → re-sérialisé en string', async () => {
    mocks.request.mockResolvedValue({ status: 200, data: { ok: true }, headers: {} })
    const { apiFetch } = await loadApiClient({ native: true })

    const res = await apiFetch('/api/save', { method: 'POST', body: '{}' })

    await expect(res.json()).resolves.toEqual({ ok: true })
  })

  it.each([0, undefined, 600])('statut hors bornes (%s) → 599', async (status) => {
    mocks.request.mockResolvedValue({ status, data: 'err', headers: {} })
    const { apiFetch } = await loadApiClient({ native: true })

    const res = await apiFetch('/api/ping')

    expect(res.status).toBe(599)
  })

  it.each([204, 205, 304])('statut %s → corps null (contrainte Response)', async (status) => {
    mocks.request.mockResolvedValue({ status, data: 'ignoré', headers: {} })
    const { apiFetch } = await loadApiClient({ native: true })

    const res = await apiFetch('/api/ping')

    expect(res.status).toBe(status)
    expect(res.body).toBeNull()
  })

  it('rejet de CapacitorHttp.request → TypeError, message propagé (contrat fetch)', async () => {
    mocks.request.mockRejectedValue(new Error('SocketTimeoutException: timeout'))
    const { apiFetch } = await loadApiClient({ native: true })

    await expect(apiFetch('/api/ping')).rejects.toThrowError(
      new TypeError('SocketTimeoutException: timeout'),
    )
  })

  it('rejet sans message → TypeError NETWORK_ERROR', async () => {
    mocks.request.mockRejectedValue({})
    const { apiFetch } = await loadApiClient({ native: true })

    await expect(apiFetch('/api/ping')).rejects.toThrowError(new TypeError('NETWORK_ERROR'))
  })

  it('timeout natif (message « timed out ») → AbortError, pour afficher TIMEOUT', async () => {
    mocks.request.mockRejectedValue(new Error('The request timed out.'))
    const { apiFetch } = await loadApiClient({ native: true })

    await expect(apiFetch('/api/ping')).rejects.toMatchObject({
      name: 'AbortError',
      message: 'The request timed out.',
    })
  })

  it('timeout natif (code iOS -1001) → AbortError même sans message', async () => {
    mocks.request.mockRejectedValue({ code: -1001 })
    const { apiFetch } = await loadApiClient({ native: true })

    await expect(apiFetch('/api/ping')).rejects.toMatchObject({
      name: 'AbortError',
      message: 'TIMEOUT',
    })
  })
})
