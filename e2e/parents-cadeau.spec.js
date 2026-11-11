// /parents (11/11) : un parent offre Réviz+ sans compte, récupère le code de son enfant ; l'enfant
// ouvre le lien, crée son compte, et Réviz+ s'active. La VRAIE route ?op=cadeau (api/_cadeau.js)
// tourne dans le processus du test, sur les émulateurs ; Stripe est simulé (paiement réussi).
import { test, expect } from '@playwright/test'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { routeCadeau } from '../api/_cadeau.js'
import { mockApiRoutes, signup, passerDecouverte, fermerAnnonces, sansDebordement, lireProfilEmulateur } from './helpers'

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099'
process.env.CRON_SECRET ||= 'secret-e2e'
const admin = getApps().find(a => a.name === 'e2e-cadeau') ?? initializeApp({ projectId: 'demo-reviz' }, 'e2e-cadeau')

const CAPTURES = process.env.CAPTURES_DIR
async function capture(page, nom, options = {}) {
  await page.waitForTimeout(CAPTURES ? 1500 : 200)
  await page.screenshot({ path: CAPTURES ? `${CAPTURES}/${nom}.png` : test.info().outputPath(`${nom}.png`), animations: 'disabled', ...options })
}

const SESSION = `cs_test_e2e${Date.now()}abcdef`
const fauxStripe = {
  checkout: { sessions: { retrieve: async id => ({ id, status: 'complete', payment_status: 'paid', customer: 'cus_e2e', subscription: 'sub_e2e', metadata: { cadeau: '1', formule: 'annuel', fondateur: 'false' }, customer_details: { email: 'parent@famille.test' } }) } },
  subscriptions: { retrieve: async () => ({ status: 'active' }), update: async () => ({}) },
}
async function brancherCadeau(page, appels, session = SESSION) {
  await page.addInitScript(() => { try { delete Navigator.prototype.share } catch { /* rien */ } })
  await page.route('**/api/abonnement?op=cadeau', async route => {
    const corps = route.request().postDataJSON()
    appels?.push(corps)
    let statut = 200
    let reponse = null
    const res = { status(c) { statut = c; return res }, json(b) { reponse = b; return res } }
    // « Stripe » renvoie tout de suite sur la page de remerciement, comme après un paiement réussi.
    const creerSession = async () => `/parents/merci?session=${session}`
    await routeCadeau({ body: corps }, res, { db: getFirestore(admin), auth: getAuth(admin), stripe: fauxStripe, creerSession })
    return route.fulfill({ status: statut, contentType: 'application/json', body: JSON.stringify(reponse) })
  })
}

