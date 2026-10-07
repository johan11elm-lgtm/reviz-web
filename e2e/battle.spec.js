// Battle : deux élèves, deux navigateurs, une partie complète en temps réel
// contre l'Emulator Suite (auth, firestore et base temps réel, projet demo-reviz).
// Johan a un compte : popup de lancement → chapitre → salon. Léa n'en a pas :
// elle ouvre le lien, donne son prénom et joue en invitée (connexion anonyme).
// 5 rounds → fin (6-7 du gagnant, aura rangée ou non) → revanche suivie.
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mockApiRoutes, signup, verifyEmailAndOnboard } from './helpers'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixture = name => JSON.parse(readFileSync(path.join(here, 'fixtures/programme', name), 'utf8'))

// Le chapitre de Thalès de la fixture, porté à 7 questions (une battle en demande 6).
const chapitre = fixture('thales.json')
chapitre.quiz = [
  ...chapitre.quiz,
  { question: 'Dans la configuration de Thalès, les droites (BC) et (MN) sont…', choices: ['Sécantes', 'Parallèles', 'Perpendiculaires', 'Confondues'], correct: 1, explanation: 'Le théorème s’applique quand (MN) est parallèle à (BC).' },
  { question: 'Si AM/AB = 1/2, le triangle AMN est…', choices: ['Un agrandissement', 'Une réduction de rapport 1/2', 'Isométrique', 'Rectangle'], correct: 1, explanation: 'Un rapport inférieur à 1 donne une réduction.' },
]
const catalogue = fixture('index.json')
catalogue.matieres[0].chapitres[0].quiz = chapitre.quiz.length

async function preparer(page) {
  await mockApiRoutes(page)
  await page.route('**/programme/3eme/index.json', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(catalogue) }))
  await page.route('**/programme/3eme/maths/theoreme-de-thales.json', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(chapitre) }))
}

// BATTLE_MOBILE=1 : la même partie sur deux téléphones (390 px), pour les captures.
const CONTEXTE = process.env.BATTLE_MOBILE
  ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  : {}

// L'affichage pose des espaces insécables (typographie française) : on compare sans.
const sansInsecables = t => t.replace(/\u00a0/g, ' ').trim()
async function repondre(page, juste) {
  const texte = sansInsecables(await page.locator('.battle-question-texte').textContent())
  const q = chapitre.quiz.find(x => x.question === texte)
  const index = juste ? q.correct : (q.correct + 1) % q.choices.length
  await page.locator('.battle-choix-btn').nth(index).click()
}

