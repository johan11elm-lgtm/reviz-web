/**
 * Musique du tour de magie, composée en code (22/10) : une boucle de 8 mesures façon boîte à
 * musique de cabaret, en do majeur, avec quelques chromatismes malicieux. Trois voix synthétisées
 * en Web Audio : la boîte à musique (mélodie), la contrebasse en pizzicato (fondamentale et quinte)
 * et des accords pincés sur les contretemps ; un balai de caisse claire très léger. Pendant que
 * Réviz mélange, le tempo monte et un woodblock fait tic-tac sur chaque croche.
 *
 * Séquenceur classique : toutes les 25 ms, on programme les croches des 120 prochaines ms sur
 * l'horloge audio (précis même si l'onglet ralentit). La musique suit le bouton son des bruitages.
 *
 * Deuxième version (22/10) : une piste générée sur Google Flow Music, montée en boucle sans couture
 * (public/jeux/magie/boucle-melange.mp3, deux périodes par fichier : on boucle une fenêtre d'une
 * période, ce qui absorbe le silence d'encodage du MP3), accélérée à chaque tour. C'est la
 * version par défaut ; ?musique=code dans l'adresse rejoue la version composée en code. Attention :
 * pistes faites sur un compte Flow gratuit, sans usage commercial, à regénérer avant le lancement.
 */
import { sonActif } from './bruitages';

