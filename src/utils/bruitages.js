/**
 * Bruitages de Réviz Games, synthétisés à la volée (Web Audio) : aucun fichier à charger, rien à
 * licencier. Sons courts et doux, façon jouet en bois et boîte à musique. Le son se coupe avec
 * bruitagesActifs(false) (mémorisé sur l'appareil) ; rien ne sonne avant un premier geste de
 * l'élève (le navigateur l'interdit de toute façon).
 */
const CLE = 'reviz-jeux-son';
let ctx = null;
let actif = (() => { try { return localStorage.getItem(CLE) !== '0'; } catch { return true; } })();

export const sonActif = () => actif;
export function bruitagesActifs(oui) {
  actif = oui;
  try { localStorage.setItem(CLE, oui ? '1' : '0'); } catch { /* stockage indisponible */ }
}

function audio() {
  if (!actif) return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
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
};

export function jouer(nom) {
  const a = audio();
  if (!a || !SONS[nom]) return;
  try { SONS[nom](a); } catch { /* audio indisponible : on joue en silence */ }
}
