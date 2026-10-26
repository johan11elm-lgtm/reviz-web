// -------------------------------------------------------
// Réviz — adresses courtes des vidéos (TikTok, Instagram)
//
// Chaque vidéo affiche à l'écran une adresse à taper, par ex.
// « revizapp.fr/vf6 ». Le site (reviz-landing) renvoie tout chemin de cette
// forme vers app.revizapp.fr/v/vf6 ; l'app lit ce tableau et ouvre l'essai
// sans compte sur le bon chapitre, avec la provenance (via) et le code (v)
// qui accompagnent ensuite essai_demarre, quiz_termine et compte_cree.
//
// AJOUTER UNE VIDÉO : une ligne dans CODES_VIDEO, puis `npm test` (le test
// vérifie la forme du code et que le chapitre existe et est prêt), puis
// déployer l'app. Rien à faire côté site.
//   - code : 1 à 3 lettres puis 1 à 3 chiffres, en minuscules (vf6, b12,
//     cer3). Jamais réutilisé pour une autre vidéo, sinon les chiffres se mêlent.
//   - via : 'tiktok', 'instagram', ou 'reseaux' si la même vidéo part sur les deux.
//   - classe : '6ème' à '3ème' ; matiere : slug du programme (maths, svt,
//     histoire, physique-chimie…) ; chapitre : id du chapitre dans
//     public/programme/<classe>/index.json. Sans chapitre, l'essai ouvre la
//     matière ; sans matière, le programme de la classe.
//   - titre, date : pour s'y retrouver (non utilisés par l'app).
// Aucune donnée personnelle ici ni dans l'adresse : public mineur.
// -------------------------------------------------------

export const CODES_VIDEO = {
  // Code de test : à garder, sert à vérifier la chaîne de bout en bout.
  x0: { via: 'reseaux', classe: '4ème', matiere: 'svt', chapitre: 'seismes', titre: 'Test du pont vidéo → app', date: '2026-10-16' },
}

/** Forme d'un code vidéo (la même règle filtre les chemins côté site). */
export const FORME_CODE = /^[a-z]{1,3}[0-9]{1,3}$/

export const VIA_VIDEO = ['tiktok', 'instagram', 'reseaux']

/** Code lu dans une adresse, en minuscules, ou null s'il n'a pas la bonne forme. */
export function normaliserCode(code) {
  const c = String(code ?? '').trim().toLowerCase()
  return FORME_CODE.test(c) ? c : null
}

/**
 * Adresse de l'essai pour un code vidéo : `/essai?via=…&v=…&classe=…`.
 * Code inconnu : l'essai sans pré-remplissage, provenance « reseaux ».
 */
export function lienEssai(code) {
  const c = normaliserCode(code)
  const e = c ? CODES_VIDEO[c] : null
  const p = new URLSearchParams()
  if (!e) {
    p.set('via', 'reseaux')
    return `/essai?${p}`
  }
  p.set('via', e.via)
  p.set('v', c)
  if (e.classe) p.set('classe', e.classe)
  if (e.classe && e.matiere) p.set('matiere', e.matiere)
  if (e.classe && e.matiere && e.chapitre) p.set('chapitre', e.chapitre)
  return `/essai?${p}`
}
