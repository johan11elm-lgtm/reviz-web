// Battle : deux élèves, deux navigateurs, une partie complète en temps réel
// contre l'Emulator Suite (auth, firestore et base temps réel, projet demo-reviz).
//
// Deux parcours :
//  - deux comptes (Johan sur téléphone, Léa sur ordinateur) : salon, 5 rounds, fin, aura
//    rangée pour le vainqueur et « partie amicale » pour l'autre, revanche suivie ;
//  - un compte (ordinateur) contre un invité sans compte (téléphone) : l'invité donne son
//    prénom, joue en connexion anonyme, et on lui propose de créer un compte.
// Les comptes sont créés par compteRapide (API de l'émulateur), pas par l'interface.
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compteRapide, fermerAnnonceRevizPlus, lireProfilEmulateur, mockApiRoutes } from './helpers'

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

const TELEPHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const ORDINATEUR = { viewport: { width: 1280, height: 800 } }

// Bruit de console connu et sans conséquence. Tout le reste fait échouer le test.
//  - Sentry : le DSN du .env de développement est refusé par le SDK en local.
//  - Firestore « Could not reach Cloud Firestore backend » : le flux d'écoute est coupé net par une
//    navigation de la page (page.goto) ; le SDK le raconte en console.error, de façon intermittente.
const BRUIT_CONNU = [/Invalid Sentry Dsn/, /Could not reach Cloud Firestore backend/]

/** Ouvre un contexte + une page, câblés sur les faux appels IA / serveur et sur le chapitre de fixture. */
async function ouvrirPage(browser, contexte, erreurs, nom) {
  const page = await (await browser.newContext(contexte)).newPage()
  page.on('pageerror', e => erreurs.push(`[${nom}] pageerror : ${e.message}`))
  page.on('console', m => {
    if (m.type() !== 'error') return
    const t = m.text()
    if (BRUIT_CONNU.some(re => re.test(t))) return
    erreurs.push(`[${nom}] console.error : ${t} (${m.location().url})`)
  })
  await mockApiRoutes(page)
  // /api/track (statistiques) n'existe pas sous Vite : sans cette réponse, 404 dans la console.
  await page.route('**/api/track', route => route.fulfill({ status: 204 }))
  await page.route('**/programme/3eme/index.json', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(catalogue) }))
  await page.route('**/programme/3eme/maths/theoreme-de-thales.json', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(chapitre) }))
  return page
}

const capture = (page, nom) => page.screenshot({ path: test.info().outputPath(`${nom}.png`), animations: 'disabled' })

// L'affichage pose des espaces insécables (typographie française) : on compare sans.
const sansInsecables = t => t.replace(/ /g, ' ').replace(/⁠/g, '').trim()

async function repondre(page, juste) {
  const texte = sansInsecables(await page.locator('.bt-question-texte').textContent())
  const q = chapitre.quiz.find(x => x.question === texte)
  expect(q, `question inconnue : ${texte}`).toBeTruthy()
  const index = juste ? q.correct : (q.correct + 1) % q.choices.length
  const bouton = page.locator('.bt-choix-btn').nth(index)
  await bouton.scrollIntoViewIfNeeded()
  await bouton.click()
}

/** Depuis /battle : Maths, le chapitre de Thalès, « Créer le salon » → code du salon. */
async function creerSalon(hote) {
  await hote.goto('/battle')
  await hote.getByRole('button', { name: 'Maths', exact: true }).click()
  await hote.getByRole('button', { name: /Le théorème de Thalès/ }).click()
  await hote.getByRole('button', { name: 'Créer le salon' }).click()
  await expect(hote).toHaveURL(/\/battle\/[A-HJ-NP-Z2-9]{4}$/, { timeout: 15_000 })
  const code = hote.url().split('/').pop()
  await expect(hote.getByText('Code du salon')).toBeVisible()
  await expect(hote.getByText('En attente de ton adversaire…')).toBeVisible()
  await expect(hote.getByRole('button', { name: 'C’est parti' })).toBeDisabled()
  return code
}

