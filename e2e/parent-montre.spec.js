// « Montre ça à tes parents » : un moins de 15 ans qui n'a pas donné l'adresse
// d'un parent (« Plus tard ») réussit sa première séance d'exercices (le quiz jusqu'au 29/10) ; la fin lui
// propose d'envoyer son score à un parent, et ce mail porte aussi l'accord.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, compteRapide, sansDebordement } from './helpers'
import { SEANCE_ACCUEIL } from '../src/utils/seanceAccueil.js'
import { jouerSeance } from './exercices-aides'

const CAPTURES = process.env.CAPTURES_DIR
const plat = s => String(s).replace(/[\s  ]+/g, ' ').trim()

test.describe('Montre ça à tes parents', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('fin de la première séance réussie → score envoyé au parent avec la demande d’accord', async ({ page }) => {
    await mockApiRoutes(page)
    // Le corps de la requête, avant que le faux serveur de mockApiRoutes y réponde.
    const envois = []
    await page.route('**/api/send-parental-consent', route => { envois.push(route.request().postDataJSON()); return route.fallback() })

    await compteRapide(page, {
      classe: '6ème', birthDate: '2014-03-01', onboarde: false, aller: '/onboarding',
      // « Plus tard » : pas encore d'adresse de parent.
      consentement: { status: 'pending', createdAt: Date.now() },
    })
    await page.getByRole('button', { name: 'Suivant' }).click()
    await page.getByRole('button', { name: 'Suivant' }).click()
    await page.getByRole('button', { name: 'C’est parti' }).click()
    await expect(page).toHaveURL(/\/exercices\?premiere=1/, { timeout: 10_000 })
    // Tout juste, sur la séance d'accueil (3 exercices écrits à la main).
    await jouerSeance(page, SEANCE_ACCUEIL)

    const carte = page.locator('.qz-parent')
    await expect(carte.getByText('Montre ça à tes parents')).toBeVisible()
    await expect(carte.getByText(/Envoie ton 3\/3 à un parent/)).toBeVisible()
    await sansDebordement(page, 'fin de séance avec la carte parent')
    if (CAPTURES) await page.waitForTimeout(5000)
    if (CAPTURES) await carte.scrollIntoViewIfNeeded()
    if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/parent-1-carte-390.png` })

    await carte.getByLabel('Adresse e-mail d\'un parent').fill('maman@famille.test')
    await carte.getByRole('button', { name: 'Envoyer' }).click()
    await expect(carte.getByText('C\'est parti')).toBeVisible({ timeout: 10_000 })
    await expect(carte.getByText(/m•••@famille\.test/)).toBeVisible()
    if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/parent-2-envoye-390.png` })

    // Le lien à partager est préparé à l'affichage de la carte (op « lien ») ; ici l'élève tape l'adresse.
    const parMail = envois.filter(e => e.op !== 'lien')
    expect(parMail).toHaveLength(1)
    // La séance d'accueil n'a pas de chapitre : le mail donne le score seul.
    expect(parMail[0]).toMatchObject({ parentEmail: 'maman@famille.test', resultat: { score: 3, total: 3 } })
    expect(parMail[0].resultat.chapitre).toBeUndefined()

    // L'accueil ne réclame plus l'adresse : la demande est partie.
    await page.getByRole('button', { name: 'Choisir ma matière' }).click()
    await expect(page).toHaveURL(/\/programme/, { timeout: 10_000 })
    await page.goto('/')
    await expect(page.getByText('Montre tes révisions à un parent')).toHaveCount(0)
  })

  // 10/11 : sur 143 élèves qui ont vu cette carte, 11 ont tapé une adresse. La plupart ne la
  // connaissent pas : le score part aussi par message, avec le lien d'accord.
  test('sans l’adresse en tête : le score part par message, avec le lien d’accord', async ({ page }) => {
    await page.addInitScript(() => {
      window.__partages = []
      navigator.share = async donnees => { window.__partages.push(donnees) }
    })
    await mockApiRoutes(page)
    const envois = []
    await page.route('**/api/send-parental-consent', route => { envois.push(route.request().postDataJSON()); return route.fallback() })

    await compteRapide(page, {
      classe: '6ème', birthDate: '2014-03-01', onboarde: false, aller: '/onboarding',
      consentement: { status: 'pending', createdAt: Date.now() },
    })
    await page.getByRole('button', { name: 'Suivant' }).click()
    await page.getByRole('button', { name: 'Suivant' }).click()
    await page.getByRole('button', { name: 'C’est parti' }).click()
    await expect(page).toHaveURL(/\/exercices\?premiere=1/, { timeout: 10_000 })
    await jouerSeance(page, SEANCE_ACCUEIL)

    const carte = page.locator('.qz-parent')
    const lien = carte.getByRole('button', { name: /Tu ne connais pas son adresse \? Envoie-lui par message/ })
    await expect(lien).toBeVisible()
    await sansDebordement(page, 'fin de séance avec le lien parent')
    if (CAPTURES) await page.waitForTimeout(5000)
    if (CAPTURES) await carte.scrollIntoViewIfNeeded()
    if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/parent-3-lien-390.png` })
    await lien.click()
    await expect(carte.getByRole('status').filter({ hasText: 'Ton parent n’a plus qu’à ouvrir le lien' })).toBeVisible()
    if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/parent-4-lien-parti-390.png` })

    // Le serveur n'a reçu qu'une demande de lien (pas d'adresse), avec le score à montrer.
    expect(envois).toHaveLength(1)
    expect(envois[0]).toMatchObject({ op: 'lien', resultat: { score: 3, total: 3 } })
    expect(envois[0].parentEmail).toBeUndefined()
    const [partage] = await page.evaluate(() => window.__partages)
    expect(partage.text).toContain('3/3 à un quiz')
    expect(partage.url).toMatch(/approve-consent\?uid=[A-Za-z0-9]+&e=\d+&s=[0-9a-f]{32}&n=3&t=3$/)
  })
})
