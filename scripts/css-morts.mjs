#!/usr/bin/env node
/**
 * Inventaire du CSS mort ou en conflit (lecture seule : ne modifie rien dans src/).
 *
 *   node scripts/css-morts.mjs                       résumé texte sur la sortie standard
 *   node scripts/css-morts.mjs --json rapport.json   + rapport JSON complet
 *   node scripts/css-morts.mjs --md annexes.md       + listes détaillées en Markdown
 *
 * Méthode (voir docs/css-morts-2026-10-23.md) :
 *  1. postcss (déjà là via Vite) lit chaque src/**\/*.css : règles, sélecteurs, lignes.
 *  2. Chaque nom de classe est cherché comme mot entier dans src/**\/*.{js,jsx} (hors tests),
 *     index.html, public/**\/*.{html,js} ; les tests (src/**\/__tests__, e2e/) sont comptés à part.
 *  3. Les classes fabriquées (`xx-${…}`, 'xx-' + …, `${…}-xx`) rendent « douteuses » toutes les
 *     classes qui commencent / finissent pareil.
 *  4. Une règle n'est « morte sûre » que si TOUS ses sélecteurs exigent une classe morte sûre.
 *  5. Le graphe d'imports depuis src/main.jsx donne l'ordre de chargement (qui gagne un conflit)
 *     et les fichiers CSS jamais importés (orphelins).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/')

const args = process.argv.slice(2)
const argVal = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null }
const JSON_OUT = argVal('--json')
const MD_OUT = argVal('--md')

/* ───────────────────────── fichiers ───────────────────────── */

function walk(dir, accept, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.git')) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, accept, out)
    else if (accept(p)) out.push(p)
  }
  return out
}

const isTestPath = (p) => /(^|\/)(__tests__|test)\//.test(rel(p)) || /\.(test|spec)\.[jt]sx?$/.test(p)

const cssFiles = walk(path.join(ROOT, 'src'), (p) => p.endsWith('.css')).sort()
const srcJs = walk(path.join(ROOT, 'src'), (p) => /\.(js|jsx)$/.test(p))
const codeFiles = [
  ...srcJs.filter((p) => !isTestPath(p)),
  path.join(ROOT, 'index.html'),
  ...walk(path.join(ROOT, 'public'), (p) => /\.(html|js)$/.test(p)),
].filter((p) => fs.existsSync(p))
const testFiles = [
  ...srcJs.filter(isTestPath),
  ...walk(path.join(ROOT, 'e2e'), (p) => /\.(js|mjs)$/.test(p)),
]

/* ───────────────────────── commentaires ───────────────────────── */

const blank = (m) => m.replace(/[^\n]/g, ' ')

/**
 * Efface les commentaires d'un fichier JS/JSX en gardant les retours à la ligne.
 * Parcours caractère par caractère : un `/*` dans une chaîne (accept="image/*") ou une
 * URL (https://…) ne doit pas ouvrir un commentaire. Les apostrophes du texte JSX ouvrent
 * de fausses chaînes, mais une chaîne s'arrête à la fin de la ligne : au pire on garde
 * trop de texte, jamais trop peu.
 */
function stripJs(src) {
  const n = src.length
  let out = ''
  let i = 0
  let depth = 0
  const tpl = [] // profondeur d'accolades aux ouvertures de ${
  let prev = ''
  const REGEX_PREV = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^'])
  const readTemplate = () => {
    // i est juste après le backtick (ou après le } qui ferme un ${)
    while (i < n) {
      const c = src[i]
      if (c === '\\') { out += src.slice(i, i + 2); i += 2; continue }
      if (c === '`') { out += c; i++; prev = '`'; return }
      if (c === '$' && src[i + 1] === '{') { out += '${'; i += 2; tpl.push(depth); depth++; prev = '{'; return }
      out += c; i++
    }
  }
  while (i < n) {
    const c = src[i], d = src[i + 1]
    if (c === '/' && d === '/' && src[i - 1] !== ':') {
      let j = src.indexOf('\n', i); if (j < 0) j = n
      out += blank(src.slice(i, j)); i = j; continue
    }
    if (c === '/' && d === '*') {
      let j = src.indexOf('*/', i + 2); j = j < 0 ? n : j + 2
      out += blank(src.slice(i, j)); i = j; continue
    }
    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < n && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') j++; j++ }
      out += src.slice(i, j + 1); i = j + 1; prev = c; continue
    }
    if (c === '`') { out += c; i++; readTemplate(); continue }
    if (c === '/' && REGEX_PREV.has(prev)) {
      let j = i + 1, inCls = false
      while (j < n && src[j] !== '\n') {
        if (src[j] === '\\') { j += 2; continue }
        if (src[j] === '[') inCls = true
        else if (src[j] === ']') inCls = false
        else if (src[j] === '/' && !inCls) break
        j++
      }
      if (src[j] === '/') { out += src.slice(i, j + 1); i = j + 1; prev = '/'; continue }
    }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (tpl.length && tpl[tpl.length - 1] === depth) { tpl.pop(); out += c; i++; readTemplate(); continue }
    }
    out += c
    if (!/\s/.test(c)) prev = c
    i++
  }
  return out
}

function stripComments(text, file) {
  if (file.endsWith('.html')) return text.replace(/<!--[\s\S]*?-->/g, blank)
  return stripJs(text)
}

/* ───────────────────────── index d'usage ───────────────────────── */

