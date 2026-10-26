import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Le service worker (public/sw.js) est évalué avec un faux `self`, un faux `caches` et un faux
// `fetch` : on déclenche ses événements `fetch` comme le navigateur le ferait.
const SOURCE = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8')

function creerSW({ reseau }) {
  const ecouteurs = {}
  const stockage = new Map() // cache unique : clé = url
  const cle = (r) => (typeof r === 'string' ? new URL(r, 'https://app.test').href : r.url)
  const cache = {
    addAll: async () => {},
    put: async (r, rep) => { stockage.set(cle(r), rep) },
    match: async (r) => stockage.get(cle(r)),
  }
  const caches = {
    open: async () => cache,
    match: async (r) => stockage.get(cle(r)),
    keys: async () => [],
    delete: async () => true,
  }
  const self = {
    addEventListener: (nom, f) => { ecouteurs[nom] = f },
    skipWaiting: () => {},
    clients: { claim: () => {} },
  }
  const fetch = vi.fn(async (r) => reseau(new URL(r.url).pathname, r))
  new Function('self', 'caches', 'fetch', 'Response', SOURCE)(self, caches, fetch, Response)

  /** Joue un événement fetch ; renvoie la réponse (null si le SW ne l'intercepte pas). */
  async function demander(chemin, destination = '', mode = 'no-cors') {
    const request = { url: 'https://app.test' + chemin, destination, mode }
    let promesse = null
    ecouteurs.fetch({ request, respondWith: (p) => { promesse = p } })
    if (!promesse) return null
    try { return await promesse } catch { return 'erreur-reseau' }
  }
  const enCache = (chemin) => stockage.has(cle(chemin))
  return { demander, enCache, fetch }
}

const html = () => new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } })
const js = () => new Response('export {}', { status: 200, headers: { 'content-type': 'text/javascript' } })

describe('public/sw.js', () => {
  it('nomme son cache reviz-v6', () => {
    expect(SOURCE).toContain("const CACHE_NAME = 'reviz-v6'")
  })

  it('ne met jamais en cache une page HTML servie pour un chunk haché disparu', async () => {
    const sw = creerSW({ reseau: () => html() })
    const rep = await sw.demander('/assets/Jeux-ancien.js', 'script')
    expect(rep).toBeInstanceOf(Response) // la réponse passe telle quelle, au navigateur de la refuser
    expect(sw.enCache('/assets/Jeux-ancien.js')).toBe(false)
  })

  it('met en cache un chunk haché valide, puis le sert sans réseau (cache d\'abord)', async () => {
    const sw = creerSW({ reseau: () => js() })
    await sw.demander('/assets/Jeux-abc.js', 'script')
    expect(sw.enCache('/assets/Jeux-abc.js')).toBe(true)
    await sw.demander('/assets/Jeux-abc.js', 'script')
    expect(sw.fetch).toHaveBeenCalledTimes(1)
  })

  it('ne met pas en cache du HTML pour un script, un style, une police ou une image non hachés', async () => {
    const sw = creerSW({ reseau: () => html() })
    for (const [chemin, dest] of [['/x.js', 'script'], ['/x.css', 'style'], ['/x.woff2', 'font'], ['/x.png', 'image']]) {
      await sw.demander(chemin, dest)
      expect(sw.enCache(chemin)).toBe(false)
    }
  })

  it('scripts non hachés (moteur du pantin) : réseau d\'abord, donc toujours la version fraîche', async () => {
    let version = 1
    const sw = creerSW({ reseau: () => new Response(`v${version}`, { status: 200, headers: { 'content-type': 'text/javascript' } }) })
    expect(await (await sw.demander('/pantin/moteur/reviz-anim.js', 'script')).text()).toBe('v1')
    version = 2
    expect(await (await sw.demander('/pantin/moteur/reviz-anim.js', 'script')).text()).toBe('v2')
    expect(sw.fetch).toHaveBeenCalledTimes(2)
  })

  it('scripts non hachés hors ligne : retombe sur la dernière copie', async () => {
    let enLigne = true
    const sw = creerSW({ reseau: () => { if (!enLigne) throw new TypeError('hors ligne'); return js() } })
    await sw.demander('/pantin/moteur/reviz-anim.js', 'script')
    enLigne = false
    const rep = await sw.demander('/pantin/moteur/reviz-anim.js', 'script')
    expect(await rep.text()).toBe('export {}')
    // Jamais vu : une erreur réseau, pas de réponse inventée.
    expect((await sw.demander('/pantin/moteur/autre.js', 'script')).type).toBe('error')
  })

  it('navigation hors ligne : sert la page d\'accueil mise en cache, comme avant', async () => {
    let enLigne = true
    const sw = creerSW({ reseau: () => { if (!enLigne) throw new TypeError('hors ligne'); return html() } })
    await sw.demander('/', '', 'navigate')
    expect(sw.enCache('/')).toBe(true)
    enLigne = false
    const rep = await sw.demander('/jeux', '', 'navigate')
    expect(await rep.text()).toBe('<!doctype html>')
  })

  it('ne met pas en cache une navigation en erreur', async () => {
    const sw = creerSW({ reseau: () => new Response('boum', { status: 500, headers: { 'content-type': 'text/html' } }) })
    await sw.demander('/jeux', '', 'navigate')
    expect(sw.enCache('/jeux')).toBe(false)
  })

  it('n\'intercepte pas /api/ ni /ingest/', async () => {
    const sw = creerSW({ reseau: () => js() })
    expect(await sw.demander('/api/x', '')).toBeNull()
    expect(await sw.demander('/ingest/e', '')).toBeNull()
  })
})
