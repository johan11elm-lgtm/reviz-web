import { describe, it, expect, vi, beforeEach } from 'vitest'
import { envoyerLimitesParent, mailLimiteParent, marquerLimite } from '../_limiteParent.js'
import { REPONDRE_A } from '../_bilanParent.js'

const J = 24 * 60 * 60 * 1000
const MAINTENANT = Date.parse('2026-10-31T16:00:00Z')

let users, consents
function consentDoc(uid) {
  return { data: () => consents[uid], ref: { parent: { parent: { id: uid } } } }
}
const ecritures = []
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
        update: async m => { Object.assign(users[uid], m) },
        set: async (m, o) => { ecritures.push({ uid, m, o }) },
      }),
    }
  },
}
const envoyer = vi.fn(async () => ({ data: { id: 'x' } }))
const journal = vi.fn()
const lancer = (extra = {}) => envoyerLimitesParent({ db, envoyer, maintenant: MAINTENANT, secret: 's', journal, ...extra })

/** Élève gratuit qui a atteint sa limite de scans hier, parent d'accord. */
function eleve(uid, { profil = {}, consent = {} } = {}) {
  users[uid] = { prenom: 'Léa', plan: 'free', limiteAtteinte: { type: 'scan', le: MAINTENANT - J }, ...profil }
  consents[uid] = { status: 'approved', parentEmail: `parent-${uid}@test.fr`, ...consent }
}

beforeEach(() => {
  users = {}; consents = {}
  ecritures.length = 0
  envoyer.mockClear(); journal.mockClear()
})

describe('limite atteinte — le mot au parent', () => {
  it('prévient le parent, une fois, avec le lien de désabonnement', async () => {
    eleve('lea')
    expect(await lancer()).toEqual({ limitesParent: 1 })
    const m = envoyer.mock.calls[0][0]
    expect(m.to).toBe('parent-lea@test.fr')
    expect(m.replyTo).toBe(REPONDRE_A)
    expect(m.subject).toBe('Léa a utilisé ses 5 scans de la semaine')
    expect(m.headers['List-Unsubscribe']).toContain('op=desabonner')
    expect(users.lea.limiteParentLe).toBe(MAINTENANT)
    // Le lendemain, même limite : rien (au plus un par semaine).
    envoyer.mockClear()
    expect(await lancer({ maintenant: MAINTENANT + J })).toEqual({ limitesParent: 0 })
  })

  it('reprévient une semaine plus tard si la limite est de nouveau atteinte', async () => {
    eleve('lea', { profil: { limiteParentLe: MAINTENANT - 7 * J } })
    expect(await lancer()).toEqual({ limitesParent: 1 })
  })

  it('n\'écrit pas : accord pas encore donné, refus, désabonné, abonné, limite trop ancienne, bilan ou relance du jour', async () => {
    eleve('attente', { consent: { status: 'pending' } })
    eleve('refus', { consent: { status: 'denied' } })
    eleve('desabo', { profil: { bilansParent: false } })
    eleve('abonne', { profil: { plan: 'premium' } })
    eleve('ancien', { profil: { limiteAtteinte: { type: 'scan', le: MAINTENANT - 3 * J } } })
    eleve('bilan', { profil: { bilanParentLe: MAINTENANT - 60e3 } })
    eleve('relance', { consent: { relanceLe: MAINTENANT - 60e3 } })
    eleve('sans', { profil: { limiteAtteinte: null } })
    expect(await lancer()).toEqual({ limitesParent: 0 })
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('compte supprimé ou désactivé : rien', async () => {
    eleve('parti'); eleve('bloque')
    const auth = { getUser: async uid => (uid === 'parti' ? Promise.reject(new Error('x')) : { disabled: true }) }
    expect(await lancer({ auth })).toEqual({ limitesParent: 0 })
  })

  it('un envoi refusé n\'est pas marqué : nouvel essai demain', async () => {
    eleve('lea')
    envoyer.mockImplementationOnce(async () => ({ error: { message: 'quota' } }))
    expect(await lancer()).toEqual({ limitesParent: 0 })
    expect(users.lea.limiteParentLe).toBeUndefined()
    expect(journal).toHaveBeenCalled()
  })
})

describe('limite atteinte — le contenu du mail', () => {
  it('scans : ce qui est arrivé, le programme gratuit, les prix, comment activer', () => {
    const { subject, html } = mailLimiteParent({ prenom: 'Léa', type: 'scan', desabo: 'https://x/desabo' })
    expect(subject).toBe('Léa a utilisé ses 5 scans de la semaine')
    expect(html).toContain('Ses scans reviennent lundi')
    expect(html).toContain('restent gratuits et sans limite')
    expect(html).toContain('6,99 € par mois')
    expect(html).toContain('49 € par an')
    expect(html).toContain('https://app.revizapp.fr/reglages#abonnement')
    expect(html).toContain('avec le compte de Léa')
    expect(html).toContain('https://x/desabo')
  })

  it('Réviz IA, et sans prénom', () => {
    const { subject, html } = mailLimiteParent({ type: 'ia' })
    expect(subject).toBe('Votre enfant a posé ses 10 questions de la semaine à Réviz IA')
    expect(html).toContain('avec le compte de votre enfant')
  })

  it('un prénom piégé est échappé', () => {
    const { html } = mailLimiteParent({ prenom: '<b>x</b>', type: 'scan' })
    expect(html).not.toContain('<b>x</b>')
  })
})

describe('limite atteinte — la marque', () => {
  it('pose le type et la date sur le profil, sans écraser le reste', async () => {
    await marquerLimite({ db, uid: 'lea', type: 'ia', maintenant: 42 })
    expect(ecritures).toEqual([{ uid: 'lea', m: { limiteAtteinte: { type: 'ia', le: 42 } }, o: { merge: true } }])
  })
})

describe('limite atteinte — la marque ne bloque jamais', () => {
  it('une base qui plante ne remonte pas d\'erreur', async () => {
    const casse = { collection: () => ({ doc: () => ({}) }) }
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(marquerLimite({ db: casse, uid: 'x', type: 'scan' })).resolves.toBeUndefined()
    erreur.mockRestore()
  })
})
