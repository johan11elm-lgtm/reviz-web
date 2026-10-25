import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { CODES_VIDEO, FORME_CODE, VIA_VIDEO, lienEssai, normaliserCode } from '../codesVideo'
import { PROGRAMME_CLASSES, classeSlug } from '../programme'

// Garde-fou pour les sessions qui ajoutent des codes : une faute dans le
// tableau doit casser `npm test`, pas l'adresse affichée dans une vidéo.
describe('CODES_VIDEO (tableau des adresses courtes)', () => {
  for (const [code, e] of Object.entries(CODES_VIDEO)) {
    it(`${code} : forme, provenance et chapitre valides`, () => {
      expect(code).toMatch(FORME_CODE)
      expect(VIA_VIDEO).toContain(e.via)
      if (!e.classe) return
      expect(PROGRAMME_CLASSES).toContain(e.classe)
      if (!e.matiere) return
      const index = JSON.parse(fs.readFileSync(`public/programme/${classeSlug(e.classe)}/index.json`, 'utf8'))
      const m = index.matieres.find(x => x.slug === e.matiere)
      expect(m, `matière « ${e.matiere} » absente du programme de ${e.classe}`).toBeTruthy()
      if (!e.chapitre) return
      const ch = m.chapitres.find(x => x.id === e.chapitre)
      expect(ch, `chapitre « ${e.chapitre} » absent de ${e.matiere} (${e.classe})`).toBeTruthy()
      expect(ch.pret, `chapitre « ${e.chapitre} » pas encore prêt`).toBe(true)
    })
  }
})

describe('normaliserCode', () => {
  it('accepte 1 à 3 lettres puis 1 à 3 chiffres, sans tenir compte de la casse', () => {
    expect(normaliserCode('vf6')).toBe('vf6')
    expect(normaliserCode(' VF6 ')).toBe('vf6')
    expect(normaliserCode('cer123')).toBe('cer123')
  })
  it('refuse le reste (chemins du site, injections)', () => {
    for (const c of ['fiches', 't', '6', 'abcd1', 'a1234', 'v-6', '', null, '<x>']) expect(normaliserCode(c)).toBeNull()
  })
})

describe('lienEssai', () => {
  it('pré-remplit classe, matière et chapitre avec la provenance et le code', () => {
    const u = new URL(lienEssai('X0'), 'https://app.revizapp.fr')
    expect(u.pathname).toBe('/essai')
    expect(Object.fromEntries(u.searchParams)).toEqual({
      via: 'reseaux', v: 'x0', classe: '4ème', matiere: 'svt', chapitre: 'seismes',
    })
  })
  it('code inconnu : essai simple, sans code', () => {
    expect(lienEssai('zz99')).toBe('/essai?via=reseaux')
    expect(lienEssai('../admin')).toBe('/essai?via=reseaux')
  })
})
