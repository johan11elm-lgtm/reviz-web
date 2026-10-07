import { describe, it, expect } from 'vitest'
import { resumeReadingMinutes, splitOnTerms, pickCheckCards } from '../resume'

const marques = segs => segs.filter(s => s.term).map(s => s.text)

describe('splitOnTerms', () => {
  it('repère la première occurrence de chaque terme, sans perdre de texte', () => {
    const texte = "Le tiers état réclame la fin des privilèges. Le tiers état se proclame Assemblée."
    const segs = splitOnTerms(texte, ['tiers état', 'privilèges'])
    expect(segs.map(s => s.text).join('')).toBe(texte)
    expect(marques(segs)).toEqual(['tiers état', 'privilèges'])
  })

  it('ignore la casse, tolère le pluriel et ne coupe pas les mots', () => {
    expect(marques(splitOnTerms('Les Pronoms remplacent un nom.', ['pronom']))).toEqual(['Pronoms'])
    expect(marques(splitOnTerms('Un adverbe modifie un verbe.', ['verbe']))).toEqual(['verbe'])
    expect(marques(splitOnTerms("l'hypoténuse est le plus long côté", ['Hypoténuse']))).toEqual(['hypoténuse'])
  })

  it('préfère le terme le plus long et ignore les parenthèses', () => {
    expect(marques(splitOnTerms('La racine carrée de 25 vaut 5.', ['Racine carrée (√)', 'racine']))).toEqual(['racine carrée'])
  })

  it('renvoie le terme d\'origine du vocabulaire, pour retrouver sa définition', () => {
    const segs = splitOnTerms('Les Privilèges et la racine carrée', ['privilège', 'Racine carrée (√)'])
    expect(segs.filter(s => s.term).map(s => s.term)).toEqual(['privilège', 'Racine carrée (√)'])
  })

  it('rend le texte tel quel sans terme exploitable', () => {
    expect(splitOnTerms('Bonjour', [])).toEqual([{ text: 'Bonjour', term: false }])
    expect(splitOnTerms('Le a et le b', ['a'])).toEqual([{ text: 'Le a et le b', term: false }])
    expect(splitOnTerms('Prix : 3 € (environ)', ['(environ)'])).toEqual([{ text: 'Prix : 3 € (environ)', term: false }])
  })
})

describe('resumeReadingMinutes', () => {
  it('compte toutes les rubriques, une minute au minimum', () => {
    expect(resumeReadingMinutes(null)).toBe(1)
    expect(resumeReadingMinutes({ intro: 'court' })).toBe(1)
    const long = Array.from({ length: 300 }, () => 'mot').join(' ')
    expect(resumeReadingMinutes({ sections: [{ content: long }], pieges: [long] })).toBe(4)
  })
})

describe('pickCheckCards', () => {
  const cartes = Array.from({ length: 8 }, (_, i) => ({ front: `Q${i}`, back: `R${i}` }))
  it('prend le début, le milieu et la fin du paquet, avec leur index', () => {
    expect(pickCheckCards(cartes).map(c => c.front)).toEqual(['Q0', 'Q4', 'Q7'])
    expect(pickCheckCards(cartes).map(c => c.index)).toEqual([0, 4, 7])
  })
  it('garde tout un petit paquet et écarte les cartes invalides', () => {
    expect(pickCheckCards([null, { front: 'a', back: 'b' }, { front: 1 }])).toEqual([{ front: 'a', back: 'b', index: 1 }])
    expect(pickCheckCards(undefined)).toEqual([])
  })
})