/** Depuis /battle : taper le code (en minuscules, il est normalisé) et rejoindre. */
async function taperLeCode(page, code) {
  await page.goto('/battle')
  const champ = page.getByLabel('Code de la battle')
  await expect(champ).toBeVisible()
  await champ.fill(code.toLowerCase())
  await page.getByRole('button', { name: 'Rejoindre', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/battle/${code}$`))
}

/** 5 rounds : l'hôte répond juste, l'autre se trompe. Vérifie au passage le premier round en détail. */
async function jouerCinqRounds(hote, autre, { nomHote, nomAutre }) {
  await hote.getByRole('button', { name: 'C’est parti' }).click()
  await expect(autre.getByText('Prêts ?')).toBeVisible()
  for (let n = 1; n <= 5; n++) {
    await expect(hote.locator('.bt-question-texte')).toBeVisible({ timeout: 15_000 })
    await expect(autre.locator('.bt-question-texte')).toBeVisible({ timeout: 15_000 })
    if (n === 1) await capture(hote, '05-question-hote')
    await repondre(hote, true)
    if (n === 1) {
      await expect(autre.getByText(`${nomHote} a répondu`).first()).toBeVisible()
      await expect(hote.getByText(`En attente de ${nomAutre}…`).first()).toBeVisible()
    }
    await repondre(autre, false)
    await expect(hote.getByRole('heading', { name: 'Tu gagnes le round' })).toBeVisible()
    await expect(autre.getByRole('heading', { name: `${nomHote} gagne le round` })).toBeVisible()
    if (n === 1) {
      await expect(hote.getByText('+20 aura', { exact: true }).first()).toBeVisible()
      await expect(autre.getByText('−10 aura', { exact: true }).first()).toBeVisible()
      await capture(hote, '06-revelation-hote')
      await capture(autre, '07-revelation-autre')
    }
  }
}

test.describe('Battle', () => {
  test.setTimeout(240_000)

  test('la popup de lancement mène à la Battle, une seule fois', async ({ page }) => {
    const erreurs = []
    page.on('pageerror', e => erreurs.push(e.message))
    await mockApiRoutes(page)
    await compteRapide(page, { annoncesVues: false, aller: null })
    // Réviz+ passe en premier ; la Battle s'ouvre à la visite suivante de l'accueil.
    await fermerAnnonceRevizPlus(page)
    await page.goto('/')
    const annonce = page.getByRole('dialog', { name: 'La Battle' })
    await expect(annonce).toBeVisible()
    await expect(annonce.getByText('Nouveau')).toBeVisible()
    await annonce.getByRole('button', { name: 'Lancer une battle' }).click()
    await expect(page).toHaveURL(/\/battle$/)
    await expect(page.getByRole('heading', { name: 'Lancer une battle' })).toBeVisible()
    // Vue une fois : à la visite suivante de l'accueil, plus de popup, mais la carte Battle.
    await page.goto('/')
    await expect(page.getByRole('link', { name: /Battle/ }).first()).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'La Battle' })).toHaveCount(0)
    expect(erreurs).toEqual([])
  })

  test('deux comptes (téléphone et ordinateur) jouent une battle complète, puis la revanche', async ({ browser }) => {
    const erreurs = []
    const hote = await ouvrirPage(browser, TELEPHONE, erreurs, 'Johan')
    const autre = await ouvrirPage(browser, ORDINATEUR, erreurs, 'Léa')

    const johan = await compteRapide(hote, { prenom: 'Johan', birthDate: '1990-05-01', aller: null })
    const lea = await compteRapide(autre, { prenom: 'Léa', birthDate: '1990-05-01', aller: null })
    // Léa a déjà atteint la limite de parties comptées du jour : pour elle, « partie amicale ».
    await autre.route('**/api/battle-fin', async route => {
      const { idToken } = route.request().postDataJSON()
      const uid = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString()).user_id
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ compte: { [uid]: { delta: 0, comptee: false } } }) })
    })

    // ── Johan : l'accueil de la Battle (téléphone), puis le salon ──
    await hote.goto('/battle')
    await expect(hote.getByRole('heading', { name: 'Battle', level: 1 })).toBeVisible()
    await expect(hote.getByRole('heading', { name: 'Rejoindre une battle' })).toBeVisible()
    await expect(hote.getByRole('heading', { name: 'Les règles en bref' })).toBeVisible()
    await expect(hote.getByRole('button', { name: 'Créer le salon' })).toBeDisabled()
    await capture(hote, '01-accueil-battle-telephone')
    const code = await creerSalon(hote)
    await capture(hote, '02-salon-hote')

    // ── Léa : un code tapé en minuscules, l'invitation (prénom du compte, pas de champ) ──
    await taperLeCode(autre, code)
    await expect(autre.getByRole('heading', { name: `Johan t’invite au salon ${code}.` })).toBeVisible()
    await expect(autre.getByText('Tu joues sous le nom de')).toBeVisible()
    await expect(autre.getByLabel('Ton prénom')).toHaveCount(0)
    await capture(autre, '03-invitation-ordinateur')
    await autre.getByRole('button', { name: 'Entrer dans le salon' }).click()
    await expect(autre.getByText('Johan va lancer la partie.')).toBeVisible()
    await expect(hote.getByRole('button', { name: 'C’est parti' })).toBeEnabled()
    await expect(hote.getByText('Léa').first()).toBeVisible()
    await capture(autre, '04-salon-ordinateur')

    // ── 5 rounds : Johan répond juste, Léa se trompe ──
    await jouerCinqRounds(hote, autre, { nomHote: 'Johan', nomAutre: 'Léa' })

    // ── Fin : 5–0, aura de la partie, 6-7 du vainqueur ──
    await expect(hote.getByRole('heading', { name: 'Grosse victoire' })).toBeVisible({ timeout: 20_000 })
    await expect(autre.getByRole('heading', { name: 'GG' })).toBeVisible()
    await expect(hote.getByLabel(/Score : Johan 5, Léa 0/)).toHaveText(/5 – 0/)
    await expect(autre.getByLabel(/Score : Léa 0, Johan 5/)).toHaveText(/0 – 5/)
    await expect(hote.getByText('+130', { exact: true })).toBeVisible()
    await expect(autre.getByText('−50', { exact: true })).toBeVisible()
    await expect(hote.locator('.bt-fin .battle-67')).toHaveCount(1)
    // Aura rangée par le serveur pour Johan ; pour Léa, la limite du jour est atteinte.
    await expect(hote.getByText('Ton aura :')).toBeVisible()
    await expect(hote.getByText('Ton aura :')).toContainText('130')
    await expect(autre.getByText('Partie amicale.')).toBeVisible()
    await expect(autre.getByText('Crée ton compte pour garder')).toHaveCount(0)
    // La correction se déplie et se replie.
    const correction = hote.getByRole('button', { name: 'Voir la correction' })
    await correction.scrollIntoViewIfNeeded()
    await correction.click()
    await expect(hote.getByRole('button', { name: 'Masquer la correction' })).toBeVisible()
    await expect(hote.getByText(/Round 1 · Johan/)).toBeVisible()
    await hote.getByRole('button', { name: 'Masquer la correction' }).click()
    await capture(hote, '08-fin-hote')
    await capture(autre, '09-fin-autre')
    // Seul l'hôte relance ; l'autre voit pourquoi elle attend.
    await expect(autre.getByRole('button', { name: 'Rejouer' })).toHaveCount(0)
    await expect(autre.getByText('Si Johan relance, tu rejoins la revanche automatiquement.')).toBeVisible()

    // ── Revanche : Léa suit Johan dans le nouveau salon ──
    const rejouer = hote.getByRole('button', { name: 'Rejouer' })
    await rejouer.scrollIntoViewIfNeeded()
    await rejouer.click()
    await expect(hote).toHaveURL(/\/battle\/[A-HJ-NP-Z2-9]{4}$/)
    await expect.poll(() => hote.url()).not.toContain(code)
    const nouveau = hote.url().split('/').pop()
    await expect(autre).toHaveURL(new RegExp(`/battle/${nouveau}$`), { timeout: 15_000 })
    await expect(autre.getByText('Johan va lancer la partie.')).toBeVisible()
    await expect(hote.getByRole('button', { name: 'C’est parti' })).toBeEnabled()

    // ── L'aura de Johan est rangée sur son profil, et visible à l'accueil de la Battle ──
    const profil = await lireProfilEmulateur(johan.uid)
    expect(profil.aura).toBe(130)
    expect(profil.battles).toEqual({ jouees: 1, gagnees: 1 })
    expect((await lireProfilEmulateur(lea.uid)).aura).toBeUndefined()
    await hote.goto('/battle')
    await expect(hote.getByText('130 aura', { exact: true })).toBeVisible()
    await expect(hote.getByText('1 battle · 1 gagnée')).toBeVisible()
    await capture(hote, '10-accueil-battle-aura')

    expect(erreurs).toEqual([])
  })

  test('un compte (ordinateur) joue contre un invité sans compte (téléphone)', async ({ browser }) => {
    const erreurs = []
    const hote = await ouvrirPage(browser, ORDINATEUR, erreurs, 'Johan')
    const invite = await ouvrirPage(browser, TELEPHONE, erreurs, 'Invité')
    await compteRapide(hote, { prenom: 'Johan', birthDate: '1990-05-01', aller: null })

    const code = await creerSalon(hote)
    await capture(hote, '01-salon-hote-ordinateur')

    // ── Léa, sans compte : la page /battle sans barre d'onglets, puis le code ──
    await taperLeCode(invite, code)
    await expect(invite.locator('.bottom-nav')).toHaveCount(0)
    await expect(invite.getByRole('heading', { name: `Johan t’invite au salon ${code}.` })).toBeVisible()
    const entrer = invite.getByRole('button', { name: 'Entrer dans le salon' })
    await expect(entrer).toBeDisabled()
    await invite.getByLabel('Ton prénom').fill('Léa')
    await expect(invite.getByRole('link', { name: 'Me connecter' })).toBeVisible()
    await capture(invite, '02-invitation-invite')
    await entrer.click()
    await expect(invite.getByText('Johan va lancer la partie.')).toBeVisible()
    await expect(hote.getByRole('button', { name: 'C’est parti' })).toBeEnabled()

    await jouerCinqRounds(hote, invite, { nomHote: 'Johan', nomAutre: 'Léa' })

    // ── Fin : Johan garde son aura ; l'invitée est invitée à créer un compte ──
    await expect(hote.getByRole('heading', { name: 'Grosse victoire' })).toBeVisible({ timeout: 20_000 })
    await expect(invite.getByRole('heading', { name: 'GG' })).toBeVisible()
    await expect(hote.getByText('Ton aura :')).toContainText('130')
    await expect(invite.getByText('Crée ton compte pour garder ton aura')).toBeVisible()
    await expect(invite.getByRole('link', { name: 'Créer mon compte' })).toBeVisible()
    await capture(hote, '03-fin-hote-ordinateur')
    await capture(invite, '04-fin-invite-telephone')

    // ── Revanche suivie par l'invitée ──
    await hote.getByRole('button', { name: 'Rejouer' }).click()
    await expect.poll(() => hote.url()).not.toContain(code)
    const nouveau = hote.url().split('/').pop()
    await expect(invite).toHaveURL(new RegExp(`/battle/${nouveau}$`), { timeout: 15_000 })
    await expect(invite.getByText('Johan va lancer la partie.')).toBeVisible()

    expect(erreurs).toEqual([])
  })

  test('un code inconnu mène à « Partie introuvable »', async ({ page }) => {
    await mockApiRoutes(page)
    await page.goto('/battle/ZZZZ')
    await expect(page.getByRole('heading', { name: 'Partie introuvable' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Entrer un autre code' }).click()
    await expect(page).toHaveURL(/\/battle$/)
    await expect(page.getByLabel('Code de la battle')).toBeVisible()
  })
})
