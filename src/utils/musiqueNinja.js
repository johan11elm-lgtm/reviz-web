/**
 * Musique du ninja des fautes, composée en code (23/10) : une boucle de 8 mesures façon dojo de jeu
 * vidéo, en ré mineur pentatonique (ré fa sol la do), qui file droit. Quatre voix en Web Audio : le
 * koto (mélodie pincée, la note glisse un peu à l'attaque), le shamisen (basse pincée, sèche), les
 * taikos (grand tambour sur les temps 1 et 3, « ka » du bord sur les contretemps), un shaker léger.
 * Chaque tour la rejoue plus vite (regler({ bpm })) ; dans les 3 dernières secondes du chrono
 * (enTension), elle s'emballe (+20 %) et un tambour double chaque temps.
 *
 * Même séquenceur que Réviz lance (musiqueLance.js) : toutes les 25 ms, on programme les croches
 * des 120 prochaines ms sur l'horloge audio. Elle suit le bouton son.
 *
 * Deuxième version (23/10) : la piste « Clay Ninja Fruit Cut » choisie par Johan sur Google Flow
 * Music (public/jeux/ninja/musique.mp3, 3 min 01, fin fondue), jouée entière en boucle, sans
 * montage, accélérée à chaque tour (tempo du tour / 140) et de 20 % dans les dernières secondes.
 * C'est la version par défaut ; ?musique=code rejoue la version composée en code, qui sert aussi de
 * repli si le fichier ne se charge pas. Piste faite sur un compte Flow gratuit, sans usage
 * commercial : à regénérer avant le lancement.
 */
import { sonActif, contexteAudio } from './bruitages';

const NOTES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const freq = n => {
  const [, nom, oct] = n.match(/^([A-G])(\d)$/);
  return 440 * 2 ** ((NOTES[nom] + (Number(oct) + 1) * 12 - 69) / 12);
};

const _ = null;
const MELODIE = [
  ['D5', _, 'F5', 'G5', 'A5', _, 'G5', 'F5'],
  ['G5', _, 'A5', 'C6', 'A5', _, 'G5', _],
  ['F5', _, 'G5', 'A5', 'D6', 'C6', 'A5', 'G5'],
  ['A5', _, _, 'G5', 'F5', _, 'D5', _],
  ['D5', _, 'F5', 'G5', 'A5', _, 'C6', 'A5'],
  ['D6', _, 'C6', 'A5', 'G5', _, 'A5', _],
  ['F5', 'G5', 'A5', 'G5', 'F5', 'D5', 'F5', 'G5'],
  ['D5', _, _, _, 'A4', _, 'D5', _],
];
// Par mesure : la basse des temps 1 et 3.
const BASSE = [['D3', 'A2'], ['G2', 'D3'], ['F2', 'C3'], ['A2', 'A2'], ['D3', 'A2'], ['C3', 'G2'], ['F2', 'C3'], ['D3', 'A2']];

let ctx = null, sortie = null, minuterie = null, bruit = null;
let pas = 0, prochaine = 0, tempo = 132, tension = false;

// Le contexte audio partagé avec les bruitages (un seul pour la page, voir bruitages.js).
function contexte() {
  ctx = contexteAudio();
  return ctx;
}

// Corde pincée : dent de scie filtrée qui se ferme vite ; la hauteur glisse d'un rien vers la note.
function pince(t, f, { vol = 0.09, d = 0.45, ouvre = 3200, glisse = 1.03 } = {}) {
  const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(f * glisse, t);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
  fl.type = 'lowpass'; fl.Q.value = 2;
  fl.frequency.setValueAtTime(ouvre, t);
  fl.frequency.exponentialRampToValueAtTime(Math.max(200, f * 1.5), t + d * 0.6);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(fl).connect(g).connect(sortie); o.start(t); o.stop(t + d + 0.02);
}
function souffle(t, f, q, vol, d, type = 'bandpass') {
  if (!bruit) {
    bruit = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = bruit.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = bruit; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(fl).connect(g).connect(sortie); s.start(t); s.stop(t + d + 0.02);
}
// Le grand taiko : une peau grave qui descend, et le coup de mailloche.
function taiko(t, vol = 0.26) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.22);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  o.connect(g).connect(sortie); o.start(t); o.stop(t + 0.34);
  souffle(t, 300, 0.7, vol * 0.35, 0.06, 'lowpass');
}
// « Ka » : le bord du tambour, sec.
const ka = (t, vol = 0.06) => { souffle(t, 2400, 3, vol, 0.035); souffle(t, 900, 2, vol * 0.6, 0.03); };