const TOKEN = /(?<![\w-])[A-Za-z_][\w-]*/g
const QUOTED = /(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g // une ligne
const TEMPLATE = /`((?:\\.|[^`\\])*)`/g // multi-lignes

function tokensOf(text, set) { for (const m of text.matchAll(TOKEN)) set.add(m[0]) }
function quotedTokensOf(text, set) {
  for (const line of text.split('\n')) {
    for (const m of line.matchAll(QUOTED)) tokensOf(m[2], set)
  }
  for (const m of text.matchAll(TEMPLATE)) tokensOf(m[1], set)
}

function buildUsage(files) {
  const bare = new Map() // token -> Set(fichiers)  (n'importe où dans le code hors commentaires)
  const quoted = new Map() // token -> Set(fichiers) (dans une chaîne)
  const raw = new Map() // token -> Set(fichiers)    (commentaires compris)
  const add = (map, tok, f) => { let s = map.get(tok); if (!s) map.set(tok, (s = new Set())); s.add(f) }
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8')
    const stripped = stripComments(text, f)
    const a = new Set(), b = new Set(), c = new Set()
    tokensOf(stripped, a)
    quotedTokensOf(stripped, b)
    tokensOf(text, c)
    for (const t of a) add(bare, t, rel(f))
    for (const t of b) add(quoted, t, rel(f))
    for (const t of c) add(raw, t, rel(f))
  }
  return { bare, quoted, raw }
}

// Garde-fou : un fichier vide ou illisible (réécriture en cours par un autre outil) fausserait tout le rapport.
for (const f of [...codeFiles, ...testFiles]) {
  if (fs.statSync(f).size === 0) { console.error(`Fichier vide, relancer dans un instant : ${rel(f)}`); process.exit(2) }
}
const U = buildUsage(codeFiles)
const T = buildUsage(testFiles)

/* ───────────────────────── préfixes / suffixes dynamiques ───────────────────────── */

const dynamics = [] // { kind, value, file, line, text }
function findDynamics() {
  for (const f of codeFiles) {
    if (f.endsWith('.html')) continue
    const text = stripComments(fs.readFileSync(f, 'utf8'), f)
    const lines = text.split('\n')
    lines.forEach((ln, i) => {
      const hasClass = /class/i.test(ln)
      const push = (kind, value) => dynamics.push({ kind, value, file: rel(f), line: i + 1, text: ln.trim().slice(0, 120) })
      // `xx-${…}` ou ` xx${…}` (gabarit)
      for (const m of ln.matchAll(/(?:^|[`\s{"'])([A-Za-z][\w-]*)\$\{/g)) {
        const v = m[1]
        if (v.length < 2) continue
        if (v.includes('-') || v.includes('_') || hasClass) push('prefixe', v)
      }
      // 'xx-' + …  ou  'a b xx-' + …
      for (const m of ln.matchAll(/(["'`])([^"'`\n]*?)\1\s*\+/g)) {
        const str = m[2]
        if (!str || /\s$/.test(str)) continue
        const last = str.split(/\s+/).pop()
        if (/^[A-Za-z][\w-]*$/.test(last) && last.length >= 2 && (last.includes('-') || last.includes('_') || hasClass)) push('prefixe', last)
      }
      // ${…}-xx  (suffixe)
      for (const m of ln.matchAll(/\}([-_][A-Za-z][\w-]*)/g)) if (m[1].length >= 4) push('suffixe', m[1])
      // + '-xx'
      for (const m of ln.matchAll(/\+\s*(["'`])([-_][A-Za-z][\w-]*)\1/g)) if (m[2].length >= 4) push('suffixe', m[2])
    })
  }
}
findDynamics()
const prefixes = new Map() // valeur -> [{file,line}]
const suffixes = new Map()
for (const d of dynamics) {
  const m = d.kind === 'prefixe' ? prefixes : suffixes
  if (!m.has(d.value)) m.set(d.value, [])
  m.get(d.value).push({ file: d.file, line: d.line })
}

/* ───────────────────────── graphe d'imports (ordre de chargement) ───────────────────────── */

const RESOLVE_EXT = ['', '.js', '.jsx', '.mjs', '.css', '/index.js', '/index.jsx']
function resolveSpec(from, spec) {
  if (!spec.startsWith('.')) return null
  const base = path.resolve(path.dirname(from), spec)
  for (const e of RESOLVE_EXT) {
    const p = base + e
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p
  }
  return null
}

const importCache = new Map()
function importsOf(file) {
  if (importCache.has(file)) return importCache.get(file)
  const res = { static: [], dynamic: [] }
  if (file.endsWith('.css')) {
    const root = postcss.parse(fs.readFileSync(file, 'utf8'), { from: file })
    root.walkAtRules('import', (r) => {
      const m = /["']([^"']+)["']|url\(\s*["']?([^"')]+)/.exec(r.params)
      const spec = m && (m[1] || m[2])
      const p = spec && resolveSpec(file, spec)
      if (p) res.static.push(p)
    })
  } else {
    const text = stripComments(fs.readFileSync(file, 'utf8'), file)
    const found = []
    for (const m of text.matchAll(/\bimport\s+(?:[\w*${}\s,]+?\s+from\s+)?(["'])([^"'\n]+)\1/g)) found.push({ i: m.index, spec: m[2], dyn: false })
    for (const m of text.matchAll(/\bexport\s+[^'";]*?\sfrom\s+(["'])([^"'\n]+)\1/g)) found.push({ i: m.index, spec: m[2], dyn: false })
    for (const m of text.matchAll(/\bimport\(\s*(["'])([^"'\n]+)\1\s*\)/g)) found.push({ i: m.index, spec: m[2], dyn: true })
    found.sort((a, b) => a.i - b.i)
    for (const f of found) {
      const p = resolveSpec(file, f.spec)
      if (p) (f.dyn ? res.dynamic : res.static).push(p)
    }
  }
  importCache.set(file, res)
  return res
}

const ENTRY = path.join(ROOT, 'src/main.jsx')
const eagerSeen = new Set()
const eagerCss = [] // ordre de chargement
const lazyQueue = []
const lazySeen = new Set()
function visit(file, seen, cssOut, dynOut) {
  if (seen.has(file)) return
  seen.add(file)
  const im = importsOf(file)
  for (const p of im.static) {
    if (p.endsWith('.css')) visitCss(p, seen, cssOut)
    else visit(p, seen, cssOut, dynOut)
  }
  for (const p of im.dynamic) dynOut.push(p)
}
function visitCss(file, seen, cssOut) {
  if (seen.has(file)) return
  seen.add(file)
  for (const p of importsOf(file).static) visitCss(p, seen, cssOut)
  cssOut.push(file)
}
const dyn0 = []
visit(ENTRY, eagerSeen, eagerCss, dyn0)
lazyQueue.push(...dyn0)
const reachable = new Set(eagerSeen)
const lazyEntries = new Map() // entry -> [css…] (CSS propres à ce chunk, hors eager)
while (lazyQueue.length) {
  const entry = lazyQueue.shift()
  if (lazySeen.has(entry) || eagerSeen.has(entry)) continue
  lazySeen.add(entry)
  const seen = new Set(eagerSeen)
  const css = []
  const dyn = []
  visit(entry, seen, css, dyn)
  lazyEntries.set(rel(entry), css.map(rel))
  for (const s of seen) reachable.add(s)
  lazyQueue.push(...dyn)
}
const eagerIndex = new Map(eagerCss.map((f, i) => [rel(f), i]))
const lazyPos = new Map() // css -> Map(entry -> index)
for (const [entry, list] of lazyEntries) {
  list.forEach((c, i) => {
    if (!lazyPos.has(c)) lazyPos.set(c, new Map())
    lazyPos.get(c).set(entry, i)
  })
}
const cssReached = new Set([...reachable].filter((f) => f.endsWith('.css')).map(rel))
const unreachableJs = new Set(srcJs.filter((f) => !isTestPath(f) && !reachable.has(f)).map(rel))
const orphanCss = new Set(cssFiles.map(rel).filter((f) => !cssReached.has(f)))
const importedByAnyCode = new Set() // fichiers CSS cités dans un import quelconque (même JS non atteint)
for (const f of srcJs) for (const p of importsOf(f).static) if (p.endsWith('.css')) importedByAnyCode.add(rel(p))

/** Qui gagne entre deux fichiers (même sélecteur, même spécificité) ? */
function winner(a, b) {
  const ea = eagerIndex.get(a), eb = eagerIndex.get(b)
  if (ea != null && eb != null) return { w: ea > eb ? b : a, l: ea > eb ? a : b, certain: true, why: 'les deux chargés au démarrage : le plus tard dans l\'ordre d\'import gagne' }
  if (ea != null && eb == null) return { w: b, l: a, certain: true, why: `${b} est chargé plus tard (paresseux) que ${a}` }
  if (eb != null && ea == null) return { w: a, l: b, certain: true, why: `${a} est chargé plus tard (paresseux) que ${b}` }
  const pa = lazyPos.get(a), pb = lazyPos.get(b)
  if (pa && pb) {
    const ea2 = [...pa.keys()], eb2 = [...pb.keys()]
    const common = ea2.filter((e) => pb.has(e))
    const memeEnsemble = common.length === ea2.length && common.length === eb2.length
    if (common.length && memeEnsemble) {
      const wins = new Set(common.map((e) => (pa.get(e) > pb.get(e) ? a : b)))
      if (wins.size === 1) { const w = [...wins][0]; return { w, l: w === a ? b : a, certain: true, why: `toujours chargés ensemble (${common.map((e) => path.basename(e)).join(', ')}) : ${w} vient après`, coLoaded: true } }
      return { w: null, l: null, certain: false, why: 'ordre variable selon la route', coLoaded: true }
    }
    if (common.length) return { w: null, l: null, certain: false, why: 'chargés ensemble par une route mais l\'un des deux l\'est aussi sans l\'autre : dépend de l\'ordre de navigation', coLoaded: true }
  }
  return { w: null, l: null, certain: false, why: 'chunks paresseux distincts : dépend de l\'ordre de navigation', coLoaded: false }
}

/* ───────────────────────── lecture du CSS ───────────────────────── */

function splitTop(str, sep = ',') {
  let depth = 0, q = null, cur = ''
  const out = []
  for (let i = 0; i < str.length; i++) {
    const c = str[i]
    if (q) { cur += c; if (c === '\\') cur += str[++i] ?? ''; else if (c === q) q = null; continue }
    if (c === '"' || c === "'") { q = c; cur += c; continue }
    if (c === '(' || c === '[') depth++
    else if (c === ')' || c === ']') depth--
    if (c === sep && depth === 0) { out.push(cur); cur = ''; continue }
    cur += c
  }
  out.push(cur)
  return out.map((s) => s.trim()).filter(Boolean)
}

const GROUP_PSEUDOS = new Set(['is', 'where', 'matches', 'any', '-webkit-any', '-moz-any', 'has'])
/** Sélecteur complexe -> { req: classes exigées, all: toutes les classes, groups: [[noeud…]], attrs } */
function parseSelector(sel) {
  const node = { req: [], all: [], groups: [], attrs: [] }
  let i = 0
  while (i < sel.length) {
    const c = sel[i]
    if (c === '\\') { i += 2; continue }
    if (c === '[') {
      let j = i + 1, q = null
      while (j < sel.length) {
        const d = sel[j]
        if (q) { if (d === '\\') j++; else if (d === q) q = null } else if (d === '"' || d === "'") q = d
        else if (d === ']') break
        j++
      }
      node.attrs.push(sel.slice(i + 1, j)); i = j + 1; continue
    }
    if (c === '.') {
      const m = /^\.((?:\\.|[\w-]|[^\x00-\x7f])+)/.exec(sel.slice(i))
      if (m) { const n = m[1].replace(/\\(.)/g, '$1'); node.req.push(n); node.all.push(n); i += m[0].length; continue }
    }
    if (c === ':') {
      const m = /^::?([\w-]+)/.exec(sel.slice(i))
      if (m) {
        i += m[0].length
        if (sel[i] === '(') {
          let depth = 0, j = i
          for (; j < sel.length; j++) { if (sel[j] === '(') depth++; else if (sel[j] === ')' && --depth === 0) break }
          const inner = sel.slice(i + 1, j)
          const nm = m[1].toLowerCase()
          if (GROUP_PSEUDOS.has(nm)) {
            const subs = splitTop(inner).map(parseSelector)
            node.groups.push(subs)
            for (const s of subs) node.all.push(...s.all)
          } else {
            for (const s of splitTop(inner).map(parseSelector)) node.all.push(...s.all)
          }
          i = j + 1
        }
        continue
      }
    }
    i++
  }
  return node
}

const RANK = { alive: 0, doubt: 1, dead: 2 }
/** État d'un sélecteur d'après l'état de ses classes exigées : pire des états. */
function selState(node, classState) {
  let worst = 'alive'
  const upd = (s) => { if (RANK[s] > RANK[worst]) worst = s }
  for (const c of node.req) upd(classState(c))
  for (const g of node.groups) {
    let best = 'dead'
    for (const sub of g) { const s = selState(sub, classState); if (RANK[s] < RANK[best]) best = s }
    upd(best)
  }
  return worst
}

const norm = (s) => s.replace(/\s+/g, ' ').replace(/\s*([>+~,])\s*/g, '$1').trim()
const normVal = (s) => s.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim().toLowerCase()

const CONTAINER_AT = new Set(['media', 'supports', 'container', 'layer', 'document', 'scope'])

/** Parcourt un fichier CSS, renvoie les règles à plat. */
function readCss(file) {
  const text = fs.readFileSync(file, 'utf8')
  const root = postcss.parse(text, { from: file })
  const rules = []
  const containers = [] // at-rules conteneurs
  const keyframes = []
  const vars = []
  const walkNodes = (parent, atChain, containerRef) => {
    parent.each((n) => {
      if (n.type === 'rule') {
        const selectors = splitTop(n.selector)
        const decls = []
        n.each((d) => {
          if (d.type === 'decl') {
            decls.push({ prop: d.prop, value: d.value, important: !!d.important, line: d.source.start.line })
            if (d.prop.startsWith('--')) vars.push({ name: d.prop, file: rel(file), line: d.source.start.line, selector: n.selector.trim() })
          }
        })
        const rule = {
          file: rel(file), start: n.source.start.line, end: n.source.end.line,
          selector: n.selector.replace(/\s+/g, ' ').trim(), selectors, nodes: selectors.map(parseSelector),
          decls, at: atChain.join(' | '), container: containerRef,
          nested: n.parent.type === 'rule',
        }
        rules.push(rule)
        if (containerRef) containerRef.children.push(rule)
        walkNodes(n, atChain, containerRef)
      } else if (n.type === 'atrule') {
        const name = n.name.toLowerCase()
        if (/keyframes$/.test(name)) {
          keyframes.push({ name: n.params.trim(), file: rel(file), start: n.source.start.line, end: n.source.end.line })
        } else if (name === 'property') {
          n.each((d) => { if (d.type === 'decl') {} })
          vars.push({ name: n.params.trim(), file: rel(file), line: n.source.start.line, selector: '@property' })
        } else if (CONTAINER_AT.has(name) && n.nodes) {
          const ref = { file: rel(file), start: n.source.start.line, end: n.source.end.line, at: `@${n.name} ${n.params}`.trim(), children: [] }
          containers.push(ref)
          walkNodes(n, [...atChain, ref.at], ref)
        } else if (name === 'font-face') {
          n.each((d) => { if (d.type === 'decl' && d.prop.startsWith('--')) vars.push({ name: d.prop, file: rel(file), line: d.source.start.line, selector: '@font-face' }) })
        }
      }
    })
  }
  walkNodes(root, [], null)
  return { file: rel(file), lines: text.split('\n').length - (text.endsWith('\n') ? 1 : 0), rules, containers, keyframes, vars, text }
}

const parsed = cssFiles.map(readCss)

/* ───────────────────────── classification des classes ───────────────────────── */

const GENERIC_WORDS = new Set([
  'active', 'open', 'on', 'off', 'show', 'hide', 'hidden', 'visible', 'done', 'current', 'selected', 'disabled',
  'error', 'loading', 'dark', 'light', 'ios', 'android', 'native', 'desktop', 'mobile', 'first', 'last',
  'empty', 'full', 'small', 'large', 'card', 'title', 'text', 'icon', 'btn', 'button', 'app', 'page', 'row', 'col',
])

const classDecls = new Map() // nom -> [{file,line}]
for (const p of parsed) for (const r of p.rules) for (const n of r.nodes) for (const c of new Set(n.all)) {
  if (!classDecls.has(c)) classDecls.set(c, [])
  classDecls.get(c).push({ file: r.file, line: r.start })
}

// motifs [class*="xx"] / [class^="xx"] dans le CSS
const attrMatchers = []
for (const p of parsed) for (const r of p.rules) for (const n of r.nodes) for (const a of n.attrs) {
  const m = /^class\s*([*^$~|]?=)\s*["']?([^"'\]]+)/.exec(a)
  if (m) attrMatchers.push({ op: m[1], value: m[2], file: r.file, line: r.start })
}

const isCompound = (name) => name.includes('-')
const has = (map, k) => map.has(k)
const filesOf = (map, k) => [...(map.get(k) ?? [])]

function classify(name) {
  const compound = isCompound(name)
  const inCode = compound ? has(U.bare, name) : has(U.quoted, name)
  if (inCode) {
    const files = filesOf(compound ? U.bare : U.quoted, name)
    if (files.every((f) => unreachableJs.has(f))) return { status: 'douteuse', kind: 'js-non-atteint', reason: `utilisée seulement dans du JS que main.jsx n'atteint pas (${files.slice(0, 2).join(', ')})`, files }
    return { status: 'utilisee', files }
  }
  const inTest = compound ? has(T.bare, name) : has(T.quoted, name)
  // piste dynamique
  const pre = [...prefixes.keys()].filter((p) => name.startsWith(p) && name !== p)
  const suf = [...suffixes.keys()].filter((s) => name.endsWith(s) && name !== s)
  const att = attrMatchers.filter((a) => (a.op === '*=' && name.includes(a.value)) || (a.op === '^=' && name.startsWith(a.value)) || (a.op === '$=' && name.endsWith(a.value)))
  if (pre.length || suf.length || att.length) {
    const reasons = []
    if (pre.length) reasons.push(`préfixe dynamique ${pre.map((p) => '`' + p + '`').join(', ')}`)
    if (suf.length) reasons.push(`suffixe dynamique ${suf.map((p) => '`' + p + '`').join(', ')}`)
    if (att.length) reasons.push(`sélecteur d'attribut [class${att[0].op}"${att[0].value}"]`)
    return { status: 'douteuse', kind: 'dynamique', reason: reasons.join(' ; '), testOnly: inTest, ...(inTest ? { files: filesOf(compound ? T.bare : T.quoted, name) } : {}) }
  }
  if (inTest) return { status: 'utilisee', testOnly: true, files: filesOf(compound ? T.bare : T.quoted, name) }
  if (!compound && has(U.bare, name)) return { status: 'douteuse', kind: 'identifiant-nu', reason: `le mot « ${name} » apparaît dans le code hors d'une chaîne (identifiant ou clé d'objet), à vérifier`, files: filesOf(U.bare, name) }
  if (!compound && (name.length <= 4 || GENERIC_WORDS.has(name))) return { status: 'douteuse', kind: 'generique', reason: `nom générique (« ${name} ») : peut être posé par une bibliothèque ou une valeur calculée` }
  if (!compound && !has(U.quoted, name) && has(T.bare, name)) return { status: 'utilisee', testOnly: true, files: filesOf(T.bare, name) }
  const inComment = has(U.raw, name)
  return { status: 'morte', commentOnly: inComment, files: inComment ? filesOf(U.raw, name) : [] }
}

const classInfo = new Map()
for (const name of classDecls.keys()) classInfo.set(name, classify(name))
const stateOf = (name) => {
  const c = classInfo.get(name)
  if (!c) return 'dead'
  return c.status === 'utilisee' ? 'alive' : c.status === 'douteuse' ? 'doubt' : 'dead'
}

/* ───────────────────────── règles mortes / douteuses ───────────────────────── */

const mergeRanges = (ranges) => {
  const s = ranges.slice().sort((a, b) => a[0] - b[0])
  const out = []
  for (const r of s) {
    if (out.length && r[0] <= out[out.length - 1][1] + 0) out[out.length - 1][1] = Math.max(out[out.length - 1][1], r[1])
    else out.push([r[0], r[1]])
  }
  return out
}
const countLines = (ranges) => mergeRanges(ranges).reduce((a, r) => a + (r[1] - r[0] + 1), 0)

const fileReports = []
const ruleStateAll = new Map()
const deadRules = []
const doubtRules = []
const partialRules = []
for (const p of parsed) {
  const orphan = orphanCss.has(p.file)
  const deadRanges = [], doubtRanges = []
  let nDead = 0, nDoubt = 0, nAlive = 0, nNoClass = 0
  const stateByRule = new Map()
  for (const r of p.rules) {
    if (orphan) { stateByRule.set(r, 'dead'); continue }
    if (r.nested) { stateByRule.set(r, 'alive'); continue }
    const per = r.nodes.map((n) => selState(n, stateOf))
    const hasAnyClass = r.nodes.some((n) => n.all.length > 0)
    let best = 'dead'
    for (const s of per) if (RANK[s] < RANK[best]) best = s
    if (!hasAnyClass && r.nodes.every((n) => n.req.length === 0 && n.groups.length === 0)) { best = 'alive'; nNoClass++ }
    stateByRule.set(r, best)
    if (best === 'dead') {
      nDead++; deadRanges.push([r.start, r.end])
      deadRules.push({ file: r.file, start: r.start, end: r.end, selector: r.selector, at: r.at })
    } else if (best === 'doubt') {
      nDoubt++; doubtRanges.push([r.start, r.end])
      const reasons = new Set()
      r.nodes.forEach((n, i) => {
        for (const c of n.req) if (stateOf(c) === 'doubt') { const ci = classInfo.get(c); reasons.add(`.${c} : ${ci.reason}`) }
      })
      doubtRules.push({ file: r.file, start: r.start, end: r.end, selector: r.selector, at: r.at, reasons: [...reasons] })
    } else nAlive++
    // sélecteurs morts dans une règle vivante (liste à virgules)
    if (best !== 'dead' && r.nodes.length > 1) {
      const deadSel = r.selectors.filter((s, i) => per[i] === 'dead')
      if (deadSel.length) partialRules.push({ file: r.file, start: r.start, end: r.end, selector: r.selector, deadSelectors: deadSel })
    }
  }
  for (const [k, v] of stateByRule) ruleStateAll.set(k, v)
  // conteneurs @media entièrement morts
  for (const c of p.containers) {
    const kids = c.children.filter((k) => !k.nested)
    if (!orphan && kids.length && kids.every((k) => stateByRule.get(k) === 'dead')) deadRanges.push([c.start, c.end])
  }
  const fileLines = p.lines
  fileReports.push({
    file: p.file, lines: fileLines, orphan,
    importedByCode: importedByAnyCode.has(p.file),
    chargement: eagerIndex.has(p.file) ? `démarrage #${eagerIndex.get(p.file) + 1}` : lazyPos.has(p.file) ? `paresseux (${[...lazyPos.get(p.file).keys()].map((e) => path.basename(e).replace(/\.\w+$/, '')).join(', ')})` : 'jamais',
    rules: p.rules.length, deadRules: nDead, doubtRules: nDoubt,
    deadLines: orphan ? fileLines : countLines(deadRanges),
    doubtLines: orphan ? 0 : countLines(doubtRanges),
    _deadRanges: deadRanges,
  })
}

/* ───────────────────────── variables CSS ───────────────────────── */

const varReads = new Map() // nom -> [lieux]
const varWrites = new Map()
const dynVarPrefixes = new Set()
const addTo = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v) }
for (const p of parsed) {
  if (orphanCss.has(p.file)) continue
  for (const m of p.text.matchAll(/var\(\s*(--[\w-]+)/g)) addTo(varReads, m[1], p.file)
}
for (const f of [...codeFiles, ...testFiles]) {
  const isTest = testFiles.includes(f)
  const text = stripComments(fs.readFileSync(f, 'utf8'), f)
  for (const m of text.matchAll(/var\(\s*(--[\w-]+)/g)) addTo(varReads, m[1], rel(f) + (isTest ? ' (test)' : ''))
  for (const m of text.matchAll(/getPropertyValue\(\s*(["'`])(--[\w-]+)\1/g)) addTo(varReads, m[2], rel(f))
  if (isTest) continue
  for (const m of text.matchAll(/(["'`])(--[\w-]+)\1\s*:/g)) addTo(varWrites, m[2], rel(f))
  for (const m of text.matchAll(/setProperty\(\s*(["'`])(--[\w-]+)\1/g)) addTo(varWrites, m[2], rel(f))
  for (const m of text.matchAll(/(["'`])(--[\w-]*-)\$\{/g)) dynVarPrefixes.add(m[2])
  for (const m of text.matchAll(/(["'`])(--[\w-]+)\1\s*\+/g)) dynVarPrefixes.add(m[2])
  for (const m of text.matchAll(/(?<![\w-])(--[\w-]+)\s*:\s*[^;\n]*(?:;|\$\{)/g)) if (/style|css|\$\{/.test(text.slice(Math.max(0, m.index - 80), m.index + 40))) addTo(varWrites, m[1], rel(f))
}
const declared = new Map()
for (const p of parsed) {
  for (const v of p.vars) {
    if (!v.name.startsWith('--')) continue
    if (!declared.has(v.name)) declared.set(v.name, [])
    declared.get(v.name).push({ file: v.file, line: v.line, selector: v.selector })
  }
}
const readCount = new Map(), deadReadCount = new Map()
const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1)
for (const p of parsed) {
  if (orphanCss.has(p.file)) continue
  for (const m of p.text.matchAll(/var\(\s*(--[\w-]+)/g)) bump(readCount, m[1])
  for (const r of p.rules) {
    if (ruleStateAll.get(r) !== 'dead') continue
    for (const d of r.decls) for (const m of d.value.matchAll(/var\(\s*(--[\w-]+)/g)) bump(deadReadCount, m[1])
  }
}
const liveReads = new Set([...readCount].filter(([k, n]) => n > (deadReadCount.get(k) ?? 0)).map(([k]) => k))
const jsReads = new Set()
for (const [name, places] of varReads) if (places.some((x) => !x.endsWith('.css'))) jsReads.add(name)
const deadVars = []
for (const [name, places] of declared) {
  if (varReads.has(name)) continue
  const dyn = [...dynVarPrefixes].filter((pre) => name.startsWith(pre))
  deadVars.push({ name, declarations: places, douteuse: dyn.length ? `préfixe dynamique ${dyn.join(', ')}` : null, ecriteParJs: varWrites.has(name) ? varWrites.get(name) : null })
}
const varsMortesApres = [...declared.keys()].filter((n) => varReads.has(n) && !liveReads.has(n) && !jsReads.has(n)).map((n) => ({ name: n, declarations: declared.get(n), luesDans: [...new Set(varReads.get(n))] }))
const writtenNotRead = [...varWrites.keys()].filter((n) => !varReads.has(n) && !declared.has(n)).map((n) => ({ name: n, files: [...new Set(varWrites.get(n))] }))
const readNotDeclared = []
for (const [name, places] of varReads) {
  if (declared.has(name) || varWrites.has(name)) continue
  if ([...dynVarPrefixes].some((pre) => name.startsWith(pre))) continue
  readNotDeclared.push({ name, lus: [...new Set(places)] })
}

/* ───────────────────────── keyframes ───────────────────────── */

const animTokens = new Set()
for (const p of parsed) {
  if (orphanCss.has(p.file)) continue
  for (const m of p.text.matchAll(/animation(?:-name)?\s*:\s*([^;}]+)/g)) for (const t of m[1].split(/[\s,]+/)) animTokens.add(t.trim())
}
const deadKeyframes = []
for (const p of parsed) for (const k of p.keyframes) {
  const used = animTokens.has(k.name) || has(U.bare, k.name) || has(T.bare, k.name)
  if (!used) deadKeyframes.push({ ...k, orphan: orphanCss.has(k.file) })
}

/* ───────────────────────── conflits ───────────────────────── */

const entries = new Map() // clé at|sel -> Map(fichier -> Map(prop -> {value, important, line}))
for (const p of parsed) {
  if (orphanCss.has(p.file)) continue
  for (const r of p.rules) {
    if (r.nested) continue
    r.selectors.forEach((s, i) => {
      const key = `${r.at}¦${norm(s)}`
      if (!entries.has(key)) entries.set(key, { at: r.at, selector: norm(s), node: r.nodes[i], perFile: new Map() })
      const e = entries.get(key)
      if (!e.perFile.has(r.file)) e.perFile.set(r.file, new Map())
      const props = e.perFile.get(r.file)
      for (const d of r.decls) props.set(d.prop, { value: normVal(d.value), raw: d.value, important: d.important, line: d.line })
    })
  }
}
const conflicts = []
const doublonsIdentiques = []
for (const e of entries.values()) {
  const files = [...e.perFile.keys()]
  if (files.length < 2) continue
  const allProps = new Set(files.flatMap((f) => [...e.perFile.get(f).keys()]))
  const props = []
  const same = []
  for (const prop of allProps) {
    const vals = files.filter((f) => e.perFile.get(f).has(prop)).map((f) => ({ file: f, ...e.perFile.get(f).get(prop) }))
    if (vals.length < 2) continue
    const distinct = new Set(vals.map((v) => v.value + (v.important ? '!' : '')))
    if (distinct.size > 1) props.push({ prop, values: vals.map((v) => ({ file: v.file, line: v.line, value: v.raw.trim() + (v.important ? ' !important' : '') })) })
    else same.push(prop)
  }
  const state = selState(e.node, stateOf)
  if (props.length) {
    // gagnant pour chaque propriété : !important d'abord, sinon l'ordre de chargement
    const resolved = props.map((pr) => {
      const imp = pr.values.filter((v) => v.value.endsWith('!important'))
      let w = null, why = ''
      const cand = imp.length ? imp : pr.values
      if (imp.length === 1) { w = imp[0].file; why = '!important' }
      else if (cand.length === 2) { const r = winner(cand[0].file, cand[1].file); w = r.w; why = r.why; pr.coLoaded = r.coLoaded; pr.certain = r.certain }
      else {
        const fs_ = cand.map((v) => v.file)
        const pairs = new Map()
        for (let i = 0; i < fs_.length; i++) for (let j = i + 1; j < fs_.length; j++) pairs.set(fs_[i] + '|' + fs_[j], winner(fs_[i], fs_[j]))
        const champion = fs_.find((f) => fs_.every((g) => g === f || ((pairs.get(f + '|' + g) ?? pairs.get(g + '|' + f)).w === f)))
        if (champion) { w = champion; why = 'dernier chargé de ' + fs_.length + ' fichiers' }
        else why = [...new Set([...pairs.values()].map((x) => x.why))].join(' ; ')
        pr.certain = !!champion
        pr.coLoaded = [...pairs.values()].some((x) => x.coLoaded)
      }
      return { ...pr, gagnant: w, pourquoi: why }
    })
    conflicts.push({ selector: e.selector, at: e.at, etat: state, fichiers: files, proprietes: resolved })
  } else if (same.length) doublonsIdentiques.push({ selector: e.selector, at: e.at, fichiers: files, proprietes: same })
}
const isShared = (f) => /^src\/styles\//.test(f)
for (const c of conflicts) {
  const co = c.proprietes.some((p) => p.coLoaded)
  c.score = (c.etat === 'alive' ? 100 : c.etat === 'doubt' ? 50 : 0) + c.proprietes.length * 6 + (c.fichiers.some(isShared) ? 25 : 0) + (co ? 15 : 0) + (c.proprietes.every((p) => p.certain === false) ? -5 : 0)
}
conflicts.sort((a, b) => b.score - a.score)

/* Doublons internes : même sélecteur (et même @media) répété dans UN fichier avec des valeurs qui se contredisent. */
const intraMap = new Map()
for (const p of parsed) {
  if (orphanCss.has(p.file)) continue
  for (const r of p.rules) {
    if (r.nested) continue
    r.selectors.forEach((s, i) => {
      const key = `${p.file}¦${r.at}¦${norm(s)}`
      if (!intraMap.has(key)) intraMap.set(key, { file: p.file, at: r.at, selector: norm(s), node: r.nodes[i], regles: [] })
      intraMap.get(key).regles.push({ start: r.start, decls: r.decls })
    })
  }
}
const doublonsInternes = []
for (const e of intraMap.values()) {
  if (e.regles.length < 2) continue
  const byProp = new Map()
  for (const reg of e.regles) for (const d of reg.decls) {
    if (!byProp.has(d.prop)) byProp.set(d.prop, [])
    byProp.get(d.prop).push({ line: d.line, value: d.value.trim() + (d.important ? ' !important' : ''), norm: normVal(d.value) + (d.important ? '!' : '') })
  }
  const props = []
  for (const [prop, vals] of byProp) if (vals.length > 1 && new Set(vals.map((v) => v.norm)).size > 1) props.push({ prop, valeurs: vals.map(({ line, value }) => ({ line, value })), gagnante: vals[vals.length - 1].line })
  if (props.length) doublonsInternes.push({ file: e.file, selector: e.selector, at: e.at, etat: selState(e.node, stateOf), lignes: e.regles.map((r) => r.start), proprietes: props })
}

/* Surcharges entre fichiers : même sélecteur à un préfixe « html:not(.native) » près ou dans un autre @media. */
const stripPrefix = (s) => s.replace(/^html:not\(\.native\)\s+/, '').replace(/^html\.native\s+/, '')
const sur = new Map()
for (const e of entries.values()) {
  const k = stripPrefix(e.selector)
  if (!sur.has(k)) sur.set(k, [])
  sur.get(k).push(e)
}
const surcharges = []
for (const [k, list] of sur) {
  const fileset = new Set(list.flatMap((e) => [...e.perFile.keys()]))
  if (fileset.size < 2) continue
  // déjà couvert par les conflits exacts ?
  const propVals = new Map()
  for (const e of list) for (const [f, props] of e.perFile) for (const [prop, v] of props) {
    if (!propVals.has(prop)) propVals.set(prop, [])
    propVals.get(prop).push({ file: f, at: e.at, selector: e.selector, value: v.raw.trim() + (v.important ? ' !important' : ''), line: v.line, norm: v.value + (v.important ? '!' : '') })
  }
  const props = []
  for (const [prop, vals] of propVals) {
    if (new Set(vals.map((v) => v.file)).size < 2) continue
    if (new Set(vals.map((v) => v.norm)).size < 2) continue
    // exclure si c'est exactement un conflit déjà listé (même at+sélecteur)
    if (new Set(vals.map((v) => v.at + '¦' + v.selector)).size === 1) continue
    props.push({ prop, valeurs: vals.map(({ file, at, selector, value, line }) => ({ file, at, selector, value, line })) })
  }
  if (props.length) surcharges.push({ selector: k, etat: selState(list[0].node, stateOf), fichiers: [...fileset], proprietes: props })
}

/* ───────────────────────── rapport ───────────────────────── */

const classesOut = [...classInfo.entries()].map(([name, c]) => ({ name, ...c, declarations: classDecls.get(name) }))
const count = (f) => classesOut.filter(f).length
const totals = {
  fichiersCss: cssFiles.length,
  lignesCss: parsed.reduce((a, p) => a + p.lines, 0),
  classesDistinctes: classesOut.length,
  utilisees: count((c) => c.status === 'utilisee'),
  utiliseesParTestsSeulement: count((c) => c.status === 'utilisee' && c.testOnly),
  mortesSures: count((c) => c.status === 'morte'),
  mortesSuresMentionneesEnCommentaire: count((c) => c.status === 'morte' && c.commentOnly),
  douteuses: count((c) => c.status === 'douteuse'),
  reglesMortes: deadRules.length,
  reglesDouteuses: doubtRules.length,
  lignesMortesSures: fileReports.filter((f) => !f.orphan).reduce((a, f) => a + f.deadLines, 0),
  lignesFichiersOrphelins: fileReports.filter((f) => f.orphan).reduce((a, f) => a + f.lines, 0),
  lignesDouteuses: fileReports.reduce((a, f) => a + f.doubtLines, 0),
}
const report = {
  meta: { date: new Date().toISOString(), racine: ROOT, fichiersCodeScannes: codeFiles.length, fichiersTestScannes: testFiles.length },
  totals,
  fichiers: fileReports.map(({ _deadRanges, ...f }) => f),
  orphelins: [...orphanCss],
  jsNonAtteints: [...unreachableJs],
  reglesMortes: deadRules,
  reglesDouteuses: doubtRules,
  selecteursMortsDansReglesVivantes: partialRules,
  classes: classesOut,
  prefixesDynamiques: [...prefixes].map(([value, lieux]) => ({ value, lieux })),
  suffixesDynamiques: [...suffixes].map(([value, lieux]) => ({ value, lieux })),
  selecteursAttributClass: attrMatchers,
  variables: { mortes: deadVars, mortesApresSuppressionDesReglesMortes: varsMortesApres, ecritesParJsJamaisLues: writtenNotRead, luesJamaisDeclarees: readNotDeclared },
  keyframesMortes: deadKeyframes,
  conflits: conflits_(),
  doublonsIdentiques,
  doublonsInternes,
  surchargesInterFichiers: surcharges,
  ordreChargementDemarrage: eagerCss.map(rel),
  chunksParesseux: Object.fromEntries(lazyEntries),
}
function conflits_() { return conflicts }

if (JSON_OUT) fs.writeFileSync(path.resolve(ROOT, JSON_OUT), JSON.stringify(report, null, 1))

/* ───────────────────────── sorties texte ───────────────────────── */

const pad = (s, n) => String(s).padEnd(n)
const padL = (s, n) => String(s).padStart(n)
const out = []
out.push('CSS mort ou en conflit — ' + new Date().toISOString().slice(0, 10))
out.push(`${totals.fichiersCss} fichiers CSS, ${totals.lignesCss} lignes, ${totals.classesDistinctes} classes distinctes`)
out.push(`classes : ${totals.utilisees} utilisées (dont ${totals.utiliseesParTestsSeulement} par des tests seulement), ${totals.mortesSures} mortes sûres (dont ${totals.mortesSuresMentionneesEnCommentaire} citées en commentaire), ${totals.douteuses} douteuses`)
out.push(`règles : ${totals.reglesMortes} mortes sûres (${totals.lignesMortesSures} lignes) + ${orphanCss.size} fichier(s) orphelin(s) (${totals.lignesFichiersOrphelins} lignes), ${totals.reglesDouteuses} douteuses (${totals.lignesDouteuses} lignes)`)
out.push('')
out.push(pad('fichier', 46) + padL('lignes', 7) + padL('règles', 7) + padL('mortes', 7) + padL('l.mortes', 9) + padL('douteuses', 10) + padL('l.douteuses', 12) + '  chargement')
for (const f of fileReports.slice().sort((a, b) => b.deadLines - a.deadLines)) {
  out.push(pad(f.file.replace(/^src\//, ''), 46) + padL(f.lines, 7) + padL(f.rules, 7) + padL(f.orphan ? 'TOUT' : f.deadRules, 7) + padL(f.deadLines, 9) + padL(f.doubtRules, 10) + padL(f.doubtLines, 12) + '  ' + (f.orphan ? 'ORPHELIN (jamais importé)' : f.chargement))
}
out.push('')
out.push(`variables CSS déclarées jamais lues : ${deadVars.length} (dont ${deadVars.filter((v) => v.douteuse).length} douteuses) ; écrites par le JS jamais lues : ${writtenNotRead.length} ; lues jamais déclarées : ${readNotDeclared.length}`)
out.push(`@keyframes sans animation : ${deadKeyframes.length}`)
out.push(`conflits (même sélecteur, ≥2 fichiers, valeurs différentes) : ${conflicts.length} sélecteurs ; doublons identiques : ${doublonsIdentiques.length}`)
out.push(`doublons internes (même sélecteur répété dans un fichier, valeurs contradictoires) : ${doublonsInternes.length} ; surcharges entre fichiers (même sélecteur à html:not(.native) ou @media près) : ${surcharges.length}`)
out.push('')
out.push('Top conflits :')
for (const c of conflicts.slice(0, 10)) {
  out.push(`  ${c.selector}${c.at ? '  [' + c.at + ']' : ''}  (${c.etat})  ${c.fichiers.map((f) => f.replace(/^src\//, '')).join(' <> ')}`)
  for (const p of c.proprietes.slice(0, 3)) out.push(`      ${p.prop}: ${p.values.map((v) => `${v.value} (${path.basename(v.file)}:${v.line})`).join('  vs  ')}  -> ${p.gagnant ? path.basename(p.gagnant) : '?'}`)
}
out.push('')
out.push('Top doublons internes :')
for (const d of doublonsInternes.filter((x) => x.etat !== 'dead').slice(0, 8)) out.push(`  ${d.file.replace(/^src\//, '')} L${d.lignes.join('/')} ${d.selector}${d.at ? ' [' + d.at + ']' : ''} : ${d.proprietes.slice(0, 3).map((p) => p.prop + ' ' + p.valeurs.map((v) => v.value).join(' -> ')).join(' ; ')}`)
out.push('')
out.push('Top surcharges inter-fichiers :')
for (const d of surcharges.filter((x) => x.etat !== 'dead').slice(0, 8)) out.push(`  ${d.selector} : ${d.fichiers.map((f) => f.replace(/^src\//, '')).join(' <> ')} (${d.proprietes.length} prop.)`)
console.log(out.join('\n'))

/* ───────────────────────── annexes Markdown ───────────────────────── */

if (MD_OUT) {
  const md = []
  const short = (s, n = 110) => (s.length > n ? s.slice(0, n - 1) + '…' : s)
  const cell = (s) => String(s).replace(/\|/g, '\\|')
  md.push('### Chiffres par fichier', '')
  md.push('| Fichier | Lignes | Règles | Mortes sûres | Lignes retirables | Douteuses | Lignes douteuses | Chargement |')
  md.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |')
  for (const f of fileReports.slice().sort((a, b) => b.deadLines - a.deadLines || b.lines - a.lines)) {
    md.push(`| \`${f.file.replace(/^src\//, '')}\` | ${f.lines} | ${f.rules} | ${f.orphan ? 'toutes' : f.deadRules} | ${f.deadLines} | ${f.doubtRules} | ${f.doubtLines} | ${f.orphan ? '**orphelin (jamais importé)**' : cell(f.chargement)} |`)
  }
  md.push('', '### Règles mortes sûres, par fichier', '')
  md.push('Numéros de ligne du fichier courant (début-fin de la règle). Les `@media` entièrement vides après suppression sont comptés dans les « lignes retirables » du tableau.', '')
  const byFile = new Map()
  for (const r of deadRules) { if (!byFile.has(r.file)) byFile.set(r.file, []); byFile.get(r.file).push(r) }
  for (const [file, list] of [...byFile].sort((a, b) => b[1].length - a[1].length)) {
    md.push(`#### \`${file}\` — ${list.length} règle(s)`, '')
    for (const r of list) md.push(`- L${r.start}${r.end !== r.start ? '-' + r.end : ''}${r.at ? ' _(' + cell(short(r.at, 50)) + ')_' : ''} \`${cell(short(r.selector))}\``)
    md.push('')
  }
  md.push('### Fichiers jamais importés (orphelins)', '')
  for (const f of fileReports.filter((x) => x.orphan)) md.push(`- \`${f.file}\` — ${f.lines} lignes${f.importedByCode ? ' (importé seulement par du JS non atteint depuis main.jsx)' : ''}`)
  md.push('', '### Fichiers JS de src/ jamais atteints depuis main.jsx', '')
  for (const f of unreachableJs) md.push(`- \`${f}\``)
  md.push('', '### Règles douteuses', '')
  const dby = new Map()
  for (const r of doubtRules) { if (!dby.has(r.file)) dby.set(r.file, []); dby.get(r.file).push(r) }
  for (const [file, list] of [...dby].sort((a, b) => b[1].length - a[1].length)) {
    md.push(`#### \`${file}\` — ${list.length} règle(s)`, '')
    for (const r of list) md.push(`- L${r.start}${r.end !== r.start ? '-' + r.end : ''} \`${cell(short(r.selector, 90))}\` — ${cell(short(r.reasons.join(' ; '), 220))}`)
    md.push('')
  }
  md.push('### Préfixes et suffixes dynamiques détectés', '')
  md.push('| Motif | Genre | Classes rendues douteuses | Lieux |', '| --- | --- | ---: | --- |')
  const allDyn = [...[...prefixes].map(([v, l]) => ['préfixe', v, l]), ...[...suffixes].map(([v, l]) => ['suffixe', v, l])]
  for (const [kind, v, lieux] of allDyn.sort((a, b) => a[1].localeCompare(b[1]))) {
    const n = classesOut.filter((c) => c.status === 'douteuse' && c.reason?.includes('`' + v + '`')).length
    md.push(`| \`${cell(v)}\` | ${kind} | ${n} | ${lieux.slice(0, 3).map((l) => `${l.file.replace(/^src\//, '')}:${l.line}`).join(', ')}${lieux.length > 3 ? ` (+${lieux.length - 3})` : ''} |`)
  }
  md.push('', '### Classes douteuses (hors dynamiques déjà listées ci-dessus : identifiant nu, nom générique)', '')
  for (const c of classesOut.filter((x) => x.status === 'douteuse' && x.kind !== 'dynamique').sort((a, b) => a.name.localeCompare(b.name)))
    md.push(`- \`.${c.name}\` — ${c.reason} (déclarée ${c.declarations.slice(0, 2).map((d) => d.file.replace(/^src\//, '') + ':' + d.line).join(', ')})`)
  md.push('', '### Classes utilisées seulement par des tests', '')
  for (const c of classesOut.filter((x) => x.status === 'utilisee' && x.testOnly)) md.push(`- \`.${c.name}\` — cité par ${(c.files?.length ? c.files : ['(préfixe dynamique + test)']).join(', ')} ; déclaré ${c.declarations.slice(0, 3).map((d) => d.file.replace(/^src\//, '') + ':' + d.line).join(', ')}`)
  md.push('', '### Conflits : même sélecteur dans plusieurs fichiers, valeurs différentes', '')
  md.push('Triés par importance (sélecteur vivant, fichiers partagés, chargés ensemble, nombre de propriétés).', '')
  for (const c of conflicts) {
    md.push(`- \`${cell(short(c.selector, 80))}\`${c.at ? ' _(' + cell(short(c.at, 40)) + ')_' : ''} — état : ${c.etat} — ${c.fichiers.map((f) => '`' + f.replace(/^src\//, '') + '`').join(' / ')}`)
    for (const p of c.proprietes) md.push(`  - \`${p.prop}\` : ${p.values.map((v) => `\`${cell(short(v.value, 50))}\` (${path.basename(v.file)}:${v.line})`).join(' vs ')} → gagne **${p.gagnant ? path.basename(p.gagnant) : 'indéterminé'}** (${p.pourquoi})`)
  }
  md.push('', `### Doublons identiques (même sélecteur, mêmes valeurs, plusieurs fichiers) — ${doublonsIdentiques.length}`, '')
  for (const d of doublonsIdentiques) md.push(`- \`${cell(short(d.selector, 80))}\`${d.at ? ' _(' + cell(short(d.at, 40)) + ')_' : ''} — ${d.fichiers.map((f) => '`' + f.replace(/^src\//, '') + '`').join(' / ')} — ${d.proprietes.join(', ')}`)
  md.push('', `### Doublons internes : même sélecteur répété dans un fichier, valeurs contradictoires (la dernière gagne) — ${doublonsInternes.length}`, '')
  for (const d of doublonsInternes.slice().sort((a, b) => (a.etat === 'dead') - (b.etat === 'dead') || b.proprietes.length - a.proprietes.length)) {
    md.push(`- ${d.file.replace(/^src\//, '')} L${d.lignes.join(', ')} \`${cell(short(d.selector, 80))}\`${d.at ? ' _(' + cell(short(d.at, 40)) + ')_' : ''} — état : ${d.etat}`)
    for (const p of d.proprietes.slice(0, 6)) md.push(`  - \`${p.prop}\` : ${p.valeurs.map((v) => `\`${cell(short(v.value, 40))}\` (L${v.line})`).join(' puis ')}`)
  }
  md.push('', `### Surcharges entre fichiers : même sélecteur (au préfixe html:not(.native) ou @media près), valeurs différentes — ${surcharges.length}`, '')
  for (const d of surcharges.slice().sort((a, b) => (a.etat === 'dead') - (b.etat === 'dead') || b.proprietes.length - a.proprietes.length)) {
    md.push(`- \`${cell(short(d.selector, 80))}\` — état : ${d.etat} — ${d.fichiers.map((f) => '`' + f.replace(/^src\//, '') + '`').join(' / ')}`)
    for (const p of d.proprietes.slice(0, 5)) md.push(`  - \`${p.prop}\` : ${p.valeurs.map((v) => `\`${cell(short(v.value, 36))}\` (${path.basename(v.file)}:${v.line}${v.at ? ', ' + cell(short(v.at, 28)) : ''}${v.selector !== d.selector ? ', ' + cell(short(v.selector, 30)) : ''})`).join(' vs ')}`)
  }
  md.push('', '### Variables CSS déclarées mais jamais lues', '')
  for (const v of deadVars) md.push(`- \`${v.name}\` — ${v.declarations.map((d) => `${d.file.replace(/^src\//, '')}:${d.line}`).join(', ')}${v.douteuse ? ' — **douteuse** : ' + v.douteuse : ''}${v.ecriteParJs ? ' — écrite par le JS : ' + [...new Set(v.ecriteParJs)].join(', ') : ''}`)
  md.push('', '### Variables qui deviennent mortes une fois les règles mortes supprimées (leurs seules lectures sont dans des règles mortes)', '')
  for (const v of varsMortesApres) md.push(`- \`${v.name}\` — déclarée ${v.declarations.map((d) => `${d.file.replace(/^src\//, '')}:${d.line}`).join(', ')} ; lue seulement dans ${v.luesDans.join(', ')}`)
  md.push('', '### Variables écrites par le JS, jamais lues ni déclarées', '')
  for (const v of writtenNotRead) md.push(`- \`${v.name}\` — ${v.files.join(', ')}`)
  md.push('', '### Variables lues (`var(--x)`) mais jamais déclarées', '')
  for (const v of readNotDeclared) md.push(`- \`${v.name}\` — ${v.lus.slice(0, 4).join(', ')}`)
  md.push('', '### @keyframes jamais référencées', '')
  for (const k of deadKeyframes) md.push(`- \`${k.name}\` — ${k.file.replace(/^src\//, '')}:${k.start}-${k.end}${k.orphan ? ' (fichier orphelin)' : ''}`)
  md.push('', '### Sélecteurs morts dans une règle vivante (liste à virgules à élaguer)', '')
  for (const r of partialRules) md.push(`- ${r.file.replace(/^src\//, '')}:${r.start} — à retirer : ${r.deadSelectors.map((s) => '`' + cell(short(s, 70)) + '`').join(', ')}`)
  md.push('', '### Ordre de chargement des CSS au démarrage', '')
  eagerCss.forEach((f, i) => md.push(`${i + 1}. \`${rel(f).replace(/^src\//, '')}\``))
  fs.writeFileSync(path.resolve(ROOT, MD_OUT), md.join('\n') + '\n')
}
