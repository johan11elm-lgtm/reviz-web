import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'

vi.mock('../../utils/bruitages', () => ({ jouer: () => {}, sonActif: () => false, contexteAudio: () => null }))
const { JeuLance, partieLance } = await import('../JeuLance')

const visibilite = etat => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => etat })
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
}
const avancer = ms => { for (let t = 0; t < ms; t += 16) act(() => { vi.advanceTimersByTime(Math.min(16, ms - t)) }) }

function monter() {
  const pantin = { current: { lancer: ({ lacher }) => lacher(), objet: () => ({ left: 100, top: 400, width: 50, height: 50 }), montrerObjet: vi.fn() } }
  const scene = { current: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 700 }) } }
  const horloge = { pause: vi.fn(), reprise: vi.fn() }
  const reviz = { bulle: vi.fn(), geste: vi.fn(), effet: vi.fn() }
  const props = { onBon: vi.fn(), onFaux: vi.fn(), onTermine: vi.fn(), onCommencer: vi.fn() }
  const manche = partieLance()[0]
  const rendu = render(<JeuLance manche={manche} numero={1} total={3} enJeu expire={false} horloge={horloge} reviz={reviz} pantin={pantin} scene={scene} {...props} />)
  return { rendu, pantin, horloge, ...props }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] })
  visibilite('visible')
})
afterEach(() => { visibilite('visible'); vi.useRealTimers() })

describe('Réviz lance : le temps et les minuteries', () => {
  it('la boule lancée arrive, le verdict tombe, la question suivante s’affiche', () => {
    const { pantin, onBon, onFaux, horloge } = monter()
    avancer(100)
    act(() => { fireEvent.keyDown(window, { key: '1' }) })
    avancer(900)
    expect(onBon.mock.calls.length + onFaux.mock.calls.length).toBe(1)
    expect(horloge.pause).toHaveBeenCalledTimes(1)
    avancer(1000)
    expect(pantin.current.montrerObjet).toHaveBeenCalledTimes(1)
    expect(horloge.reprise).toHaveBeenCalledTimes(1)
  })

  it('démonté (la croix) pendant le verdict : la question suivante, le chrono et la fin ne viennent plus', () => {
    const { rendu, pantin, onTermine, horloge } = monter()
    avancer(100)
    act(() => { fireEvent.keyDown(window, { key: '1' }) })
    avancer(700) // la boule est arrivée, le verdict est en cours
    rendu.unmount()
    avancer(5000)
    expect(pantin.current.montrerObjet).not.toHaveBeenCalled()
    expect(horloge.reprise).not.toHaveBeenCalled()
    expect(onTermine).not.toHaveBeenCalled()
  })

  it('la page cachée pendant le vol : la boule reprend au retour et arrive une seule fois (pas de tour bloqué)', () => {
    const { onBon, onFaux } = monter()
    avancer(100)
    act(() => { fireEvent.keyDown(window, { key: '1' }) })
    avancer(200)
    visibilite('hidden')
    avancer(60_000)
    expect(onBon.mock.calls.length + onFaux.mock.calls.length).toBe(0)
    visibilite('visible')
    avancer(900)
    expect(onBon.mock.calls.length + onFaux.mock.calls.length).toBe(1)
  })
})