const NOTES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = n => {
  const [, nom, oct] = n.match(/^([A-G]#?)(\d)$/);
  return 440 * 2 ** ((NOTES[nom] + (Number(oct) + 1) * 12 - 69) / 12);
};

// 8 mesures de 8 croches. Mélodie : une note par croche ou null (silence).
const _ = null;
const MELODIE = [
  ['E5', _, 'G5', _, 'C6', _, 'G5', 'E5'],
  ['A5', _, 'G5', _, 'E5', _, 'C5', _],
  ['F5', _, 'A5', _, 'C6', _, 'A5', 'F5'],
  ['G5', 'F#5', 'G5', _, 'D5', _, 'B4', _],
  ['E5', _, 'G5', _, 'C6', _, 'E6', 'D6'],
  ['C#6', _, 'A5', _, 'E5', _, 'G5', _],
  ['F5', _, 'A5', _, 'G5', _, 'F5', 'D5'],
  ['C5', _, 'E5', 'G5', 'C6', _, _, _],
];
// Harmonie : par demi-mesure, [basse temps 1, basse temps 3, accord pincé].
const ACCORDS = [
  ['C3', 'G2', ['E4', 'G4', 'C5']], ['C3', 'G2', ['E4', 'G4', 'C5']],
  ['A2', 'E3', ['A4', 'C5', 'E5']], ['A2', 'E3', ['A4', 'C5', 'E5']],
  ['F2', 'C3', ['F4', 'A4', 'C5']], ['F2', 'C3', ['F4', 'A4', 'C5']],
  ['G2', 'D3', ['G4', 'B4', 'D5']], ['G2', 'D3', ['F4', 'G4', 'B4']],
  ['C3', 'G2', ['E4', 'G4', 'C5']], ['C3', 'G2', ['E4', 'G4', 'C5']],
  ['A2', 'E3', ['C#5', 'E5', 'G5']], ['A2', 'E3', ['C#5', 'E5', 'G5']],
  ['D3', 'A2', ['D4', 'F4', 'A4']], ['G2', 'D3', ['F4', 'G4', 'B4']],
  ['C3', 'G2', ['E4', 'G4', 'C5']], ['C3', 'G2', ['E4', 'G4', 'C5']],
];

let ctx = null, sortie = null, minuterie = null;
let pas = 0, prochaine = 0, tempo = 108, melange = false;

function contexte() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// Boîte à musique : fondamentale sinus + partiel aigu inharmonique (lame de métal), chute rapide.
function boite(t, f, vol = 0.09) {
  for (const [mult, v, d] of [[1, vol, 0.9], [4.2, vol * 0.18, 0.25], [2, vol * 0.25, 0.5]]) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f * mult;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(sortie); o.start(t); o.stop(t + d + 0.02);
  }
}
// Pizzicato : triangle filtré, attaque sèche, chute courte.
function pizz(t, f, vol, d = 0.28) {
  const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'triangle'; o.frequency.value = f;
  fl.type = 'lowpass'; fl.frequency.value = Math.min(4000, f * 6);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(fl).connect(g).connect(sortie); o.start(t); o.stop(t + d + 0.02);
}
// Bruit court filtré (balai, woodblock).
let bruit = null;
function souffle(t, f, q, vol, d) {
  if (!bruit) {
    bruit = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = bruit.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = bruit; fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = q;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(fl).connect(g).connect(sortie); s.start(t); s.stop(t + d + 0.02);
}
function woodblock(t, haut) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(haut ? 1250 : 950, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.06, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  o.connect(g).connect(sortie); o.start(t); o.stop(t + 0.08);
}

function jouerPas(t) {
  const mesure = Math.floor(pas / 8) % 8, croche = pas % 8;
  const note = MELODIE[mesure][croche];
  if (note) boite(t, freq(note), melange ? 0.08 : 0.09);
  const [b1, b3, accord] = ACCORDS[mesure * 2 + (croche >= 4 ? 1 : 0)];
  if (croche === 0) pizz(t, freq(b1), 0.16, 0.35);
  if (croche === 4) pizz(t, freq(b3), 0.14, 0.35);
  if (croche === 2 || croche === 6) accord.forEach(n => pizz(t, freq(n), 0.035, 0.18));
  if (croche === 2 || croche === 6) souffle(t, 3500, 0.6, 0.025, 0.12);
  if (melange) woodblock(t, croche % 2 === 0);
  pas += 1;
}

function boucle() {
  const croche = 60 / tempo / 2;
  while (prochaine < ctx.currentTime + 0.12) {
    jouerPas(prochaine);
    prochaine += croche * (pas % 2 === 0 ? 0.92 : 1.08); // léger swing de cabaret
  }
}

const musiqueCode = {
  demarrer() {
    if (minuterie || !sonActif()) return;
    if (!contexte()) return;
    sortie = ctx.createGain();
    sortie.gain.setValueAtTime(0.0001, ctx.currentTime);
    sortie.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 0.6);
    sortie.connect(ctx.destination);
    pas = 0;
    prochaine = ctx.currentTime + 0.05;
    minuterie = setInterval(boucle, 25);
  },
  arreter() {
    if (!minuterie) return;
    clearInterval(minuterie);
    minuterie = null;
    const s = sortie;
    s.gain.cancelScheduledValues(ctx.currentTime);
    s.gain.setValueAtTime(s.gain.value, ctx.currentTime);
    s.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    setTimeout(() => s.disconnect(), 500);
  },
  /** jeu : tempo du tour ; melange : plus vite, avec le tic-tac du woodblock. */
  regler({ bpm, enMelange } = {}) {
    if (bpm) tempo = bpm;
    if (enMelange !== undefined) melange = enMelange;
  },
  joue: () => !!minuterie,
};

// ── Version Flow Music : une seule boucle, la variation « mélange » (la plus vive), accélérée ──
// Son tempo d'origine est ~110 à la noire : on la joue à bpm / 110 (×1,05 au 1er tour, puis +8 %).
const BOUCLE = '/jeux/magie/boucle-melange.mp3';
let tampon = null, chargement = null;
function charger() {
  chargement ??= fetch(BOUCLE).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(t => { tampon = t; })
    .catch(e => { chargement = null; throw e; });
  return chargement;
}
const flux = { source: null, bpm: 116, actif: false };
const vitesse = () => flux.bpm / 110;
const musiqueFlow = {
  async demarrer() {
    if (flux.actif || !sonActif() || !contexte()) return;
    flux.actif = true;
    sortie = ctx.createGain();
    sortie.gain.setValueAtTime(0.0001, ctx.currentTime);
    sortie.gain.exponentialRampToValueAtTime(0.6, ctx.currentTime + 0.8);
    sortie.connect(ctx.destination);
    try { await charger(); } catch { flux.actif = false; musiqueCode.demarrer(); return; }
    if (!flux.actif) return; // arrêtée pendant le chargement
    const s = ctx.createBufferSource();
    s.buffer = tampon; s.loop = true; s.loopStart = 0.5; s.loopEnd = 0.5 + tampon.duration / 2;
    s.playbackRate.value = vitesse();
    s.connect(sortie);
    s.start(ctx.currentTime + 0.05, 0.5);
    flux.source = s;
  },
  arreter() {
    musiqueCode.arreter();
    if (!flux.actif) return;
    flux.actif = false;
    const out = sortie, s = flux.source;
    flux.source = null;
    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setValueAtTime(out.gain.value, ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    setTimeout(() => { s?.stop(); out.disconnect(); }, 600);
  },
  regler({ bpm } = {}) {
    if (bpm) flux.bpm = bpm;
    flux.source?.playbackRate.setTargetAtTime(vitesse(), ctx.currentTime, 0.3);
  },
  joue: () => flux.actif,
};

const versionCode = typeof location !== 'undefined' && new URLSearchParams(location.search).get('musique') === 'code';
export const musiqueMagie = versionCode ? musiqueCode : musiqueFlow;
