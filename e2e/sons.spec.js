// Les bruitages de l'app (29/10). Un test n'entend rien : il écoute ce que l'app demande au contexte
// audio. Chaque son démarré est noté avec la durée de son tampon (elle désigne le fichier) et sa
// vitesse de lecture (le combo monte la gamme d'un cran à chaque bonne réponse).
import { test, expect } from '@playwright/test'
import { mockApiRoutes, mockProgramme, entrerEnEssai, ouvrirChapitreDuProgramme, chapitreThales, figerHeure } from './helpers'
import { quetesDuMoment } from '../src/utils/quetes.js'

// Durée décodée de chaque fichier de src/assets/sons (Chromium).
const DUREES = { bonne: 0.77, faute: 0.39, palier: 1.33, casse: 0.55, xp: 0.19, fin: 2.12, niveau: 2.19, quete: 1.2 }
const nomDe = d => Object.entries(DUREES).find(([, v]) => Math.abs(v - d) < 0.02)?.[0] ?? `?${d}`
const demi = n => Math.round(2 ** (n / 12) * 1000) / 1000

// Le jour où la quête du jour se boucle avec un quiz parfait (même calcul que xp-quetes.spec.js).
const MOMENT = (() => {
  for (let k = 0; k < 60; k++) {
    const t = Date.parse('2026-10-29T14:00:00Z') + k * 864e5
    const jour = quetesDuMoment([], {}, t).jour
    if (['quiz1', 'combo5', 'xp100'].includes(jour.id)) return { iso: new Date(t).toISOString(), quete: jour }
  }
  throw new Error('aucun jour trouvé')
})()
const esc = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const choix = (page, texte) => page.getByRole('button', { name: new RegExp(`^[A-D] : ${esc(texte)}$`) })

async function ecouter(page) {
  await page.addInitScript(() => {
    window.__sons = []
    const AC = window.AudioContext
    window.AudioContext = class extends AC {
      createBufferSource() {
        const s = super.createBufferSource()
        const start = s.start.bind(s)
        s.start = (t = 0, ...r) => {
          window.__sons.push({ d: Math.round(s.buffer.duration * 100) / 100, taux: Math.round(s.playbackRate.value * 1000) / 1000, dans: Math.round((t - this.currentTime) * 100) / 100 })
          return start(t, ...r)
        }
        return s
      }
    }
  })
}
const entendus = page => page.evaluate(() => window.__sons).then(l => l.map(s => ({ ...s, nom: nomDe(s.d) })))
const noms = async page => (await entendus(page)).map(s => s.nom)

async function ouvrirQuiz(page) {
  await page.setViewportSize({ width: 390, height: 844 })
  await ecouter(page)
  await figerHeure(page, { iso: MOMENT.iso })
  await mockApiRoutes(page)
  await mockProgramme(page)
  await entrerEnEssai(page)
  await ouvrirChapitreDuProgramme(page)
  await page.getByRole('link', { name: /^Quiz corrigé/ }).click()
  // Les sons de la séance se décodent à l'ouverture du quiz : le temps de lire la première question.
  await page.waitForTimeout(800)
  return chapitreThales().quiz
}

test.describe('Bruitages', () => {
  test('un quiz parfait : la gamme monte, le palier, la fin, l’XP qui défile, la quête', async ({ page }) => {
    const questions = await ouvrirQuiz(page)
    for (const q of questions) {
      await choix(page, q.choices[q.correct]).click()
      await page.getByRole('button', { name: /Question suivante|Voir mon score/ }).click()
    }
    await expect(page.getByText('Quiz terminé')).toBeVisible()
    await expect.poll(() => noms(page)).toEqual(['bonne', 'bonne', 'bonne', 'bonne', 'palier', 'fin', ...Array(8).fill('xp')])
    const sons = await entendus(page)
    expect(sons.slice(0, 4).map(s => s.taux)).toEqual([0, 2, 4, 5].map(demi))
    expect(sons.slice(6).map(s => s.taux)).toEqual([0, 1, 2, 3, 4, 5, 6, 7].map(demi))
    expect(sons[6].dans).toBeGreaterThanOrEqual(0.85) // l'XP défile une fois « +XP » à l'écran

    await page.getByRole('region', { name: 'XP gagnée' }).getByRole('button', { name: `Récupérer +${MOMENT.quete.xp} XP` }).click()
    await expect.poll(async () => (await noms(page)).at(-1)).toBe('quete')
  })

  test('une erreur casse le combo, une erreur sans combo sonne faux, et la gamme repart du bas', async ({ page }) => {
    const [q1, q2, q3, q4, q5] = await ouvrirQuiz(page)
    const repondre = async (q, juste) => {
      await choix(page, q.choices[juste ? q.correct : (q.correct + 1) % q.choices.length]).click()
      await page.getByRole('button', { name: /Question suivante|Voir mon score/ }).click()
    }
    await repondre(q1, true); await repondre(q2, true); await repondre(q3, false); await repondre(q4, false); await repondre(q5, true)
    await expect.poll(() => noms(page)).toEqual(expect.arrayContaining(['fin']))
    const sons = await entendus(page)
    expect(sons.slice(0, 5).map(s => s.nom)).toEqual(['bonne', 'bonne', 'casse', 'faute', 'bonne'])
    expect(sons[4].taux).toBe(1)
  })

  test('Réglages : couper les bruitages rend la séance muette, les rallumer fait entendre la bonne réponse', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await ecouter(page)
    await mockApiRoutes(page)
    await mockProgramme(page)
    await entrerEnEssai(page, { aller: '/reglages' })
    const interrupteur = page.getByRole('checkbox', { name: 'Activer les bruitages' })
    await expect(interrupteur).toBeChecked()
    await interrupteur.evaluate(el => el.scrollIntoView({ block: 'center' }))
    await interrupteur.click({ force: true })
    await expect(interrupteur).not.toBeChecked()
    expect(await page.evaluate(() => localStorage.getItem('reviz-jeux-son'))).toBe('0')

    await page.goto('/programme')
    await ouvrirChapitreDuProgramme(page)
    await page.getByRole('link', { name: /^Quiz corrigé/ }).click()
    await page.waitForTimeout(800)
    const [q1] = chapitreThales().quiz
    await choix(page, q1.choices[q1.correct]).click()
    await page.waitForTimeout(400)
    expect(await noms(page)).toEqual([])

    await page.goto('/reglages')
    const rallumer = page.getByRole('checkbox', { name: 'Activer les bruitages' })
    await rallumer.evaluate(el => el.scrollIntoView({ block: 'center' }))
    await rallumer.click({ force: true })
    await expect.poll(() => noms(page)).toEqual(['bonne'])
  })
})
