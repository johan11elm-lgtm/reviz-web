/**
 * La pizzeria ! (23/10) : les commandes, fabriquées par le code à l'infini (fractions de 6e à 4e).
 * Une commande dit ce que veut le client (le ticket), comment la pizza est déjà coupée (coupe), sur
 * combien de pizzas (1 ou 2), et le nombre de parts à servir (attendu). Toutes les parts d'une
 * commande ont la même taille : servir k parts, c'est servir k/coupe de pizza.
 *
 * Tour 0 : le ticket donne la coupe (3/8, pizza en 8). Tour 1 : ça ne tombe pas juste (3/4, pizza
 * en 8 : il faut 6 parts), parfois en toutes lettres. Tour 2, le coup de feu, sur deux pizzas : plus
 * d'une pizza (5/4), une somme (1/4 + 3/8), un pourcentage ou un nombre décimal (75 %, 0,5).
 *
 * Le ticket et la note sont des suites de morceaux : un texte, ou une fraction [n, d].
 */
const melange = liste => {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const auHasard = liste => liste[Math.floor(Math.random() * liste.length)];
const pgcd = (a, b) => (b ? pgcd(b, a % b) : a);
const irreductible = (n, d) => pgcd(n, d) === 1;
const ecrire = morceaux => morceaux.map(m => (Array.isArray(m) ? `${m[0]}/${m[1]}` : m)).join(' ');
const NBSP = ' ';

const EN_LETTRES = { '1/2': 'la moitié', '1/4': 'un quart', '3/4': 'trois quarts', '1/3': 'un tiers', '2/3': 'deux tiers' };

// Chaque fabrique renvoie { ticket, coupe, pizzas, attendu } ; commande() ajoute la note et le récap.
const FABRIQUES = {
  // Tour 0 : la pizza est coupée comme le dit le ticket.
  simple: () => {
    const coupe = auHasard([3, 4, 5, 6, 8]);
    const n = 1 + Math.floor(Math.random() * (coupe - 1));
    return { ticket: [[n, coupe]], coupe, pizzas: 1, attendu: n };
  },
  // Tour 1 : une fraction irréductible, la pizza coupée en un multiple de son dénominateur.
  equivalente: ({ lettres = false } = {}) => {
    const choix = [];
    for (const q of [2, 3, 4, 5, 6]) {
      for (let p = 1; p < q; p++) {
        if (!irreductible(p, q)) continue;
        for (const coupe of [4, 6, 8, 10, 12]) if (coupe > q && coupe % q === 0) choix.push({ p, q, coupe });
      }
    }
    const pool = lettres ? choix.filter(c => EN_LETTRES[`${c.p}/${c.q}`]) : choix;
    const { p, q, coupe } = auHasard(pool);
    return { ticket: lettres ? [EN_LETTRES[`${p}/${q}`]] : [[p, q]], coupe, pizzas: 1, attendu: p * (coupe / q) };
  },
  // Tour 2 : plus d'une pizza (5/4, 3/2…), deux pizzas coupées pareil.
  plus: () => {
    const choix = [];
    for (const q of [2, 3, 4, 6]) {
      for (let p = q + 1; p < 2 * q; p++) if (irreductible(p, q)) choix.push({ p, q });
    }
    const { p, q } = auHasard(choix);
    const coupe = q === 2 || (2 * q <= 8 && Math.random() < 0.35) ? 2 * q : q; // jamais de demi-pizzas
    return { ticket: [[p, q]], coupe, pizzas: 2, attendu: p * (coupe / q) };
  },
  // Tour 2 : une somme a/b + c/d, b divise d : la pizza est coupée en d.
  somme: () => {
    const choix = [];
    for (const d of [4, 6, 8]) {
      for (const b of [2, 3, 4]) {
        if (b >= d || d % b) continue;
        for (let a = 1; a < b; a++) {
          if (!irreductible(a, b)) continue;
          for (let c = 1; c < d; c++) {
            const total = a * (d / b) + c;
            if (irreductible(c, d) && total <= 2 * d - 1) choix.push({ a, b, c, d, total });
          }
        }
      }
    }
    const { a, b, c, d, total } = auHasard(choix);
    const termes = Math.random() < 0.5 ? [[a, b], '+', [c, d]] : [[c, d], '+', [a, b]];
    return { ticket: termes, coupe: d, pizzas: 2, attendu: total };
  },
  // Tour 2 : un pourcentage ou un nombre décimal.
  pourcent: () => {
    const { texte, n, d } = auHasard([
      { texte: `25${NBSP}%`, n: 1, d: 4 }, { texte: `50${NBSP}%`, n: 1, d: 2 }, { texte: `75${NBSP}%`, n: 3, d: 4 },
      { texte: `20${NBSP}%`, n: 1, d: 5 }, { texte: `40${NBSP}%`, n: 2, d: 5 }, { texte: `60${NBSP}%`, n: 3, d: 5 }, { texte: `80${NBSP}%`, n: 4, d: 5 },
      { texte: `150${NBSP}%`, n: 3, d: 2 }, { texte: '0,5', n: 1, d: 2 }, { texte: '0,25', n: 1, d: 4 }, { texte: '0,75', n: 3, d: 4 }, { texte: '1,5', n: 3, d: 2 },
    ]);
    const coupe = auHasard([d, 2 * d, 4 * d].filter(c => c >= 4 && c <= 8));
    return { ticket: [texte], coupe, pizzas: 2, attendu: n * (coupe / d) };
  },
};

/** Une commande complète : ce qu'il faut servir, la note du pizzaïolo et la ligne du récap. */
function commande(f, id) {
  const c = { ...f, id };
  // La note écrite au stylo sur le ticket une fois servi : les parts qu'il fallait.
  c.note = ['=', [c.attendu, c.coupe]];
  const ticket = ecrire(c.ticket);
  const coupee = `${c.pizzas > 1 ? 'pizzas coupées' : 'pizza coupée'} en ${c.coupe}`;
  const parts = `${c.attendu} part${c.attendu > 1 ? 's' : ''}`;
  // Plus d'une pizza : 7/4 = 1 pizza + 3/4.
  const plus = c.attendu > c.coupe ? ` = 1 pizza + ${c.attendu - c.coupe}/${c.coupe}` : '';
  const direct = c.ticket.length === 1 && Array.isArray(c.ticket[0]) && c.ticket[0][1] === c.coupe;
  c.recap = {
    texte: `${ticket} de pizza`,
    detail: direct ? `${parts}, ${coupee}${plus && ` (${ticket}${plus})`}` : `${ticket} = ${c.attendu}/${c.coupe}${plus} : ${parts}, ${coupee}`,
  };
  return c;
}

/** Les n commandes d'un tour de la pizzeria (niveau 0, 1 ou 2), toutes différentes. */
export function commandesPizzeria(niveau, n) {
  const types = niveau === 0 ? Array(n).fill('simple')
    : niveau === 1 ? Array(n).fill('equivalente')
      : [...melange(['plus', 'somme', 'pourcent']), ...melange(['plus', 'somme', 'pourcent'])].slice(0, n);
  // Au tour 1, une commande sur quatre en toutes lettres (« trois quarts »).
  const lettres = niveau === 1 ? Math.floor(Math.random() * n) : -1;
  const vues = new Set();
  const liste = [];
  // Pas plus de parts à toucher que le temps ne le permet.
  const maxi = niveau === 2 ? 7 : 8;
  for (let k = 0, essais = 0; k < n && essais < 200; essais++) {
    const f = FABRIQUES[types[k]]({ lettres: k === lettres });
    const cle = `${ecrire(f.ticket)}|${f.coupe}`;
    // Pas deux fois la même commande, ni deux fois de suite le même nombre de parts.
    if (f.attendu > maxi || vues.has(cle) || (liste.length && liste.at(-1).attendu === f.attendu && essais < 100)) continue;
    vues.add(cle);
    liste.push(commande(f, k));
    k += 1;
  }
  return liste;
}
