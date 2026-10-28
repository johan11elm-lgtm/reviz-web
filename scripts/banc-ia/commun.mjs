// -------------------------------------------------------
// Banc d'essai Réviz IA : ce que partagent les scripts
// (docs/plan-reviz-ia-agent.md, étape 0)
//
// Chaque IA reçoit le MÊME message : la classe, le contexte de l'élève
// fictif quand la demande en a besoin, puis la demande telle qu'un élève
// la tape. C'est le meilleur cas pour ChatGPT et Nono, qui ne connaissent
// pas l'élève.
// -------------------------------------------------------
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const DOSSIER = dirname(fileURLToPath(import.meta.url))
export const banc = JSON.parse(readFileSync(join(DOSSIER, 'questions.json'), 'utf8'))

/** « 4ème » → « 4e », comme l'écrit un élève. */
const courte = classe => classe.replace('ème', 'e')

/** Le message envoyé à chaque IA pour une demande. */
export function message(d) {
  const tete = d.contexte ? banc.eleve.contexte : `Je suis en ${courte(d.classe)}.`
  return `${tete}\n\n${d.texte}`
}

/** Dossier des résultats d'un relevé (AAAA-MM-JJ, jour du passage). */
export function dossierReleve(jour = new Date().toISOString().slice(0, 10)) {
  const d = join(DOSSIER, 'resultats', jour)
  mkdirSync(d, { recursive: true })
  return d
}

// Utilisé par le relevé dans le navigateur : node commun.mjs > messages.json
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(banc.demandes.map(d => ({ id: d.id, message: message(d) })), null, 2))
}
