import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const getUserProfile = vi.fn()
vi.mock('../../services/userProfileService', () => ({ getUserProfile: (...args) => getUserProfile(...args) }))

const { useAuraCompte } = await import('../useAuraCompte')

beforeEach(() => {
  localStorage.clear()
  getUserProfile.mockReset()
})

describe('useAuraCompte', () => {
  it('lit l’aura du profil et la garde sur l’appareil', async () => {
    getUserProfile.mockResolvedValue({ aura: 70, battles: { jouees: 3, gagnees: 1 } })
    const { result } = renderHook(() => useAuraCompte('u1'))
    await waitFor(() => expect(result.current).toEqual({ aura: 70, jouees: 3 }))
    expect(getUserProfile).toHaveBeenCalledWith('u1')
    expect(JSON.parse(localStorage.getItem('reviz-aura-u1'))).toEqual({ aura: 70, jouees: 3 })
  })

  it('affiche tout de suite la dernière valeur connue, puis la met à jour', async () => {
    localStorage.setItem('reviz-aura-u1', JSON.stringify({ aura: 40, jouees: 1 }))
    let repondre
    getUserProfile.mockReturnValue(new Promise(r => { repondre = r }))
    const { result } = renderHook(() => useAuraCompte('u1'))
    expect(result.current).toEqual({ aura: 40, jouees: 1 })
    repondre({ aura: 60, battles: { jouees: 2 } })
    await waitFor(() => expect(result.current).toEqual({ aura: 60, jouees: 2 }))
  })

  it('un profil sans Battle vaut zéro partie', async () => {
    getUserProfile.mockResolvedValue({ prenom: 'Léa' })
    const { result } = renderHook(() => useAuraCompte('u2'))
    await waitFor(() => expect(result.current).toEqual({ aura: 0, jouees: 0 }))
  })

  it('rien pour un invité, et une lecture ratée ne casse rien', async () => {
    const { result } = renderHook(() => useAuraCompte(null))
    expect(result.current).toBeNull()
    expect(getUserProfile).not.toHaveBeenCalled()

    getUserProfile.mockRejectedValue(new Error('hors ligne'))
    const { result: r2 } = renderHook(() => useAuraCompte('u3'))
    await waitFor(() => expect(getUserProfile).toHaveBeenCalled())
    expect(r2.current).toBeNull()
  })
})
