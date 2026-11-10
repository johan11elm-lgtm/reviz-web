import { describe, it, expect } from 'vitest'
import {
  nouvelleDemande, demandeEnCours, jetonDe, jetonValide, JETON_CONSOMME,
  lienPartage, partageValide, scorePartage, DUREE_PARTAGE_MS,
} from '../_accordParent.js'

const SECRET = 'secret-de-test'
const UID = 'AbCdEfGhIjKlMnOpQrStUvWxYz12'
const JOUR = 24 * 60 * 60 * 1000

describe('jeton d’autorisation', () => {
  it('avec la clé serveur : le document garde un germe, jamais le jeton du lien', () => {
    const { champs, jeton } = nouvelleDemande(UID, { secret: SECRET })
    expect(champs.germe).toMatch(/^[0-9a-f]{32}$/)
    expect(champs.token).toBeNull()
    expect(jeton).toMatch(/^[0-9a-f]{32}$/)
    expect(Object.values(champs)).not.toContain(jeton)
    expect(jetonDe(UID, champs, { secret: SECRET })).toBe(jeton)
    expect(jetonValide(UID, champs, jeton, { secret: SECRET })).toBe(true)
  })

  it('ce que l’élève peut lire dans son document ne suffit pas à s’approuver', () => {
    const { champs, jeton } = nouvelleDemande(UID, { secret: SECRET })
    expect(jetonValide(UID, champs, champs.germe, { secret: SECRET })).toBe(false)
    expect(jetonValide(UID, champs, '', { secret: SECRET })).toBe(false)
    expect(jetonValide(UID, champs, undefined, { secret: SECRET })).toBe(false)
    // Le jeton d'un autre élève, ou d'une autre demande du même élève, ne passe pas.
    expect(jetonValide('UnAutreEleve1234567890', champs, jeton, { secret: SECRET })).toBe(false)
    expect(jetonValide(UID, nouvelleDemande(UID, { secret: SECRET }).champs, jeton, { secret: SECRET })).toBe(false)
    // Ni avec une autre clé serveur.
    expect(jetonValide(UID, champs, jeton, { secret: 'autre' })).toBe(false)
  })

  it('une demande d’avant (jeton en clair) reste valable jusqu’à sa réponse', () => {
    const ancien = { status: 'pending', token: 'jeton-en-clair' }
    expect(demandeEnCours(ancien)).toBe(true)
    expect(jetonDe(UID, ancien, { secret: SECRET })).toBe('jeton-en-clair')
    expect(jetonValide(UID, ancien, 'jeton-en-clair', { secret: SECRET })).toBe(true)
    expect(jetonValide(UID, ancien, 'autre', { secret: SECRET })).toBe(false)
  })

  it('sans clé serveur : l’ancien fonctionnement, pour que l’accord reste possible', () => {
    const { champs, jeton } = nouvelleDemande(UID, { secret: '' })
    expect(champs).toEqual({ token: jeton })
    expect(jetonValide(UID, champs, jeton, { secret: '' })).toBe(true)
  })

  it('une fois le parent passé, le lien ne sert plus', () => {
    const { champs, jeton } = nouvelleDemande(UID, { secret: SECRET })
    const apres = { ...champs, status: 'approved', ...JETON_CONSOMME }
    expect(demandeEnCours(apres)).toBe(false)
    expect(jetonDe(UID, apres, { secret: SECRET })).toBeNull()
    expect(jetonValide(UID, apres, jeton, { secret: SECRET })).toBe(false)
  })

  it('le document posé à l’inscription (sans e-mail parti) n’a pas de demande en cours', () => {
    expect(demandeEnCours({ status: 'pending', createdAt: 1 })).toBe(false)
    expect(demandeEnCours(null)).toBe(false)
  })
})

describe('lien à partager', () => {
  const maintenant = 1_800_000_000_000

  it('porte l’élève, l’expiration et une signature ; valable 15 jours', () => {
    const url = new URL(lienPartage(UID, { maintenant, secret: SECRET }))
    expect(url.origin + url.pathname).toBe('https://app.revizapp.fr/api/approve-consent')
    expect(url.searchParams.get('uid')).toBe(UID)
    const e = url.searchParams.get('e'), s = url.searchParams.get('s')
    expect(Number(e) * 1000).toBeGreaterThan(maintenant + DUREE_PARTAGE_MS - 1000)
    expect(url.searchParams.has('token')).toBe(false)
    expect(partageValide(UID, e, s, { maintenant, secret: SECRET })).toBe(true)
    expect(partageValide(UID, e, s, { maintenant: maintenant + 14 * JOUR, secret: SECRET })).toBe(true)
    expect(partageValide(UID, e, s, { maintenant: maintenant + 16 * JOUR, secret: SECRET })).toBe(false)
  })

  it('refuse un lien retouché : autre élève, autre date, autre signature, autre clé', () => {
    const url = new URL(lienPartage(UID, { maintenant, secret: SECRET }))
    const e = url.searchParams.get('e'), s = url.searchParams.get('s')
    expect(partageValide('UnAutreEleve1234567890', e, s, { maintenant, secret: SECRET })).toBe(false)
    expect(partageValide(UID, String(Number(e) + 86400), s, { maintenant, secret: SECRET })).toBe(false)
    expect(partageValide(UID, e, s.replace(/.$/, c => (c === '0' ? '1' : '0')), { maintenant, secret: SECRET })).toBe(false)
    expect(partageValide(UID, e, s, { maintenant, secret: 'autre' })).toBe(false)
    expect(partageValide(UID, 'abc', s, { maintenant, secret: SECRET })).toBe(false)
    expect(partageValide('../etc', e, s, { maintenant, secret: SECRET })).toBe(false)
    expect(partageValide(UID, e, undefined, { maintenant, secret: SECRET })).toBe(false)
  })

  it('une expiration lointaine fabriquée à la main ne passe pas, même bien signée ailleurs', () => {
    // Un lien émis « dans le futur » : sa date dépasse ce qu'un vrai lien peut porter aujourd'hui.
    const url = new URL(lienPartage(UID, { maintenant: maintenant + 60 * JOUR, secret: SECRET }))
    expect(partageValide(UID, url.searchParams.get('e'), url.searchParams.get('s'), { maintenant, secret: SECRET })).toBe(false)
  })

  it('pas de lien sans clé serveur', () => {
    expect(lienPartage(UID, { maintenant, secret: '' })).toBeNull()
  })

  it('le score que l’élève veut montrer suit le lien, s’il est plausible', () => {
    const avec = new URL(lienPartage(UID, { maintenant, secret: SECRET, resultat: { score: 8, total: 10 } }))
    expect(avec.searchParams.get('n')).toBe('8')
    expect(avec.searchParams.get('t')).toBe('10')
    const sans = new URL(lienPartage(UID, { maintenant, secret: SECRET, resultat: { score: 12, total: 10 } }))
    expect(sans.searchParams.has('n')).toBe(false)
    expect(scorePartage({ score: '3', total: '5' })).toEqual({ score: 3, total: 5 })
    expect(scorePartage({ score: 1.5, total: 5 })).toBeNull()
    expect(scorePartage({ score: 1, total: 500 })).toBeNull()
    expect(scorePartage(null)).toBeNull()
  })
})
