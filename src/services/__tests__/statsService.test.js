import { describe, it, expect, vi } from 'vitest'

vi.mock('../apiClient', () => ({ apiFetch: vi.fn(async () => ({})), IS_NATIVE: false }))
vi.mock('../guestService', () => ({ GUEST_KEY: 'reviz-guest' }))

const { readVia, scanErrorCode, readCodeVideo } = await import('../statsService')

describe('readVia', () => {
  it('lit la provenance dans la chaîne de requête', () => {
    expect(readVia('?via=tiktok')).toBe('tiktok')
    expect(readVia('?utm=x&via=Pinterest')).toBe('pinterest')
  })
  it('renvoie null sans provenance ou avec une valeur vide', () => {
    expect(readVia('')).toBeNull()
    expect(readVia('?via=')).toBeNull()
    expect(readVia('?via=%20')).toBeNull()
  })
  it('tronque une valeur trop longue (le serveur ne garde que la liste fermée)', () => {
    expect(readVia(`?via=${'a'.repeat(50)}`)).toHaveLength(20)
  })
})

describe('scanErrorCode', () => {
  it("garde un code d'erreur en majuscules", () => {
    expect(scanErrorCode('NON_SCOLAIRE')).toBe('NON_SCOLAIRE')
    expect(scanErrorCode('API_ERROR_504')).toBe('API_ERROR_504')
  })
  it('remplace un message libre ou absent par « AUTRE »', () => {
    expect(scanErrorCode('Unexpected token < in JSON')).toBe('AUTRE')
    expect(scanErrorCode('Le théorème de Pythagore')).toBe('AUTRE')
    expect(scanErrorCode(undefined)).toBe('AUTRE')
  })
})

describe('readCodeVideo', () => {
  it('lit le code de la vidéo, en minuscules', () => {
    expect(readCodeVideo('?via=tiktok&v=VF6')).toBe('vf6')
  })
  it('refuse un code mal formé ou absent', () => {
    expect(readCodeVideo('?v=fiches')).toBeNull()
    expect(readCodeVideo('?via=tiktok')).toBeNull()
  })
})
