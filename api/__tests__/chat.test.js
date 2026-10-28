import { describe, it, expect, vi, beforeEach } from 'vitest'

const verifyIdToken = vi.fn()
const consumeChatQuota = vi.fn()
const refundChatQuota = vi.fn()
const getUserDoc = vi.fn()
const getLessonDoc = vi.fn()

vi.mock('../_firebaseAdmin.js', () => ({
  getAuthAdmin: () => ({ verifyIdToken }),
  getDb: () => ({
    collection: () => ({
      doc: () => ({
        get: (...a) => getUserDoc(...a),
        collection: () => ({
          doc: () => ({ get: (...a) => getLessonDoc(...a) }),
        }),
      }),
    }),
  }),
}))
vi.mock('../_chatQuota.js', () => ({
  CHAT_FREE_LIMIT: 10,
  CHAT_PREMIUM_LIMIT: 200,
  consumeChatQuota: (...a) => consumeChatQuota(...a),
  refundChatQuota: (...a) => refundChatQuota(...a),
}))
vi.mock('../_chatPrompt.js', () => ({
  buildChatRequest: (o) => ({ model: 'test-model', system: 'sys', messages: o.messages, aujourdhui: o.aujourdhui }),
  buildChatLessonContext: () => 'ctx',
  CHAT_MESSAGE_REFUS: 'Refus.',
  CHAT_MAX_MESSAGE_LENGTH: 1000,
  CHAT_MAX_HISTORY: 20,
}))
const anthropicCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class { constructor() { this.messages = { create: (...a) => anthropicCreate(...a) } } },
}))

const { default: handler, sanitizeMessages } = await import('../chat.js')

function mockRes() {
  return {
    statusCode: 0,
    payload: null,
    chunks: [],
    ended: false,
    status(c) { this.statusCode = c; return this },
    send(b) { this.payload = b; return this },
    setHeader() { return this },
    write(c) { this.chunks.push(c); return true },
    end() { this.ended = true },
  }
}

// Flux du SDK : un itérable async d'événements déjà décodés.
function flux(events) {
  return (async function* () { yield* events })()
}
// Erreur HTTP du SDK (APIError) : seul `status` compte pour le handler.
const erreurApi = status => Object.assign(new Error(`HTTP ${status}`), { status })

const VALID_BODY = {
  idToken: 'good',
  lessonId: 'l1',
  level: { cycle: 'college', classe: '3ème' },
  messages: [{ role: 'user', content: 'Explique-moi' }],
}

describe('sanitizeMessages', () => {
  it('accepte une conversation valide et la normalise', () => {
    const out = sanitizeMessages([
      { role: 'user', content: 'a', extra: 'dropped' },
      { role: 'assistant', content: 'b' },
      { role: 'user', content: 'c' },
    ])
    expect(out).toEqual([
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
      { role: 'user', content: 'c' },
    ])
  })

  it('rejette vide, rôle inconnu, contenu non-string ou vide', () => {
    expect(sanitizeMessages([])).toBeNull()
    expect(sanitizeMessages(null)).toBeNull()
    expect(sanitizeMessages([{ role: 'system', content: 'x' }])).toBeNull()
    expect(sanitizeMessages([{ role: 'user', content: 42 }])).toBeNull()
    expect(sanitizeMessages([{ role: 'user', content: '   ' }])).toBeNull()
  })

  it('rejette un message élève trop long', () => {
    expect(sanitizeMessages([{ role: 'user', content: 'x'.repeat(1001) }])).toBeNull()
  })

  it('rejette si le dernier message n\'est pas celui de l\'élève', () => {
    expect(sanitizeMessages([
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
    ])).toBeNull()
  })

  it('ne garde que les 20 messages les plus récents', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'user' : 'assistant', content: `m${i}` }))
    const out = sanitizeMessages(many)
    expect(out).toHaveLength(20)
    expect(out[out.length - 1].content).toBe('m29')
  })
})