function jouerPas(t) {
  const mesure = Math.floor(pas / 8) % 8, croche = pas % 8;
  const note = MELODIE[mesure][croche];
  if (note) pince(t, freq(note));
  const [b1, b3] = BASSE[mesure];
  if (croche === 0) pince(t, freq(b1), { vol: 0.13, d: 0.28, ouvre: 900, glisse: 1 });
  if (croche === 4) pince(t, freq(b3), { vol: 0.12, d: 0.24, ouvre: 900, glisse: 1 });
  if (croche === 0 || croche === 4) taiko(t);
  if (tension && (croche === 2 || croche === 6)) taiko(t, 0.18);
  if (croche === 3 || croche === 7) ka(t);
  if (croche % 2 === 1) souffle(t, 7500, 0.9, 0.016, 0.05);
  pas += 1;
}

function boucle() {
  const croche = 60 / (tension ? tempo * 1.2 : tempo) / 2;
  while (prochaine < ctx.currentTime + 0.12) {
    jouerPas(prochaine);
    prochaine += croche;
  }
}

const musiqueCode = {
  demarrer() {
    if (minuterie || !sonActif() || !contexte()) return;
    sortie = ctx.createGain();
    sortie.gain.setValueAtTime(0.0001, ctx.currentTime);
    sortie.gain.exponentialRampToValueAtTime(0.8, ctx.currentTime + 0.6);
    sortie.connect(ctx.destination);
    pas = 0;
    prochaine = ctx.currentTime + 0.05;
    minuterie = setInterval(boucle, 25);
  },
  arreter() {
    if (!minuterie) return;
    clearInterval(minuterie);
    minuterie = null;
    tension = false;
    const s = sortie;
    s.gain.cancelScheduledValues(ctx.currentTime);
    s.gain.setValueAtTime(s.gain.value, ctx.currentTime);
    s.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    setTimeout(() => s.disconnect(), 500);
  },
  /** bpm : tempo du tour ; enTension : les dernières secondes, elle s'emballe. */
  regler({ bpm, enTension } = {}) {
    if (bpm) tempo = bpm;
    if (enTension !== undefined) tension = enTension;
  },
  joue: () => !!minuterie,
};

// ── Version Flow Music : la piste entière en boucle, jouée à bpm / 140 ──
const PISTE = { url: '/jeux/ninja/musique.mp3', bpm: 140 };
let tampon = null, chargement = null;
function charger() {
  chargement ??= fetch(PISTE.url).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(t => { tampon = t; })
    .catch(e => { chargement = null; throw e; });
  return chargement;
}
const flux = { source: null, sortie: null, bpm: 132, tension: false, actif: false };
const vitesse = () => (flux.bpm / PISTE.bpm) * (flux.tension ? 1.2 : 1);
const musiqueFlow = {
  async demarrer() {
    if (flux.actif || !sonActif() || !contexte()) return;
    flux.actif = true;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(0.6, ctx.currentTime + 0.8);
    out.connect(ctx.destination);
    flux.sortie = out;
    try { await charger(); } catch { flux.actif = false; out.disconnect(); musiqueCode.regler({ bpm: flux.bpm }); musiqueCode.demarrer(); return; }
    if (!flux.actif) return; // arrêtée pendant le chargement
    const s = ctx.createBufferSource();
    s.buffer = tampon; s.loop = true;
    s.playbackRate.value = vitesse();
    s.connect(out);
    s.start(ctx.currentTime + 0.05);
    flux.source = s;
  },
  arreter() {
    musiqueCode.arreter();
    flux.tension = false;
    if (!flux.actif) return;
    flux.actif = false;
    const out = flux.sortie, s = flux.source;
    flux.source = null; flux.sortie = null;
    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setValueAtTime(out.gain.value, ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    setTimeout(() => { s?.stop(); out.disconnect(); }, 600);
  },
  /** bpm : tempo du tour ; enTension : les dernières secondes, elle s'emballe. */
  regler({ bpm, enTension } = {}) {
    if (bpm) flux.bpm = bpm;
    if (enTension !== undefined) flux.tension = enTension;
    musiqueCode.regler({ bpm, enTension });
    if (ctx) flux.source?.playbackRate.setTargetAtTime(vitesse(), ctx.currentTime, enTension === undefined ? 0.3 : 0.1);
  },
  joue: () => flux.actif || musiqueCode.joue(),
};

const versionCode = typeof location !== 'undefined' && new URLSearchParams(location.search).get('musique') === 'code';
export const musiqueNinja = versionCode ? musiqueCode : musiqueFlow;
