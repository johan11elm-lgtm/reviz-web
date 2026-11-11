// Note estimée (11/11) : en tête du plan de révision, la note d'après les séances sur les
// chapitres du contrôle, et le chapitre à revoir pour viser plus haut.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, mockProgramme, entrerEnEssai, sansDebordement } from './helpers'

const CAPTURES = process.env.CAPTURES_DIR
const jour = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

test('téléphone : la note estimée et le chapitre à revoir, sur l’agenda', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockApiRoutes(page)
  await mockProgramme(page)
  await entrerEnEssai(page, { aller: null })
  await page.evaluate(({ date, cree }) => {
    const g = JSON.parse(localStorage.getItem('reviz-guest'))
    const chapitres = [
      { id: '3eme-maths-theoreme-de-thales', titre: 'Le théorème de Thalès' },
      { id: '3eme-maths-pythagore', titre: 'Le théorème de Pythagore' },
    ]
    // La note visée dans la découverte : « Viser 16 et plus ».
    localStorage.setItem(`reviz-entree-${g.uid}`, JSON.stringify({ controle: 'c1', blocage: 'retenir', objectif: 'haut' }))
    localStorage.setItem(`reviz-agenda-${g.uid}`, JSON.stringify({ pronote: null, controles: [{ id: 'c1', matiere: 'maths', titre: 'Thalès', date, cree, chapitres }], planOffert: 'c1' }))
    const t = Date.now() - 3_600_000
    localStorage.setItem(`reviz-revisions-${g.uid}`, JSON.stringify([
      { id: String(t), type: 'exercices', lessonId: 'prog-3eme-maths-theoreme-de-thales', score: 8, total: 10, revisedAt: t, termineAt: t },
      { id: String(t + 1), type: 'quiz', lessonId: 'prog-3eme-maths-pythagore', score: 5, total: 10, revisedAt: t + 1, termineAt: t + 1 },
    ]))
  }, { date: jour(6), cree: jour(0) })
  await page.goto('/agenda')
  const plan = page.getByRole('region', { name: /^Plan de révision/ })
  await expect(plan.getByText('Note estimée')).toBeVisible({ timeout: 15_000 })
  // (0,8 + 0,5) / 2 = 0,65 → 13/20 ; Pythagore à 85 % → 16,5.
  await expect(plan.locator('.pr-note-chiffre')).toHaveText('13/20')
  await expect(plan).toContainText('D’après tes 2 séances.')
  await expect(plan).toContainText(/Revois «\sLe théorème de Pythagore\s»\s: tu peux viser 16,5\./)
  await expect(plan.locator('.pr-objectif')).toHaveText(/Ton objectif\s: 16\/20\. Encore 3\spoints\./)
  await plan.scrollIntoViewIfNeeded()
  await sansDebordement(page, 'note estimée')
  if (CAPTURES) { await page.waitForTimeout(1200); await page.screenshot({ path: `${CAPTURES}/07-note-estimee-390.png`, animations: 'disabled' }) }
})
