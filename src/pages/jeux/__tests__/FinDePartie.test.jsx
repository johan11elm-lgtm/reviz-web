import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, act } from '@testing-library/react'

const jouer = vi.fn()
vi.mock('../../../utils/bruitages', () => ({ jouer: (...a) => jouer(...a), sonActif: () => false, contexteAudio: () => null }))
vi.mock('../../../utils/musiqueFin', () => ({ musiqueFin: { demarrer: () => {}, arreter: () => {} } }))
vi.mock('../../../services/mesure', () => ({ mesurer: () => {} }))
vi.mock('../../../components/Pantin', async () => {
  const { forwardRef } = await import('react')
  return { Pantin: forwardRef(() => null) }
})
vi.mock('../../../components/reviz/BulleReviz', () => ({ BulleReviz: () => null }))
const { FinDePartie } = await import('../FinDePartie')

const avancer = ms => { for (let t = 0; t < ms; t += 16) act(() => { vi.advanceTimersByTime(Math.min(16, ms - t)) }) }
const monter = (props = {}) => render(
  <FinDePartie surtitre="Partie rapide · 6 tours" score={300} bonnes={3} erreurs={[]} cleRecord="reviz-jeux-record-test" mode="test"
    onRejouer={() => {}} onQuitter={() => {}} isDesktop={false} hauteurEcran={800} {...props} />,
)

beforeEach(() => {
  localStorage.clear()
  jouer.mockClear()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] })
  vi.advanceTimersByTime(1000)
})
afterEach(() => vi.useRealTimers())

const sons = nom => jouer.mock.calls.filter(([n]) => n === nom).length

describe('FinDePartie — le podium', () => {
  it('les étoiles et la fanfare du record se jouent après le défilement du score', () => {
    monter()
    avancer(1300)
    expect(sons('etoile')).toBeGreaterThanOrEqual(1)
    avancer(2000)
    expect(sons('etoile')).toBe(3) // sans faute : trois étoiles
  })

  it('quitté juste après le défilement (la croix, rejouer) : plus aucun son ni geste ne part', () => {
    const { unmount } = monter()
    avancer(1300)
    const avant = sons('etoile')
    unmount()
    avancer(3000)
    expect(sons('etoile')).toBe(avant)
  })
})

describe('FinDePartie — le record', () => {
  it('sans recordAvant : le record local de la clé, mis à jour', () => {
    localStorage.setItem('reviz-jeux-record-test', '200')
    const { container } = monter()
    expect(container.querySelector('.fp-meilleur').textContent).toMatch(/Meilleur\s*:\s*300/)
    expect(localStorage.getItem('reviz-jeux-record-test')).toBe('300')
  })

  it('avec recordAvant (la partie du jour) : celui du hub, et la clé locale n’est pas touchée', () => {
    localStorage.setItem('reviz-jeux-record-test', '50')
    const { container } = monter({ recordAvant: 800 })
    expect(container.querySelector('.fp-meilleur').textContent).toMatch(/Meilleur\s*:\s*800/)
    expect(localStorage.getItem('reviz-jeux-record-test')).toBe('50')
  })

  it('avec recordAvant plus petit que le score : nouveau record, affiché après le défilement', () => {
    const { container } = monter({ recordAvant: 100 })
    expect(container.querySelector('.fp-meilleur').textContent).toMatch(/Meilleur\s*:\s*300/)
    avancer(1300)
    expect(container.querySelector('.fp-record')).not.toBeNull()
  })
})
