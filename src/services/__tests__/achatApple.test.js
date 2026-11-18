// Le plugin Capacitor est un Proxy qui répond à toute propriété, `then` compris (18/11 :
// l'écran restait sur « Prix de l'App Store… » car l'await du plugin ne se résolvait jamais).
import { describe, it, expect, vi } from 'vitest'

const appels = []
const natif = { configure: async () => {}, logIn: async () => {}, getProducts: async () => ({ products: [
  { identifier: 'com.reviz.app.plus.annuel', priceString: '54,99 €', price: 54.99, currencyCode: 'EUR' },
  { identifier: 'com.reviz.app.plus.mensuel', priceString: '7,99 €', price: 7.99, currencyCode: 'EUR' },
] }) }
// Comme registerPlugin : toute propriété est une méthode, y compris `then` (qui ne répond jamais).
const Purchases = new Proxy({}, { get: (_, prop) => (...a) => { appels.push(prop); return prop in natif ? natif[prop](...a) : new Promise(() => {}) } })

vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'ios' } }))
vi.mock('@revenuecat/purchases-capacitor', () => ({ Purchases }))
vi.mock('../firebaseConfig', () => ({ auth: { currentUser: { uid: 'u1', getIdToken: async () => 't' } } }))
vi.mock('../apiClient.js', () => ({ apiFetch: vi.fn() }))
vi.stubEnv('VITE_REVENUECAT_IOS', 'appl_test')

const { formulesApple } = await import('../achatApple.js')

describe('achatApple', () => {
  it('lit les prix sans prendre le plugin pour une promesse', async () => {
    const f = await formulesApple()
    expect(f.annuel.prix).toBe('54,99 €')
    expect(f.mensuel.centimes).toBe(799)
    expect(appels).toEqual(['configure', 'getProducts'])
  })
})
