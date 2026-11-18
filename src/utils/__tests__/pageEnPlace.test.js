import { describe, it, expect, vi } from 'vitest'
import { remettreEnPlace, clavierOuvert } from '../pageEnPlace.js'

function fenetre({ scrollY = 0, vvHeight = 800, appTop = 0 } = {}) {
  const app = { scrollTop: appTop, scrollLeft: 0 }
  const win = {
    innerHeight: 800, scrollY,
    visualViewport: { height: vvHeight, offsetTop: 0 },
    scrollTo: vi.fn(),
    document: { documentElement: { clientHeight: 800, scrollTop: scrollY }, querySelector: () => app },
  }
  return { win, app }
}

describe('pageEnPlace', () => {
  it('clavier fermé : remet la page et .app à zéro', () => {
    const { win, app } = fenetre({ scrollY: 260, appTop: 40 })
    expect(remettreEnPlace(win)).toBe(true)
    expect(win.scrollTo).toHaveBeenCalledWith(0, 0)
    expect(app.scrollTop).toBe(0)
  })
  it('clavier ouvert : ne touche à rien (iOS montre le champ)', () => {
    const { win } = fenetre({ scrollY: 260, vvHeight: 450 })
    expect(clavierOuvert(win)).toBe(true)
    expect(remettreEnPlace(win)).toBe(false)
    expect(win.scrollTo).not.toHaveBeenCalled()
  })
  it('déjà en place : rien à faire', () => {
    expect(remettreEnPlace(fenetre().win)).toBe(false)
  })
})
