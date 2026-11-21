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
    // Le lien que l'élève envoie lui-même par message (17/11).
    let liens = 0
    await page.route('**/api/track?op=lien-plus', route => {
      liens += 1
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ lien: 'https://app.revizapp.fr/api/abonnement?op=offrir&u=eleve&e=1&t=x' }) })
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
    // Dans l'offre, la demande au parent est un vrai bouton.
    const demander = offreRevizPlus.getByRole('button', { name: 'Demander à un parent de me l’offrir' })
    await demander.scrollIntoViewIfNeeded()
    await expect(demander).toHaveClass(/rpo-btn--second/)
    if (process.env.CAPTURES_DIR) await page.screenshot({ path: `${process.env.CAPTURES_DIR}/07-offre-bouton-parent-390.png`, animations: 'disabled' })
    await page.goto('/exercices?graine=42')
    await expect(limite).toBeVisible()

    await limite.getByRole('button', { name: 'Demander à un parent de me l’offrir' }).click()
    const champ = limite.getByLabel('L’adresse e-mail d’un parent')
    await expect(champ).toHaveValue('parent@famille.test') // l'adresse donnée pour l'accord
    // D'abord par message (partage du téléphone, ou copie sur ordinateur), l'e-mail en dessous.
    await expect(limite.getByRole('button', { name: /Lui envoyer par message|Copier le message à lui envoyer/ })).toBeVisible()
    await expect.poll(() => liens).toBe(1)
    await sansDebordement(page, 'demande au parent')
    if (process.env.CAPTURES_DIR) await page.screenshot({ path: `${process.env.CAPTURES_DIR}/08-demande-parent-390.png`, animations: 'disabled' })
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

  test('fin de l’essai : un écran sur l’accueil, une fois, puis l’offre', async ({ page }) => {
    await page.setViewportSize(TELEPHONE)
    await mockApiRoutes(page)
    await mockProgramme(page)
    const passe = Date.now() - 8 * 864e5
    await compteRapide(page, { prenom: 'Ethan', birthDate: '2011-03-01', profil: { essaiPlus: { debut: passe, fin: passe + 7 * 864e5 } } })
    const fin = page.getByRole('dialog', { name: 'Fin de Réviz+ offert' })
    await expect(fin.getByRole('heading', { name: 'Ta semaine de Réviz+ est finie' })).toBeVisible()
    await expect(fin).toContainText('3 séances d’exercices')
    await sansDebordement(page, 'fin d’essai')
    await page.waitForTimeout(2500) // la bulle de Réviz s'écrit lettre à lettre
    if (process.env.CAPTURES_DIR) await page.screenshot({ path: `${process.env.CAPTURES_DIR}/01-fin-essai-390.png`, animations: 'disabled' })
    await fin.getByRole('button', { name: 'Garder Réviz+' }).click()
    const offre = page.getByRole('dialog', { name: 'Réviz+' })
    await expect(offre.getByRole('heading', { name: 'Garde Réviz+' })).toBeVisible()
    await expect(offre).toContainText(/Pour Ethan · Brevet dans \d+ jours/i)
    await expect(offre.getByText('Sans publicité', { exact: true })).toBeVisible()
    // Sur téléphone, la feuille défile jusqu'au bouton de paiement (sinon il est hors de l'écran).
    const payer = offre.getByRole('button', { name: 'Passer à Réviz+' })
    await payer.scrollIntoViewIfNeeded()
    const boite = await payer.boundingBox()
    expect(boite.y + boite.height).toBeLessThanOrEqual(844)
    await sansDebordement(page, 'offre fin d’essai')
    if (process.env.CAPTURES_DIR) {
      await page.screenshot({ path: `${process.env.CAPTURES_DIR}/02-offre-haut-390.png`, animations: 'disabled' })
      // La feuille défile seule : on ouvre l'encart et on descend en bas de la feuille.
      await offre.evaluate(f => { const d = f.querySelector('details'); d.open = true; d.scrollIntoView({ block: 'end' }) })
      await page.screenshot({ path: `${process.env.CAPTURES_DIR}/03-offre-bas-390.png`, animations: 'disabled' })
    }
    // Une seule fois : au retour sur l'accueil, plus d'écran de fin.
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await expect(fin).toHaveCount(0)
  })
})

test.describe('Retour de Stripe sans payer', () => {
  test('réessayer ou envoyer le lien à un parent, rien ne part tout seul', async ({ page }) => {
    const demandes = []
    await page.setViewportSize(TELEPHONE)
    await mockApiRoutes(page)
    await mockProgramme(page)
    await page.route('**/api/track?op=lien-plus', route => {
      demandes.push(route.request().url())
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ lien: 'https://app.revizapp.fr/api/abonnement?op=offrir&u=x' }) })
    })
    await compteRapide(page, { birthDate: '2013-03-01', profil: {}, aller: '/programme' })
    await page.goto('/scan?revizplus=annule')
    const fenetre = page.getByRole('dialog', { name: 'Paiement pas terminé' })
    await expect(fenetre).toBeVisible()
    await expect(fenetre).toContainText('Rien n’a été prélevé.')
    await expect(page).toHaveURL(/\/scan$/)
    expect(demandes).toHaveLength(0)
    await expect(fenetre).toContainText('Rien n’a été prélevé.', { timeout: 5000 })
    await page.waitForTimeout(3500)
    await sansDebordement(page, 'paiement pas terminé')
    await page.screenshot({ path: test.info().outputPath('paiement-pas-termine.png'), animations: 'disabled' })
    await fenetre.getByRole('button', { name: 'Réessayer' }).click()
    await expect(page.getByRole('dialog', { name: 'Réviz+' })).toContainText('On réessaie')
  })
})
