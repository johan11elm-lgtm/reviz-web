/**
 * Bruitages de Réviz Games, synthétisés à la volée (Web Audio) : aucun fichier à charger, rien à
 * licencier. Sons courts et doux, façon jouet en bois et boîte à musique. Le son se coupe avec
 * bruitagesActifs(false) (mémorisé sur l'appareil) ; rien ne sonne avant un premier geste de
 * l'élève (le navigateur l'interdit de toute façon).
 */
const CLE = 'reviz-jeux-son';
let ctx = null;
// Le réglage est relu à chaque son : il a pu changer depuis le chargement du module, qui a lieu dès
// le démarrage de l'app (un autre onglet, un réglage posé avant une connexion sans rechargement).
// `actif` garde le dernier choix connu, pour un stockage illisible, et `seulEnMemoire` fait primer
// le choix fait sur la page quand le stockage a refusé de l'écrire (quota plein).
let actif = true;
let seulEnMemoire = false;

export function sonActif() {
  if (!seulEnMemoire) try { actif = localStorage.getItem(CLE) !== '0'; } catch { /* stockage indisponible */ }
  return actif;
}
export function bruitagesActifs(oui) {
  actif = oui;
  try { localStorage.setItem(CLE, oui ? '1' : '0'); seulEnMemoire = false; } catch { seulEnMemoire = true; }
}

/**
 * Le contexte audio, partagé par les bruitages et toutes les musiques des jeux. Un seul pour toute
 * la page : Safari sur iPhone limite le nombre de contextes, et les derniers créés restaient muets
 * (la musique du ninja, 23/10). Il est réveillé au premier geste de l'élève, seul moment où iOS
 * accepte de le démarrer.
 */
// Un contexte à reprendre : suspendu (avant le premier geste, ou mis en veille), ou « interrupted »
// (Safari sur iPhone : un appel, le verrouillage de l'écran, une autre appli qui prend le son). Un
// contexte fermé ne revient pas.
const aReprendre = () => !!ctx && ctx.state !== 'running' && ctx.state !== 'closed';
const reprendre = () => { if (aReprendre()) ctx.resume().catch(() => {}); };

export function contexteAudio() {
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return null;
  ctx ??= new AC();
  reprendre();
  return ctx;
}
if (typeof window !== 'undefined') {
  // Les gestes de l'élève, et le retour au premier plan : iOS coupe le son quand la page passe en
  // arrière-plan et ne le rend pas tout seul (la musique restait muette jusqu'au prochain toucher).
  for (const ev of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(ev, reprendre, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reprendre(); });
}

function audio() {
  if (!sonActif()) return null;
  return contexteAudio();
}

// Une note : oscillateur + enveloppe (attaque courte, chute exponentielle).
function note(a, { f, f2 = f, t = 0, d = 0.15, type = 'sine', vol = 0.18 }) {
  const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + t;
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2 !== f) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + d + 0.05);
}

// Un souffle : bruit blanc filtré (fumée, glissement, applaudissements).
function souffle(a, { t = 0, d = 0.3, f = 1200, f2 = f, q = 0.8, vol = 0.12, type = 'bandpass' }) {
  const n = Math.ceil(a.sampleRate * d), buf = a.createBuffer(1, n, a.sampleRate), data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(), t0 = a.currentTime + t;
  s.buffer = buf;
  fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t0);
  if (f2 !== f) fl.frequency.exponentialRampToValueAtTime(f2, t0 + d);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.04, d / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  s.connect(fl).connect(g).connect(a.destination);
  s.start(t0);
  s.stop(t0 + d + 0.05);
}

