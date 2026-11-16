import { describe, it, expect, vi, beforeEach } from 'vitest'
import { envoyerFinsEssai, mailFinEssai, activiteEssai, essaiFinitBientot } from '../_finEssai.js'
import { REPONDRE_A } from '../_bilanParent.js'

const H = 60 * 60 * 1000
const J = 24 * H
// Lundi 16/11/2026 à 17 h, heure de Paris (16 h UTC, heure du cron).
const MAINTENANT = Date.parse('2026-11-16T16:00:00Z')

let users, consents, revisions
const db = {
  collectionGroup: nom => {
    if (nom !== 'parentalConsent') throw new Error(nom)
    return { get: async () => ({ docs: Object.keys(consents).map(uid => ({ data: () => consents[uid], ref: { parent: { parent: { id: uid } } } })) }) }
  },
  collection: nom => {
    if (nom !== 'users') throw new Error(nom)
    return {
      doc: uid => ({
        get: async () => ({ exists: uid in users, data: () => users[uid] }),
        update: async m => { Object.assign(users[uid], m) },
        collection: sub => ({
          where: (champ, op, v) => ({ get: async () => ({ docs: (sub === 'revisions' ? revisions[uid] ?? [] : []).filter(r => r[champ] >= v).map(r => ({ data: () => r })) }) }),
        }),
      }),
    }
  },
}
const envoyer = vi.fn(async () => ({ data: { id: 'x' } }))
const journal = vi.fn()
const lancer = (extra = {}) => envoyerFinsEssai({ db, envoyer, maintenant: MAINTENANT, secret: 's', journal, lienOffrir: uid => `https://app.revizapp.fr/api/abonnement?op=offrir&u=${uid}`, ...extra })

/** Élève gratuit dont l'essai finit dans 20 h, parent d'accord. */
function eleve(uid, { profil = {}, consent = {}, fin = MAINTENANT + 20 * H } = {}) {
  users[uid] = { prenom: 'Léa', plan: 'free', essaiPlus: { debut: fin - 7 * J, fin, origine: 'limite_exercices' }, ...profil }
  consents[uid] = { status: 'approved', parentEmail: `parent-${uid}@test.fr`, ...consent }
}

beforeEach(() => {
  users = {}; consents = {}; revisions = {}
  envoyer.mockClear(); journal.mockClear()
})

describe('fin de l’essai Réviz+ — le mot au parent', () => {
  it('écrit au parent la veille, une seule fois, avec ce que l’élève a fait et le lien pour offrir', async () => {
    eleve('lea')
    const debut = users.lea.essaiPlus.debut
    // Deux jours d'exercices : 5 séances le premier (2 au-delà de la limite), 1 le second.
    revisions.lea = [
      ...Array.from({ length: 5 }, (_, i) => ({ revisedAt: debut + i * 60 * 1000, type: 'exercices' })),
      { revisedAt: debut + 2 * J, type: 'exercices' },
      { revisedAt: debut + 2 * J + H, type: 'flashcards' },
      { revisedAt: debut - J, type: 'exercices' }, // avant l'essai : ne compte pas
    ]
    expect(await lancer()).toEqual({ finsEssaiParent: 1 })
    const m = envoyer.mock.calls[0][0]
    expect(m.to).toBe('parent-lea@test.fr')
    expect(m.replyTo).toBe(REPONDRE_A)
    expect(m.subject).toBe('L\'essai Réviz+ de Léa se termine mardi 17 novembre')
    expect(m.html).toContain('<b>2 jours</b>')
    expect(m.html).toContain('<b>6 séances d\'exercices</b>, dont 2 au-delà des 3 par jour')
    expect(m.html).toContain('rien n\'est prélevé')
    expect(m.html).toContain('op=offrir&amp;u=lea')
    expect(m.headers['List-Unsubscribe']).toContain('op=desabonner')
    expect(users.lea.finEssaiParentLe).toBe(MAINTENANT)
    envoyer.mockClear()
    expect(await lancer({ maintenant: MAINTENANT + H })).toEqual({ finsEssaiParent: 0 })
  })

  it('rien si la fin est à plus de 24 h ou passée, si le parrainage prolonge, ou pour un abonné', async () => {
    eleve('loin', { fin: MAINTENANT + 30 * H })
    eleve('passe', { fin: MAINTENANT - H })
    eleve('parrain', { profil: { essaiPlus: { debut: MAINTENANT - 6 * J, fin: MAINTENANT + 20 * H, parrainage: { fin: MAINTENANT + 3 * J } } } })
    eleve('abonne', { profil: { plan: 'premium' } })
    expect(await lancer()).toEqual({ finsEssaiParent: 0 })
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('rien sans accord, après « Ne plus recevoir », ni pour un compte désactivé', async () => {
    eleve('attente', { consent: { status: 'pending' } })
    eleve('desabo', { profil: { bilansParent: false } })
    eleve('coupe')
    const auth = { getUser: async uid => ({ uid, disabled: uid === 'coupe' }) }
    expect(await lancer({ auth })).toEqual({ finsEssaiParent: 0 })
  })

  it('un refus de Resend ne marque rien, et le budget épuisé arrête la boucle', async () => {
    eleve('lea')
    envoyer.mockResolvedValueOnce({ error: { message: 'quota' } })
    expect(await lancer()).toEqual({ finsEssaiParent: 0 })
    expect(users.lea.finEssaiParentLe).toBeUndefined()
    expect(journal).toHaveBeenCalled()
    const epuise = Object.assign(vi.fn(), { epuise: () => true })
    expect(await envoyerFinsEssai({ db, envoyer: epuise, maintenant: MAINTENANT, secret: 's', journal })).toEqual({ finsEssaiParent: 0 })
    expect(epuise).not.toHaveBeenCalled()
  })

  it('sans lien d’offre (ventes fermées), renvoie vers les Réglages', () => {
    const { html } = mailFinEssai({ prenom: null, fin: MAINTENANT + 20 * H, activite: { jours: 0, exercices: 0, enPlus: 0 } })
    expect(html).toContain('/reglages#abonnement')
    expect(html).not.toContain('Pendant l\'essai')
    expect(html).toContain('L&#39;essai Réviz+ de votre enfant') // titre échappé
  })
})

describe('fin de l’essai — calculs', () => {
  it('essaiFinitBientot', () => {
    expect(essaiFinitBientot({ essaiPlus: { fin: MAINTENANT + J } }, MAINTENANT)).toBe(true)
    expect(essaiFinitBientot({ essaiPlus: { fin: MAINTENANT + J + 1 } }, MAINTENANT)).toBe(false)
    expect(essaiFinitBientot({}, MAINTENANT)).toBe(false)
  })
  it('activiteEssai compte les séances au-delà de la limite jour par jour', () => {
    const d = MAINTENANT - 3 * J
    const revs = Array.from({ length: 4 }, (_, i) => ({ revisedAt: d + i, type: 'exercices' }))
    expect(activiteEssai(revs, d, MAINTENANT)).toEqual({ jours: 1, exercices: 4, enPlus: 1 })
  })
})
