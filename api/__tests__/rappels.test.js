import { describe, it, expect, vi, beforeEach } from 'vitest'
import { relancerLendemain, mailRappelJ1, sujetRappel, lienDesabo, signatureValide, prenomPropre, AGE_MIN_MS, AGE_MAX_MS, LIEN_ACCORD } from '../_rappels.js'

// 17/10/2026 à 18 h, heure de Paris (16 h UTC, heure du cron).
const MAINTENANT = Date.parse('2026-10-17T16:00:00Z')
const HIER = Date.parse('2026-10-16T15:30:00Z')
const H = 60 * 60 * 1000
const ADULTE = '2008-03-01'
const ENFANT = '2014-05-10'

const SESSION = { jour: '2026-10-16', at: HIER, chapterId: 'pythagore', classe: '4ème', matiere: 'Maths', titre: 'Le théorème de Pythagore' }
const LIEN_PYTHAGORE = 'https://app.revizapp.fr/essai?classe=4%C3%A8me&matiere=maths&chapitre=pythagore&via=rappel'

let users, consents, lecons
const updates = []
function docDe(id) {
  const u = users[id]
  return {
    id,
    exists: !!u,
    data: () => u,
    ref: { update: async m => { updates.push({ id, m }); Object.assign(u, m) } },
  }
}
const db = {
  collection: nom => {
    if (nom !== 'users') throw new Error(nom)
    return {
      where: (champ, op, val) => ({
        get: async () => ({
          docs: Object.keys(users)
            .filter(id => champ === 'premiereSession.jour' && op === '==' && users[id].premiereSession?.jour === val)
            .map(docDe),
        }),
      }),
      doc: uid => ({
        get: async () => docDe(uid),
        update: async m => { updates.push({ id: uid, m }); Object.assign(users[uid], m) },
        collection: sub => ({
          doc: () => ({ get: async () => {
            if (consents[uid] === 'panne') throw new Error('firestore indisponible')
            return { exists: uid in consents, data: () => consents[uid] }
          } }),
          orderBy: () => ({ limit: () => ({ get: async () => ({ docs: (lecons[uid] ?? []).map(l => ({ data: () => l })) }) }) }),
          _sub: sub,
        }),
      }),
    }
  },
}
const envoyer = vi.fn(async () => {})
const emailDe = async uid => `${uid}@test.fr`
const relancer = (extra = {}) => relancerLendemain({ db, envoyer, emailDe, maintenant: MAINTENANT, secret: 's', journal: () => {}, ...extra })

/** Compte Firebase Auth créé la veille. */
function compte(uid, over = {}) {
  return {
    uid, email: `${uid}@test.fr`, emailVerified: true, disabled: false, displayName: null,
    providerData: [{ providerId: 'password' }],
    metadata: { creationTime: new Date(MAINTENANT - 24 * H).toUTCString() },
    ...over,
  }
}
function makeAuth(comptes, { lienVerif = 'https://verif.example/?oob=1' } = {}) {
  return {
    listUsers: vi.fn().mockResolvedValue({ users: comptes, pageToken: undefined }),
    generateEmailVerificationLink: vi.fn().mockResolvedValue(lienVerif),
    getUser: vi.fn(async uid => comptes.find(c => c.uid === uid) ?? compte(uid)),
  }
}

beforeEach(() => {
  users = {}
  consents = {}
  lecons = {}
  updates.length = 0
  envoyer.mockClear()
})

