// Tour de l'app : captures déterministes de chaque écran à 390 et 1280 px, avec
// erreurs console, pageerror, requêtes en échec, débordement horizontal et liens
// internes morts. Écrit un rapport.json dans le dossier de sortie.
//
//   node scripts/tour-captures.mjs --port 5210 --out <dossier> [--etats invite,essai,neuf,lecon,jeux]
//                                  [--largeurs 390,1280] [--date 2026-10-23T10:00:00+02:00]
//
// Prérequis : un serveur Vite branché sur l'émulateur Firebase,
//   VITE_FIREBASE_EMULATOR=1 VITE_ANTHROPIC_API_KEY= npx vite --port <port> --strictPort
// et l'émulateur (auth 9099, firestore 8080, projet demo-reviz) déjà lancé. Le script ne
// lance ni ne tue rien : il crée des comptes de test par l'API REST de l'émulateur Auth,
// écrit users/{uid} dans Firestore, et pilote l'app avec Chromium (un seul à la fois).
//
// Déterminisme (pour comparer avant/après, ménage CSS) : animations et transitions
// coupées par une feuille injectée et prefers-reduced-motion (--mouvement true pour le désactiver), images lazy forcées en eager, horloge de la page
// figée (--date), IA et /api/* simulés, attente de networkidle puis 500 ms.
// Les noms de fichiers sont stables : <etat>__<route>__<largeur>.png.
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// ── Arguments ───────────────────────────────────────────────────────────────────────────
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, tab) => {
  if (a.startsWith('--')) acc.push([a.slice(2), tab[i + 1] && !tab[i + 1].startsWith('--') ? tab[i + 1] : 'true'])
  return acc
}, []))
const PORT = Number(args.port) || 5210
const BASE = `http://localhost:${PORT}`
const OUT = path.resolve(args.out || 'tour-captures')
const LARGEURS = (args.largeurs || '390,1280').split(',').map(Number)
const HAUTEURS = { 390: 844, 1280: 800 }
const ETATS = (args.etats || 'invite,essai,neuf,lecon,jeux').split(',')
const DATE_FIGEE = args.date || '2026-10-23T10:00:00+02:00'
const SANS_HORLOGE = args['sans-horloge'] === 'true'
fs.mkdirSync(OUT, { recursive: true })

const AUTH = 'http://127.0.0.1:9099'
const FS = 'http://127.0.0.1:8080/v1/projects/demo-reviz/databases/(default)/documents'
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }
const MOT_DE_PASSE = 'motdepasse123'

// Ce qui n'est pas à nous : ni erreur ni lien mort si ça échoue.
const HOTES_IGNORES = /api\.anthropic\.com|(\/\/[^/]*(posthog|sentry)[^/]*\/)|\/ingest\b|googletagmanager|google-analytics|fonts\.(googleapis|gstatic)/i

// ── Compte de test par l'API de l'émulateur ─────────────────────────────────────────────
const v = x => x === null || x === undefined ? { nullValue: null }
  : x instanceof Date ? { timestampValue: x.toISOString() }
  : Array.isArray(x) ? { arrayValue: { values: x.map(v) } }
  : typeof x === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, y]) => [k, v(y)])) } }
  : typeof x === 'boolean' ? { booleanValue: x }
  : typeof x === 'number' ? (Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x })
  : { stringValue: String(x) }

