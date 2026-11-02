import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
const { demanderAccordIA, exigerAccordIA, ecouterDemandesAccordIA, accordIADonne, retirerAccordIA } = await import('../accordIA.js')

beforeEach(() => { localStorage.clear() })

describe('accord avant l’envoi à l’IA (app native)', () => {
  it('sans feuille montée, rien ne part', async () => {
    expect(await demanderAccordIA()).toBe(false)
    await expect(exigerAccordIA()).rejects.toThrow('ACCORD_IA_REFUSE')
  })

  it('« J’accepte » est retenu, et deux demandes simultanées n’ouvrent qu’une feuille', async () => {
    const feuille = vi.fn()
    const stop = ecouterDemandesAccordIA(feuille)
    const a = demanderAccordIA()
    const b = demanderAccordIA()
    expect(feuille).toHaveBeenCalledTimes(1)
    feuille.mock.calls[0][0](true)
    expect(await a).toBe(true)
    expect(await b).toBe(true)
    expect(accordIADonne()).toBe(true)
    expect(await demanderAccordIA()).toBe(true)
    expect(feuille).toHaveBeenCalledTimes(1)
    stop()
  })

  it('« Pas maintenant » n’est pas retenu : la question revient', async () => {
    const feuille = vi.fn(rep => rep(false))
    const stop = ecouterDemandesAccordIA(feuille)
    await expect(exigerAccordIA()).rejects.toThrow('ACCORD_IA_REFUSE')
    await expect(exigerAccordIA()).rejects.toThrow('ACCORD_IA_REFUSE')
    expect(feuille).toHaveBeenCalledTimes(2)
    stop()
  })

  it('retirer l’accord le redemande', async () => {
    const stop = ecouterDemandesAccordIA(rep => rep(true))
    await demanderAccordIA()
    retirerAccordIA()
    expect(accordIADonne()).toBe(false)
    stop()
  })
})
