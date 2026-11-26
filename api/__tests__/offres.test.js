// Pass brevet, Black Friday, offre de fin d'essai (26/11) : une seule source pour l'API et l'app.
import { describe, it, expect } from 'vitest'
import { PASS_BREVET, BLACK_FRIDAY, OFFRE_FIN_ESSAI, blackFridayEnCours, offreFinEssaiJusquau, remiseDe, remiseAffichee, passPropose, passActif, tempsRestant } from '../_offres.js'

const H = 3_600_000
const paris = s => Date.parse(`${s}+01:00`)

describe('Black Friday', () => {
  it('du vendredi 27/11 à 0 h au lundi 30/11 à minuit, heure de Paris', () => {
    expect(blackFridayEnCours(paris('2026-11-26T23:59:59'))).toBe(false)
    expect(blackFridayEnCours(paris('2026-11-27T00:00:00'))).toBe(true)
    expect(blackFridayEnCours(paris('2026-11-30T23:59:00'))).toBe(true)
    expect(blackFridayEnCours(paris('2026-12-01T00:00:00'))).toBe(false)
  })

  it('annuel à 29 € et Pass à 19 €, pas de remise sur le mensuel', () => {
    const t = paris('2026-11-28T12:00:00')
    expect(remiseDe('annuel', { maintenant: t })).toMatchObject({ coupon: 'bf2026-annuel', montant: '29 €', raison: 'black_friday', jusquau: BLACK_FRIDAY.fin })
    expect(remiseDe('pass', { maintenant: t })).toMatchObject({ coupon: 'bf2026-pass', montant: '19 €' })
    expect(remiseDe('mensuel', { maintenant: t })).toBeNull()
  })

  it('jamais en plus du tarif fondateur', () => {
    expect(remiseDe('annuel', { maintenant: paris('2026-11-28T12:00:00'), fondateur: true })).toBeNull()
  })

  it('les coupons retirent exactement l’écart avec le prix public', () => {
    expect(4900 - BLACK_FRIDAY.remises.annuel.centimes).toBe(2000)
    expect(PASS_BREVET.centimes - BLACK_FRIDAY.remises.pass.centimes).toBe(1000)
    expect(699 - OFFRE_FIN_ESSAI.remises.mensuel.centimes).toBe(400)
  })
})

describe('offre de fin d’essai', () => {
  const fin = paris('2026-11-20T10:00:00')
  const profil = { essaiPlus: { debut: fin - 7 * 24 * H, fin } }

  it('48 h après la fin de l’essai, puis plus rien', () => {
    expect(offreFinEssaiJusquau(profil, fin - 1)).toBeNull()
    expect(offreFinEssaiJusquau(profil, fin + H)).toBe(fin + 48 * H)
    expect(offreFinEssaiJusquau(profil, fin + 48 * H)).toBeNull()
  })

  it('jamais pour un élève qui a déjà payé, ni sans essai', () => {
    expect(offreFinEssaiJusquau({ ...profil, plan: 'premium' }, fin + H)).toBeNull()
    expect(offreFinEssaiJusquau({ ...profil, upgradedAt: fin - H }, fin + H)).toBeNull()
    expect(offreFinEssaiJusquau({}, fin + H)).toBeNull()
  })

  it('parrainage qui prolonge Réviz+ : l’offre part de la vraie fin', () => {
    const p = { essaiPlus: { fin, parrainage: { fin: fin + 3 * 24 * H } } }
    expect(offreFinEssaiJusquau(p, fin + H)).toBeNull()
    expect(offreFinEssaiJusquau(p, fin + 3 * 24 * H + H)).toBe(fin + 3 * 24 * H + 48 * H)
  })

  it('1er mois à 2,99 € sur le mensuel seulement', () => {
    expect(remiseDe('mensuel', { profil, maintenant: fin + H })).toMatchObject({ coupon: 'fin-essai-mensuel', montant: '2,99 €', raison: 'fin_essai' })
    expect(remiseDe('annuel', { profil, maintenant: fin + H })).toBeNull()
  })

  it('côté app : même remise à partir de la date calculée par AuthContext', () => {
    expect(remiseAffichee('mensuel', { finEssaiJusquau: fin + 48 * H, maintenant: fin + H })).toMatchObject({ montant: '2,99 €', jusquau: fin + 48 * H })
    expect(remiseAffichee('mensuel', { finEssaiJusquau: fin + 48 * H, maintenant: fin + 49 * H })).toBeNull()
  })
})

describe('Pass brevet', () => {
  it('proposé aux 3e jusqu’au 10 juillet 2027', () => {
    const t = paris('2026-11-26T12:00:00')
    expect(passPropose('3ème', t)).toBe(true)
    expect(passPropose('4ème', t)).toBe(false)
    expect(passActif(PASS_BREVET.fin + 1)).toBe(false)
  })

  it('temps restant lisible', () => {
    expect(tempsRestant(10 * H + 1, 0)).toBe('encore 11 h')
    expect(tempsRestant(72 * H, 0)).toBe('encore 3 jours')
    expect(tempsRestant(0, 1)).toBeNull()
  })
})
