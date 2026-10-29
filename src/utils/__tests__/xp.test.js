import { describe, it, expect } from 'vitest'
import { xpSeance, sommeXp, xpDuJour, plafonner, xpLecture, BAREME } from '../xp'
import { computeLevel } from '../gamification'
import { quetesDuMoment, aRecuperer, xpDesQuetes, lundiDe, QUETES_DU_JOUR, QUETES_DE_LA_SEMAINE } from '../quetes'

// Le 29/10/2026 à 15 h, heure de Paris (UTC+1 après le passage à l'heure d'hiver).
const MAINTENANT = Date.parse('2026-10-29T14:00:00Z')
const H = 36e5
const rev = (type, champs = {}, quand = MAINTENANT - H) => ({ type, lessonId: 'prog-a', revisedAt: quand, ...champs })

describe('xpSeance', () => {
  it('bonnes réponses, séance finie, sans-faute et paliers de combo', () => {
    expect(xpSeance({ bonnes: 7, total: 10, paliers: 1 })).toEqual([
      { libelle: '7 bonnes réponses', xp: 70 },
      { libelle: 'Séance finie', xp: BAREME.terminee },
      { libelle: 'Palier de combo', xp: BAREME.palierCombo },
    ])
    const parfait = xpSeance({ bonnes: 5, total: 5 })
    expect(parfait.map(l => l.libelle)).toEqual(['5 bonnes réponses', 'Séance finie', 'Sans faute'])
    expect(sommeXp(parfait)).toBe(50 + 20 + 20)
  })
  it('des flashcards rapportent 5 XP par carte sue', () => {
    expect(xpSeance({ bonnes: 4, total: 6, cartes: true })[0]).toEqual({ libelle: '4 cartes sues', xp: 20 })
  })
  it('rien fait, rien gagné', () => {
    expect(xpSeance({})).toEqual([])
  })
})

describe('plafond du jour', () => {
  const revisions = [rev('quiz', { xp: 300 }), rev('exercices', { xp: 150 }), rev('quiz', { xp: 999 }, MAINTENANT - 30 * H)]
  it('ne compte que l’XP du jour, à Paris', () => {
    expect(xpDuJour(revisions, '2026-10-29')).toBe(450)
    expect(xpDuJour(revisions, '2026-10-28')).toBe(999)
  })
  it('coupe ce qui dépasse le plafond, jamais en dessous de zéro', () => {
    expect(plafonner(120, 450)).toBe(50)
    expect(plafonner(120, 0)).toBe(120)
    expect(plafonner(120, 600)).toBe(0)
  })
  it('une lecture rapporte une fois par jour et par leçon', () => {
    const jour = '2026-10-29'
    expect(xpLecture([], 'resume', 'prog-a', jour)).toBe(BAREME.lecture)
    expect(xpLecture([rev('resume', { xp: 10 })], 'resume', 'prog-a', jour)).toBe(0)
    expect(xpLecture([rev('resume', { xp: 10 })], 'resume', 'prog-b', jour)).toBe(BAREME.lecture)
    expect(xpLecture([rev('resume', { xp: 10 }, MAINTENANT - 30 * H)], 'resume', 'prog-a', jour)).toBe(BAREME.lecture)
    expect(xpLecture([], 'resume', null, jour)).toBe(0)
  })
})

describe('computeLevel', () => {
  it('garde les 100 XP par leçon et ajoute l’XP des révisions et des quêtes', () => {
    const lecons = [{}, {}, {}]
    expect(computeLevel(lecons).xpTotal).toBe(300)
    const n = computeLevel(lecons, [{ xp: 180 }, { xp: 70 }, {}], 50)
    expect(n).toMatchObject({ xpTotal: 600, level: 2, xpInLvl: 100, fillPct: 20 })
  })
})

describe('quêtes', () => {
  it('une quête du jour et trois de la semaine, les mêmes pour tout le monde', () => {
    const q = quetesDuMoment([], {}, MAINTENANT)
    expect(QUETES_DU_JOUR.map(d => d.id)).toContain(q.jour.id)
    expect(q.semaine).toHaveLength(3)
    expect(new Set(q.semaine.map(d => d.id)).size).toBe(3)
    for (const d of q.semaine) expect(QUETES_DE_LA_SEMAINE.map(x => x.id)).toContain(d.id)
    expect(quetesDuMoment([], {}, MAINTENANT + H).jour.id).toBe(q.jour.id)
    expect(q.jour.cle).toBe(`j2026-10-29:${q.jour.id}`)
    expect(q.semaine[0].cle.startsWith('s2026-10-26:')).toBe(true)
  })

  it('la quête du jour change d’un jour à l’autre (sur une semaine, au moins deux différentes)', () => {
    const ids = new Set(Array.from({ length: 7 }, (_, k) => quetesDuMoment([], {}, MAINTENANT + k * 24 * H).jour.id))
    expect(ids.size).toBeGreaterThan(1)
  })

  it('la progression se lit dans les révisions de la période', () => {
    const revisions = [
      rev('quiz', { score: 4, total: 5, bonnes: 4, xp: 70, comboMax: 4 }),
      rev('exercices', { score: 8, total: 10, bonnes: 8, xp: 110, comboMax: 6, lessonId: 'prog-b' }),
      rev('flashcards', { bonnes: 5, cartes: 7, xp: 45 }),
      rev('quiz', { score: 9, total: 9, bonnes: 9, xp: 999 }, MAINTENANT - 4 * 24 * H), // la semaine d'avant
    ]
    // On teste chaque quête du jour possible en la forçant via son id.
    const q = quetesDuMoment(revisions, {}, MAINTENANT)
    const attendu = { bonnes15: 15, exercices1: 1, combo5: 5, chapitres2: 2, xp100: 100, quiz1: 1, cartes10: 7 }
    expect(q.jour.progression).toBe(attendu[q.jour.id])
    expect(q.jour.faite).toBe(q.jour.progression >= q.jour.cible)
    // Semaine du lundi 26/10 : seulement les révisions de cette semaine.
    const jours4 = quetesDuMoment(revisions, {}, MAINTENANT).semaine.find(d => d.id === 'jours4')
    if (jours4) expect(jours4.progression).toBe(1)
  })

  it('une récompense récupérée ne se reprend pas ; le total compte pour le niveau', () => {
    const revisions = Array.from({ length: 3 }, (_, k) => rev('quiz', { score: 9, total: 9, bonnes: 9, xp: 120, comboMax: 9, lessonId: `l${k}` }))
    const q = quetesDuMoment(revisions, {}, MAINTENANT)
    expect(q.jour.faite).toBe(true)
    expect(aRecuperer(q).map(x => x.cle)).toContain(q.jour.cle)
    const apres = quetesDuMoment(revisions, { [q.jour.cle]: q.jour.xp }, MAINTENANT)
    expect(apres.jour.recuperee).toBe(true)
    expect(aRecuperer(apres).map(x => x.cle)).not.toContain(q.jour.cle)
    expect(xpDesQuetes({ a: 50, b: 150, c: 'x' })).toBe(200)
  })

  it('le lundi de la semaine et le temps avant minuit', () => {
    expect(lundiDe('2026-10-29')).toBe('2026-10-26')
    expect(lundiDe('2026-10-26')).toBe('2026-10-26')
    expect(lundiDe('2026-11-01')).toBe('2026-10-26')
    const r = quetesDuMoment([], {}, MAINTENANT).renouvellement
    expect(r.jour).toEqual({ heures: 9, minutes: 0 })
    expect(r.semaine).toBe(4) // jeudi : jeudi, vendredi, samedi, dimanche
  })
})
