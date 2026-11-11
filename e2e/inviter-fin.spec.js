// « Invite un ami » en fin de séance réussie (11/11) : le lien de parrainage en un geste, une fois
// tous les 3 jours ; la VRAIE route ?op=parrainage tourne sur les émulateurs (firebase-admin).
import { test, expect } from '@playwright/test'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { routeParrainage } from '../api/_parrainage.js'
import { mockApiRoutes, mockProgramme, compteRapide, ouvrirChapitreDuProgramme, jouerQuiz, chapitreThales, sansDebordement } from './helpers'

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099'
const admin = getApps().find(a => a.name === 'e2e-inviter-fin') ?? initializeApp({ projectId: 'demo-reviz' }, 'e2e-inviter-fin')

test('téléphone : quiz réussi → « Révise avec un ami de ta classe » → lien copié', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => { try { delete Navigator.prototype.share } catch { /* rien */ } })
  await mockApiRoutes(page)
  await mockProgramme(page)
  await page.route('**/api/track?op=parrainage', async route => {
    let statut = 200, corps = null
    const res = { status(c) { statut = c; return res }, json(b) { corps = b; return res } }
    await routeParrainage({ body: route.request().postDataJSON() }, res, { db: getFirestore(admin), auth: getAuth(admin) })
    return route.fulfill({ status: statut, contentType: 'application/json', body: JSON.stringify(corps) })
  })
  await compteRapide(page, { prenom: 'Léa', birthDate: '2011-05-01' })
  await page.goto('/programme?matiere=maths')
  await ouvrirChapitreDuProgramme(page)
  const quiz = chapitreThales().quiz
  await page.goto('/quiz?classique=1')
  await jouerQuiz(page, quiz)

  const carte = page.getByRole('region', { name: 'Révise avec un ami de ta classe' })
  await expect(carte).toBeVisible({ timeout: 10_000 })
  await carte.scrollIntoViewIfNeeded()
  await sansDebordement(page, 'invitation en fin de quiz')
  if (process.env.CAPTURES_DIR) { await page.waitForTimeout(1200); await page.screenshot({ path: `${process.env.CAPTURES_DIR}/10-inviter-fin-390.png`, animations: 'disabled' }) }
  await carte.getByRole('button', { name: 'Inviter un ami' }).click()
  await expect(carte.getByRole('status')).toHaveText('Lien copié : envoie-le à ton ami.')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/\?parrain=[A-Z2-9]{6}$/)

  // Une fois tous les 3 jours : le quiz suivant ne la repropose pas.
  await page.goto('/quiz?classique=1')
  await jouerQuiz(page, quiz)
  await expect(page.getByText(/Score enregistré/)).toBeVisible()
  await expect(page.getByRole('region', { name: 'Révise avec un ami de ta classe' })).toHaveCount(0)
})
