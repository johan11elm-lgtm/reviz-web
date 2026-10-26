// Réviz Games : le hub, la carte de début, la partie du jour jouée jusqu'au bout (série, record,
// accueil, profil dans l'émulateur), la Partie rapide et l'écran de fin de démonstration.
// À 390×844 (téléphone) et à 1280×800 (ordinateur).
//
// Comment la partie avance : l'horloge de la page est pilotée par Playwright (page.clock.install,
// puis runFor par pas de 500 ms). Les manches durent 11 à 15 s et enchaînent consigne et
// transitions : on ne les attend pas. À chaque pas, un « joueur » agit :
//  - le tour de magie : de vraies réponses (les cartes sont rendues par paires dans le DOM,
//    carte 2k et carte 2k+1 forment une paire) → +100 par paire et le bonus de temps ;
//  - Réviz se trompe ? : la touche V à chaque affirmation (vrai ou faux au hasard du tirage) ;
//  - les autres jeux (lance, pizzeria, ninja, taupe) : le chrono s'écoule jusqu'au bout (score bas).
// Le score est donc > 0 (le tour de magie fait partie de toute partie du jour) mais pas figé :
// les specs lisent le score affiché à l'écran et le comparent à l'accueil, au hub et à l'émulateur.
// Le son est coupé (réglage reviz-jeux-son) : pas de musique de 290 Mo à décoder.
import { test, expect } from '@playwright/test'
import { compteRapide, fermerAnnonceRevizPlus, lireProfilEmulateur, mockApiRoutes } from './helpers'