describe('/api/chat', () => {
  beforeEach(() => {
    verifyIdToken.mockReset()
    consumeChatQuota.mockReset()
    refundChatQuota.mockReset()
    getUserDoc.mockReset()
    getLessonDoc.mockReset()
    anthropicCreate.mockReset()

    verifyIdToken.mockResolvedValue({ uid: 'u1', email_verified: true })
    getUserDoc.mockResolvedValue({ exists: true, data: () => ({ plan: 'free' }) })
    getLessonDoc.mockResolvedValue({ exists: true, data: () => ({ metadata: { title: 'T' }, aiData: {} }) })
    consumeChatQuota.mockResolvedValue({ allowed: true, remaining: 9 })
    refundChatQuota.mockResolvedValue()
  })

  it('refuse (405) hors POST', async () => {
    const res = mockRes()
    await handler({ method: 'GET' }, res)
    expect(res.statusCode).toBe(405)
  })

  it('refuse (400) un lessonId qui n’est pas un texte, ou des messages invalides', async () => {
    const res1 = mockRes()
    await handler({ method: 'POST', body: { ...VALID_BODY, lessonId: 42 } }, res1)
    expect(res1.statusCode).toBe(400)
    expect(res1.payload).toBe('MISSING_LESSON')

    const res2 = mockRes()
    await handler({ method: 'POST', body: { ...VALID_BODY, messages: [] } }, res2)
    expect(res2.statusCode).toBe(400)
    expect(res2.payload).toBe('INVALID_MESSAGES')
    expect(anthropicCreate).not.toHaveBeenCalled()
  })

  it('refuse (401) sans token ou token invalide', async () => {
    const res1 = mockRes()
    await handler({ method: 'POST', body: { ...VALID_BODY, idToken: undefined } }, res1)
    expect(res1.statusCode).toBe(401)

    verifyIdToken.mockRejectedValue(new Error('bad'))
    const res2 = mockRes()
    await handler({ method: 'POST', body: VALID_BODY }, res2)
    expect(res2.statusCode).toBe(401)
    expect(anthropicCreate).not.toHaveBeenCalled()
  })

  it('refuse (403 EMAIL_NOT_VERIFIED) si l\'email n\'est pas vérifié', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email_verified: false })
    const res = mockRes()
    await handler({ method: 'POST', body: VALID_BODY }, res)
    expect(res.statusCode).toBe(403)
    expect(res.payload).toBe('EMAIL_NOT_VERIFIED')
    expect(consumeChatQuota).not.toHaveBeenCalled()
  })

  it('refuse (404) si la leçon n\'existe pas chez cet élève', async () => {
    getLessonDoc.mockResolvedValue({ exists: false })
    const res = mockRes()
    await handler({ method: 'POST', body: VALID_BODY }, res)
    expect(res.statusCode).toBe(404)
    expect(res.payload).toBe('LESSON_NOT_FOUND')
    expect(consumeChatQuota).not.toHaveBeenCalled()
  })

  it('refuse (429 CHAT_LIMIT) quand le quota jour est épuisé', async () => {
    consumeChatQuota.mockResolvedValue({ allowed: false, remaining: 0 })
    const res = mockRes()
    await handler({ method: 'POST', body: VALID_BODY }, res)
    expect(res.statusCode).toBe(429)
    expect(res.payload).toBe('CHAT_LIMIT')
    expect(anthropicCreate).not.toHaveBeenCalled()
  })

  it('applique la limite premium pour un compte premium', async () => {
    getUserDoc.mockResolvedValue({ exists: true, data: () => ({ plan: 'premium' }) })
    anthropicCreate.mockResolvedValue(flux([]))
    const res = mockRes()
    await handler({ method: 'POST', body: VALID_BODY }, res)
    expect(consumeChatQuota).toHaveBeenCalledWith(expect.objectContaining({ limit: 200 }))
  })

  it('envoie la requête du prompt partagé, en streaming, avec le jour à Paris', async () => {
    anthropicCreate.mockResolvedValue(flux([]))
    await handler({ method: 'POST', body: VALID_BODY }, mockRes())
    const params = anthropicCreate.mock.calls[0][0]
    expect(params).toMatchObject({ model: 'test-model', system: 'sys', stream: true, messages: VALID_BODY.messages })
    expect(params.aujourdhui).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('streame les deltas de texte puis [DONE] (200), sans la réflexion du modèle', async () => {
    anthropicCreate.mockResolvedValue(flux([
      { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'sig' } },
      { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'Salut ' } },
      { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'toi !' } },
      { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
      { type: 'message_stop' },
    ]))
    const res = mockRes()
    await handler({ method: 'POST', body: VALID_BODY }, res)

    expect(res.statusCode).toBe(200)
    expect(res.ended).toBe(true)
    const joined = res.chunks.join('')
    expect(joined).toContain('"remaining":9')
    expect(joined).toContain(JSON.stringify({ text: 'Salut ' }))
    expect(joined).toContain(JSON.stringify({ text: 'toi !' }))
    expect(joined).toContain('data: [DONE]')
    // Le flux brut Anthropic (métadonnées, réflexion) n'est jamais relayé tel quel.
    expect(joined).not.toContain('content_block_delta')
    expect(joined).not.toContain('sig')
  })

  it('ajoute une phrase pour l\'élève quand le modèle refuse (stop_reason refusal)', async () => {
    anthropicCreate.mockResolvedValue(flux([
      { type: 'message_delta', delta: { stop_reason: 'refusal' } },
      { type: 'message_stop' },
    ]))
    const res = mockRes()
    await handler({ method: 'POST', body: VALID_BODY }, res)
    expect(res.chunks.join('')).toContain('Refus.')
  })

  it('rembourse le quota si Anthropic échoue avant le stream', async () => {
    anthropicCreate.mockRejectedValue(erreurApi(500))
    const res = mockRes()
    await handler({ method: 'POST', body: VALID_BODY }, res)
    expect(res.statusCode).toBe(502)
    expect(res.payload).toBe('API_ERROR_500')
    expect(refundChatQuota).toHaveBeenCalled()
  })

  it('traduit les erreurs de clé et de débit', async () => {
    anthropicCreate.mockRejectedValue(erreurApi(401))
    const res1 = mockRes()
    await handler({ method: 'POST', body: VALID_BODY }, res1)
    expect(res1.payload).toBe('INVALID_API_KEY')
    anthropicCreate.mockRejectedValue(erreurApi(429))
    const res2 = mockRes()
    await handler({ method: 'POST', body: VALID_BODY }, res2)
    expect(res2.statusCode).toBe(429)
    expect(res2.payload).toBe('RATE_LIMIT')
  })

  it('rembourse aussi sur erreur réseau', async () => {
    anthropicCreate.mockRejectedValue(new Error('boom'))
    const res = mockRes()
    await handler({ method: 'POST', body: VALID_BODY }, res)
    expect(res.statusCode).toBe(502)
    expect(res.payload).toBe('NETWORK_ERROR')
    expect(refundChatQuota).toHaveBeenCalled()
  })
})

