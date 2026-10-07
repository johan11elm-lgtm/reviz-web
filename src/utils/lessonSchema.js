// -------------------------------------------------------
// Réviz — Validation du JSON de leçon produit par l'IA
// Source unique : aiService (scan) et scripts/programme (catalogue)
// partagent exactement les mêmes règles.
// -------------------------------------------------------
import { BRANCH_COLORS, BRANCH_POSITIONS } from './aiPrompts.js'

/**
 * Parse et normalise la réponse brute du modèle.
 * Lève Error('INVALID_JSON') ou Error('NON_SCOLAIRE').
 */
export function parseLessonJson(raw) {
  let parsed
  try {
    // 1. Essaie le JSON brut
    let cleaned = String(raw).replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      // 2. Extrait le premier objet JSON trouvé dans la réponse
      const start = cleaned.indexOf('{')
      const end   = cleaned.lastIndexOf('}')
      if (start === -1 || end === -1) throw new Error('no json')
      parsed = JSON.parse(cleaned.slice(start, end + 1))
    }
  } catch {
    throw new Error('INVALID_JSON')
  }

  if (!parsed || typeof parsed !== 'object') throw new Error('INVALID_JSON')

  // Refus de sûreté renvoyé par le modèle (contenu non scolaire / inapproprié).
  if (typeof parsed.error === 'string') {
    if (parsed.error === 'NON_SCOLAIRE') throw new Error('NON_SCOLAIRE')
    throw new Error('INVALID_JSON')
  }

  // Présence des blocs principaux
  if (!parsed.metadata || !parsed.flashcards || !parsed.quiz || !parsed.resume || !parsed.mindmap) {
    throw new Error('INVALID_JSON')
  }

  // Flashcards : tableau non vide d'items { front, back } texte
  if (!Array.isArray(parsed.flashcards) || parsed.flashcards.length === 0 ||
      !parsed.flashcards.every(c => c && typeof c.front === 'string' && typeof c.back === 'string')) {
    throw new Error('INVALID_JSON')
  }

  // Quiz : tableau non vide ; chaque item a question + 2 choix minimum +
  // un index `correct` valide (coercition string→number, corrige "1" vs 1).
  if (!Array.isArray(parsed.quiz) || parsed.quiz.length === 0) throw new Error('INVALID_JSON')
  parsed.quiz = parsed.quiz.map(q => {
    if (!q || typeof q.question !== 'string' || !Array.isArray(q.choices) || q.choices.length < 2) {
      throw new Error('INVALID_JSON')
    }
    const correct = Number(q.correct)
    if (!Number.isInteger(correct) || correct < 0 || correct >= q.choices.length) {
      throw new Error('INVALID_JSON')
    }
    return { ...q, correct }
  })

  // Résumé : sections / keyPoints / keyTerms doivent être des tableaux (sinon crash UI)
  const r = parsed.resume
  if (!r || !Array.isArray(r.keyPoints) || !Array.isArray(r.sections) || !Array.isArray(r.keyTerms)) {
    throw new Error('INVALID_JSON')
  }
  // Rubriques ajoutées en octobre 2026 (exemple, méthode, pièges) : optionnelles,
  // les leçons plus anciennes ne les ont pas. On garde seulement ce qui est affichable.
  const texte = v => (typeof v === 'string' && v.trim() ? v.trim() : null)
  r.sections = r.sections.filter(s => s && typeof s === 'object').map(s => ({ ...s, exemple: texte(s.exemple) }))
  const etapes = Array.isArray(r.methode?.etapes) ? r.methode.etapes.map(texte).filter(Boolean) : []
  r.methode = etapes.length ? { titre: texte(r.methode.titre) ?? 'La méthode', etapes } : null
  r.pieges = Array.isArray(r.pieges) ? r.pieges.map(texte).filter(Boolean) : []

  // Carte mentale : le prompt exige exactement 4 branches, mais on
  // normalise défensivement — champs texte garantis, children = tableau de
  // strings, max 4 branches, positions canoniques réassignées par index
  // (évite chevauchements si le modèle renvoie 5+ branches ou des doublons).
  if (!Array.isArray(parsed.mindmap.branches)) throw new Error('INVALID_JSON')
  const seenIds = new Set()
  const branches = parsed.mindmap.branches
    .filter(b => b && typeof b.label === 'string' && b.label.trim())
    .slice(0, BRANCH_POSITIONS.length)
    .map((b, i) => {
      let id = (typeof b.id === 'string' && b.id.trim()) ? b.id.trim() : `branche-${i}`
      if (seenIds.has(id)) id = `branche-${i}`
      seenIds.add(id)
      return {
        id,
        label:    b.label.trim(),
        emoji:    (typeof b.emoji === 'string' && b.emoji.trim()) ? b.emoji : '📌',
        detail:   typeof b.detail === 'string' ? b.detail : '',
        children: Array.isArray(b.children) ? b.children.filter(c => typeof c === 'string' && c.trim()).slice(0, 6) : [],
        position: BRANCH_POSITIONS[i],
        ...BRANCH_COLORS[i % BRANCH_COLORS.length],
      }
    })
  if (branches.length < 2) throw new Error('INVALID_JSON')
  parsed.mindmap.branches = branches
  return parsed
}