const TELEPHONE = { nom: '390×844', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const ORDINATEUR = { nom: '1280×800', viewport: { width: 1280, height: 800 } }

// Bruit de console connu et sans conséquence. Tout le reste fait échouer le test.
//  - Sentry : le DSN du .env de développement est refusé par le SDK en local.
//  - Firestore « Could not reach Cloud Firestore backend » : un flux d'écoute coupé net par une
//    navigation, ou par un saut d'horloge (page.clock), est raconté en console.error par le SDK.
const BRUIT_CONNU = [/Invalid Sentry Dsn/, /Could not reach Cloud Firestore backend/]

/** Surveille la page : pageerror et console.error (hors bruit connu) vont dans `erreurs`. */
function surveiller(page, erreurs) {
  page.on('pageerror', e => erreurs.push(`pageerror : ${e.message}`))
  page.on('console', m => {
    if (m.type() !== 'error') return
    if (BRUIT_CONNU.some(re => re.test(m.text()))) return
    erreurs.push(`console.error : ${m.text()} (${m.location().url})`)
  })
}

/** Les routes serverless absentes de Vite : les statistiques (/api/track) répondent 204. */
async function preparer(page) {
  await mockApiRoutes(page)
  await page.route('**/api/track', route => route.fulfill({ status: 204 }))
}

// Le jour de Paris (AAAA-MM-JJ), comme jourParis() de l'app, et ses voisins.
const parisLe = t => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(t)
const aujourdhui = () => parisLe(Date.now())
const decaler = (jour, n) => new Date(Date.parse(`${jour}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10)

/** Un compte prêt, son coupé, tout sur la page de départ donnée. Renvoie le compte. */
async function ouvrirCompte(page, options = {}) {
  return compteRapide(page, { stockage: { 'reviz-jeux-son': '0' }, ...options })
}

/** Installe l'horloge pilotée AVANT d'ouvrir la page, puis charge `url` (les jeux lisent debut === 0 comme « pas commencé »). */
async function ouvrirAvecHorloge(page, url) {
  await page.clock.install()
  await page.goto(url)
  await page.clock.runFor(200)
}

// « 1 300 » (espaces fines ou insécables) → 1300.
const nombreDe = texte => Number(texte.replace(/\D/g, ''))

// ── Les actions du joueur, à chaque pas de l'horloge ────────────────────────────────────────

/** Tour de magie : retourne les paires (cartes 2k et 2k+1 du DOM) dès que les cartes se laissent retourner. */
async function jouerMagie(page) {
  await page.evaluate(() => {
    const cartes = [...document.querySelectorAll('.mg-cartes .mg-carte')]
    for (let k = 0; k + 1 < cartes.length; k += 2) {
      if (cartes[k].classList.contains('mg-carte--trouvee')) continue
      cartes[k].click()
      cartes[k + 1].click()
      return
    }
  })
}

/**
 * Joue la partie en cours jusqu'à l'écran de fin (le podium) : magie jouée pour de bon, buzzer à la
 * touche V, « Je suis prêt ! » touché sur chaque carte de transition, le reste laissé au chrono.
 * Renvoie le score affiché au podium.
 */
async function jouerPartie(page, { maxPas = 900 } = {}) {
  const fin = page.locator('.fp-fin')
  for (let pas = 0; pas < maxPas; pas++) {
    if (await fin.count()) break
    if (await page.locator('.mg-cartes').count()) await jouerMagie(page)
    if (await page.locator('.bz-page').count()) await page.keyboard.press('v')
    const pret = page.locator('.tj-pret')
    if (await pret.count()) await pret.first().dispatchEvent('click', undefined, { timeout: 1000 }).catch(() => {}) // la carte peut partir entre-temps
    await page.clock.runFor(500)
  }
  await expect(fin, 'la partie n’est pas arrivée à l’écran de fin').toBeVisible()
  // Le score défile pendant ~2 s, puis les étoiles tombent.
  await page.clock.runFor(4000)
  const texte = await page.locator('.fp-sr').filter({ hasText: /^Score/ }).textContent()
  return nombreDe(texte)
}

/** Depuis le hub : toucher la partie du jour, « Démarrer », puis jouer jusqu'au podium. Renvoie le score. */
async function jouerLaPartieDuJour(page) {
  await page.getByRole('button', { name: /^(Jouer|Rejouer)/ }).first().click()
  const carte = page.getByRole('dialog', { name: 'La partie du jour' })
  await expect(carte).toBeVisible()
  await carte.getByRole('button', { name: /Démarrer/ }).click()
  await page.clock.runFor(100)
  return jouerPartie(page)
}

/** Podium → « Quitter » → le hub (le titre « On joue ? » est de retour). */
async function revenirAuHub(page) {
  await page.locator('button.fp-btn', { hasText: 'Quitter' }).click()
  await expect(page.getByRole('heading', { name: /On joue/ })).toBeVisible()
}

// ── Lecture du hub ──────────────────────────────────────────────────────────────────────────

const pastilleSerie = page => page.locator('.hb-pastille[aria-label^="Série"], .hb-pastille[aria-label^="Pas encore"]')
const pastilleRecord = page => page.locator('.hb-pastille[aria-label^="Record"]')

for (const profil of [TELEPHONE, ORDINATEUR]) {
  test.describe(`Réviz Games à ${profil.nom}`, () => {
    test.use({ viewport: profil.viewport, deviceScaleFactor: profil.deviceScaleFactor, isMobile: profil.isMobile, hasTouch: profil.hasTouch })
    test.setTimeout(240_000)

    test('le hub : partie du jour, Partie rapide, six jeux, la croix', async ({ page }) => {
      const erreurs = []
      surveiller(page, erreurs)
      await preparer(page)
      await ouvrirCompte(page)

      // Depuis l'accueil : la carte « La partie du jour » mène au hub, la croix revient à l'accueil.
      const carte = page.getByRole('link', { name: /La partie du jour/ })
      await expect(carte).toBeVisible()
      await expect(carte).toContainText('6 mini-jeux de 15 secondes')
      await carte.scrollIntoViewIfNeeded()
      await carte.click()
      await expect(page).toHaveURL(/\/jeux/)
      await expect(page.getByRole('heading', { name: /On joue/ })).toBeVisible()

      await expect(page.getByRole('heading', { name: 'La partie du jour' })).toBeVisible()
      await expect(page.getByText('Les 6 jeux, la même partie pour tout le monde aujourd’hui.')).toBeVisible()
      await expect(page.getByRole('button', { name: /^Jouer/ }).first()).toBeVisible()
      // Compte neuf : pas de série, pas de record.
      await expect(pastilleSerie(page)).toHaveText('Lance ta série')
      await expect(pastilleRecord(page)).toHaveCount(0)

      await expect(page.getByRole('button', { name: /Partie rapide/ })).toBeVisible()
      // Le son se remet et se coupe en haut à droite, dès l'écran des jeux (coupé au départ des tests).
      const son = page.locator('.hb-haut').getByRole('button', { name: /le son$/ })
      await expect(son).toHaveAccessibleName('Remettre le son')
      await son.click()
      await expect(son).toHaveAccessibleName('Couper le son')
      await expect(son).toHaveAttribute('aria-pressed', 'false')
      await son.click()
      await expect(son).toHaveAccessibleName('Remettre le son')
      await expect(page.getByRole('heading', { name: 'Les jeux' })).toBeVisible()
      for (const nom of ['Le tour de magie', 'Réviz lance', 'Réviz se trompe ?', 'La pizzeria !', 'Le ninja des fautes', 'Tape-taupe !']) {
        await expect(page.locator('.hb-jeu').filter({ hasText: nom })).toBeVisible()
      }
      await expect(page.locator('.hb-jeu')).toHaveCount(6)
      await page.screenshot({ path: test.info().outputPath('hub.png'), animations: 'disabled' })

      // La croix : on revient d'où l'on vient (l'accueil).
      await page.getByRole('button', { name: 'Fermer' }).click()
      await expect(page).toHaveURL(/\/$/)

      // Lien direct : rien avant dans l'app, la croix mène à l'accueil.
      await page.goto('/jeux')
      await page.getByRole('button', { name: 'Fermer' }).click()
      await expect(page).toHaveURL(/\/$/)

      expect(erreurs).toEqual([])
    })

    test('la carte de début : règle, tours, record, Démarrer, Retour', async ({ page }) => {
      const erreurs = []
      surveiller(page, erreurs)
      await preparer(page)
      const jour = aujourdhui()
      await ouvrirCompte(page, { aller: '/jeux', profil: { jeux: { jours: [decaler(jour, -1)], record: 1240, scores: { [decaler(jour, -1)]: 1240 } } } })
      await expect(pastilleRecord(page)).toBeVisible() // le record du compte, repris au démarrage

      // La partie du jour.
      await page.getByRole('button', { name: /^Jouer/ }).first().click()
      const carte = page.getByRole('dialog', { name: 'La partie du jour' })
      await expect(carte).toBeVisible()
      await expect(carte.getByText('Défi du jour')).toBeVisible()
      await expect(carte.locator('.cd-haut').getByRole('button', { name: /le son$/ })).toBeVisible()
      await expect(carte.getByText('La même partie pour tout le monde aujourd’hui.')).toBeVisible()
      await expect(carte.getByText(/6\stours\sde\s\d+\ss/)).toBeVisible()
      await expect(carte.getByText(/Ton record/)).toContainText(/1\s240/)
      await expect(carte.getByRole('button', { name: /Démarrer/ })).toBeVisible()
      await page.screenshot({ path: test.info().outputPath('carte-jour.png'), animations: 'disabled' })

      // Retour (bouton), puis Échap : on retombe sur le hub.
      await carte.getByRole('button', { name: 'Retour aux jeux' }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await page.getByRole('button', { name: /^Jouer/ }).first().click()
      await expect(page.getByRole('dialog', { name: 'La partie du jour' })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)

      // Un jeu seul : sa règle en trois étapes, 3 tours.
      await page.locator('.hb-jeu').filter({ hasText: 'Réviz se trompe' }).click()
      const buzzer = page.getByRole('dialog', { name: 'Réviz se trompe ?' })
      await expect(buzzer).toBeVisible()
      await expect(buzzer.getByText('Vrai ? Buzzer vert. Faux ? Buzzer rouge.')).toBeVisible()
      await expect(buzzer.getByText(/3\stours\sde\s15\ss/)).toBeVisible()
      await buzzer.getByRole('button', { name: 'Retour aux jeux' }).click()

      // La Partie rapide annonce son premier jeu.
      await page.getByRole('button', { name: /Partie rapide/ }).click()
      const rapide = page.getByRole('dialog', { name: 'Partie rapide' })
      await expect(rapide).toBeVisible()
      await expect(rapide.getByText(/1er jeu/)).toBeVisible()
      await expect(rapide.getByText(/6\stours/)).toBeVisible()

      expect(erreurs).toEqual([])
    })

    test('la partie du jour jusqu’au bout : fin, récap, hub, accueil, profil, puis plus rejouable (Partie rapide)', async ({ page }) => {
      const erreurs = []
      surveiller(page, erreurs)
      await preparer(page)
      const { uid } = await ouvrirCompte(page, { aller: null })
      await ouvrirAvecHorloge(page, '/jeux')
      const jour = aujourdhui()

      await expect(pastilleSerie(page)).toHaveText('Lance ta série')
      const score = await jouerLaPartieDuJour(page)
      expect(score, 'le tour de magie joué doit rapporter des points').toBeGreaterThan(0)

      // Podium : titre, étoiles, score, meilleur = score (premier record), nombre de bonnes réponses.
      await expect(page.locator('.fp-titre')).toHaveText(/Sans faute|Bravo|Bien joué|Bel effort/)
      expect(nombreDe(await page.locator('.fp-meilleur').textContent())).toBe(score)
      await expect(page.getByText(/bonnes? réponses? sur/)).toBeVisible()
      // Une seule partie du jour : la fin propose une Partie rapide, pas de la rejouer.
      await expect(page.locator('button.fp-btn', { hasText: 'Partie rapide' })).toBeVisible()
      await expect(page.locator('.fp-haut').getByRole('button', { name: /le son$/ })).toBeVisible()
      await expect(page.locator('button.fp-btn', { hasText: 'Rejouer' })).toHaveCount(0)
      await page.screenshot({ path: test.info().outputPath('fin.png'), animations: 'disabled' })

      // Le récap (s'il y a des erreurs : toute partie jouée au chrono en a).
      const recap = page.getByRole('button', { name: /^Voir le récap/ })
      await expect(recap).toBeVisible()
      await recap.click()
      await expect(page.getByRole('heading', { name: 'Le récap' })).toBeVisible()
      await expect(page.getByText(/^Erreur\s*1 \/ \d+/)).toBeVisible()
      await page.getByRole('button', { name: 'Erreur suivante' }).click()
      await page.clock.runFor(800)
      await expect(page.getByText(/^Erreur\s*2 \/ \d+/)).toBeVisible()
      await page.screenshot({ path: test.info().outputPath('recap.png'), animations: 'disabled' })
      await page.getByRole('button', { name: 'Retour au score' }).click()
      await expect(page.locator('.fp-fin')).toBeVisible()

      // Retour au hub : partie faite, série 1, record = score.
      await revenirAuHub(page)
      expect(nombreDe(await page.locator('.hb-jour-sous').textContent())).toBe(score)
      await expect(pastilleSerie(page)).toHaveText('1 jour de suite')
      expect(nombreDe(await pastilleRecord(page).getAttribute('aria-label'))).toBe(score)
      await expect(page.locator('.hb-jour').getByRole('button', { name: /^Partie rapide/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /^Rejouer/ })).toHaveCount(0)

      // Dans l'émulateur : le jour de Paris et le record, écrits de façon asynchrone.
      await expect.poll(async () => (await lireProfilEmulateur(uid))?.jeux?.jours ?? [], { timeout: 15_000 }).toEqual([jour])
      await expect.poll(async () => (await lireProfilEmulateur(uid))?.jeux?.record, { timeout: 15_000 }).toBe(score)
      expect((await lireProfilEmulateur(uid)).jeux.scores[jour]).toBe(score)

      // L'accueil : « Faite ! ».
      await page.getByRole('button', { name: 'Fermer' }).click()
      await expect(page).toHaveURL(/\/$/)
      const carte = page.getByRole('link', { name: /La partie du jour/ })
      await expect(carte).toContainText('Faite !')
      expect(nombreDe((await carte.locator('.hm-jeux-sous').textContent()).match(/Faite\s*!\s*([\d\s\u00a0\u202f]+) points/)[1])).toBe(score)
      await expect(carte.getByText('Voir les jeux')).toBeVisible()

      // Plus rejouable le même jour : le bouton de la partie du jour ouvre une Partie rapide (le lien
      // direct ?rapide=jour aussi : test unitaire de la page). Série, score du jour et record ne bougent pas.
      await page.getByRole('link', { name: /La partie du jour/ }).click()
      await expect(page.getByRole('heading', { name: /On joue/ })).toBeVisible()
      await page.locator('.hb-jour').getByRole('button', { name: /^Partie rapide/ }).click()
      await expect(page.getByRole('dialog', { name: 'Partie rapide' })).toBeVisible()
      await expect(page.getByRole('dialog', { name: 'La partie du jour' })).toHaveCount(0)
      await page.goto('/jeux')
      await expect(pastilleSerie(page)).toHaveText('1 jour de suite')
      expect(nombreDe(await pastilleRecord(page).getAttribute('aria-label'))).toBe(score)
      const profil2 = await lireProfilEmulateur(uid)
      expect(profil2.jeux.jours).toEqual([jour])
      expect(profil2.jeux.scores[jour]).toBe(score)

      expect(erreurs).toEqual([])
    })

    test('la partie du jour arrêtée à la croix compte quand même : plus rejouable, série lancée', async ({ page }) => {
      await preparer(page)
      await ouvrirCompte(page, { aller: null })
      await ouvrirAvecHorloge(page, '/jeux')
      await page.getByRole('button', { name: /^Jouer/ }).first().click()
      await page.getByRole('dialog', { name: 'La partie du jour' }).getByRole('button', { name: /Démarrer/ }).click()
      await page.clock.runFor(100)
      await page.getByRole('button', { name: 'Fermer' }).first().click()
      await expect(page.getByRole('heading', { name: /On joue/ })).toBeVisible()
      await expect(pastilleSerie(page)).toHaveText('1 jour de suite')
      await expect(page.locator('.hb-jour').getByRole('button', { name: /^Partie rapide/ })).toBeVisible()
    })

    test('une série en cours : 2 jours repris du compte, 3 jours après la partie du jour', async ({ page }) => {
      const erreurs = []
      surveiller(page, erreurs)
      await preparer(page)
      const jour = aujourdhui()
      const hier = decaler(jour, -1)
      const avantHier = decaler(jour, -2)
      const { uid } = await ouvrirCompte(page, {
        aller: null,
        profil: { jeux: { jours: [avantHier, hier], record: 500, scores: { [avantHier]: 300, [hier]: 500 } } },
      })
      await ouvrirAvecHorloge(page, '/jeux')

      // La synchro depuis le compte : série de 2 jours, record 500, partie du jour pas encore faite.
      await expect(pastilleSerie(page)).toHaveText('2 jours de suite')
      expect(nombreDe(await pastilleRecord(page).getAttribute('aria-label'))).toBe(500)
      await expect(page.getByRole('button', { name: /^Jouer/ }).first()).toBeVisible()

      const score = await jouerLaPartieDuJour(page)
      await revenirAuHub(page)
      await expect(pastilleSerie(page)).toHaveText('3 jours de suite')
      const record = Math.max(500, score)
      expect(nombreDe(await pastilleRecord(page).getAttribute('aria-label'))).toBe(record)

      await expect.poll(async () => (await lireProfilEmulateur(uid))?.jeux?.jours?.length, { timeout: 15_000 }).toBe(3)
      const jeux = (await lireProfilEmulateur(uid)).jeux
      expect([...jeux.jours].sort()).toEqual([avantHier, hier, jour])
      await expect.poll(async () => (await lireProfilEmulateur(uid))?.jeux?.record, { timeout: 15_000 }).toBe(record)

      expect(erreurs).toEqual([])
    })

    test('la Partie rapide jusqu’au bout ne touche ni la série ni le record du jour', async ({ page }) => {
      const erreurs = []
      surveiller(page, erreurs)
      await preparer(page)
      const { uid } = await ouvrirCompte(page, { aller: null })
      await ouvrirAvecHorloge(page, '/jeux?rapide=melange')

      // Lancée par le lien : pas de carte de début, la première manche démarre.
      const score = await jouerPartie(page)
      expect(score).toBeGreaterThanOrEqual(0)
      await expect(page.locator('.fp-surtitre')).toContainText(/Partie rapide\s·\s6\stours/)
      await revenirAuHub(page)
      await expect(pastilleSerie(page)).toHaveText('Lance ta série')
      await expect(pastilleRecord(page)).toHaveCount(0)
      expect((await lireProfilEmulateur(uid)).jeux).toBeUndefined()

      expect(erreurs).toEqual([])
    })

    test('l’écran de fin de démonstration (?fin=6) et son récap', async ({ page }) => {
      const erreurs = []
      surveiller(page, erreurs)
      await preparer(page)
      await ouvrirCompte(page, { aller: null })
      await ouvrirAvecHorloge(page, '/jeux?fin=6')

      await expect(page.locator('.fp-fin')).toBeVisible()
      await page.clock.runFor(4000)
      expect(nombreDe(await page.locator('.fp-sr').filter({ hasText: /^Score/ }).textContent())).toBe(1480)
      const recap = page.getByRole('button', { name: /^Voir le récap · 6 erreurs/ })
      await expect(recap).toBeVisible()
      await recap.click()
      await expect(page.getByRole('heading', { name: 'Le récap' })).toBeVisible()
      await expect(page.getByText(/^Erreur\s*1 \/ 6/)).toBeVisible()
      for (let i = 2; i <= 6; i++) {
        await page.getByRole('button', { name: 'Erreur suivante' }).click()
        await page.clock.runFor(800)
        await expect(page.getByText(new RegExp(`^Erreur\\s*${i} / 6`))).toBeVisible()
      }
      await expect(page.getByRole('button', { name: 'Erreur suivante' })).toBeDisabled()
      await page.getByRole('button', { name: 'Retour au score' }).click()
      await expect(page.locator('.fp-fin')).toBeVisible()
      await page.locator('button.fp-btn', { hasText: 'Quitter' }).click()
      await expect(page.getByRole('heading', { name: /On joue/ })).toBeVisible()

      expect(erreurs).toEqual([])
    })
  })
}

test.describe('Annonce de la sortie', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('la popup « Nouveau : Réviz Games » mène aux jeux, une seule fois', async ({ page }) => {
    const erreurs = []
    page.on('pageerror', e => erreurs.push(e.message))
    await mockApiRoutes(page)
    await compteRapide(page, { annoncesVues: false, aller: null, stockage: { 'reviz-jeux-son': '0' } })
    // Réviz+ (s'il est encore offert) passe en premier ; Réviz Games à la visite suivante.
    await fermerAnnonceRevizPlus(page)
    await page.goto('/')
    const annonce = page.getByRole('dialog', { name: 'Réviz Games' })
    await expect(annonce).toBeVisible()
    await expect(annonce.getByText('Nouveau')).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'La Battle' })).toHaveCount(0)
    // La scène de la partie du jour est chargée et remplit l'encadré.
    await expect.poll(() => annonce.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true)
    await page.screenshot({ path: test.info().outputPath('annonce-jeux.png'), animations: 'disabled' })
    await annonce.getByRole('button', { name: 'Jouer à la partie du jour' }).click()
    await expect(page).toHaveURL(/\/jeux/)
    await expect(page.getByRole('heading', { name: /On joue/ })).toBeVisible()
    // Vue une fois : plus de popup à la visite suivante.
    await page.goto('/')
    await expect(page.locator('a[href^="/jeux"]').first()).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Réviz Games' })).toHaveCount(0)
    expect(erreurs).toEqual([])
  })
})