test('deux élèves jouent une battle complète, puis la revanche', async ({ browser }) => {
  test.setTimeout(240_000)
  const hote = await (await browser.newContext(CONTEXTE)).newPage()
  const invite = await (await browser.newContext(CONTEXTE)).newPage()
  await preparer(hote)
  await preparer(invite)
  const capture = (page, nom) => page.screenshot({ path: test.info().outputPath(`${nom}.png`), animations: 'disabled' })

  // ── Johan : compte, puis la popup de lancement, une seule fois ──
  const emailJohan = await signup(hote, { birthDate: '1990-05-01', prenom: 'Johan' })
  await verifyEmailAndOnboard(hote, emailJohan, { garderAnnonce: true })
  const annonce = hote.getByRole('dialog', { name: 'La Battle' })
  await expect(annonce).toBeVisible()
  await expect(annonce.getByText('Nouveau')).toBeVisible()
  await capture(hote, '01-annonce')
  await annonce.getByRole('button', { name: 'Lancer une battle' }).click()
  await expect(hote).toHaveURL(/\/battle$/)
  await hote.goto('/')
  await expect(hote.getByRole('link', { name: /Battle/ })).toBeVisible()
  await expect(hote.getByRole('dialog', { name: 'La Battle' })).toHaveCount(0)

  // ── Johan lance une battle depuis le chapitre ──
  await hote.goto('/programme/maths')
  await hote.getByRole('button', { name: /Le théorème de Thalès/ }).click()
  await expect(hote.getByRole('button', { name: 'Lancer une battle' })).toBeVisible()
  await capture(hote, '01b-chapitre')
  await hote.getByRole('button', { name: 'Lancer une battle' }).click()
  await expect(hote).toHaveURL(/\/battle\/[A-HJ-NP-Z2-9]{4}$/, { timeout: 15_000 })
  const code = hote.url().split('/').pop()
  await expect(hote.getByText('Code de la partie')).toBeVisible()
  await expect(hote.getByRole('button', { name: 'En attente de ton adversaire…' })).toBeDisabled()

  // ── Léa, sans compte : la page /battle, puis le code tapé en minuscules ──
  await invite.goto('/battle')
  await expect(invite.getByLabel('Rejoindre avec un code')).toBeVisible()
  await expect(invite.locator('.bottom-nav')).toHaveCount(0)
  await capture(invite, '02-rejoindre')
  await invite.getByLabel('Rejoindre avec un code').fill(code.toLowerCase())
  await invite.getByRole('button', { name: 'Rejoindre', exact: true }).click()
  await expect(invite).toHaveURL(new RegExp(`/battle/${code}$`))
  await expect(invite.getByRole('heading', { name: 'Johan te défie' })).toBeVisible()
  const rejoindre = invite.getByRole('button', { name: 'Rejoindre la battle' })
  await expect(rejoindre).toBeDisabled()
  await invite.getByLabel('Ton prénom').fill('Léa')
  await capture(invite, '03-invitation')
  await rejoindre.click()
  await expect(invite.getByText('Johan va lancer la partie.')).toBeVisible()
  await expect(hote.getByRole('button', { name: "C'est parti" })).toBeEnabled()
  await capture(hote, '04-salon')

  // ── 5 rounds : Johan répond juste, Léa se trompe ──
  await hote.getByRole('button', { name: "C'est parti" }).click()
  await expect(invite.getByText('Round 1').first()).toBeVisible()
  for (let n = 1; n <= 5; n++) {
    await expect(hote.locator('.battle-question-texte')).toBeVisible({ timeout: 15_000 })
    await expect(invite.locator('.battle-question-texte')).toBeVisible({ timeout: 15_000 })
    if (n === 1) await capture(hote, '05-question')
    await repondre(hote, true)
    if (n === 1) {
      await expect(invite.getByText('Johan a répondu')).toBeVisible()
      await expect(hote.getByText('En attente de Léa…')).toBeVisible()
    }
    await repondre(invite, false)
    await expect(hote.getByRole('heading', { name: 'Tu gagnes le round' })).toBeVisible()
    await expect(invite.getByRole('heading', { name: 'Johan gagne le round' })).toBeVisible()
    if (n === 1) {
      await expect(hote.locator('.battle-revelation').getByText('+20 aura')).toBeVisible()
      await expect(invite.locator('.battle-revelation').getByText('−10 aura')).toBeVisible()
      await capture(hote, '06-revelation-hote')
      await capture(invite, '07-revelation-invite')
    }
  }

  // ── Fin : 5–0, aura de la partie, 6-7 de Johan ──
  await expect(hote.getByRole('heading', { name: 'Tu gagnes la battle' })).toBeVisible({ timeout: 20_000 })
  await expect(invite.getByRole('heading', { name: 'Johan gagne la battle' })).toBeVisible()
  await expect(hote.getByText('5 – 0')).toBeVisible()
  await expect(hote.locator('.battle-fin').getByText('+130 aura')).toBeVisible()
  await expect(invite.locator('.battle-fin').getByText('−50 aura')).toBeVisible()
  await expect(hote.locator('.battle-fin .battle-67')).toHaveCount(1)
  // Aura rangée par le serveur pour Johan ; Léa, invitée, est invitée à créer un compte.
  await expect(hote.getByText('Ton aura :')).toBeVisible()
  await expect(invite.getByText('Sans compte, ton aura n’est pas gardée.')).toBeVisible()
  await expect(invite.getByRole('link', { name: /Créer mon compte gratuit/ })).toBeVisible()
  await capture(hote, '08-fin-hote')
  await capture(invite, '09-fin-invite')

  // ── Revanche : Léa suit Johan dans le nouveau salon ──
  await hote.getByRole('button', { name: 'Revanche' }).click()
  await expect(hote).toHaveURL(/\/battle\/[A-HJ-NP-Z2-9]{4}$/)
  await expect.poll(() => hote.url()).not.toContain(code)
  const nouveau = hote.url().split('/').pop()
  await expect(invite).toHaveURL(new RegExp(`/battle/${nouveau}$`), { timeout: 15_000 })
  await expect(invite.getByText('Johan va lancer la partie.')).toBeVisible()
  await expect(hote.getByRole('button', { name: "C'est parti" })).toBeEnabled()
})
