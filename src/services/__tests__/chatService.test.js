import { describe, it, expect, vi, beforeEach } from 'vitest'

// L'appli passe par /api/chat (pas de clé dans le navigateur), comme en prod.
vi.stubEnv('VITE_ANTHROPIC_API_KEY', '')
const compte = vi.hoisted(() => ({ currentUser: null }))
vi.mock('../firebaseConfig', () => ({ auth: compte }))
const api = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock('../apiClient.js', () => ({ apiFetch: (...a) => api.fetch(...a) }))
vi.mock('../historyService.js', () => ({ loadLessons: () => [] }))
const { sendCoachMessage } = await import('../chatService.js')

// Réponse de /api/chat : un refus (texte), ou un flux SSE.
function refus(status, texte) {
  const r = { ok: false, status, text: async () => texte }
  r.clone = () => r
  return r
}
function flux(evenements) {
  const octets = new TextEncoder().encode(evenements.map(e => `data: ${typeof e === 'string' ? e : JSON.stringify(e)}\n\n`).join(''))
  let lu = false
  const r = { ok: true, status: 200, body: { getReader: () => ({ read: async () => (lu ? { done: true } : (lu = true, { done: false, value: octets })) }) } }
  r.clone = () => r
  return r
}
const ENVOI = { lessonId: null, history: [{ role: 'user', content: 'je fais quoi' }], level: { cycle: 'college', classe: '4ème' } }
const corps = i => JSON.parse(api.fetch.mock.calls[i][1].body)

beforeEach(() => {
  api.fetch.mockReset()
  compte.currentUser = {
    emailVerified: false,
    getIdToken: vi.fn(async neuf => (neuf ? 'jeton-neuf' : 'jeton-ancien')),
    reload: vi.fn(async () => { compte.currentUser.emailVerified = true }),
  }
})

describe('sendCoachMessage — e-mail tout juste confirmé', () => {
  it('refus EMAIL_NOT_VERIFIED alors que le compte vient d’être vérifié : jeton neuf, la question repart', async () => {
    api.fetch.mockResolvedValueOnce(refus(403, 'EMAIL_NOT_VERIFIED')).mockResolvedValueOnce(flux([{ text: 'Allez !' }, '[DONE]']))
    const { text } = await sendCoachMessage(ENVOI)
    expect(text).toBe('Allez !')
    expect(compte.currentUser.reload).toHaveBeenCalled()
    expect(corps(0).idToken).toBe('jeton-ancien')
    expect(corps(1).idToken).toBe('jeton-neuf')
  })

  it('toujours pas vérifié : une seule tentative, et le refus remonte', async () => {
    compte.currentUser.reload = vi.fn(async () => {})
    api.fetch.mockResolvedValue(refus(403, 'EMAIL_NOT_VERIFIED'))
    await expect(sendCoachMessage(ENVOI)).rejects.toThrow('EMAIL_NOT_VERIFIED')
    expect(api.fetch).toHaveBeenCalledTimes(1)
  })

  it('agent : l’ouverture de Réviz IA est précédée d’une ligne de l’élève, les cartes partent en trace', async () => {
    api.fetch.mockResolvedValueOnce(flux([{ text: 'Ok.' }, '[DONE]']))
    await sendCoachMessage({ ...ENVOI, history: [{ role: 'assistant', content: 'Hier, tu as raté…', cartes: [{ resume: 'Bats ton toi d’hier, Thalès' }] }, { role: 'user', content: 'oui' }] })
    expect(corps(0).messages).toEqual([
      { role: 'user', content: '(L’élève ouvre Réviz IA.)' },
      { role: 'assistant', content: 'Hier, tu as raté…\n\n[carte : Bats ton toi d’hier, Thalès]' },
      { role: 'user', content: 'oui' },
    ])
    expect(corps(0)).not.toHaveProperty('lessonId')
  })
})
