import { describe, it, expect, vi, beforeEach } from 'vitest'
import { envoyerBilansParent, mailBilanParent, resumeActivite, lienDesaboParent, PORTEE_DESABO, REPONDRE_A } from '../_bilanParent.js'
import { signatureValide } from '../_rappels.js'

const J = 24 * 60 * 60 * 1000
// Jeudi 22/10/2026 à 18 h, heure de Paris (16 h UTC, heure du cron).
const MAINTENANT = Date.parse('2026-10-22T16:00:00Z')
// Compte créé le lundi 19/10 à 10 h (Paris) ; demande au parent dix minutes après.
const INSCRIT = Date.parse('2026-10-19T08:00:00Z')
const DEMANDE = INSCRIT + 10 * 60 * 1000

const REVISIONS = [
  { type: 'quiz', lessonId: 'prog-fractions', chapterId: 'fractions', classe: '6ème', matiere: 'Maths', revisedAt: INSCRIT + 60e3, score: 3, total: 10 },
  { type: 'flashcards', lessonId: 'prog-fractions', chapterId: 'fractions', classe: '6ème', matiere: 'Maths', revisedAt: INSCRIT + 120e3 },
  { type: 'resume', lessonId: 'scan-abc', source: 'scan', revisedAt: INSCRIT + 2 * J },
]
const LECONS = {
  'prog-fractions': { metadata: { title: 'Les fractions' } },
  'scan-abc': { metadata: { title: 'La cellule', subject: 'SVT' }, source: 'scan' },
}

let users, consents, revisions, lecons
const majUsers = []
function consentDoc(uid) {
  return { data: () => consents[uid], ref: { parent: { parent: { id: uid } } } }
}
const db = {
  collectionGroup: nom => {
    if (nom !== 'parentalConsent') throw new Error(nom)
    return { get: async () => ({ docs: Object.keys(consents).map(consentDoc) }) }
  },
  collection: nom => {
    if (nom !== 'users') throw new Error(nom)
    return {
      doc: uid => ({
        get: async () => ({ exists: uid in users, data: () => users[uid] }),
        update: async m => { majUsers.push({ uid, m }); Object.assign(users[uid], m) },
        collection: sub => ({
          where: (champ, op, val) => ({
            get: async () => {
              if (sub !== 'revisions' || champ !== 'revisedAt' || op !== '>=') throw new Error(`${sub}.${champ}`)
              return { docs: (revisions[uid] ?? []).filter(r => r.revisedAt >= val).map(r => ({ data: () => r })) }
            },
          }),
          doc: id => ({
            get: async () => {
              if (sub !== 'lessons') throw new Error(sub)
              const l = lecons[uid]?.[id]
              return { exists: !!l, data: () => l }
            },
          }),
        }),
      }),
    }
  },
}
const envoyer = vi.fn(async () => ({ data: { id: 'x' } }))
const lienAutorisation = (token, uid) => `https://app.revizapp.fr/api/approve-consent?token=${token}&uid=${uid}`
const journal = vi.fn()
const lancer = (extra = {}) => envoyerBilansParent({ db, envoyer, lienAutorisation, maintenant: MAINTENANT, secret: 's', journal, ...extra })

/** Élève de 6e avec un parent qui a donné son accord, et des révisions. */
function eleve(uid, { profil = {}, consent = {}, revs = REVISIONS } = {}) {
  users[uid] = { prenom: 'Léa', createdAt: INSCRIT, level: { classe: '6ème' }, ...profil }
  consents[uid] = { status: 'approved', parentEmail: `parent-${uid}@test.fr`, createdAt: DEMANDE, firstRequestedAt: DEMANDE, approvedAt: DEMANDE + 3600e3, token: null, ...consent }
  revisions[uid] = revs
  lecons[uid] = LECONS
}

beforeEach(() => {
  users = {}; consents = {}; revisions = {}; lecons = {}
  majUsers.length = 0
  envoyer.mockClear(); journal.mockClear()
})

