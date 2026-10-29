// XP réelle, combo et quêtes (29/10), en mode essai, à 1280 px et à 390 px. L'heure est figée sur
// un jour dont la quête du jour se boucle avec un quiz parfait (quiz, combo de 5 ou 100 XP) : le
// quiz du chapitre Thalès (5 questions) fait monter le combo, crédite l'XP, puis la quête se
// récupère et l'accueil compte tout.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, mockProgramme, entrerEnEssai, ouvrirChapitreDuProgramme, chapitreThales, figerHeure, sansDebordement } from './helpers'
import { quetesDuMoment } from '../src/utils/quetes.js'

const APPAREILS = [
  ['ordinateur', { width: 1280, height: 800 }],
  ['téléphone', { width: 390, height: 844 }],
]
// Un jeudi 15 h à Paris, ou le premier jour suivant dont la quête du jour se boucle avec un quiz parfait.
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
const statXp = page => page.locator('.nm-stats li').filter({ hasText: 'Points d’expérience' }).locator('b')

test.describe('XP, combo et quêtes', () => {
  for (const [appareil, viewport] of APPAREILS) {
    test(`un quiz parfait : combo, XP créditée, quête récupérée (${appareil})`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await figerHeure(page, { iso: MOMENT.iso })
      await mockApiRoutes(page)
      await mockProgramme(page)
      await entrerEnEssai(page, { aller: null })

      // ── Accueil : les quêtes, rien de fait ──
      const quetes = page.getByRole('region', { name: 'Tes quêtes' })
      await expect(quetes).toBeVisible()
      await expect(quetes.getByText(MOMENT.quete.titre)).toBeVisible()
      await expect(quetes.getByRole('progressbar', { name: `${MOMENT.quete.titre} : 0 sur ${MOMENT.quete.cible}` })).toBeVisible()
      await expect(statXp(page)).toHaveText('0')
      await sansDebordement(page, `accueil ${appareil}`)

      // ── Le quiz du chapitre, tout juste : le combo monte jusqu'au palier ──
      await page.goto('/programme')
      await ouvrirChapitreDuProgramme(page)
      await page.getByRole('link', { name: /^Quiz corrigé/ }).click()
      const questions = chapitreThales().quiz
      for (const [i, q] of questions.entries()) {
        await choix(page, q.choices[q.correct]).click()
        if (i === 0) await expect(page.locator('.xp-combo')).toHaveCount(0)
        if (i === 1) await expect(page.locator('.xp-combo')).toHaveText('×2')
        if (i === 4) {
          await expect(page.locator('.xp-combo')).toContainText('×5')
          await expect(page.locator('.xp-combo')).toContainText('+10 XP')
          await page.screenshot({ path: test.info().outputPath('combo-palier.png'), animations: 'disabled' })
        }
        await page.getByRole('button', { name: /Question suivante|Voir mon score/ }).click()
      }

      // ── Fin : l'XP détaillée, le niveau, la quête à récupérer ──
      await expect(page.getByText('Quiz terminé')).toBeVisible()
      const bilan = page.getByRole('region', { name: 'XP gagnée' })
      await expect(bilan.locator('.xp-gain')).toHaveText('+100 XP')
      for (const [libelle, xp] of [['5 bonnes réponses', 50], ['Séance finie', 20], ['Sans faute', 20], ['Palier de combo', 10]]) {
        await expect(bilan.getByRole('listitem').filter({ hasText: libelle })).toContainText(`+${xp}`)
      }
      await expect(bilan).toContainText('200 / 500 XP') // 100 pour le chapitre ouvert + 100 gagnés
      const recuperer = bilan.getByRole('button', { name: `Récupérer +${MOMENT.quete.xp} XP` })
      await expect(recuperer).toBeVisible()
      await sansDebordement(page, `fin du quiz ${appareil}`)
      await page.screenshot({ path: test.info().outputPath('fin-quiz.png'), fullPage: true, animations: 'disabled' })
      await recuperer.click()
      await expect(bilan.getByText(`+${MOMENT.quete.xp} XP`, { exact: true })).toBeVisible()
      await expect(bilan.getByRole('button', { name: /Récupérer/ })).toHaveCount(0)

      // ── Accueil : la quête récupérée, l'XP comptée ──
      await page.goto('/')
      await expect(quetes.getByText(MOMENT.quete.titre)).toBeVisible()
      await expect(quetes.locator('.xp-carte--jour')).toContainText('Récupérée')
      await expect(statXp(page)).toHaveText(String(200 + MOMENT.quete.xp))
      await quetes.scrollIntoViewIfNeeded()
      await page.screenshot({ path: test.info().outputPath('accueil-quetes.png'), animations: 'disabled' })
    })
  }

  test('une erreur casse le combo', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockApiRoutes(page)
    await mockProgramme(page)
    await entrerEnEssai(page)
    await ouvrirChapitreDuProgramme(page)
    await page.getByRole('link', { name: /^Quiz corrigé/ }).click()
    const [q1, q2, q3] = chapitreThales().quiz
    await choix(page, q1.choices[q1.correct]).click()
    await page.getByRole('button', { name: /Question suivante/ }).click()
    await choix(page, q2.choices[q2.correct]).click()
    await expect(page.locator('.xp-combo')).toHaveText('×2')
    await page.getByRole('button', { name: /Question suivante/ }).click()
    await choix(page, q3.choices[(q3.correct + 1) % q3.choices.length]).click()
    await expect(page.locator('.xp-combo')).toHaveText('Combo cassé')
    await page.screenshot({ path: test.info().outputPath('combo-casse.png'), animations: 'disabled' })
  })
})
