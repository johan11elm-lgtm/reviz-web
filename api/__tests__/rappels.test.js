import { describe, it, expect, vi, beforeEach } from 'vitest'
import { relancerLendemain, mailRappelJ1, lienDesabo, signatureValide } from '../_rappels.js'

// 17/10/2026 à 18 h, heure de Paris (16 h UTC, heure du cron).
const MAINTENANT = Date.parse('2026-10-17T16:00:00Z')
const HIER = Date.parse('2026-10-16T15:30:00Z')
const ADULTE = '2008-03-01'
const ENFANT = '2014-05-10'

const SESSION = { jour: '2026-10-16', at: HIER, chapterId: 'pythagore', classe: '4ème', matiere: 'Maths', titre: 'Le théorème de Pythagore' }

let users, consents
const updates = []
const db = {
  collection: nom => {
    if (nom !== 'users') throw new Error(nom)
    return {
      where: (champ, op, val) => ({
        get: async () => ({
          docs: Object.entries(users)
            .filter(([, u]) => champ === 'premiereSession.jour' && op === '==' && u.premiereSession?.jour === val)
            .map(([id, u]) => ({ id, data: () => u, ref: { update: async m => { updates.push({ id, m }); Object.assign(u, m) } } })),
        }),
      }),
      doc: uid => ({
        collection: () => ({ doc: () => ({ get: async () => ({ exists: uid in consents, data: () => consents[uid] }) }) }),
      }),
    }
  },
}
const envoyer = vi.fn(async () => {})
const emailDe = async uid => `${uid}@test.fr`
const relancer = () => relancerLendemain({ db, envoyer, emailDe, maintenant: MAINTENANT, secret: 's' })

beforeEach(() => {
  users = {}
  consents = {}
  updates.length = 0
  envoyer.mockClear()
})

describe('rappel du lendemain (J+1)', () => {
  it('écrit une fois à l’élève commencé hier, avec le lien du chapitre', async () => {
    users.lea = { prenom: 'Léa', birthDate: ADULTE, premiereSession: SESSION, derniereRevisionAt: HIER }
    expect(await relancer()).toEqual({ rappelsJ1: 1 })
    const m = envoyer.mock.calls[0][0]
    expect(m.to).toBe('lea@test.fr')
    expect(m.subject).toContain('Pythagore')
    expect(m.html).toContain('https://app.revizapp.fr/essai?classe=4%C3%A8me&matiere=maths&chapitre=pythagore&via=rappel')
    expect(m.headers['List-Unsubscribe']).toContain('op=desabonner')
    expect(updates).toEqual([{ id: 'lea', m: { rappelJ1Le: MAINTENANT } }])
    // Le cron du lendemain ne renvoie rien : un seul rappel.
    expect(await relancer()).toEqual({ rappelsJ1: 0 })
  })

  it('ne relance pas un élève déjà revenu aujourd’hui, ni un désabonné', async () => {
    users.revenu = { birthDate: ADULTE, premiereSession: SESSION, derniereRevisionAt: Date.parse('2026-10-17T07:00:00Z') }
    users.desabo = { birthDate: ADULTE, premiereSession: SESSION, rappels: false }
    users.avant = { birthDate: ADULTE, premiereSession: { ...SESSION, jour: '2026-10-15' } }
    expect(await relancer()).toEqual({ rappelsJ1: 0 })
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('moins de 15 ans : seulement avec l’autorisation d’un parent ; sans date de naissance : jamais', async () => {
    users.attente = { birthDate: ENFANT, premiereSession: SESSION }
    users.autorise = { birthDate: ENFANT, premiereSession: SESSION }
    users.inconnu = { premiereSession: SESSION }
    consents.attente = { status: 'pending', parentEmail: 'p@test.fr' }
    consents.autorise = { status: 'approved' }
    expect(await relancer()).toEqual({ rappelsJ1: 1 })
    expect(envoyer.mock.calls.map(c => c[0].to)).toEqual(['autorise@test.fr'])
  })

  it('hors programme (leçon scannée) : lien vers l’accueil', async () => {
    users.scan = { birthDate: ADULTE, premiereSession: { jour: '2026-10-16', source: 'scan', titre: 'Ma leçon' } }
    await relancer()
    expect(envoyer.mock.calls[0][0].html).toContain('https://app.revizapp.fr/?via=rappel')
  })

  it('un échec d’envoi n’arrête pas les autres', async () => {
    users.a = { birthDate: ADULTE, premiereSession: SESSION }
    users.b = { birthDate: ADULTE, premiereSession: SESSION }
    envoyer.mockRejectedValueOnce(new Error('resend'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await relancer()).toEqual({ rappelsJ1: 1 })
  })
})

describe('mail et désinscription', () => {
  it('échappe le prénom et le titre', () => {
    const m = mailRappelJ1({ prenom: '<b>Léa</b>', titre: 'A & <i>B</i>', lien: 'https://x', desabo: null })
    expect(m.html).not.toContain('<b>Léa')
    expect(m.html).toContain('A &amp; &lt;i&gt;B')
  })
  it('le lien de désinscription est signé pour ce compte seulement', () => {
    const url = new URL(lienDesabo('uid1234567890', 's'))
    expect(signatureValide('uid1234567890', url.searchParams.get('t'), 's')).toBe(true)
    expect(signatureValide('autre12345678', url.searchParams.get('t'), 's')).toBe(false)
    expect(lienDesabo('uid1234567890', '')).toBeNull()
  })
})
