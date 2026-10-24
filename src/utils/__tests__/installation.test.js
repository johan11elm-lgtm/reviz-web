import { describe, it, expect, vi, beforeAll } from 'vitest'
import {
  detecterPlateforme,
  navigateurIntegre,
  estInstallee,
  brancherHauteurEcran,
  ecouterInstallation,
  installationDirectePossible,
  installerDirectement,
} from '../installation'

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  ipadMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  tiktok: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_41.2.0 JsSdk/2.0 NetType/WIFI Channel/App Store BytedanceWebview/d8a21c6',
  instagram: 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 Instagram 350.0.0.0',
}

describe('detecterPlateforme', () => {
  it('reconnaît iPhone, Android et ordinateur', () => {
    expect(detecterPlateforme(UA.iphone)).toBe('ios')
    expect(detecterPlateforme(UA.android)).toBe('android')
    expect(detecterPlateforme(UA.windows)).toBe('ordinateur')
  })
  it("reconnaît un iPad qui se présente comme un Mac, grâce à l'écran tactile", () => {
    expect(detecterPlateforme(UA.ipadMac, 5)).toBe('ios')
    expect(detecterPlateforme(UA.ipadMac, 0)).toBe('ordinateur')
  })
})

describe('navigateurIntegre', () => {
  it('repère les navigateurs de TikTok et Instagram', () => {
    expect(navigateurIntegre(UA.tiktok)).toBe('TikTok')
    expect(navigateurIntegre(UA.instagram)).toBe('Instagram')
  })
  it('ne signale rien dans un vrai navigateur', () => {
    expect(navigateurIntegre(UA.iphone)).toBeNull()
    expect(navigateurIntegre(UA.windows)).toBeNull()
  })
})

describe('estInstallee', () => {
  const fenetre = (standalone, matches) => ({ navigator: { standalone }, matchMedia: () => ({ matches }) })
  it("vrai dans l'app ajoutée à l'écran d'accueil (iOS) ou installée (display-mode)", () => {
    expect(estInstallee(fenetre(true, false))).toBe(true)
    expect(estInstallee(fenetre(undefined, true))).toBe(true)
  })
  it('faux dans un onglet de navigateur', () => {
    expect(estInstallee(fenetre(undefined, false))).toBe(false)
    expect(estInstallee(undefined)).toBe(false)
  })
})

describe('brancherHauteurEcran', () => {
  const fenetre = ({ standalone, innerWidth = 390, innerHeight = 797, ecran = 844 }) => {
    const style = new Map()
    return {
      navigator: { standalone }, matchMedia: () => ({ matches: false }),
      innerWidth, innerHeight, screen: { height: ecran },
      document: { documentElement: { style: { setProperty: (k, v) => style.set(k, v) } } },
      addEventListener: () => {}, removeEventListener: () => {},
      style,
    }
  }
  it("app installée sur téléphone : la hauteur de l'écran entier, barre d'état comprise", () => {
    const w = fenetre({ standalone: true })
    brancherHauteurEcran(w)
    expect(w.style.get('--hauteur-ecran')).toBe('844px')
  })
  it("dans le navigateur : rien n'est posé (les écrans gardent 100svh)", () => {
    const w = fenetre({ standalone: undefined })
    brancherHauteurEcran(w)
    expect(w.style.has('--hauteur-ecran')).toBe(false)
  })
  it("sur iPad (plus large qu'un téléphone) : la hauteur de la fenêtre, pas celle de l'écran", () => {
    const w = fenetre({ standalone: true, innerWidth: 820, innerHeight: 1000, ecran: 1180 })
    brancherHauteurEcran(w)
    expect(w.style.get('--hauteur-ecran')).toBe('1000px')
  })
})

describe("invitation d'installation de Chrome / Edge", () => {
  const installee = vi.fn()
  beforeAll(() => ecouterInstallation(installee))

  const inviter = outcome => {
    const e = new Event('beforeinstallprompt', { cancelable: true })
    e.prompt = vi.fn(async () => {})
    e.userChoice = Promise.resolve({ outcome })
    window.dispatchEvent(e)
    return e
  }

  it("garde l'invitation et l'utilise une seule fois", async () => {
    expect(installationDirectePossible()).toBe(false)
    const e = inviter('accepted')
    expect(e.defaultPrevented).toBe(true)
    expect(installationDirectePossible()).toBe(true)
    expect(await installerDirectement()).toBe(true)
    expect(e.prompt).toHaveBeenCalledTimes(1)
    expect(installationDirectePossible()).toBe(false)
    expect(await installerDirectement()).toBe(false)
  })

  it("renvoie faux quand l'élève refuse", async () => {
    inviter('dismissed')
    expect(await installerDirectement()).toBe(false)
  })

  it("prévient quand le navigateur confirme l'installation", () => {
    inviter('accepted')
    window.dispatchEvent(new Event('appinstalled'))
    expect(installee).toHaveBeenCalledTimes(1)
    expect(installationDirectePossible()).toBe(false)
  })
})