describe('/api/chat sans leçon (Réviz IA en agent)', () => {
  const AGENT_BODY = { ...VALID_BODY, lessonId: undefined, level: { cycle: 'college', classe: '4ème' }, messages: [{ role: 'user', content: 'je fais quoi ce soir' }] }
  const dans2Jours = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10)

  beforeEach(() => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email_verified: true })
    consumeChatQuota.mockReset()
    consumeChatQuota.mockResolvedValue({ allowed: true, remaining: 9 })
    getLessonDoc.mockReset()
    anthropicCreate.mockReset()
    getUserDoc.mockResolvedValue({
      exists: true,
      data: () => ({ plan: 'free', agenda: { controles: [{ id: 'c1', matiere: 'maths', titre: 'Pythagore', date: dans2Jours }] } }),
    })
  })

  it('appelle un outil, renvoie son résultat au modèle, puis streame la réponse et la carte', async () => {
    anthropicCreate
      .mockResolvedValueOnce(flux([
        { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '', signature: '' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'sig1' } },
        { type: 'content_block_stop', index: 0 },
        { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 't1', name: 'mes_controles', input: {} } },
        { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{}' } },
        { type: 'content_block_stop', index: 1 },
        { type: 'content_block_start', index: 2, content_block: { type: 'tool_use', id: 't2', name: 'proposer_revision', input: {} } },
        { type: 'content_block_delta', index: 2, delta: { type: 'input_json_delta', partial_json: '{"format":"controle_blanc",' } },
        { type: 'content_block_delta', index: 2, delta: { type: 'input_json_delta', partial_json: '"controle":"c1"}' } },
        { type: 'content_block_stop', index: 2 },
        { type: 'message_delta', delta: { stop_reason: 'tool_use' } },
      ]))
      .mockResolvedValueOnce(flux([
        { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Ton contrôle de maths approche.' } },
        { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
      ]))
    const res = mockRes()
    await handler({ method: 'POST', body: AGENT_BODY }, res)

    expect(getLessonDoc).not.toHaveBeenCalled()
    expect(consumeChatQuota).toHaveBeenCalledTimes(1)
    expect(anthropicCreate).toHaveBeenCalledTimes(2)
    const [premier, second] = anthropicCreate.mock.calls.map(c => c[0])
    expect(premier.tools.map(t => t.name)).toContain('mes_controles')
    // Le tour suivant renvoie la réflexion (signature comprise) et les appels tels quels, puis les résultats.
    expect(second.messages[1]).toMatchObject({ role: 'assistant', content: [{ type: 'thinking', signature: 'sig1' }, { type: 'tool_use', id: 't1' }, { type: 'tool_use', id: 't2', input: { format: 'controle_blanc', controle: 'c1' } }] })
    expect(second.messages[2].content[0]).toMatchObject({ type: 'tool_result', tool_use_id: 't1' })
    expect(second.messages[2].content[0].content).toContain('"id":"c1"')

    const joined = res.chunks.join('')
    expect(joined).toContain(JSON.stringify({ outil: 'Je regarde ton agenda…' }))
    expect(joined).toContain('"carte":{"type":"revision","format":"controle_blanc","controleId":"c1"')
    expect(joined).toContain(JSON.stringify({ text: 'Ton contrôle de maths approche.' }))
    expect(joined).toContain('data: [DONE]')
    expect(joined).not.toContain('sig1')
  })

  it('s’arrête au plafond de tours : le dernier tour se fait sans outil', async () => {
    const appel = n => flux([
      { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: `t${n}`, name: 'mes_controles', input: {} } },
      { type: 'content_block_stop', index: 0 },
      { type: 'message_delta', delta: { stop_reason: 'tool_use' } },
    ])
    anthropicCreate.mockImplementation(async () => appel(anthropicCreate.mock.calls.length))
    const res = mockRes()
    await handler({ method: 'POST', body: AGENT_BODY }, res)
    expect(anthropicCreate).toHaveBeenCalledTimes(5)
    expect(anthropicCreate.mock.calls[4][0].tool_choice).toEqual({ type: 'none' })
    expect(res.chunks.join('')).toContain('data: [DONE]')
  })
})
