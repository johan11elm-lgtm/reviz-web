// Black Friday (27-30/11) : e-mail aux parents et notification, une fois, jamais aux abonnés.
import { describe, it, expect, vi } from 'vitest'
import { mailBlackFridayParent, envoyerBlackFridayParents } from '../_blackFridayParent.js'
import { notifBlackFriday } from '../_push.js'

const BF = Date.parse('2026-11-27T17:00:00+01:00')

describe('e-mail Black Friday aux parents', () => {
  it('3e : le Pass brevet à 19 €, au vouvoiement, avec le lien pour l’offrir et la désinscription', () => {
    const m = mailBlackFridayParent({ prenom: 'léa', classe: '3ème', lien: 'https://app.revizapp.fr/api/abonnement?op=offrir&u=x', desabo: 'https://app.revizapp.fr/desabo', maintenant: BF })
    expect(m.subject).toBe('Black Friday : le Pass brevet de Léa à 19 €')
    expect(m.html).toContain('Offrir Réviz+ à Léa')
    expect(m.html).toContain('Ne plus recevoir')
    expect(m.html).toContain('<s>29 €</s>')
  })
  it('autres classes : l’annuel à 29 € au lieu de 49 €', () => {
    expect(mailBlackFridayParent({ prenom: 'Tom', classe: '5ème', maintenant: BF }).subject).toBe('Black Friday : Réviz+ pour Tom à 29 € au lieu de 49 €')
  })

  function db(eleves) {
    const maj = {}
    return {
      maj,
      collectionGroup: () => ({ get: async () => ({ docs: eleves.map(e => ({ data: () => e.consent, ref: { parent: { parent: { id: e.uid } } } })) }) }),
      collection: () => ({ doc: uid => ({
        get: async () => ({ exists: true, data: () => eleves.find(e => e.uid === uid).profil }),
        update: async v => { maj[uid] = v },
      }) }),
    }
  }

  it('une fois, accord donné, ni abonné, ni désinscrit, ni deux mails le même jour', async () => {
    const ok = { parentEmail: 'p@x.fr', status: 'approved' }
    const base = db([
      { uid: 'a', consent: ok, profil: { prenom: 'A', level: { classe: '4ème' } } },
      { uid: 'b', consent: ok, profil: { plan: 'premium' } },
      { uid: 'c', consent: ok, profil: { bilansParent: false } },
      { uid: 'd', consent: ok, profil: { blackFridayParentLe: BF - 1000 } },
      { uid: 'e', consent: { ...ok, status: 'pending' }, profil: {} },
      { uid: 'f', consent: ok, profil: { bilanParentLe: BF - 3600_000 } },
    ])
    const envoyer = vi.fn(async () => ({}))
    const r = await envoyerBlackFridayParents({ db: base, envoyer, maintenant: BF, secret: 's' })
    expect(r.blackFridayParents).toBe(1)
    expect(envoyer).toHaveBeenCalledTimes(1)
    expect(envoyer.mock.calls[0][0].to).toBe('p@x.fr')
    expect(base.maj.a).toEqual({ blackFridayParentLe: BF })
  })
  it('hors Black Friday : rien', async () => {
    const envoyer = vi.fn()
    expect(await envoyerBlackFridayParents({ db: db([]), envoyer, maintenant: Date.parse('2026-12-02T17:00:00+01:00') })).toEqual({ blackFridayParents: 0 })
  })
})

describe('notification Black Friday', () => {
  it('vendredi et lundi seulement, jamais aux abonnés, le Pass en 3e', () => {
    expect(notifBlackFriday({ level: { classe: '4ème' } }, '2026-11-27', BF).title).toBe('Black Friday sur Réviz+')
    expect(notifBlackFriday({ level: { classe: '3ème' } }, '2026-11-27', BF).body).toMatch(/Pass brevet à 19 €/)
    expect(notifBlackFriday({}, '2026-11-28', BF)).toBeNull()
    expect(notifBlackFriday({ plan: 'premium' }, '2026-11-27', BF)).toBeNull()
    expect(notifBlackFriday({}, '2026-11-30', Date.parse('2026-11-30T17:00:00+01:00')).title).toBe('Dernier jour du Black Friday')
  })
})
