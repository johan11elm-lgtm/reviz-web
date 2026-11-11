// Partager une conversation avec Réviz IA (11/11) : Léa crée le lien depuis Réviz IA ; un ami
// l'ouvre sans compte, lit la conversation et peut essayer Réviz. La VRAIE route ?op=partage
// (api/_partageChat.js) tourne sur les émulateurs (firebase-admin).
import { test, expect } from '@playwright/test'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { routePartage } from '../api/_partageChat.js'
import { mockApiRoutes, mockProgramme, compteRapide, ouvrirChapitreDuProgramme, sansDebordement } from './helpers'

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099'
const admin = getApps().find(a => a.name === 'e2e-partage') ?? initializeApp({ projectId: 'demo-reviz' }, 'e2e-partage')
const CAPTURES = process.env.CAPTURES_DIR

async function brancherPartage(page) {
  await page.route('**/api/track?op=partage*', async route => {
    const req = route.request()
    const url = new URL(req.url())
    let statut = 200, corps = null
    const res = { status(c) { statut = c; return res }, json(b) { corps = b; return res }, setHeader() {} }
    await routePartage({ method: req.method(), query: Object.fromEntries(url.searchParams), body: req.method() === 'POST' ? req.postDataJSON() : undefined }, res, { db: getFirestore(admin), auth: getAuth(admin) })
    return route.fulfill({ status: statut, contentType: 'application/json', body: JSON.stringify(corps) })
  })
}

test('Léa partage sa conversation, un ami la lit sans compte', async ({ page, browser }) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => { try { delete Navigator.prototype.share } catch { /* rien */ } })
  await mockApiRoutes(page)
  await mockProgramme(page)
  await brancherPartage(page)
  await page.route('**/api/chat', route => route.fulfill({
    status: 200, contentType: 'text/event-stream',
    body: [{ meta: { remaining: 9, limit: 10 } }, { text: 'Le théorème de Thalès relie des **longueurs proportionnelles**.\n- deux droites sécantes\n- deux droites parallèles' }]
      .map(e => `data: ${JSON.stringify(e)}\n\n`).join('') + 'data: [DONE]\n\n',
  }))
  await compteRapide(page, { prenom: 'Léa', birthDate: '2011-05-01' })
  await page.goto('/programme?matiere=maths')
  await ouvrirChapitreDuProgramme(page)
  await page.getByRole('link', { name: /Poser une question à Réviz IA/ }).click()
  await page.getByLabel(/Ta question|Demande à Réviz IA/).first().fill('C’est quoi le théorème de Thalès ?')
  await page.keyboard.press('Enter')
  await expect(page.getByText(/longueurs proportionnelles/)).toBeVisible({ timeout: 15_000 })

  await page.getByRole('button', { name: 'Partager cette conversation' }).click()
  const fenetre = page.getByRole('dialog', { name: 'Partager cette conversation' })
  await expect(fenetre).toContainText('sans ton prénom')
  await fenetre.getByRole('button', { name: 'Créer le lien' }).click()
  const champ = fenetre.getByLabel('Le lien de la conversation')
  await expect(champ).toHaveValue(/\/partage\/[a-z0-9]{12}$/, { timeout: 15_000 })
  await sansDebordement(page, 'partager la conversation')
  if (CAPTURES) { await page.waitForTimeout(1200); await page.screenshot({ path: `${CAPTURES}/12-partager-390.png`, animations: 'disabled' }) }
  const lien = new URL(await champ.inputValue())

  // Un ami ouvre le lien, sans compte.
  const contexte = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const ami = await contexte.newPage()
  await brancherPartage(ami)
  await ami.goto(lien.pathname)
  await expect(ami.getByText('C’est quoi le théorème de Thalès ?')).toBeVisible({ timeout: 15_000 })
  await expect(ami.locator('.pch-reponse-txt strong')).toHaveText('longueurs proportionnelles')
  await expect(ami.locator('.pch-reponse-txt li')).toHaveCount(2)
  await expect(ami.getByText('Léa')).toHaveCount(0)
  await expect(ami.getByRole('link', { name: 'Essayer Réviz gratuitement' })).toBeVisible()
  await sansDebordement(ami, 'conversation partagée')
  if (CAPTURES) { await ami.waitForTimeout(1200); await ami.screenshot({ path: `${CAPTURES}/13-partage-lu-390.png`, animations: 'disabled' }) }
  await contexte.close()
})
