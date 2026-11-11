// Parrainage (11/11) : Léa invite un ami depuis « Moi » ; Tom ouvre son lien, voit le cadeau sur
// l'accueil de l'app, crée son compte ; le serveur offre 3 jours de Réviz+ aux deux, et chacun
// l'apprend par un bandeau sur l'accueil.
// La route ?op=parrainage n'existe pas sous Vite : on fait tourner la VRAIE (api/_parrainage.js)
// dans le processus du test, avec firebase-admin branché sur les émulateurs.
import { test, expect } from '@playwright/test'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { routeParrainage, PARRAINAGE_MS } from '../api/_parrainage.js'
import { mockApiRoutes, compteRapide, signup, passerDecouverte, fermerAnnonces, sansDebordement, lireProfilEmulateur } from './helpers'

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099'
const admin = getApps().find(a => a.name === 'e2e-parrainage') ?? initializeApp({ projectId: 'demo-reviz' }, 'e2e-parrainage')

const CAPTURES = process.env.CAPTURES_DIR
async function capture(page, nom, options = {}) {
  await page.waitForTimeout(CAPTURES ? 1500 : 200)
  await page.screenshot({ path: CAPTURES ? `${CAPTURES}/${nom}.png` : test.info().outputPath(`${nom}.png`), animations: 'disabled', ...options })
}

async function brancherParrainage(page) {
  // Le partage natif ouvrirait une fenêtre du système : on garde le lien affiché.
  await page.addInitScript(() => { try { delete Navigator.prototype.share } catch { /* rien */ } })
  await page.route('**/api/track?op=parrainage', async route => {
    let statut = 200
    let corps = null
    const res = { status(c) { statut = c; return res }, json(b) { corps = b; return res } }
    await routeParrainage({ body: route.request().postDataJSON() }, res, { db: getFirestore(admin), auth: getAuth(admin) })
    return route.fulfill({ status: statut, contentType: 'application/json', body: JSON.stringify(corps) })
  })
}

test.describe('Parrainage', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('Léa invite Tom : 3 jours de Réviz+ pour les deux, annoncés sur l’accueil', async ({ page, browser }) => {
    test.setTimeout(90_000)
    await mockApiRoutes(page)
    await brancherParrainage(page)
    const lea = await compteRapide(page, { prenom: 'Léa', birthDate: '2011-05-01', aller: '/profil' })

    // « Moi » : la carte d'invitation, puis le lien.
    const carte = page.locator('.ia')
    await expect(carte.getByText('Invite un ami de ta classe')).toBeVisible({ timeout: 15_000 })
    await carte.scrollIntoViewIfNeeded()
    await capture(page, '01-carte-invitation-390')
    await carte.getByRole('button', { name: 'Inviter un ami' }).click()
    const champ = carte.getByLabel('Ton lien d’invitation')
    await expect(champ).toHaveValue(/\/\?parrain=[A-Z2-9]{6}$/, { timeout: 15_000 })
    const lien = await champ.inputValue()
    const code = lien.split('=').pop()
    await expect(carte).toContainText(`Ton code : ${code}`.replace(' :', ' :'))
    await sansDebordement(page, 'carte d’invitation')
    await capture(page, '02-lien-390')

    // Tom ouvre le lien sur son téléphone (autre navigateur, rien en mémoire).
    const contexte = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const tom = await contexte.newPage()
    await mockApiRoutes(tom)
    await brancherParrainage(tom)
    await tom.goto(new URL(lien).pathname + new URL(lien).search)
    await expect(tom.getByText('Invité par un ami')).toBeVisible({ timeout: 15_000 })
    await capture(tom, '03-bienvenue-invite-390')

    // Il crée son compte : le code gardé depuis le lien part au serveur dès que le profil existe.
    // Le vrai tunnel d'inscription : le code part dès que le profil est enregistré, sans recharger.
    await signup(tom, { prenom: 'Tom', birthDate: '2011-02-01' })
    await expect(tom).toHaveURL(/onboarding/, { timeout: 15_000 })
    await passerDecouverte(tom)
    await fermerAnnonces(tom)
    const uidTom = await tom.evaluate(() => Object.keys(localStorage).find(k => k.startsWith('reviz-onboarded-'))?.slice('reviz-onboarded-'.length))
    const bandeauTom = tom.getByRole('status').filter({ hasText: 'Code de ton ami accepté' })
    await expect(bandeauTom).toBeVisible({ timeout: 15_000 })
    await expect(bandeauTom).toContainText('Réviz+ offert jusqu’au')
    await capture(tom, '04-accueil-tom-390')
    const profilTom = await lireProfilEmulateur(uidTom)
    const finTom = Number(profilTom.essaiPlus.parrainage.fin)
    expect(finTom).toBeGreaterThan(Date.now() + PARRAINAGE_MS - 60_000)
    expect(await tom.evaluate(() => localStorage.getItem('reviz-parrain'))).toBeNull()
    // Annoncé une fois seulement.
    await bandeauTom.getByRole('button', { name: 'Super' }).click()
    await tom.reload()
    await expect(tom.getByText('Code de ton ami accepté')).toHaveCount(0)
    await contexte.close()

    // Léa rouvre l'app : un bandeau, et le bilan sur « Moi ».
    const profilLea = await lireProfilEmulateur(lea.uid)
    expect(Number(profilLea.essaiPlus.parrainage.filleuls)).toBe(1)
    await page.goto('/')
    const bandeauLea = page.getByRole('status').filter({ hasText: 'Un ami a rejoint Réviz avec ton lien' })
    await expect(bandeauLea).toBeVisible({ timeout: 15_000 })
    await capture(page, '05-accueil-lea-390')
    await page.goto('/profil')
    await expect(carte.getByText('1 ami inscrit avec ton lien')).toBeVisible({ timeout: 15_000 })
    await expect(carte).toContainText('Réviz+ offert jusqu’à')
    await carte.scrollIntoViewIfNeeded()
    await capture(page, '06-bilan-lea-390')

    // Sur ordinateur : la carte vient dans la colonne de droite de « Moi ».
    await page.setViewportSize({ width: 1280, height: 860 })
    await page.goto('/profil')
    await expect(carte.getByText('1 ami inscrit avec ton lien')).toBeVisible({ timeout: 15_000 })
    await sansDebordement(page, 'Moi sur ordinateur')
    await capture(page, '07-moi-1280', { fullPage: true })
  })
})
