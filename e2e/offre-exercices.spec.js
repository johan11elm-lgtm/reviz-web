// Limite d'exercices du jour et essai Réviz+ (08/11) : un compte gratuit qui a déjà fait
// 3 séances aujourd'hui. La première fois, Réviz+ est offert 7 jours (cadeau) et la séance
// s'ouvre ; si l'essai est déjà pris, la limite propose Réviz+ et « Demander à un parent ».
import { test, expect } from '@playwright/test'
import { mockApiRoutes, mockProgramme, compteRapide, ouvrirChapitreDuProgramme, sansDebordement } from './helpers'

const TELEPHONE = { width: 390, height: 844 }

/** Trois séances d'exercices commencées il y a quelques minutes, sur cet appareil. */
async function troisSeancesAujourdhui(page, uid) {
  await page.evaluate(uid => {
    const cle = `reviz-revisions-${uid}`
    const avant = JSON.parse(localStorage.getItem(cle) || '[]')
    const t = Date.now() - 5 * 60 * 1000
    const seances = [0, 1, 2].map(i => ({ id: String(t + i), type: 'exercices', lessonId: 'prog-3eme-maths-theoreme-de-thales', revisedAt: t + i, source: 'programme' }))
    localStorage.setItem(cle, JSON.stringify([...seances, ...avant]))
  }, uid)
}

async function versLaFiche(page, profil) {
  await page.setViewportSize(TELEPHONE)
  await mockApiRoutes(page)
  await mockProgramme(page)
  const compte = await compteRapide(page, { birthDate: '2013-03-01', profil, aller: '/programme' })
  await ouvrirChapitreDuProgramme(page)
  await troisSeancesAujourdhui(page, compte.uid)
  return compte
}

test.describe('Limite d\'exercices et essai Réviz+', () => {
  test('la première limite offre Réviz+ 7 jours, puis la séance continue', async ({ page }) => {
    const appels = []
    await versLaFiche(page, {})
    await page.route('**/api/track?op=essai-plus', route => {
      appels.push(route.request().postDataJSON())
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ fin: Date.now() + 7 * 864e5, nouveau: true }) })
    })
    await page.goto('/exercices?graine=42')
    const cadeau = page.getByRole('dialog', { name: 'Réviz+ offert 7 jours' })
    await expect(cadeau).toBeVisible()
    await expect(cadeau).toContainText('Exercices illimités')
    await expect(cadeau).not.toContainText('€')
    expect(appels).toHaveLength(1)
    await sansDebordement(page, 'cadeau')
    await page.screenshot({ path: test.info().outputPath('01-cadeau-essai.png'), animations: 'disabled' })
    await cadeau.getByRole('button', { name: 'Continuer ma séance' }).click()
    await expect(cadeau).toHaveCount(0)
    await expect(page.getByText(/· 1 sur 10$/)).toBeVisible()
  })

  test('essai déjà pris : la limite propose Réviz+ et la demande à un parent', async ({ page }) => {
    const passe = Date.now() - 10 * 864e5
    await versLaFiche(page, { essaiPlus: { debut: passe, fin: passe + 7 * 864e5 } })
    let demande = null
    await page.route('**/api/track?op=demande-plus', route => {
      demande = route.request().postDataJSON()
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
    })
    await page.goto('/exercices?graine=42')
    const limite = page.getByRole('dialog', { name: 'Limite atteinte' })
    await expect(limite).toBeVisible()
    await expect(limite).toContainText('Tu as fait tes 3 séances d’exercices du jour')
    await expect(limite.getByRole('button', { name: 'Exercices illimités avec Réviz+' })).toBeVisible()
    await sansDebordement(page, 'limite')
    await page.screenshot({ path: test.info().outputPath('02-limite.png'), animations: 'disabled' })
    // Compte à rebours jusqu'au retour des séances (11/11).
    await expect(limite).toContainText(/Elles reviennent dans \d+\s?h|Elles reviennent dans \d+\s?min/)
    if (process.env.CAPTURES_DIR) await page.screenshot({ path: `${process.env.CAPTURES_DIR}/05-limite-390.png`, animations: 'disabled' })
    // L'offre reprend ce qui a bloqué, et l'annuel ramené à la semaine.
    await limite.getByRole('button', { name: 'Exercices illimités avec Réviz+' }).click()
    const offreRevizPlus = page.getByRole('dialog', { name: 'Réviz+' })
    await expect(offreRevizPlus.getByRole('heading', { name: 'Continue tes exercices' })).toBeVisible()
    await expect(offreRevizPlus).toContainText(/soit 0,\d\d\s€ par semaine/)
    await sansDebordement(page, 'offre')
    if (process.env.CAPTURES_DIR) await page.screenshot({ path: `${process.env.CAPTURES_DIR}/06-offre-390.png`, animations: 'disabled' })
    await page.goto('/exercices?graine=42')
    await expect(limite).toBeVisible()

    await limite.getByRole('button', { name: 'Demander à un parent de me l’offrir' }).click()
    const champ = limite.getByLabel('L’adresse e-mail d’un parent')
    await expect(champ).toHaveValue('parent@famille.test') // l'adresse donnée pour l'accord
    await page.screenshot({ path: test.info().outputPath('03-demande-parent.png'), animations: 'disabled' })
    await limite.getByRole('button', { name: 'Envoyer la demande' }).click()
    await expect(limite.getByRole('status')).toContainText('Ton parent a reçu un e-mail')
    expect(demande.email).toBe('parent@famille.test')
    await page.screenshot({ path: test.info().outputPath('04-demande-envoyee.png'), animations: 'disabled' })

    // L'offre détaillée liste la nouvelle limite.
    await limite.getByRole('button', { name: 'Exercices illimités avec Réviz+' }).click()
    const offre = page.getByRole('dialog', { name: 'Réviz+' })
    await expect(offre.getByRole('row', { name: /Séances d’exercices 3 par jour Illimitées/ })).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('05-offre.png'), fullPage: true, animations: 'disabled' })
  })
})
