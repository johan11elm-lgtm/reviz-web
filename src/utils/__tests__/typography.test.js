import { describe, it, expect } from 'vitest'
import { nbsp } from '../typography'

describe('nbsp — typographie française', () => {
  it('insécable avant ? ! : ; et après «', () => {
    expect(nbsp('Prêt ?')).toBe('Prêt ?')
    expect(nbsp('« Bonjour »')).toBe('« Bonjour »')
  })

  it('« y a-t-il » ne se coupe pas au trait d’union', () => {
    const r = nbsp('Combien y a-t-il de millions ?')
    expect(r).toContain('a⁠-⁠t⁠-⁠il')
    expect(r.replace(/⁠/g, '').replace(/ /g, ' ')).toBe('Combien y a-t-il de millions ?')
  })

  it('laisse le reste intact', () => {
    expect(nbsp('arc-en-ciel')).toBe('arc-en-ciel')
    expect(nbsp(42)).toBe(42)
  })
})