describe('bilan au parent (J+3) — qui le reçoit', () => {
  it('écrit une fois au parent qui a donné son accord, avec le bilan de son enfant', async () => {
    eleve('lea')
    expect(await lancer()).toEqual({ bilansParent: 1 })
    const m = envoyer.mock.calls[0][0]
    expect(m.to).toBe('parent-lea@test.fr')
    expect(m.from).toBe('Réviz <noreply@revizapp.fr>')
    expect(m.replyTo).toBe(REPONDRE_A)
    expect(m.subject).toBe('Ce que Léa a révisé depuis lundi')
    expect(m.html).toContain('Les fractions')
    expect(m.html).toContain('La cellule')
    expect(m.html).toContain('Maths · 6e — Quiz terminé, flashcards')
    expect(m.html).toContain('SVT — Résumé')
    expect(m.html).toContain('depuis le lundi 19 octobre pour réviser le programme de 6e')
    expect(m.html).not.toContain('Il manque votre accord')
    // Le parent voit l'effort, pas les notes.
    expect(m.html).not.toMatch(/3\s*\/\s*10/)
    expect(m.headers['List-Unsubscribe']).toContain('qui=parent')
    expect(majUsers).toEqual([{ uid: 'lea', m: { bilanParentLe: MAINTENANT } }])
    // Le cron du lendemain ne renvoie rien : un seul bilan.
    expect(await lancer({ maintenant: MAINTENANT + J })).toEqual({ bilansParent: 0 })
  })

  it('demande en cours : le bilan porte le bouton d’autorisation et la date limite', async () => {
    eleve('tom', { profil: { prenom: 'Tom' }, consent: { status: 'pending', token: 'tok123', approvedAt: undefined } })
    expect(await lancer()).toEqual({ bilansParent: 1 })
    const { html } = envoyer.mock.calls[0][0]
    expect(html).toContain('Il manque votre accord')
    expect(html).toContain('Donner mon autorisation')
    expect(html).toContain('https://app.revizapp.fr/api/approve-consent?token=tok123&amp;uid=tom')
    expect(html).toContain('après le jeudi 29 octobre')
  })

  it('jamais après un refus, un accès suspendu, ni sans lien ou sans adresse', async () => {
    eleve('refus', { consent: { status: 'refused' } })
    eleve('expire', { consent: { status: 'pending', token: 't', createdAt: MAINTENANT - 11 * J, firstRequestedAt: MAINTENANT - 11 * J } })
    eleve('sansLien', { consent: { status: 'pending', token: null } })
    eleve('sansAdresse', { consent: { status: 'pending', parentEmail: null } })
    expect(await lancer()).toEqual({ bilansParent: 0 })
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('attend J+3, s’arrête à 15 jours, et jamais deux e-mails au parent le même jour', async () => {
    eleve('tropTot', { profil: { createdAt: MAINTENANT - 2 * J } })
    eleve('tropTard', { profil: { createdAt: MAINTENANT - 15 * J } })
    eleve('sansDate', { profil: { createdAt: undefined } })
    eleve('demandeDuJour', { consent: { status: 'pending', token: 't', createdAt: MAINTENANT - 3600e3 } })
    eleve('relanceDuJour', { consent: { status: 'pending', token: 't', relanceLe: MAINTENANT - 60e3 } })
    expect(await lancer()).toEqual({ bilansParent: 0 })
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('pas de bilan après « Ne plus recevoir de bilan », ni si le compte a disparu', async () => {
    eleve('desabo', { profil: { bilansParent: false } })
    eleve('supprime')
    eleve('desactive')
    delete users.supprime
    const auth = { getUser: vi.fn(async uid => (uid === 'desactive' ? { uid, disabled: true } : { uid, disabled: false })) }
    expect(await lancer({ auth })).toEqual({ bilansParent: 0 })
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('rien à raconter : on attend, et le bilan part le jour où l’élève s’y met', async () => {
    eleve('pasEncore', { revs: [] })
    expect(await lancer()).toEqual({ bilansParent: 0 })
    expect(majUsers).toEqual([])
    revisions.pasEncore = [{ type: 'quiz', lessonId: 'prog-fractions', classe: '6ème', matiere: 'Maths', revisedAt: MAINTENANT + 3600e3, total: 5, score: 5 }]
    expect(await lancer({ maintenant: MAINTENANT + J })).toEqual({ bilansParent: 1 })
  })

  it('un refus de Resend n’est pas marqué envoyé (nouvel essai le lendemain)', async () => {
    eleve('lea')
    envoyer.mockResolvedValueOnce({ error: { message: 'rate limit' } })
    expect(await lancer()).toEqual({ bilansParent: 0 })
    expect(majUsers).toEqual([])
    expect(journal).toHaveBeenCalledWith(expect.stringContaining('rate limit'))
  })
})

describe('bilan au parent — contenu', () => {
  it('resumeActivite : jours, chapitres du plus récent au plus ancien, quiz menés au bout, parties du jour', () => {
    const r = resumeActivite({
      revisions: [
        ...REVISIONS,
        { type: 'quiz', lessonId: 'prog-vieux', revisedAt: INSCRIT - J, total: 4 },
        { type: 'quiz', lessonId: 'prog-fractions', revisedAt: INSCRIT + 3 * 60e3 },
      ],
      jeux: { jours: ['2026-10-18', '2026-10-19', '2026-10-21'] },
      depuis: INSCRIT, maintenant: MAINTENANT,
    })
    expect(r.joursRevision).toBe(2)
    expect(r.chapitres.map(c => c.lessonId)).toEqual(['scan-abc', 'prog-fractions'])
    expect([...r.chapitres[1].formats]).toEqual(['quiz', 'flashcards'])
    expect(r.quizTermines).toBe(1)
    expect(r.parties).toBe(2)
  })

  it('sans prénom, avec des titres à échapper, au-delà de cinq chapitres', () => {
    const chapitres = Array.from({ length: 7 }, (_, i) => ({ lessonId: `l${i}`, titre: i ? `Chapitre ${i}` : '<b>Piège</b>', matiere: 'Histoire', classe: '4ème', formats: new Set(['resume']), quizTermine: false }))
    const { subject, html } = mailBilanParent({ depuis: INSCRIT, maintenant: MAINTENANT, resume: { chapitres, joursRevision: 3, quizTermines: 0, parties: 0 } })
    expect(subject).toBe('Ce que votre enfant a révisé depuis lundi')
    expect(html).toContain('Votre enfant a révisé')
    expect(html).toContain('&lt;b&gt;Piège&lt;/b&gt;')
    expect(html).not.toContain('<b>Piège</b>')
    expect(html).toContain('Et 2 autres chapitres.')
    expect(html).not.toContain('Chapitre 6')
    expect(html).toContain('pour réviser ses cours')
  })

  it('parties du jour seulement, et arrivée de plus d’une semaine', () => {
    const { subject, html } = mailBilanParent({ prenom: 'Inès', classe: '3ème', depuis: MAINTENANT - 10 * J, maintenant: MAINTENANT, resume: { chapitres: [], joursRevision: 0, quizTermines: 0, parties: 1 } })
    expect(subject).toBe('Ce qu\'Inès a fait sur Réviz depuis le 12 octobre')
    expect(html).toContain('Inès a joué')
    expect(html).toContain('parce qu\'Inès a donné votre adresse')
    expect(html).toContain('1 partie du jour')
    expect(html).not.toContain('Ses chapitres')
    expect(html).toContain('un chapitre vu en classe cette semaine')
  })

  it('le lien de désinscription est signé pour le bilan seulement', () => {
    const url = new URL(lienDesaboParent('uid1234567890', 's'))
    expect(url.searchParams.get('qui')).toBe('parent')
    const t = url.searchParams.get('t')
    expect(signatureValide('uid1234567890', t, 's', PORTEE_DESABO)).toBe(true)
    // Il ne coupe pas les rappels de l'élève, et ne vaut pas pour un autre compte.
    expect(signatureValide('uid1234567890', t, 's')).toBe(false)
    expect(signatureValide('autre123456789', t, 's', PORTEE_DESABO)).toBe(false)
  })
})