async function creerCompte({ etiquette, prenom = 'Léa', classe = '3ème', verifie = true, naissance = '2011-03-12' }) {
  const email = `tour-${Date.now()}-${etiquette}-${Math.random().toString(36).slice(2, 6)}@tour.reviz.test`
  const reessayer = async (nom, fn) => {
    let derniere
    for (let i = 0; i < 4; i++) {
      try { return await fn() } catch (e) { derniere = e; await new Promise(r => setTimeout(r, 1500)) }
    }
    throw new Error(`${nom} : ${derniere.message}`)
  }
  const uid = await reessayer('Auth émulateur', async () => {
    const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: MOT_DE_PASSE, displayName: prenom, returnSecureToken: true }),
    })
    if (!res.ok) throw new Error(`signUp ${res.status} ${await res.text()}`)
    const { localId } = await res.json()
    if (verifie) {
      const up = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/demo-reviz/accounts:update`, {
        method: 'POST', headers: OWNER, body: JSON.stringify({ localId, emailVerified: true }),
      })
      if (!up.ok) throw new Error(`verif email ${up.status} ${await up.text()}`)
    }
    return localId
  })
  // users/{uid} comme après une inscription réelle (createUserProfile).
  const level = { cycle: 'college', classe }
  const doc = { prenom, email, birthDate: naissance, level, plan: 'free', createdAt: new Date() }
  let sansProfil = false
  try {
    await reessayer('Firestore émulateur', async () => {
      const w = await fetch(`${FS}/users/${uid}`, { method: 'PATCH', headers: OWNER, body: JSON.stringify({ fields: v(doc).mapValue.fields }) })
      if (!w.ok) throw new Error(`users/${uid} ${w.status} ${await w.text()}`)
    })
  } catch (e) {
    // Firestore hors service (émulateur partagé en panne) : on continue sans profil distant,
    // la classe est posée dans le navigateur. Le rapport le dit (meta.modeDegrade).
    sansProfil = true
    rapport.meta.modeDegrade = `Firestore indisponible, comptes sans users/{uid} : ${e.message.slice(0, 160)}`
    console.log(`  (mode dégradé : ${e.message.slice(0, 120)})`)
  }
  return { uid, email, prenom, level, sansProfil }
}

// ── IA et /api/* simulés (comme e2e/helpers.js) ─────────────────────────────────────────
const MOCK_IA = {
  metadata: { title: 'La photosynthèse', subject: 'SVT', excerpt: 'Comment les plantes fabriquent leur matière organique à partir de lumière.' },
  flashcards: [
    { front: 'Où se déroule la photosynthèse ?', back: 'Dans les chloroplastes des cellules végétales.' },
    { front: 'Quels sont les deux réactifs de la photosynthèse ?', back: "Le dioxyde de carbone (CO₂) et l'eau (H₂O)." },
    { front: 'Quel gaz est rejeté par la photosynthèse ?', back: 'Le dioxygène (O₂).' },
  ],
  quiz: [
    { question: 'Quel pigment capte la lumière ?', choices: ['La chlorophylle', 'La mélanine', "L'hémoglobine", 'Le carotène'], correct: 0, explanation: 'La chlorophylle donne aussi leur couleur verte aux feuilles.' },
    { question: 'La photosynthèse produit…', choices: ['Du CO₂', "Du glucose et de l'O₂", "De l'azote", "De l'eau uniquement"], correct: 1, explanation: 'Glucose (matière organique) + dioxygène rejeté.' },
    { question: 'Quand la photosynthèse a-t-elle lieu ?', choices: ['La nuit', 'En présence de lumière', 'En hiver seulement', 'Sous terre'], correct: 1, explanation: "La lumière est la source d'énergie du processus." },
  ],
  resume: {
    intro: 'La photosynthèse permet aux végétaux de produire leur matière organique.',
    keyPoints: ['Se déroule dans les chloroplastes', 'Nécessite lumière, CO₂ et eau', 'Produit glucose et O₂'],
    sections: [
      { title: '1. Le principe', content: 'Les végétaux captent la lumière grâce à la chlorophylle.', formula: null, formulaCaption: null },
      { title: "2. L'équation", content: 'CO₂ + H₂O → glucose + O₂ en présence de lumière.', formula: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂', formulaCaption: 'Équation bilan de la photosynthèse' },
    ],
    keyTerms: [
      { term: 'Chloroplaste', def: 'Organite où se déroule la photosynthèse.' },
      { term: 'Chlorophylle', def: 'Pigment vert qui capte la lumière.' },
      { term: 'Autotrophe', def: 'Organisme qui produit sa propre matière organique.' },
    ],
  },
  mindmap: {
    branches: [
      { id: 'principe', label: 'Principe', detail: 'Convertir la lumière en matière organique.', children: ['Lumière', 'Chlorophylle'], position: 'top-left' },
      { id: 'reactifs', label: 'Réactifs', detail: 'CO₂ et eau sont indispensables.', children: ['CO₂', 'H₂O'], position: 'top-right' },
      { id: 'produits', label: 'Produits', detail: 'Glucose et dioxygène.', children: ['Glucose', 'O₂'], position: 'bottom-left' },
      { id: 'lieu', label: 'Lieu', detail: 'Les chloroplastes des feuilles.', children: ['Chloroplastes', 'Feuilles'], position: 'bottom-right' },
    ],
  },
}
const TEXTE_LECON = "La photosynthèse est le processus par lequel les végétaux chlorophylliens fabriquent leur matière organique à partir de CO2, d'eau et de lumière. Elle se déroule dans les chloroplastes et rejette du dioxygène."

async function simulerApi(page, apiAppelees) {
  await page.route('**/api.anthropic.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(MOCK_IA) }] }) }))
  await page.route(/\/api\/(analyse|analyse-image)(\?|$)/, r => {
    apiAppelees.add(new URL(r.request().url()).pathname)
    return r.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: JSON.stringify(MOCK_IA) })
  })
  // Toute autre route serverless (absente sous Vite) : réponse vide et trace dans le rapport.
  await page.route(url => url.origin === BASE && url.pathname.startsWith('/api/') && !/\.(js|mjs|ts|map)$/.test(url.pathname) && !/\/api\/(analyse|analyse-image)$/.test(url.pathname), r => {
    apiAppelees.add(new URL(r.request().url()).pathname)
    return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  // Analytics : jamais de sortie.
  await page.route(url => (url.origin !== BASE && /posthog|sentry/i.test(url.hostname)) || url.pathname.startsWith('/ingest'), r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
}

// ── Capture d'une vue ───────────────────────────────────────────────────────────────────
const slug = s => s.replace(/^\//, '').replace(/[/?&=#]+/g, '-').replace(/[^a-zA-Z0-9_-]+/g, '').replace(/-+$/, '') || 'accueil'
const rapport = { meta: { date: new Date().toISOString(), base: BASE, largeurs: LARGEURS, dateFigee: SANS_HORLOGE ? null : DATE_FIGEE }, vues: [], liensMorts: [], liensVerifies: 0, apiAppelees: [], echecsScenario: [] }
const apiAppelees = new Set()
const liensVus = new Map()      // classe -> Map(href -> { de: [vue] })
const liensDejaVerifies = new Map() // classe -> Set(href)

// Coupures de connexion de l'émulateur Firestore (partagé avec d'autres runs : il lâche des
// connexions quand il est chargé). Comptées à part, ce ne sont pas des défauts de l'app.
const BRUIT_EMULATEUR = /127\.0\.0\.1:8080\/google\.firestore|@firebase\/firestore.*(Could not reach|transport errored)|ERR_EMPTY_RESPONSE/i

// Animations et transitions coupées. Pas « animation:none » : beaucoup d'entrées partent de
// opacity:0 et ne deviennent visibles qu'à la fin de l'animation (fill-mode forwards) ; en
// durée nulle, chaque animation saute directement à son état final et le contenu est là.
const CSS_FIGE = '*,*::before,*::after{animation-duration:1ms!important;animation-delay:0s!important;animation-iteration-count:1!important;animation-fill-mode:both!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}'

class Suivi {
  constructor(page) {
    this.vide()
    page.on('console', m => {
      const t = m.type()
      if (t !== 'error' && t !== 'warning') return
      const url = m.location()?.url || ''
      if (HOTES_IGNORES.test(url) || HOTES_IGNORES.test(m.text())) return
      const texte = m.text().slice(0, 600)
      if (BRUIT_EMULATEUR.test(texte) || BRUIT_EMULATEUR.test(url)) { this.bruitEmulateur++; return }
      ;(t === 'error' ? this.consoleErreurs : this.consoleAvertissements).push(url ? `${texte} [${url.replace(BASE, '')}:${m.location().lineNumber}]` : texte)
    })
    page.on('pageerror', e => this.pageerrors.push(String(e?.stack || e).slice(0, 800)))
    page.on('requestfailed', r => {
      const u = r.url()
      const raison = r.failure()?.errorText || ''
      if (HOTES_IGNORES.test(u) || /ERR_ABORTED/.test(raison)) return
      if (BRUIT_EMULATEUR.test(u)) { this.bruitEmulateur++; return }
      this.requetesEchec.push(`${r.method()} ${u.replace(BASE, '')} : ${raison}`)
    })
    page.on('response', r => {
      const u = r.url()
      if (HOTES_IGNORES.test(u) || r.status() < 400) return
      this.reponsesErreur.push(`${r.status()} ${r.request().method()} ${u.replace(BASE, '')}`)
    })
  }
  vide() { this.consoleErreurs = []; this.consoleAvertissements = []; this.pageerrors = []; this.requetesEchec = []; this.reponsesErreur = []; this.bruitEmulateur = 0 }
}

async function attendre(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {})
  await page.addStyleTag({ content: CSS_FIGE }).catch(() => {})
  // Images lazy forcées en eager, puis on attend qu'elles soient décodées (ou en échec).
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager' })
    await document.fonts?.ready
    const imgs = [...document.images]
    await Promise.race([
      Promise.all(imgs.map(i => i.complete ? null : new Promise(res => { i.addEventListener('load', res, { once: true }); i.addEventListener('error', res, { once: true }) }))),
      new Promise(res => setTimeout(res, 4000)),
    ])
  }).catch(() => {})
  await page.waitForTimeout(500)
}

// Débordement horizontal : le document, et .app (que le halo peut rendre défilable).
const MESURE_DEBORDEMENT = () => {
  const iw = window.innerWidth
  const app = document.querySelector('.app')
  const trop = []
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    if (r.right > iw + 1 || r.left < -1) {
      // Ignore ce qui est dans un conteneur qui défile ou qui rogne exprès.
      let p = el.parentElement, rogne = false
      while (p && p !== document.body) {
        const cs = getComputedStyle(p)
        if (/(auto|scroll|hidden|clip)/.test(cs.overflowX) && p.getBoundingClientRect().right <= iw + 1) { rogne = true; break }
        p = p.parentElement
      }
      if (rogne) continue
      const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''
      trop.push(`${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} [${Math.round(r.left)}→${Math.round(r.right)}]`)
      if (trop.length >= 6) break
    }
  }
  return {
    innerWidth: iw,
    docScrollWidth: document.documentElement.scrollWidth,
    docDebordeX: document.documentElement.scrollWidth > iw,
    appScrollLeft: app ? app.scrollLeft : null,
    appScrollWidth: app ? app.scrollWidth : null,
    appClientWidth: app ? app.clientWidth : null,
    appDebordeX: app ? app.scrollWidth > app.clientWidth + 1 : false,
    elementsHorsEcran: trop,
  }
}

// Hauteur utile : le document, ou le plus grand conteneur qui défile (.app, .content…).
const MESURE_HAUTEUR = () => {
  let h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
  for (const el of document.querySelectorAll('body *')) {
    if (el.clientHeight < 300 || el.scrollHeight <= el.clientHeight + 20) continue
    const cs = getComputedStyle(el)
    if (!/(auto|scroll)/.test(cs.overflowY)) continue
    const haut = Math.max(0, el.getBoundingClientRect().top)
    h = Math.max(h, el.scrollHeight + haut)
  }
  return h
}

const LIENS = () => [...document.querySelectorAll('a[href^="/"]')]
  .map(a => a.getAttribute('href')).filter(h => h && !h.startsWith('//'))

const estNotFound = async page => page.evaluate(() => !!document.querySelector('.pe-page--seule') && /Page introuvable/.test(document.body.innerText)).catch(() => false)

async function capturer(ctx, nom, { route, note = '' } = {}) {
  const { page, suivi, etat, largeur, classe } = ctx
  await attendre(page)
  const debordement = await page.evaluate(MESURE_DEBORDEMENT).catch(e => ({ erreur: String(e) }))
  const hauteurUtile = await page.evaluate(MESURE_HAUTEUR).catch(() => 0)
  const base = HAUTEURS[largeur] || 800
  let agrandi = false
  if (hauteurUtile > base + 20) {
    await page.setViewportSize({ width: largeur, height: Math.min(Math.ceil(hauteurUtile), 6000) })
    await page.waitForTimeout(300)
    agrandi = true
  }
  const fichier = `${etat}__${nom}__${largeur}.png`
  await page.screenshot({ path: path.join(OUT, fichier) }).catch(e => suivi.pageerrors.push(`capture : ${e.message}`))
  if (agrandi) await page.setViewportSize({ width: largeur, height: base })
  const liens = await page.evaluate(LIENS).catch(() => [])
  const urlFinale = page.url().replace(BASE, '')
  const vue = {
    etat, nom, route: route ?? urlFinale, largeur, fichier, urlFinale,
    titre: await page.title().catch(() => ''),
    notFound: await estNotFound(page),
    hauteurPage: hauteurUtile,
    debordement,
    console: suivi.consoleErreurs, avertissements: suivi.consoleAvertissements, pageerrors: suivi.pageerrors,
    requetesEchec: suivi.requetesEchec, reponsesErreur: suivi.reponsesErreur, coupuresEmulateur: suivi.bruitEmulateur,
    note,
  }
  rapport.vues.push(vue)
  suivi.vide()
  const carte = liensVus.get(classe) ?? new Map()
  liensVus.set(classe, carte)
  for (const h of new Set(liens)) { const e = carte.get(h) ?? { de: [] }; if (e.de.length < 6) e.de.push(`${etat}/${nom}@${largeur}`); carte.set(h, e) }
  const drapeaux = [debordement.docDebordeX && 'DEBORD-DOC', debordement.appDebordeX && 'DEBORD-APP', vue.console.length && `${vue.console.length} err`, vue.pageerrors.length && 'PAGEERROR', vue.notFound && '404'].filter(Boolean)
  console.log(`  ${fichier}  ${urlFinale}  ${drapeaux.join(' ')}`)
}

async function aller(ctx, route, nom, opts = {}) {
  try {
    await ctx.page.goto(BASE + route, { waitUntil: 'domcontentloaded' })
  } catch (e) { rapport.echecsScenario.push(`${ctx.etat}/${nom}@${ctx.largeur} : goto ${route} : ${e.message.split('\n')[0]}`) }
  if (opts.apres) { try { await opts.apres(ctx.page) } catch (e) { rapport.echecsScenario.push(`${ctx.etat}/${nom}@${ctx.largeur} : ${e.message.split('\n')[0]}`) } }
  await capturer(ctx, nom, { route, note: opts.note })
}

// Une action de scénario qui peut échouer sans arrêter le tour.
async function essayer(ctx, libelle, fn) {
  try { await fn(ctx.page); return true } catch (e) {
    rapport.echecsScenario.push(`${ctx.etat}@${ctx.largeur} : ${libelle} : ${e.message.split('\n')[0]}`)
    console.log(`  !! ${libelle} : ${e.message.split('\n')[0]}`)
    return false
  }
}

// ── Contexte navigateur ─────────────────────────────────────────────────────────────────
async function ouvrir(browser, etat, largeur, classe, compte = null) {
  const context = await browser.newContext({
    viewport: { width: largeur, height: HAUTEURS[largeur] || 800 }, deviceScaleFactor: 1,
    locale: 'fr-FR', timezoneId: 'Europe/Paris', colorScheme: 'light', serviceWorkers: 'block',
    // Les textes tapés lettre à lettre (bulles de Réviz) et les décors animés se posent d'un coup.
    reducedMotion: args.mouvement === 'true' ? 'no-preference' : 'reduce',
  })
  if (!SANS_HORLOGE) await context.clock.setFixedTime(new Date(DATE_FIGEE))
  await context.addInitScript(css => {
    const ajouter = () => { if (document.getElementById('tour-fige')) return; const s = document.createElement('style'); s.id = 'tour-fige'; s.textContent = css; (document.head || document.documentElement).appendChild(s) }
    if (document.documentElement) ajouter()
    document.addEventListener('DOMContentLoaded', ajouter)
  }, CSS_FIGE)
  if (compte?.sansProfil) {
    await context.addInitScript(([uid, level]) => { try { localStorage.setItem(`reviz-level-${uid}`, level) } catch { /* idem */ } }, [compte.uid, JSON.stringify(compte.level)])
  }
  const page = await context.newPage()
  page.setDefaultTimeout(8000)
  await simulerApi(page, apiAppelees)
  return { context, page, suivi: new Suivi(page), etat, largeur, classe }
}

async function seConnecter(ctx, compte) {
  const { page } = ctx
  await page.goto(BASE + '/connexion', { waitUntil: 'domcontentloaded' })
  await page.locator('#connexion-email').fill(compte.email)
  await page.locator('#connexion-password').fill(MOT_DE_PASSE)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL(url => !/\/connexion/.test(url.pathname), { timeout: 15000 })
  await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {})
  ctx.suivi.vide()
}

// Ferme les annonces de l'accueil (Réviz+ offert, Battle) : « Plus tard ».
async function fermerAnnonces(page) {
  for (let i = 0; i < 3; i++) {
    const plusTard = page.getByRole('dialog').getByRole('button', { name: 'Plus tard' })
    // La feuille arrive après le fondu de l'accueil (plus tard sur ordinateur) : on lui laisse 4 s.
    if (!(await plusTard.first().waitFor({ state: 'visible', timeout: 4000 }).then(() => true, () => false))) break
    await plusTard.first().click().catch(() => {})
    await page.waitForTimeout(400)
  }
}

// ── Vérification des liens internes ─────────────────────────────────────────────────────
async function verifierLiens(ctx) {
  const carte = liensVus.get(ctx.classe)
  if (!carte) return
  const faits = liensDejaVerifies.get(ctx.classe) ?? new Set()
  liensDejaVerifies.set(ctx.classe, faits)
  const aVoir = [...carte.keys()].filter(h => !faits.has(h))
  console.log(`  liens à vérifier (${ctx.classe}) : ${aVoir.length}`)
  for (const href of aVoir) {
    faits.add(href)
    rapport.liensVerifies++
    const resultat = { href, de: carte.get(href).de, classe: ctx.classe, etat: ctx.etat }
    try {
      const rep = await ctx.page.goto(BASE + href, { waitUntil: 'domcontentloaded' })
      await ctx.page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {})
      await ctx.page.waitForTimeout(250)
      const nf = await estNotFound(ctx.page)
      resultat.urlFinale = ctx.page.url().replace(BASE, '')
      resultat.statut = rep?.status()
      if (nf) rapport.liensMorts.push({ ...resultat, probleme: 'tombe sur la page 404' })
      else if (rep && rep.status() >= 400) rapport.liensMorts.push({ ...resultat, probleme: `HTTP ${rep.status()}` })
    } catch (e) {
      if (/Download is starting/.test(e.message)) continue
      rapport.liensMorts.push({ ...resultat, probleme: `échec de navigation : ${e.message.split('\n')[0]}` })
    }
  }
  ctx.suivi.vide()
}

// ── Scénarios ───────────────────────────────────────────────────────────────────────────
const ROUTES_PRIVEES = ['/cours', '/agenda', '/profil', '/reglages', '/scan', '/programme', '/coach', '/jeux', '/battle']

async function etatInvite(browser, largeur) {
  const ctx = await ouvrir(browser, 'invite', largeur, 'anon')
  console.log(`\n[invite @${largeur}]`)
  await aller(ctx, '/welcome', 'welcome')
  await aller(ctx, '/inscription', 'inscription')
  await aller(ctx, '/connexion', 'connexion')
  // Connexion avec une erreur affichée.
  await aller(ctx, '/connexion', 'connexion-erreur', { apres: async p => {
    await p.locator('#connexion-email').fill('personne@tour.reviz.test')
    await p.locator('#connexion-password').fill('mauvaismotdepasse')
    await p.getByRole('button', { name: 'Se connecter' }).click()
    await p.waitForTimeout(1500)
  } })
  await aller(ctx, '/essai', 'essai')
  for (const page of ['mentions-legales', 'confidentialite', 'cgv', 'cgu']) await aller(ctx, `/legal/${page}`, `legal-${page}`)
  await aller(ctx, '/legal/inconnue', 'legal-inconnue')
  await aller(ctx, '/avis', 'avis')
  await aller(ctx, '/profs', 'profs')
  await aller(ctx, '/installer', 'installer')
  await aller(ctx, '/battle', 'battle')
  await aller(ctx, '/une-page-qui-nexiste-pas', '404')
  // Routes privées sans compte : redirection vers /welcome attendue.
  await aller(ctx, '/', 'accueil-sans-compte')
  await aller(ctx, '/cours', 'cours-sans-compte')
  await verifierLiens(ctx)
  await ctx.context.close()
}

async function etatEssai(browser, largeur) {
  const ctx = await ouvrir(browser, 'essai', largeur, 'essai')
  console.log(`\n[essai @${largeur}]`)
  await aller(ctx, '/essai', 'essai-formulaire')
  await essayer(ctx, 'formulaire d\'essai', async p => {
    await p.getByLabel('Ton prénom').fill('Léa')
    await p.getByRole('radio', { name: '3e', exact: true }).click()
    await p.getByRole('button', { name: /C.est parti/ }).click()
    await p.waitForURL(/\/programme/, { timeout: 15000 })
  })
  await capturer(ctx, 'programme-apres-essai', { route: '/programme' })
  await aller(ctx, '/', 'accueil')
  await aller(ctx, '/cours', 'cours')
  await aller(ctx, '/scan', 'scan')
  await aller(ctx, '/profil', 'profil')
  await aller(ctx, '/reglages', 'reglages')
  await aller(ctx, '/coach', 'coach')
  await aller(ctx, '/jeux', 'jeux')
  await aller(ctx, '/agenda', 'agenda')
  await verifierLiens(ctx)
  await ctx.context.close()
}

async function etatNeuf(browser, largeur) {
  const compte = await creerCompte({ etiquette: `neuf${largeur}`, verifie: false })
  const ctx = await ouvrir(browser, 'neuf', largeur, 'auth', compte)
  console.log(`\n[neuf @${largeur}] ${compte.email}`)
  await seConnecter(ctx, compte)
  // Premier passage : l'accueil renvoie vers la découverte (onboarding en 3 écrans).
  await ctx.page.waitForURL(/onboarding/, { timeout: 10000 }).catch(() => {})
  await capturer(ctx, 'onboarding-1', { route: '/onboarding' })
  for (const n of [2, 3]) {
    await essayer(ctx, `onboarding suivant ${n}`, p => p.getByRole('button', { name: 'Suivant' }).click())
    await capturer(ctx, `onboarding-${n}`, { route: '/onboarding' })
  }
  await essayer(ctx, 'onboarding terminer', async p => {
    await p.getByRole('button', { name: /Ouvrir mon programme|Scanner ma première leçon/ }).click()
    await p.waitForURL(/\/(programme|scan)/, { timeout: 10000 })
  })
  await capturer(ctx, 'apres-onboarding', { route: '/programme' })
  // Accueil : annonces d'abord (vues telles quelles), puis fermées.
  await aller(ctx, '/', 'accueil-annonce')
  await essayer(ctx, 'fermer les annonces', fermerAnnonces)
  await capturer(ctx, 'accueil', { route: '/' })
  for (const r of ROUTES_PRIVEES) await aller(ctx, r, slug(r))
  // Vues d'une leçon sans leçon : états vides / manquants.
  for (const r of ['/analyse', '/resume', '/flashcards', '/mindmap', '/quiz']) await aller(ctx, r, `${slug(r)}-sans-lecon`)
  for (const r of ['/verify-email', '/upgrade-success', '/consent-pending', '/finish-setup', '/onboarding', '/connexion', '/inscription', '/progres', '/programme/maths', '/battle/ZZZZ', '/legal/cgu']) await aller(ctx, r, `${slug(r)}`)
  await verifierLiens(ctx)
  await ctx.context.close()
}

async function entrerCompteVerifie(ctx, compte) {
  await seConnecter(ctx, compte)
  await ctx.page.waitForURL(/onboarding/, { timeout: 10000 }).catch(() => {})
  await essayer(ctx, 'passer l\'onboarding', async p => {
    await p.getByRole('button', { name: 'Passer' }).click()
    await p.waitForURL(url => url.pathname === '/', { timeout: 10000 })
  })
  await essayer(ctx, 'fermer les annonces', fermerAnnonces)
}

async function etatLecon(browser, largeur) {
  const compte = await creerCompte({ etiquette: `lecon${largeur}` })
  const ctx = await ouvrir(browser, 'lecon', largeur, 'auth', compte)
  console.log(`\n[lecon @${largeur}] ${compte.email}`)
  await entrerCompteVerifie(ctx, compte)

  // ── Scan en mode texte, IA simulée ──
  await aller(ctx, '/scan', 'scan-vide')
  await essayer(ctx, 'scan : saisie du texte', async p => {
    // Téléphone : un bouton « Coller le texte » ouvre le champ ; ordinateur : il est déjà là.
    if (!(await p.locator('.scan-textarea').isVisible().catch(() => false))) await p.getByRole('button', { name: /Coller le texte/ }).first().click()
    await p.locator('.scan-textarea').fill(TEXTE_LECON)
  })
  await capturer(ctx, 'scan-texte-saisi', { route: '/scan' })
  await essayer(ctx, 'scan : analyser', async p => {
    await p.getByRole('button', { name: /Analyser/ }).first().click()
    await p.waitForURL(/analyse/, { timeout: 15000 })
    await p.getByText(/Lis le résumé|Ton parcours/).first().waitFor({ timeout: 15000 })
  })
  await capturer(ctx, 'analyse', { route: '/analyse' })

  await aller(ctx, '/resume', 'resume')
  await aller(ctx, '/flashcards', 'flashcards-recto')
  await essayer(ctx, 'flashcards : retourner', async p => {
    await p.getByText(MOCK_IA.flashcards[0].front.replace(/ \?$/, '')).first().click()
    await p.waitForTimeout(400)
  })
  await capturer(ctx, 'flashcards-apres-clic', { route: '/flashcards' })
  await aller(ctx, '/mindmap', 'mindmap')
  await essayer(ctx, 'mindmap : ouvrir une branche', async p => { await p.getByRole('button', { name: /Principe/ }).first().click(); await p.waitForTimeout(400) })
  await capturer(ctx, 'mindmap-branche', { route: '/mindmap' })
  // Quiz : bonne réponse, mauvaise réponse (explication), bonne réponse, fin.
  await aller(ctx, '/quiz', 'quiz-question-1')
  const repondre = (n, bonne) => essayer(ctx, `quiz : question ${n}`, async p => {
    const q = MOCK_IA.quiz[n - 1]
    const idx = bonne ? q.correct : (q.correct + 1) % q.choices.length
    await p.getByRole('button', { name: new RegExp(q.choices[idx].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first().click()
    await p.waitForTimeout(400)
  })
  await repondre(1, true)
  await capturer(ctx, 'quiz-bonne-reponse', { route: '/quiz' })
  await essayer(ctx, 'quiz : suivante', p => p.getByRole('button', { name: /Question suivante|Voir mon (résultat|score)/ }).click())
  await repondre(2, false)
  await capturer(ctx, 'quiz-mauvaise-reponse', { route: '/quiz' })
  await essayer(ctx, 'quiz : suivante', p => p.getByRole('button', { name: /Question suivante|Voir mon (résultat|score)/ }).click())
  await repondre(3, true)
  await essayer(ctx, 'quiz : résultat', p => p.getByRole('button', { name: /Question suivante|Voir mon (résultat|score)/ }).click())
  await capturer(ctx, 'quiz-fin', { route: '/quiz' })
  // Les pages qui changent quand une leçon existe.
  await aller(ctx, '/', 'accueil')
  await aller(ctx, '/cours', 'cours')
  await aller(ctx, '/profil', 'profil')
  await aller(ctx, '/agenda', 'agenda')
  await aller(ctx, '/coach', 'coach')

  // ── Un chapitre du programme, vrai contenu de public/programme ──
  await aller(ctx, '/programme', 'programme')
  await essayer(ctx, 'programme : choisir la première case', async p => {
    await p.locator('.prg-case').first().evaluate(el => el.scrollIntoView({ block: 'center', inline: 'center' }))
    await p.locator('.prg-case').first().click()
    await p.waitForTimeout(400)
  })
  await capturer(ctx, 'programme-chapitre-choisi', { route: '/programme' })
  await essayer(ctx, 'programme : changer de matière', async p => {
    await p.getByRole('radio', { name: /^Français/ }).click()
    await p.waitForTimeout(500)
  })
  await capturer(ctx, 'programme-autre-matiere', { route: '/programme' })
  await essayer(ctx, 'programme : ouvrir un chapitre', async p => {
    await p.getByRole('radio', { name: /^Maths/ }).click()
    await p.waitForTimeout(400)
    await p.locator('.prg-case').first().evaluate(el => el.scrollIntoView({ block: 'center', inline: 'center' }))
    await p.locator('.prg-case').first().click()
    await p.locator('.prg-go').click()
    await p.waitForURL(/analyse/, { timeout: 15000 })
    await p.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
  })
  await capturer(ctx, 'chapitre-analyse', { route: '/analyse' })
  for (const r of ['/resume', '/flashcards', '/mindmap', '/quiz', '/coach']) await aller(ctx, r, `chapitre-${slug(r)}`)
  await aller(ctx, '/cours', 'cours-avec-chapitre')
  await aller(ctx, '/programme', 'programme-apres-chapitre')
  await aller(ctx, '/reglages', 'reglages')
  await verifierLiens(ctx)
  await ctx.context.close()
}

async function etatJeux(browser, largeur) {
  const compte = await creerCompte({ etiquette: `jeux${largeur}` })
  const ctx = await ouvrir(browser, 'jeux', largeur, 'auth', compte)
  console.log(`\n[jeux @${largeur}] ${compte.email}`)
  await entrerCompteVerifie(ctx, compte)
  await capturer(ctx, 'accueil-jeux', { route: '/' })
  await aller(ctx, '/jeux', 'hub')
  await essayer(ctx, 'hub : toucher la partie du jour', async p => {
    await p.locator('.hb-jouer').click()
    await p.locator('.cd').waitFor({ timeout: 10000 })
    await p.waitForTimeout(1200)
  })
  await capturer(ctx, 'carte-de-debut', { route: '/jeux' })
  await essayer(ctx, 'carte de début : démarrer', async p => {
    await p.locator('.cd-demarrer').click()
    await p.waitForTimeout(2500)
  })
  await capturer(ctx, 'partie-en-cours', { route: '/jeux', note: 'état du jeu non déterministe (hasard, minuteries)' })
  await aller(ctx, '/jeux', 'hub-apres')
  await essayer(ctx, 'hub : Partie rapide', async p => {
    await p.locator('.hb-rapide').click()
    await p.locator('.cd').waitFor({ timeout: 10000 })
    await p.waitForTimeout(1200)
  })
  await capturer(ctx, 'carte-de-debut-rapide', { route: '/jeux' })
  for (const n of [0, 1, 6]) await aller(ctx, `/jeux?fin=${n}`, `fin-${n}`)
  await essayer(ctx, 'fin : voir le récap', async p => {
    await p.goto(`${BASE}/jeux?fin=6`, { waitUntil: 'domcontentloaded' })
    await p.getByRole('button', { name: /Voir le récap/ }).click()
    await p.waitForTimeout(600)
  })
  await capturer(ctx, 'recap-fin-6', { route: '/jeux?fin=6' })
  await essayer(ctx, 'récap : erreur suivante', async p => { await p.getByRole('button', { name: 'Erreur suivante' }).click(); await p.waitForTimeout(400) })
  await capturer(ctx, 'recap-fin-6-erreur-2', { route: '/jeux?fin=6' })
  await aller(ctx, '/jeux?fin=11', 'fin-11')
  await aller(ctx, '/battle', 'battle')
  await verifierLiens(ctx)
  await ctx.context.close()
}

// ── Orchestration ───────────────────────────────────────────────────────────────────────
const SCENARIOS = { invite: etatInvite, essai: etatEssai, neuf: etatNeuf, lecon: etatLecon, jeux: etatJeux }

const verifs = await Promise.all([
  fetch(BASE).then(r => r.ok).catch(() => false),
  fetch(`${AUTH}/`).then(r => r.ok).catch(() => false),
  fetch('http://127.0.0.1:8080/').then(r => r.ok).catch(() => false),
])
if (!verifs.every(Boolean)) {
  console.error(`Prérequis manquant : app sur ${BASE} (${verifs[0]}), émulateur Auth (${verifs[1]}), Firestore (${verifs[2]}).`)
  process.exit(1)
}

const debut = Date.now()
const browser = await chromium.launch()
try {
  for (const etat of ETATS) {
    if (!SCENARIOS[etat]) { console.error(`État inconnu : ${etat}`); continue }
    for (const largeur of LARGEURS) {
      // Un scénario interrompu (l'émulateur partagé a lâché une requête) est rejoué une fois.
      for (let essai = 1; essai <= 2; essai++) {
        const avant = rapport.vues.length
        try { await SCENARIOS[etat](browser, largeur); break } catch (e) {
          console.error(`  ## scénario ${etat}@${largeur} interrompu (essai ${essai}) : ${e.message.split('\n')[0]}`)
          if (essai === 2) rapport.echecsScenario.push(`${etat}@${largeur} : scénario interrompu : ${e.message.split('\n')[0]}`)
          else rapport.vues.length = avant
        }
      }
    }
  }
} finally {
  await browser.close()
}

rapport.apiAppelees = [...apiAppelees].sort()
rapport.meta.dureeSecondes = Math.round((Date.now() - debut) / 1000)
rapport.meta.nbVues = rapport.vues.length
fs.writeFileSync(path.join(OUT, 'rapport.json'), JSON.stringify(rapport, null, 2))

const pb = rapport.vues.filter(x => x.console.length || x.pageerrors.length || x.requetesEchec.length || x.debordement.docDebordeX || x.debordement.appDebordeX)
console.log(`\n${rapport.vues.length} vues en ${rapport.meta.dureeSecondes} s, ${pb.length} avec un signal (erreur, échec réseau, débordement).`)
console.log(`Liens vérifiés : ${rapport.liensVerifies}, morts : ${rapport.liensMorts.length}. Étapes de scénario en échec : ${rapport.echecsScenario.length}.`)
console.log(`Rapport : ${path.join(OUT, 'rapport.json')}`)
