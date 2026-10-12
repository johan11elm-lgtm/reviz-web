import { describe, it, expect } from 'vitest'
import { compteVerifie } from '../_compteVerifie.js'

describe('compteVerifie', () => {
  it('e-mail confirmé (dont Google et Apple) → vérifié', () => {
    expect(compteVerifie({ email_verified: true, firebase: { sign_in_provider: 'password' } })).toBe(true)
  })
  it('e-mail non confirmé → pas vérifié', () => {
    expect(compteVerifie({ email_verified: false, firebase: { sign_in_provider: 'password' } })).toBe(false)
  })
  it('Microsoft (popup web) → vérifié sans e-mail de confirmation', () => {
    expect(compteVerifie({ email_verified: false, firebase: { sign_in_provider: 'microsoft.com' } })).toBe(true)
  })
  it('claim reviz_social (TikTok, Microsoft iOS) → vérifié', () => {
    expect(compteVerifie({ firebase: { sign_in_provider: 'custom' }, reviz_social: true })).toBe(true)
  })
  it('jeton personnalisé sans claim → pas vérifié', () => {
    expect(compteVerifie({ firebase: { sign_in_provider: 'custom' } })).toBe(false)
  })
  it('anonyme → pas vérifié', () => {
    expect(compteVerifie({ firebase: { sign_in_provider: 'anonymous' } })).toBe(false)
  })
})