test('un parent offre Réviz+ sur /parents, son enfant l’active avec le lien', async ({ browser }) => {
  test.setTimeout(90_000)
  // Le parent, sur son téléphone, sans compte.
  const contexteParent = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const parent = await contexteParent.newPage()
  const appels = []
  await brancherCadeau(parent, appels)
  await parent.goto('/parents')
  await expect(parent.getByRole('heading', { level: 1, name: 'Offrez Réviz+ à votre enfant' })).toBeVisible({ timeout: 15_000 })
  await sansDebordement(parent, '/parents')
  await capture(parent, '01-parents-390', { fullPage: true })
  await parent.getByLabel('Votre adresse e-mail').fill('parent@famille.test')
  await parent.getByRole('radiogroup', { name: 'Votre formule' }).scrollIntoViewIfNeeded()
  await capture(parent, '01b-formule-390')
  await parent.getByRole('button', { name: 'Offrir Réviz+' }).click()
  await expect(parent).toHaveURL(/\/parents\/merci/, { timeout: 15_000 })
  const champ = parent.getByLabel('Le lien à envoyer à votre enfant')
  await expect(champ).toHaveValue(/\?cadeau=[A-HJKMNP-Z2-9]{8}$/, { timeout: 15_000 })
  expect(appels[0]).toEqual({ action: 'caisse', formule: 'annuel', email: 'parent@famille.test' })
  await sansDebordement(parent, '/parents/merci')
  await capture(parent, '02-merci-390', { fullPage: true })
  const lien = new URL(await champ.inputValue())
  const code = lien.searchParams.get('cadeau')
  await contexteParent.close()

  // L'enfant ouvre le lien sur son téléphone, puis crée son compte.
  const contexteEnfant = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const enfant = await contexteEnfant.newPage()
  await mockApiRoutes(enfant)
  const appelsEnfant = []
  await brancherCadeau(enfant, appelsEnfant)
  await enfant.goto(lien.pathname + lien.search)
  await expect(enfant.getByText('Un parent t’offre Réviz+')).toBeVisible({ timeout: 15_000 })
  await capture(enfant, '03-bienvenue-cadeau-390')
  // Le vrai tunnel d'inscription : le code part dès que le profil est enregistré, sans recharger.
  const email = await signup(enfant, { prenom: 'Tom', birthDate: '2011-02-01' })
  await expect(enfant).toHaveURL(/onboarding/, { timeout: 15_000 })
  await passerDecouverte(enfant)
  await fermerAnnonces(enfant)
  const bandeau = enfant.getByRole('status').filter({ hasText: 'Réviz+ est activé' })
  await expect(bandeau).toBeVisible({ timeout: 15_000 })
  await capture(enfant, '04-accueil-active-390')
  const uid = await enfant.evaluate(() => Object.keys(localStorage).find(k => k.startsWith('reviz-onboarded-'))?.slice('reviz-onboarded-'.length))
  expect(email).toBeTruthy()
  const profil = await lireProfilEmulateur(uid)
  expect(profil).toMatchObject({ plan: 'premium', stripeCustomerId: 'cus_e2e', stripeSubscriptionId: 'sub_e2e', payeur: 'parent' })
  const cadeau = await getFirestore(admin).collection('cadeaux').doc(code).get()
  expect(cadeau.data()).toMatchObject({ uid, sessionId: SESSION })
  expect(await enfant.evaluate(() => localStorage.getItem('reviz-cadeau'))).toBeNull()
  // Une seule activation, dans la même session que l'inscription.
  expect(appelsEnfant.filter(c => c.action === 'activer')).toHaveLength(1)
  await contexteEnfant.close()
})

test('moins de 15 ans : le code d’un parent vaut son accord, plus de demande à l’écran', async ({ browser }) => {
  test.setTimeout(90_000)
  const session = `cs_test_e2eaccord${Date.now()}x`
  const contexteParent = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const parent = await contexteParent.newPage()
  await brancherCadeau(parent, [], session)
  await parent.goto('/parents')
  await expect(parent.getByText('vous confirmez être son parent ou responsable légal', { exact: false })).toBeVisible({ timeout: 15_000 })
  await parent.getByLabel('Votre adresse e-mail').fill('parent@famille.test')
  await parent.getByRole('button', { name: 'Offrir Réviz+' }).click()
  const champ = parent.getByLabel('Le lien à envoyer à votre enfant')
  await expect(champ).toHaveValue(/\?cadeau=/, { timeout: 15_000 })
  const lien = new URL(await champ.inputValue())
  await contexteParent.close()

  const contexteEnfant = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const enfant = await contexteEnfant.newPage()
  await mockApiRoutes(enfant)
  await brancherCadeau(enfant, [], session)
  await enfant.goto(lien.pathname + lien.search)
  await expect(enfant.getByText('Un parent t’offre Réviz+')).toBeVisible({ timeout: 15_000 })
  await signup(enfant, { prenom: 'Inès', birthDate: '2014-03-01', parentEmail: 'maman@famille.test' })
  await expect(enfant).toHaveURL(/onboarding/, { timeout: 15_000 })
  await passerDecouverte(enfant)
  await fermerAnnonces(enfant)
  await expect(enfant.getByRole('status').filter({ hasText: 'Réviz+ est activé' })).toBeVisible({ timeout: 15_000 })
  const uid = await enfant.evaluate(() => Object.keys(localStorage).find(k => k.startsWith('reviz-onboarded-'))?.slice('reviz-onboarded-'.length))
  await expect.poll(async () => (await getFirestore(admin).doc(`users/${uid}/parentalConsent/consent`).get()).data()?.status, { timeout: 15_000 }).toBe('approved')
  const consent = (await getFirestore(admin).doc(`users/${uid}/parentalConsent/consent`).get()).data()
  expect(consent).toMatchObject({ via: 'paiement' })
  await expect(enfant.getByText('Accord parental en attente')).toHaveCount(0)
  await enfant.reload()
  await expect(enfant.getByText('Accord parental en attente')).toHaveCount(0)
  await capture(enfant, '05-accueil-moins-de-15-390')
  await contexteEnfant.close()
})
