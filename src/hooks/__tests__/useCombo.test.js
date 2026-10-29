import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const joues = []
vi.mock('../../utils/sons', async () => {
  const vrai = await vi.importActual('../../utils/sons')
  return { ...vrai, jouerSon: (nom, o = {}) => joues.push([nom, o.demi ?? 0]), prechargerSons: () => {} }
})
const { useCombo } = await import('../useCombo')

beforeEach(() => { joues.length = 0 })

describe('useCombo : les sons des réponses', () => {
  it('la bonne réponse monte la gamme, le palier de 5 la remplace', () => {
    const { result } = renderHook(() => useCombo())
    for (let k = 0; k < 6; k++) act(() => result.current.bonne())
    expect(joues).toEqual([['bonne', 0], ['bonne', 2], ['bonne', 4], ['bonne', 5], ['palier', expect.any(Number)], ['bonne', 7]])
  })

  it('une faute sans combo joue la faute ; un combo de 2 ou plus qui se casse joue « combo cassé »', () => {
    const { result } = renderHook(() => useCombo())
    act(() => result.current.faute())
    act(() => result.current.bonne())
    act(() => result.current.faute())
    act(() => result.current.bonne()); act(() => result.current.bonne())
    act(() => result.current.faute())
    expect(joues.map(j => j[0])).toEqual(['faute', 'bonne', 'faute', 'bonne', 'bonne', 'casse'])
  })

  it('après « combo cassé », la gamme repart du bas', () => {
    const { result } = renderHook(() => useCombo())
    act(() => result.current.bonne()); act(() => result.current.bonne()); act(() => result.current.faute())
    act(() => result.current.bonne())
    expect(joues.at(-1)).toEqual(['bonne', 0])
  })

  it('sons: false : la séance reste muette', () => {
    const { result } = renderHook(() => useCombo({ sons: false }))
    act(() => result.current.bonne()); act(() => result.current.faute())
    expect(joues).toEqual([])
  })
})
