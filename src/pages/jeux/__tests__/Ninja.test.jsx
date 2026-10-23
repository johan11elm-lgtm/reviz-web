import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, act } from '@testing-library/react'

const jouer = vi.fn()
vi.mock('../../../utils/bruitages', () => ({ jouer: (...a) => jouer(...a), sonActif: () => false, contexteAudio: () => null }))
vi.mock('../../../utils/musiqueNinja', () => ({ musiqueNinja: { regler: () => {}, demarrer: () => {}, arreter: () => {} } }))
vi.mock('../../../components/Pantin', async () => {
  const { forwardRef } = await import('react')
  return { Pantin: forwardRef(() => null) }
})
const { PlateauNinja } = await import('../Ninja')

const visibilite = etat => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => etat })
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
}
const avancer = ms => { for (let t = 0; t < ms; t += 16) act(() => { vi.advanceTimersByTime(Math.min(16, ms - t)) }) }

// Un tour de 10 s : une faute qui part à 0,5 s et retombe 2 s plus tard (à 2,5 s de jeu), une autre vers la fin
// (le tour n'est donc pas réglé d'avance).
const manche = {
  type: 'ninja', niveau: 0, duree: 10, apercu: 0, titre: 'Pluriels', annonce: 'Pluriels !', sous: 'S',
  fruits: [
    { id: 0, mot: 'chevals', faute: true, bon: 'chevaux', faux: 'chevals', fruit: 'pomme', regle: 'r', niveau: 0, t: 0.5, vol: 2, x0: 0.3, x1: 0.6, haut: 0.3, tourne: 30 },
    { id: 1, mot: 'bijous', faute: true, bon: 'bijoux', faux: 'bijous', fruit: 'orange', regle: 'r', niveau: 0, t: 8.5, vol: 1.2, x0: 0.7, x1: 0.4, haut: 0.3, tourne: 30 },
  ],
}
const monter = () => {
  const props = { onBon: vi.fn(), onFaux: vi.fn(), onTermine: vi.fn() }
  const rendu = render(<PlateauNinja manche={manche} idx={0} total={3} phase="jeu" expire={false} onDemarrer={() => {}} fermer={null} boutonSon={null} score={0} isDesktop={false} hauteurEcran={800} {...props} />)
  return { rendu, ...props }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  HTMLCanvasElement.prototype.getContext = () => ({ setTransform() {}, clearRect() {}, save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {} })
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] })
  vi.advanceTimersByTime(5000) // performance.now() ne part pas de 0 (le jeu lit 0 comme « pas commencé »)
  jouer.mockClear()
  visibilite('visible')
})
afterEach(() => { visibilite('visible'); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('Le ninja des fautes : le temps de jeu', () => {
  it('au premier plan, la faute qui retombe sans être tranchée est une erreur', () => {
    const { onFaux } = monter()
    avancer(2000)
    expect(onFaux).not.toHaveBeenCalled()
    avancer(700)
    expect(onFaux).toHaveBeenCalledTimes(1)
  })

  it('la page cachée une minute : les fruits ne sont pas tous retombés au retour, le tour reprend où il en était', () => {
    const { onFaux } = monter()
    avancer(1000)
    visibilite('hidden')
    avancer(60_000)
    expect(onFaux).not.toHaveBeenCalled()
    visibilite('visible')
    avancer(900) // 1,9 s de jeu : la faute vole encore
    expect(onFaux).not.toHaveBeenCalled()
    avancer(800) // 2,7 s de jeu : elle est retombée
    expect(onFaux).toHaveBeenCalledTimes(1)
  })

  it('les sons du compte à rebours (3, 2, 1) ne partent pas pendant l’absence', () => {
    monter()
    avancer(1000)
    visibilite('hidden')
    avancer(60_000)
    expect(jouer).not.toHaveBeenCalledWith('tic')
    visibilite('visible')
    avancer(6200) // 7,2 s de jeu : le « 3 » du compte à rebours
    expect(jouer.mock.calls.filter(([nom]) => nom === 'tic')).toHaveLength(1)
  })
})
