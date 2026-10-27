// Le service worker (public/sw.js) rejoué avec un faux `self` : réception d'une
// notification web et toucher de la notification.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Lancé depuis la racine du dépôt (vitest), comme les autres tests.
const SOURCE = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8')

function charger({ fenetres = [] } = {}) {
  const ecouteurs = {}
  const self = {
    location: { origin: 'https://app.revizapp.fr' },
    addEventListener: (nom, fn) => { ecouteurs[nom] = fn },
    skipWaiting: () => {},
    registration: { showNotification: vi.fn(async () => {}) },
    clients: { matchAll: vi.fn(async () => fenetres), openWindow: vi.fn(async () => {}), claim: () => {} },
  }
  new Function('self', 'caches', SOURCE)(self, {})
  return { self, ecouteurs }
}

async function declencher(fn, event) {
  let attente
  fn({ ...event, waitUntil: p => { attente = p } })
  await attente
}

describe('service worker — notifications web', () => {
  let sw
  beforeEach(() => { sw = charger() })

  it('affiche la notification reçue, avec son lien', async () => {
    await declencher(sw.ecouteurs.push, { data: { json: () => ({ title: 'Ton chapitre t\'attend', body: 'Thalès', url: 'https://app.revizapp.fr/jeux?via=push', tag: 'reviz-chapitre' }) } })
    expect(sw.self.registration.showNotification).toHaveBeenCalledWith('Ton chapitre t\'attend', expect.objectContaining({
      body: 'Thalès', tag: 'reviz-chapitre', icon: '/icon-192.png', data: { url: 'https://app.revizapp.fr/jeux?via=push' },
    }))
  })

  it('une charge illisible donne quand même une notification Réviz', async () => {
    await declencher(sw.ecouteurs.push, { data: { json: () => { throw new Error('pas du JSON') } } })
    expect(sw.self.registration.showNotification).toHaveBeenCalledWith('Réviz', expect.objectContaining({ data: { url: '/?via=push' } }))
  })

  it('toucher la notification ouvre la page, sans app ouverte', async () => {
    const close = vi.fn()
    await declencher(sw.ecouteurs.notificationclick, { notification: { close, data: { url: 'https://app.revizapp.fr/agenda?via=push' } } })
    expect(close).toHaveBeenCalled()
    expect(sw.self.clients.openWindow).toHaveBeenCalledWith('https://app.revizapp.fr/agenda?via=push')
  })

  it('avec l’app déjà ouverte, elle revient au premier plan sur la bonne page', async () => {
    const f = { url: 'https://app.revizapp.fr/', focus: vi.fn(async () => {}), navigate: vi.fn(async () => {}) }
    sw = charger({ fenetres: [f] })
    await declencher(sw.ecouteurs.notificationclick, { notification: { close: () => {}, data: { url: 'https://app.revizapp.fr/jeux?via=push' } } })
    expect(f.focus).toHaveBeenCalled()
    expect(f.navigate).toHaveBeenCalledWith('https://app.revizapp.fr/jeux?via=push')
    expect(sw.self.clients.openWindow).not.toHaveBeenCalled()
  })

  it('jamais vers un autre site', async () => {
    await declencher(sw.ecouteurs.notificationclick, { notification: { close: () => {}, data: { url: 'https://pirate.example/x' } } })
    expect(sw.self.clients.openWindow).toHaveBeenCalledWith('https://app.revizapp.fr/?via=push')
  })
})
