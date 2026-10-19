import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../interne', () => ({ INTERNE: false }))

describe('mesurer', () => {
  beforeEach(() => { vi.resetModules() })

  it("ne fait rien en mode test (aucun événement ne part depuis la suite de tests)", async () => {
    const { mesurer, brancherPosthog } = await import('../mesure')
    const capture = vi.fn()
    mesurer('compte_cree')
    brancherPosthog({ capture })
    expect(capture).not.toHaveBeenCalled()
  })

  it("rejoue la file puis envoie en direct une fois PostHog branché", async () => {
    vi.stubEnv('MODE', 'production')
    const { mesurer, brancherPosthog } = await import('../mesure')
    const capture = vi.fn()
    mesurer('quiz_termine', { source: 'programme' })
    expect(capture).not.toHaveBeenCalled()
    brancherPosthog({ capture })
    expect(capture).toHaveBeenCalledWith('quiz_termine', { source: 'programme' })
    mesurer('format_ouvert', { format: 'quiz' })
    expect(capture).toHaveBeenLastCalledWith('format_ouvert', { format: 'quiz' })
    vi.unstubAllEnvs()
  })

  it("limite la file à 50 événements si PostHog ne se charge jamais", async () => {
    vi.stubEnv('MODE', 'production')
    const { mesurer, brancherPosthog } = await import('../mesure')
    for (let i = 0; i < 80; i++) mesurer('e', { i })
    const capture = vi.fn()
    brancherPosthog({ capture })
    expect(capture).toHaveBeenCalledTimes(50)
    vi.unstubAllEnvs()
  })
})