const SONS = {
  // Carte retournée : petit clic de carton.
  carte: a => { souffle(a, { d: 0.06, f: 3200, q: 1.5, vol: 0.16 }); note(a, { f: 900, f2: 600, d: 0.05, type: 'triangle', vol: 0.06 }); },
  // Cartes qui glissent l'une sur l'autre.
  glisse: a => souffle(a, { d: 0.32, f: 700, f2: 2400, q: 0.7, vol: 0.09 }),
  // Abracadabra : arpège qui monte, scintillant.
  magie: a => [784, 988, 1175, 1568, 1976].forEach((f, i) => note(a, { f, t: i * 0.055, d: 0.35, type: 'triangle', vol: 0.07 })),
  // Paire trouvée : deux notes de boîte à musique + un battement d'ailes.
  paire: a => {
    note(a, { f: 1046, d: 0.3, vol: 0.14 }); note(a, { f: 1568, t: 0.09, d: 0.45, vol: 0.12 });
    [0.05, 0.15, 0.25].forEach(t => souffle(a, { t, d: 0.07, f: 1800, q: 0.6, vol: 0.05 }));
  },
  // Combo : la même, une quinte plus haut.
  combo: a => { note(a, { f: 1318, d: 0.25, vol: 0.12 }); note(a, { f: 1976, t: 0.08, d: 0.4, vol: 0.11 }); note(a, { f: 2637, t: 0.16, d: 0.4, vol: 0.06 }); },
  // Raté : « pouf » de fumée + petite note qui descend.
  rate: a => { souffle(a, { d: 0.45, f: 900, f2: 200, q: 0.5, vol: 0.16, type: 'lowpass' }); note(a, { f: 330, f2: 196, t: 0.05, d: 0.32, type: 'triangle', vol: 0.09 }); },
  // Fin de tour : petite fanfare + applaudissements (rafale de claquements).
  bravo: a => {
    [523, 659, 784, 1046].forEach((f, i) => note(a, { f, t: i * 0.09, d: 0.4, type: 'triangle', vol: 0.09 }));
    for (let i = 0; i < 26; i++) souffle(a, { t: 0.15 + i * 0.045 + Math.random() * 0.03, d: 0.05, f: 1500 + Math.random() * 1500, q: 1.2, vol: 0.05 + Math.random() * 0.04 });
  },
  // Réviz lance : le bras qui fouette l'air.
  lance: a => souffle(a, { d: 0.22, f: 500, f2: 2600, q: 0.9, vol: 0.1 }),
  // La boule passe dans le filet de laine : un « chhh » qui descend.
  swish: a => souffle(a, { d: 0.32, f: 5200, f2: 2200, q: 0.7, vol: 0.12, type: 'highpass' }),
  // La boule heurte le cercle en pâte à modeler : un « bonk » mou qui rebondit.
  bonk: a => {
    note(a, { f: 210, f2: 120, d: 0.2, type: 'triangle', vol: 0.2 });
    souffle(a, { d: 0.08, f: 500, q: 0.6, vol: 0.12, type: 'lowpass' });
    note(a, { f: 330, f2: 520, t: 0.12, d: 0.16, vol: 0.06 });
  },
  // La craie qui écrit la question suivante : quelques petits grincements secs.
  craie: a => [0, 0.05, 0.11, 0.16, 0.23].forEach((t, i) => souffle(a, { t, d: 0.045, f: 2600 + i * 350, q: 4, vol: 0.05 })),
  // Une nouvelle boule de papier froissé dans la main.
  froisse: a => { for (let i = 0; i < 9; i++) souffle(a, { t: 0.05 + i * 0.022 + Math.random() * 0.015, d: 0.03, f: 3000 + Math.random() * 3000, q: 1.5, vol: 0.04 }); },
  // ── Réviz se trompe ? (jeu télé) ──
  // Le gros bouton qu'on écrase : un « clonk » de plastique sur ressort.
  appui: a => { note(a, { f: 180, f2: 90, d: 0.09, type: 'triangle', vol: 0.2 }); souffle(a, { d: 0.04, f: 2600, q: 2, vol: 0.12 }); },
  // Bonne réponse : la cloche du plateau, deux coups clairs.
  ding: a => {
    [[1318, 0], [1760, 0.13]].forEach(([f, t]) => {
      note(a, { f, t, d: 0.9, vol: 0.14 });
      note(a, { f: f * 2.76, t, d: 0.25, vol: 0.03 }); // partiel de cloche
    });
  },
  // Mauvaise réponse : le buzzer grave du jeu télé, deux dents de scie qui battent entre elles.
  buzzer: a => {
    note(a, { f: 98, d: 0.55, type: 'sawtooth', vol: 0.11 });
    note(a, { f: 104, d: 0.55, type: 'square', vol: 0.06 });
    note(a, { f: 49, d: 0.55, type: 'square', vol: 0.05 });
  },
  // Réviz grillé : le trombone triste (wah wah wah waaah), la dernière note tremble.
  trombone: a => {
    const notes = [[466, 0, 0.24], [440, 0.26, 0.24], [415, 0.52, 0.24], [392, 0.78, 0.7]];
    for (const [f, t, d] of notes) {
      const o = a.createOscillator(), fl = a.createBiquadFilter(), g = a.createGain(), t0 = a.currentTime + t;
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f / 2, t0);
      if (d > 0.5) { // vibrato qui s'élargit, et la note qui s'affaisse
        const lfo = a.createOscillator(), prof = a.createGain();
        lfo.frequency.value = 6; prof.gain.setValueAtTime(0, t0); prof.gain.linearRampToValueAtTime(9, t0 + d);
        lfo.connect(prof).connect(o.frequency); lfo.start(t0); lfo.stop(t0 + d + 0.05);
        o.frequency.linearRampToValueAtTime(f / 2 * 0.94, t0 + d);
      }
      fl.type = 'lowpass'; fl.Q.value = 4;
      fl.frequency.setValueAtTime(500, t0); fl.frequency.linearRampToValueAtTime(1300, t0 + 0.08); fl.frequency.linearRampToValueAtTime(600, t0 + d);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.13, t0 + 0.04);
      g.gain.setValueAtTime(0.13, t0 + d - 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.connect(fl).connect(g).connect(a.destination);
      o.start(t0); o.stop(t0 + d + 0.05);
    }
  },
  // Réviz triomphe : petite fanfare moqueuse (ta-da !) et le public qui rit.
  tada: a => {
    note(a, { f: 784, d: 0.12, type: 'square', vol: 0.05 });
    note(a, { f: 1046, t: 0.12, d: 0.5, type: 'square', vol: 0.06 });
    note(a, { f: 1318, t: 0.12, d: 0.5, type: 'triangle', vol: 0.06 });
  },
  // Transition entre deux jeux : petit jingle de boîte à musique (sol do mi sol, puis un carillon), court
  // pour ne pas couvrir la musique de la partie.
  jingle: a => {
    [[784, 0], [1046, 0.09], [1318, 0.18], [1568, 0.27]].forEach(([f, t], i) => note(a, { f, t, d: i === 3 ? 0.6 : 0.16, type: 'triangle', vol: 0.08 }));
    note(a, { f: 2093, t: 0.36, d: 0.7, vol: 0.05 }); note(a, { f: 3136, t: 0.4, d: 0.5, vol: 0.025 });
    souffle(a, { t: 0.3, d: 0.35, f: 5000, q: 0.8, vol: 0.03, type: 'highpass' });
  },
  // ── La pizzeria ! ──
  // Une part qu'on décolle : le fromage qui file (petit « plop » mou qui monte).
  part: a => { note(a, { f: 380, f2: 620, d: 0.09, type: 'triangle', vol: 0.12 }); souffle(a, { d: 0.06, f: 1400, q: 1, vol: 0.05 }); },
  // Elle se pose dans l'assiette : un petit choc de céramique, mat.
  assiette: a => { note(a, { f: 1650, d: 0.12, vol: 0.05 }); note(a, { f: 2480, d: 0.06, vol: 0.025 }); souffle(a, { d: 0.04, f: 900, q: 0.8, vol: 0.06, type: 'lowpass' }); },
  // Une part qui retourne sur la pizza : le plop à l'envers.
  retour: a => note(a, { f: 560, f2: 330, d: 0.09, type: 'triangle', vol: 0.1 }),
  // Servir : la sonnette du comptoir (ding !), un seul coup bien clair qui résonne.
  sonnette: a => { note(a, { f: 2093, d: 1.1, vol: 0.13 }); note(a, { f: 2093 * 2.4, d: 0.3, vol: 0.03 }); note(a, { f: 2100, d: 1.1, vol: 0.05 }); },
  // Le client emporte l'assiette : un glissement sur le bois.
  emporte: a => souffle(a, { d: 0.3, f: 500, f2: 1600, q: 0.8, vol: 0.08 }),
  // La nouvelle pizza arrive sur sa planche.
  planche: a => { note(a, { f: 150, f2: 110, d: 0.12, type: 'triangle', vol: 0.16 }); souffle(a, { d: 0.25, f: 700, f2: 300, q: 0.7, vol: 0.06 }); },
  // Réviz croque : un « crounch » de croûte (bruit sec, grave).
  croque: a => { souffle(a, { d: 0.09, f: 1100, q: 0.9, vol: 0.18 }); souffle(a, { t: 0.04, d: 0.07, f: 2400, q: 1.2, vol: 0.08 }); note(a, { f: 140, f2: 90, d: 0.07, type: 'triangle', vol: 0.1 }); },
  // Le baiser du chef : un petit « mwah » (bruit court + note qui monte).
  bisou: a => { souffle(a, { d: 0.06, f: 2200, q: 2, vol: 0.06 }); note(a, { f: 700, f2: 1300, t: 0.03, d: 0.16, vol: 0.07 }); },
  // Les 3 dernières secondes : un tic de bloc de bois, sec et bien présent (au-dessus de la musique).
  tic: a => { note(a, { f: 1250, d: 0.07, type: 'triangle', vol: 0.22 }); souffle(a, { d: 0.03, f: 3000, q: 3, vol: 0.12 }); },
  // Temps écoulé : la sonnerie du minuteur de cuisine (une clochette frappée très vite), pas le buzzer.
  minuteur: a => { for (let i = 0; i < 12; i++) { note(a, { f: 2350, t: i * 0.055, d: 0.09, vol: 0.09 }); note(a, { f: 3520, t: i * 0.055, d: 0.05, vol: 0.03 }); } },
  // Le client tapote le comptoir, impatient.
  tapote: a => [0, 0.12, 0.24].forEach(t => note(a, { f: 230, f2: 170, t, d: 0.06, type: 'triangle', vol: 0.12 })),
  // ── Le ninja des fautes ──
  // Le sabre fend l'air : un souffle bref qui monte.
  whoosh: a => souffle(a, { d: 0.16, f: 700, f2: 3200, q: 1.1, vol: 0.13 }),
  // La lame entre dans le fruit : un « tchac » sec (attaque claire) sur un petit choc mat.
  tchac: a => {
    souffle(a, { d: 0.05, f: 4200, q: 1.4, vol: 0.2 });
    note(a, { f: 260, f2: 120, d: 0.09, type: 'triangle', vol: 0.18 });
  },
  // Le jus gicle : un « splash » mouillé qui retombe, et quelques gouttes.
  splash: a => {
    souffle(a, { t: 0.02, d: 0.3, f: 2200, f2: 500, q: 0.7, vol: 0.13, type: 'lowpass' });
    [0.06, 0.11, 0.17, 0.24].forEach((t, i) => note(a, { f: 1500 - i * 180, f2: 700 - i * 60, t, d: 0.06, vol: 0.05 }));
  },
  // Une faute retombe au sol sans avoir été tranchée : un « ploc » mou qui descend.
  ploc: a => { note(a, { f: 330, f2: 110, d: 0.22, type: 'triangle', vol: 0.18 }); souffle(a, { d: 0.12, f: 600, q: 0.6, vol: 0.08, type: 'lowpass' }); },
  // Temps écoulé : le gong du dojo, grave et qui tremble (pas le buzzer d'une erreur).
  gong: a => {
    [[110, 0.2, 2.2], [165.5, 0.08, 1.6], [262, 0.05, 1.1], [393, 0.03, 0.7]].forEach(([f, vol, d]) => note(a, { f, f2: f * 0.985, d, vol }));
    souffle(a, { d: 0.12, f: 400, q: 0.6, vol: 0.1, type: 'lowpass' });
  },

  // Fin de partie : petite fanfare de boîte à musique (do mi sol do), plus longue pour un sans-faute ;
  // le compteur du score (tic de bois), chaque étoile (carillon qui monte), le record (deux cloches).
  fin: a => [523, 659, 784, 1046].forEach((f, i) => note(a, { f, t: i * 0.11, d: i === 3 ? 0.7 : 0.22, type: 'triangle', vol: 0.09 })),
  sansFaute: a => {
    [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => note(a, { f, t: i * 0.09, d: i === 5 ? 0.9 : 0.2, type: 'triangle', vol: 0.08 }));
    for (let i = 0; i < 14; i++) souffle(a, { t: 0.5 + i * 0.045 + Math.random() * 0.03, d: 0.04, f: 1800 + Math.random() * 1600, q: 1.2, vol: 0.05 });
  },
  compte: a => note(a, { f: 1500 + Math.random() * 200, d: 0.03, type: 'triangle', vol: 0.035 }),
  etoile: a => { note(a, { f: 1318, d: 0.3, vol: 0.09 }); note(a, { f: 1976, t: 0.06, d: 0.45, vol: 0.07 }); note(a, { f: 2637, t: 0.12, d: 0.5, vol: 0.04 }); },
  record: a => { note(a, { f: 1046, d: 0.5, vol: 0.1 }); note(a, { f: 1568, t: 0.14, d: 0.8, vol: 0.1 }); note(a, { f: 2093, t: 0.28, d: 0.9, vol: 0.05 }); },
  // Une carte du récap qui glisse sur le bureau (carton sur bois).
  page: a => { souffle(a, { d: 0.2, f: 1400, f2: 600, q: 0.9, vol: 0.12 }); souffle(a, { t: 0.15, d: 0.05, f: 500, q: 1, vol: 0.06, type: 'lowpass' }); },
  // ── Tape-taupe ! ──
  // Une taupe sort de son trou : un « pop » de bouchon qui monte, sur un peu de terre qui s'éboule.
  pop: a => {
    note(a, { f: 260, f2: 720, d: 0.09, vol: 0.13 });
    souffle(a, { d: 0.07, f: 900, q: 0.7, vol: 0.05, type: 'lowpass' });
  },
  // Le maillet en mousse s'écrase sur la taupe : un « pouf » mou et grave, puis un petit rebond.
  maillet: a => {
    note(a, { f: 150, f2: 70, d: 0.16, type: 'triangle', vol: 0.26 });
    souffle(a, { d: 0.11, f: 650, f2: 250, q: 0.6, vol: 0.2, type: 'lowpass' });
    note(a, { f: 420, f2: 640, t: 0.09, d: 0.12, vol: 0.06 });
  },
  // La mauvaise taupe tapée : son petit cri vexé (« couic ! »), aigu, qui monte puis retombe.
  couic: a => {
    note(a, { f: 900, f2: 1500, d: 0.08, type: 'triangle', vol: 0.11 });
    note(a, { f: 1500, f2: 820, t: 0.08, d: 0.14, type: 'triangle', vol: 0.1 });
  },
  // Une bonne taupe ratée redescend en ricanant : trois « hi » aigus qui descendent.
  hihi: a => [1180, 1080, 960].forEach((f, i) => note(a, { f, f2: f * 1.12, t: i * 0.085, d: 0.07, type: 'triangle', vol: 0.07 })),
  // Temps écoulé : la cloche de la ferme, deux coups graves qui résonnent (pas le buzzer d'une erreur).
  cloche: a => {
    [0, 0.32].forEach(t => [[392, 0.16, 1.3], [940, 0.05, 0.8], [1520, 0.03, 0.5]].forEach(([f, vol, d]) => note(a, { f, f2: f * 0.99, t, d, vol })));
  },
};

export function jouer(nom) {
  const a = audio();
  if (!a || !SONS[nom]) return;
  try { SONS[nom](a); } catch { /* audio indisponible : on joue en silence */ }
}
