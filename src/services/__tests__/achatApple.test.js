// Le plugin Capacitor est un Proxy qui répond à toute propriété, `then` compris (18/11 :
// l'écran restait sur « Prix de l'App Store… » car l'await du plugin ne se résolvait jamais).
import { describe, it, expect, vi } from 'vitest'

const appels = []
const PRODUITS = [
  { identifier: 'com.reviz.app.plus.annuel', priceString: '49,00 €', price: 49, currencyCode: 'EUR', introPrice: { priceString: '29,00 €', price: 29 } },
  { identifier: 'com.reviz.app.plus.mensuel', priceString: '6,99 €', price: 6.99, currencyCode: 'EUR',
    discounts: [{ identifier: 'fin_essai_299', priceString: '2,99 €', price: 2.99 }] },
  { identifier: 'com.reviz.app.passbrevet', priceString: '29,00 €', price: 29, currencyCode: 'EUR' },
]
const natif = { configure: async () => {}, logIn: async () => {},
  getProducts: async ({ productIdentifiers }) => ({ products: PRODUITS.filter(p => productIdentifiers.includes(p.identifier)) }) }
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
    expect(f.annuel.prix).toBe('49,00 €')
    expect(f.mensuel.centimes).toBe(699)
    expect(appels).toEqual(['configure', 'getProducts', 'getProducts'])
  })

  it('lit le Pass brevet, l’offre de lancement de l’annuel et l’offre de fin d’essai du mensuel', async () => {
    const f = await formulesApple()
    expect(f.pass).toMatchObject({ prix: '29,00 €', centimes: 2900 })
    expect(f.annuel.intro).toEqual({ prix: '29,00 €', centimes: 2900 })
    expect(f.mensuel.promo).toMatchObject({ identifier: 'fin_essai_299', priceString: '2,99 €' })
    expect(f.mensuel.intro).toBeNull()
  })
})
