import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Un faux contexte audio : on compte les sons lancés et on lit leur transposition.
let actif = true
let ctx
function fauxContexte() {
  const lances = []
  return {
    currentTime: 10,
    destination: {},
    lances,
    decodeAudioData: vi.fn(async () => ({ duree: 0.5 })),
    createBufferSource() {
      const s = { buffer: null, playbackRate: { value: 1 }, connect: vi.fn(), start: vi.fn(t => lances.push({ buffer: s.buffer, taux: s.playbackRate.value, t })) }
      return s
    },
  }
}
vi.mock('../bruitages', () => ({ sonActif: () => actif, contexteAudio: () => ctx }))

let sons
const attendre = () => new Promise(r => setTimeout(r, 0))
beforeEach(async () => {
  vi.resetModules()
  actif = true
  ctx = fauxContexte()
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })))
  sons = await import('../sons')
})
afterEach(() => { vi.unstubAllGlobals() })

describe('Sons de l’app', () => {
  it('les fichiers choisis sur la planche sont tous là', () => {
    for (const n of ['bonne', 'faute', 'palier', 'casse', 'xp', 'fin', 'niveau']) expect(sons.NOMS_SONS).toContain(n)
  })

  it('un son préchargé part tout de suite, transposé du nombre de demi-tons demandé', async () => {
    sons.prechargerSons(['bonne'])
    await attendre(); await attendre()
    sons.jouerSon('bonne', { demi: 12, dans: 0.2 })
    expect(ctx.lances).toHaveLength(1)
    expect(ctx.lances[0].taux).toBeCloseTo(2)
    expect(ctx.lances[0].t).toBeCloseTo(10.2)
  })

  it('chaque fichier n’est téléchargé et décodé qu’une fois', async () => {
    sons.prechargerSons(['faute'])
    sons.prechargerSons(['faute'])
    await attendre(); await attendre()
    sons.jouerSon('faute'); sons.jouerSon('faute')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(ctx.decodeAudioData).toHaveBeenCalledTimes(1)
    expect(ctx.lances).toHaveLength(2)
  })

  it('un son pas encore décodé part dès qu’il l’est', async () => {
    sons.jouerSon('palier')
    expect(ctx.lances).toHaveLength(0)
    await attendre(); await attendre(); await attendre()
    expect(ctx.lances).toHaveLength(1)
  })

  it('son coupé : rien n’est téléchargé ni joué', async () => {
    actif = false
    sons.prechargerSons()
    sons.jouerSon('bonne')
    await attendre()
    expect(fetch).not.toHaveBeenCalled()
    expect(ctx.lances).toHaveLength(0)
  })

  it('sans audio (vieux navigateur), aucun plantage', () => {
    ctx = null
    expect(() => { sons.prechargerSons(); sons.jouerSon('bonne') }).not.toThrow()
  })

  it('un téléchargement raté est réessayé au prochain appel', async () => {
    fetch.mockImplementationOnce(async () => ({ ok: false }))
    sons.prechargerSons(['casse'])
    await attendre(); await attendre()
    sons.jouerSon('casse')
    await attendre(); await attendre(); await attendre()
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(ctx.lances).toHaveLength(1)
  })

  it('app iOS : un fichier servi sans réponse HTTP (statut 0) se joue quand même', async () => {
    fetch.mockImplementationOnce(async () => ({ ok: false, status: 0, arrayBuffer: async () => new ArrayBuffer(8) }))
    sons.prechargerSons(['bonne'])
    await attendre(); await attendre()
    sons.jouerSon('bonne')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(ctx.lances).toHaveLength(1)
  })

  it('le combo monte do-ré-mi-fa jusqu’au palier, puis sol-la-si-do', () => {
    expect([1, 2, 3, 4].map(sons.demiCombo)).toEqual([0, 2, 4, 5])
    expect([6, 7, 8, 9].map(sons.demiCombo)).toEqual([7, 9, 11, 12])
    expect([11, 14, 16].map(sons.demiCombo)).toEqual([7, 12, 7])
  })

  it('la rafale d’XP monte d’un demi-ton par grain, douze au plus', async () => {
    sons.prechargerSons(['xp'])
    await attendre(); await attendre()
    sons.rafaleXp(20)
    expect(ctx.lances).toHaveLength(12)
    expect(ctx.lances[11].taux).toBeCloseTo(2 ** (11 / 12))
  })
})
