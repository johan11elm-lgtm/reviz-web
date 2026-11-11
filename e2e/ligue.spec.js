// Ligues (11/11) : Léa a gagné des XP cette semaine ; dans « Moi », sa ligue Bronze, sa place dans
// son groupe (des pseudos, jamais de prénoms) et ce qu'il lui manque pour monter. La VRAIE route
// ?op=ligue (api/_ligues.js) tourne sur les émulateurs (firebase-admin).
import { test, expect } from '@playwright/test'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { routeLigue, pseudoLigue } from '../api/_ligues.js'
import { lundiDe } from '../src/utils/agenda.js'
import { jourParis } from '../src/utils/retour.js'
import { mockApiRoutes, compteRapide, sansDebordement, lireProfilEmulateur } from './helpers'

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099'
const admin = getApps().find(a => a.name === 'e2e-ligue') ?? initializeApp({ projectId: 'demo-reviz' }, 'e2e-ligue')
const CAPTURES = process.env.CAPTURES_DIR

test('Moi : la ligue de la semaine, la place et les pseudos', async ({ page }) => {
  test.setTimeout(60_000)
  const db = getFirestore(admin)
  const semaine = lundiDe(jourParis(Date.now()))
  // Un groupe Bronze tout neuf, propre à ce test, avec 8 élèves déjà classés.
  const ligue = db.collection('ligues').doc(semaine)
  const prefixe = `e2e${Date.now()}`
  const groupe = 'bronze-9000'
  for (let i = 0; i < 8; i++) {
    await ligue.collection('membres').doc(`${prefixe}-${i}`).set({ ligue: 'bronze', groupe, pseudo: pseudoLigue(`${prefixe}-${i}`), xp: 400 - i * 40, majLe: Date.now() })
  }
  await ligue.collection('groupes').doc('bronze-compteur').set({ n: 9000, membres: 8 })

  await page.setViewportSize({ width: 390, height: 844 })
  await mockApiRoutes(page)
  await page.route('**/api/track?op=ligue', async route => {
    let statut = 200, corps = null
    const res = { status(c) { statut = c; return res }, json(b) { corps = b; return res } }
    await routeLigue({ body: route.request().postDataJSON() }, res, { db, auth: getAuth(admin) })
    return route.fulfill({ status: statut, contentType: 'application/json', body: JSON.stringify(corps) })
  })
  const lea = await compteRapide(page, { prenom: 'Léa', birthDate: '2011-05-01', aller: null })
  await page.evaluate(uid => {
    const t = Date.now() - 3_600_000
    localStorage.setItem(`reviz-revisions-${uid}`, JSON.stringify([{ id: String(t), type: 'exercices', lessonId: null, revisedAt: t, termineAt: t, score: 9, total: 10, xp: 250 }]))
  }, lea.uid)
  await page.goto('/profil')

  const carte = page.getByRole('region', { name: 'Ligue Bronze' })
  await expect(carte).toBeVisible({ timeout: 15_000 })
  // 250 XP : derrière 400, 360, 320, 280 → 5e sur 9 ; sur 9 élèves, les 3 premiers montent.
  await expect(carte).toContainText(/5e sur 9/)
  await expect(carte).toContainText(/Plus que 2\splaces avant la zone de montée/)
  await expect(carte).toContainText(/Les 3 premiers montent dimanche soir/)
  const moi = carte.locator('.lg-ligne.is-moi')
  await expect(moi).toContainText(`Toi · ${pseudoLigue(lea.uid)}`)
  await expect(moi).toContainText('250 XP')
  await expect(carte).not.toContainText('Léa')
  await carte.scrollIntoViewIfNeeded()
  await sansDebordement(page, 'carte ligue')
  if (CAPTURES) { await page.waitForTimeout(1200); await page.screenshot({ path: `${CAPTURES}/11-ligue-390.png`, animations: 'disabled' }) }

  // « Ne plus apparaître » : la carte disparaît, et le serveur ne la montre plus.
  await carte.getByRole('button', { name: 'Ne plus apparaître dans les ligues' }).click()
  await expect(carte).toHaveCount(0)
  await expect.poll(async () => (await lireProfilEmulateur(lea.uid))?.ligueMasquee).toBe(true)
})