describe('rappel du lendemain (J+1) — première session', () => {
  it('écrit une fois à l’élève commencé hier, avec le lien du chapitre', async () => {
    users.lea = { prenom: 'Léa', birthDate: ADULTE, premiereSession: SESSION, derniereRevisionAt: HIER }
    expect(await relancer()).toEqual({ rappelsJ1: 1 })
    const m = envoyer.mock.calls[0][0]
    expect(m.to).toBe('lea@test.fr')
    expect(m.subject).toBe('Le théorème de Pythagore : tu t\'en souviens ?')
    expect(m.html).toContain(LIEN_PYTHAGORE)
    expect(m.html).toContain('Hier, tu as commencé')
    expect(m.html).toMatch(/Salut <strong[^>]*>Léa<\/strong>/)
    expect(m.html).toContain('dix exercices en jeu de Maths')
    expect(m.html).not.toContain('confirme aussi ton adresse')
    expect(m.headers['List-Unsubscribe']).toContain('op=desabonner')
    expect(updates).toEqual([{ id: 'lea', m: { rappelJ1Le: MAINTENANT } }])
    // Le cron du lendemain ne renvoie rien : un seul rappel.
    expect(await relancer()).toEqual({ rappelsJ1: 0 })
  })

  it('ne relance pas un élève déjà revenu aujourd’hui, ni un désabonné', async () => {
    users.revenu = { birthDate: ADULTE, premiereSession: SESSION, derniereRevisionAt: Date.parse('2026-10-17T07:00:00Z') }
    users.ouvert = { birthDate: ADULTE, premiereSession: SESSION, joursActifs: ['2026-10-16', '2026-10-17'] }
    users.desabo = { birthDate: ADULTE, premiereSession: SESSION, rappels: false }
    users.avant = { birthDate: ADULTE, premiereSession: { ...SESSION, jour: '2026-10-15' } }
    expect(await relancer()).toEqual({ rappelsJ1: 0 })
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('moins de 15 ans sans accord : un mail tourné vers l’accord ; sans date de naissance, après un refus ou une panne : rien', async () => {
    for (const uid of ['adresse', 'sansdoc', 'attente', 'autorise', 'refuse', 'panne']) users[uid] = { prenom: 'Léa', birthDate: ENFANT, premiereSession: SESSION }
    users.inconnu = { premiereSession: SESSION }
    consents.adresse = { status: 'pending', createdAt: HIER }
    consents.attente = { status: 'pending', parentEmail: 'p@test.fr', token: 't' }
    consents.autorise = { status: 'approved' }
    consents.refuse = { status: 'refused' }
    consents.panne = 'panne'
    expect(await relancer()).toEqual({ rappelsJ1: 4 })
    const mails = Object.fromEntries(envoyer.mock.calls.map(c => [c[0].to.split('@')[0], c[0]]))
    expect(Object.keys(mails).sort()).toEqual(['adresse', 'attente', 'autorise', 'sansdoc'])
    // Sans adresse de parent (ou sans demande enregistrée) : le bouton mène à l'écran de l'accord.
    for (const m of [mails.adresse, mails.sansdoc]) {
      expect(m.subject).toBe('Le théorème de Pythagore : tu t\'en souviens ?')
      expect(m.html).toContain(`href="${LIEN_ACCORD}"`)
      expect(m.html).toContain('Prévenir un parent →')
      expect(m.html).toContain('un parent doit dire oui')
      expect(m.html).toContain(`href="${LIEN_PYTHAGORE}"`)
      expect(m.html).toContain('Ou fais tes exercices tout de suite')
      expect(m.html).not.toContain('Faire mes exercices →')
    }
    // Parent prévenu, pas encore d'accord : le quiz, et le rappel de la demande.
    expect(mails.attente.html).toContain('Faire mes exercices →')
    expect(mails.attente.html).toContain("Ton parent n'a pas encore dit oui")
    expect(mails.attente.html).not.toContain(LIEN_ACCORD)
    expect(mails.attente.html).not.toContain('p@test.fr')
    // Accord donné : le mail habituel.
    expect(mails.autorise.html).toContain('Faire mes exercices →')
    expect(mails.autorise.html).not.toContain('parent')
    expect(updates.map(u => u.id).sort()).toEqual(['adresse', 'attente', 'autorise', 'sansdoc'])
  })

  it('moins de 15 ans sans adresse de parent et adresse non confirmée : la vérification passe par le bouton de l’accord', async () => {
    users.lea = { prenom: 'Léa', birthDate: ENFANT, premiereSession: SESSION }
    consents.lea = { status: 'pending', createdAt: HIER }
    const auth = makeAuth([compte('lea', { emailVerified: false, metadata: { creationTime: new Date(HIER).toUTCString() } })])
    expect(await relancer({ auth })).toEqual({ rappelsJ1: 1 })
    expect(auth.generateEmailVerificationLink).toHaveBeenCalledWith('lea@test.fr', { url: LIEN_ACCORD })
    const m = envoyer.mock.calls[0][0]
    expect(m.html).toContain('href="https://verif.example/?oob=1"')
    expect(m.html).toContain(`href="${LIEN_PYTHAGORE}"`)
    expect(m.html).toContain('confirme aussi ton adresse')
  })

  it('leçon scannée : lien vers « Tes leçons scannées »', async () => {
    users.scan = { birthDate: ADULTE, premiereSession: { jour: '2026-10-16', source: 'scan', titre: 'Ma leçon', matiere: 'SVT' } }
    await relancer()
    const m = envoyer.mock.calls[0][0]
    expect(m.subject).toBe('Ta leçon « Ma leçon » t\'attend')
    expect(m.html).toContain('https://app.revizapp.fr/cours?via=rappel')
    expect(m.html).toContain('Reprendre ma leçon')
  })

  it('passe par le lien de vérification Firebase quand l’adresse n’est pas confirmée', async () => {
    users.lea = { prenom: 'Léa', birthDate: ADULTE, premiereSession: SESSION }
    const auth = makeAuth([compte('lea', { emailVerified: false, metadata: { creationTime: new Date(HIER).toUTCString() } })])
    expect(await relancer({ auth })).toEqual({ rappelsJ1: 1 })
    expect(auth.generateEmailVerificationLink).toHaveBeenCalledWith('lea@test.fr', { url: LIEN_PYTHAGORE })
    const m = envoyer.mock.calls[0][0]
    expect(m.html).toContain('https://verif.example/?oob=1')
    expect(m.html).toContain('confirme aussi ton adresse')
  })

  it('envoie quand même le lien direct si Firebase refuse le lien de vérification', async () => {
    users.lea = { prenom: 'Léa', birthDate: ADULTE, premiereSession: SESSION }
    const auth = makeAuth([compte('lea', { emailVerified: false })])
    auth.generateEmailVerificationLink.mockRejectedValue(new Error('UNAUTHORIZED_DOMAIN'))
    const journal = vi.fn()
    expect(await relancer({ auth, journal })).toEqual({ rappelsJ1: 1 })
    expect(envoyer.mock.calls[0][0].html).toContain(LIEN_PYTHAGORE)
    expect(journal).toHaveBeenCalledWith(expect.stringContaining('UNAUTHORIZED_DOMAIN'))
  })

  it('un échec d’envoi n’arrête pas les autres', async () => {
    users.a = { birthDate: ADULTE, premiereSession: SESSION }
    users.b = { birthDate: ADULTE, premiereSession: SESSION }
    envoyer.mockRejectedValueOnce(new Error('resend'))
    const journal = vi.fn()
    expect(await relancer({ journal })).toEqual({ rappelsJ1: 1 })
    expect(journal).toHaveBeenCalledWith(expect.stringContaining('resend'))
  })
})

describe('rappel du lendemain (J+1) — compte créé la veille sans session', () => {
  it('rappelle le dernier chapitre ouvert, sinon propose le programme', async () => {
    users.tom = { prenom: 'Tom', birthDate: ADULTE }
    users.zoe = { prenom: 'Zoé', birthDate: ADULTE }
    lecons.tom = [{ source: 'programme', chapterId: 'thales', classe: '3ème', matiere: 'Maths', metadata: { title: 'Théorème de Thalès' } }]
    const auth = makeAuth([compte('tom'), compte('zoe')])
    expect(await relancer({ auth })).toEqual({ rappelsJ1: 2 })
    const [tom, zoe] = envoyer.mock.calls.map(c => c[0])
    expect(tom.subject).toBe('Théorème de Thalès : tu t\'en souviens ?')
    expect(tom.html).toContain('https://app.revizapp.fr/essai?classe=3%C3%A8me&matiere=maths&chapitre=thales&via=rappel')
    expect(zoe.subject).toBe('Ton premier chapitre t\'attend')
    expect(zoe.html).toContain('https://app.revizapp.fr/programme?via=rappel')
    expect(zoe.html).toContain('Choisir un chapitre')
    expect(updates.map(u => u.id).sort()).toEqual(['tom', 'zoe'])
  })

  it('ne compte pas deux fois un élève à première session, et ignore les comptes hors fenêtre, anonymes, désactivés ou sans profil', async () => {
    users.lea = { prenom: 'Léa', birthDate: ADULTE, premiereSession: SESSION }
    users.ancien = { birthDate: ADULTE }
    users.anonyme = { birthDate: ADULTE }
    users.off = { birthDate: ADULTE }
    const auth = makeAuth([
      compte('lea'),
      compte('ancien', { metadata: { creationTime: new Date(MAINTENANT - AGE_MAX_MS).toUTCString() } }),
      compte('jeune', { metadata: { creationTime: new Date(MAINTENANT - AGE_MIN_MS + H).toUTCString() } }),
      compte('anonyme', { providerData: [] }),
      compte('off', { disabled: true }),
      compte('sans-profil'),
    ])
    expect(await relancer({ auth })).toEqual({ rappelsJ1: 1 })
    expect(envoyer.mock.calls.map(c => c[0].to)).toEqual(['lea@test.fr'])
  })

  it('applique la même règle des moins de 15 ans aux comptes de la veille', async () => {
    users.enfant = { birthDate: ENFANT }
    users.ok = { birthDate: ENFANT }
    users.non = { birthDate: ENFANT }
    consents.ok = { status: 'approved' }
    consents.non = { status: 'refused' }
    const auth = makeAuth([compte('enfant'), compte('ok'), compte('non')])
    expect(await relancer({ auth })).toEqual({ rappelsJ1: 2 })
    const [enfant, ok] = envoyer.mock.calls.map(c => c[0])
    expect(enfant.to).toBe('enfant@test.fr')
    expect(enfant.html).toContain(`href="${LIEN_ACCORD}"`)
    expect(enfant.html).toContain('Ou choisis un chapitre tout de suite')
    expect(ok.to).toBe('ok@test.fr')
    expect(ok.html).not.toContain(LIEN_ACCORD)
  })

  it('parcourt toutes les pages de comptes', async () => {
    users.a = { birthDate: ADULTE }
    users.b = { birthDate: ADULTE }
    const auth = makeAuth([])
    auth.listUsers
      .mockResolvedValueOnce({ users: [compte('a')], pageToken: 'p2' })
      .mockResolvedValueOnce({ users: [compte('b')], pageToken: undefined })
    expect(await relancer({ auth })).toEqual({ rappelsJ1: 2 })
  })
})

describe('mail et désinscription', () => {
  it('échappe le prénom et le titre', () => {
    const m = mailRappelJ1({ prenom: '<b>Léa</b>', titre: 'A & <i>B</i>', lien: 'https://x', desabo: null })
    expect(m.html).not.toContain('<b>Léa')
    expect(m.html).toContain('A &amp; &lt;i&gt;B')
    expect(prenomPropre('  Jean-Luc 42 ')).toBe('Jean-Luc')
  })
  it('dit toujours pourquoi on écrit, avec le lien de désinscription', () => {
    const m = mailRappelJ1({ prenom: null, lien: 'https://app.revizapp.fr/programme?via=rappel', desabo: 'https://app.revizapp.fr/api/track?op=desabonner&uid=u&t=t' })
    expect(m.html).toContain('une seule fois, le lendemain de ton arrivée')
    expect(m.html).toContain('Ne plus recevoir de rappels')
    expect(m.html).toContain('legal/confidentialite')
  })
  it('sujetRappel : chapitre du programme, leçon scannée, rien', () => {
    expect(sujetRappel(SESSION).lien).toBe(LIEN_PYTHAGORE)
    expect(sujetRappel({ jour: 'x', source: 'scan', titre: 'L' })).toMatchObject({ source: 'scan', lien: 'https://app.revizapp.fr/cours?via=rappel' })
    expect(sujetRappel(null, { source: 'programme', chapterId: 'x/../y', classe: '3ème', matiere: 'Maths' }).lien).toBe('https://app.revizapp.fr/?via=rappel')
    expect(sujetRappel(null, null)).toEqual({ titre: null, matiere: null, source: null, lien: 'https://app.revizapp.fr/programme?via=rappel' })
  })
  it('le lien de désinscription est signé pour ce compte seulement', () => {
    const url = new URL(lienDesabo('uid1234567890', 's'))
    expect(signatureValide('uid1234567890', url.searchParams.get('t'), 's')).toBe(true)
    expect(signatureValide('autre12345678', url.searchParams.get('t'), 's')).toBe(false)
    expect(lienDesabo('uid1234567890', '')).toBeNull()
  })
})
