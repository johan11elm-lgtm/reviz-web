// -------------------------------------------------------
// Réviz — adresses e-mail des élèves : fautes de frappe et boîte mail
// Une adresse sur cinq était fausse (Resend, 15-29/10) : « s.frfr », « hormail.fr »,
// « exmenple.com » (le modèle du champ recopié). On propose la bonne, sans jamais bloquer
// une adresse inconnue : un domaine d'établissement ou d'un petit fournisseur reste valable.
// -------------------------------------------------------

// Les messageries les plus courantes des familles, de la plus fréquente à la moins fréquente :
// à distance égale, la première gagne.
const DOMAINES = [
  'gmail.com', 'hotmail.fr', 'hotmail.com', 'outlook.fr', 'outlook.com', 'icloud.com', 'yahoo.fr',
  'yahoo.com', 'orange.fr', 'free.fr', 'sfr.fr', 'live.fr', 'laposte.net', 'wanadoo.fr', 'live.com',
  'msn.com', 'me.com', 'bbox.fr', 'neuf.fr', 'gmx.fr', 'aol.com', 'protonmail.com', 'proton.me',
  // Vraies messageries proches d'une autre (« ymail » de « gmail ») : connues, donc jamais corrigées.
  'googlemail.com', 'ymail.com', 'mail.com', 'gmx.com', 'gmx.net', 'mac.com',
];
// Ces messageries n'existent qu'avec une seule terminaison : « gmail.fr » est une faute.
const TERMINAISON_UNIQUE = { gmail: 'gmail.com', icloud: 'icloud.com' };
const TERMINAISONS = new Set(['com', 'fr', 'net', 'org', 'eu', 'be', 'ch', 'ca', 'lu', 'me', 'io', 'de', 'es', 'it', 'uk', 'pt', 'ma', 'tn', 'dz', 're']);

// Distance de Damerau-Levenshtein (une inversion de deux lettres compte pour une faute).
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cout);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

function couper(email) {
  const e = String(email ?? '').trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at < 1 || at === e.length - 1) return null;
  return { nom: e.slice(0, at), domaine: e.slice(at + 1) };
}

/** Le domaine corrigé, ou null s'il n'y a rien à proposer. */
function domaineCorrige(domaine) {
  if (DOMAINES.includes(domaine)) return null;
  const point = domaine.lastIndexOf('.');
  const nom = domaine.slice(0, point);
  if (TERMINAISON_UNIQUE[nom]) return TERMINAISON_UNIQUE[nom];
  // Le bon nom avec une terminaison qui existe (« live.be ») : rien à dire.
  if (point > 0 && TERMINAISONS.has(domaine.slice(point + 1)) && DOMAINES.some(d => d.startsWith(`${nom}.`))) return null;
  // Le domaine tel quel, et sans sa terminaison tapée deux fois (« s.frfr », « gmail.comcom »).
  const candidats = [domaine, domaine.replace(/\.(fr|com|net)\1$/, '.$1')];
  let meilleur = null;
  let min = Infinity;
  for (const c of candidats) {
    for (const d of DOMAINES) {
      const n = distance(c, d);
      if (n < min) { min = n; meilleur = d; }
    }
  }
  // Une faute pour un domaine très court, deux pour les autres : au-delà, c'est un autre domaine.
  return min <= (domaine.length < 6 ? 1 : 2) ? meilleur : null;
}

/**
 * L'adresse que l'élève voulait sans doute taper (« lea@gmial.com » → « lea@gmail.com »), ou null.
 * @param {string} email
 * @returns {string|null}
 */
export function suggererEmail(email) {
  const p = couper(email);
  if (!p || adresseExemple(email)) return null;
  const d = domaineCorrige(p.domaine);
  return d && d !== p.domaine ? `${p.nom}@${d}` : null;
}

/** Vrai pour une adresse d'exemple recopiée (exemple.com, example.fr, « exmenple.com »…). */
export function adresseExemple(email) {
  const p = couper(email);
  if (!p) return false;
  const nom = p.domaine.slice(0, p.domaine.lastIndexOf('.'));
  return ['exemple', 'example'].some(x => distance(nom, x) <= 2);
}

// Messageries en ligne : l'élève ouvre la sienne d'un geste. Gmail cherche notre adresse partout,
// spams compris.
const BOITES = [
  [['gmail.com', 'googlemail.com'], 'Gmail', 'https://mail.google.com/mail/u/0/#search/in%3Aanywhere+from%3Arevizapp.fr'],
  [['hotmail.fr', 'hotmail.com', 'outlook.fr', 'outlook.com', 'live.fr', 'live.com', 'msn.com'], 'Outlook', 'https://outlook.live.com/mail/0/'],
  [['icloud.com', 'me.com', 'mac.com'], 'iCloud Mail', 'https://www.icloud.com/mail'],
  [['yahoo.fr', 'yahoo.com'], 'Yahoo Mail', 'https://mail.yahoo.com/'],
  [['orange.fr', 'wanadoo.fr'], 'Mail Orange', 'https://messagerie.orange.fr/'],
  [['free.fr'], 'Free', 'https://webmail.free.fr/'],
  [['sfr.fr', 'neuf.fr'], 'SFR Mail', 'https://webmail.sfr.fr/'],
  [['laposte.net'], 'La Poste', 'https://www.laposte.net/accueil'],
  [['gmx.fr'], 'GMX', 'https://www.gmx.fr/'],
  [['protonmail.com', 'proton.me'], 'Proton Mail', 'https://mail.proton.me/'],
];

/**
 * La messagerie en ligne de cette adresse, ou null pour un domaine qu'on ne connaît pas.
 * @param {string} email
 * @returns {{ nom: string, url: string } | null}
 */
export function boiteMail(email) {
  const p = couper(email);
  const boite = p && BOITES.find(([domaines]) => domaines.includes(p.domaine));
  return boite ? { nom: boite[1], url: boite[2] } : null;
}
