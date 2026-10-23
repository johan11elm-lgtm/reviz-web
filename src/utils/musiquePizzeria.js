/**
 * Musique de « La pizzeria ! », composée en code (23/10) : une tarentelle en la mineur, à 6/8, qui
 * tourne comme une pâte à pizza. Quatre voix synthétisées en Web Audio : la mandoline (mélodie
 * pincée, trémolo sur les notes tenues), l'accordéon (accords sur les contretemps, deux anches un
 * peu désaccordées et un léger vibrato), la basse (fondamentale et quinte sur les deux temps), et
 * le tambourin (grelots sur chaque croche, plus forts sur les temps). Le tempo monte à chaque tour ;
 * dans les 3 dernières secondes du chrono (tension), elle s'emballe (+20 %) ; le tic des secondes
 * est joué par le jeu (bruitage « tic »).
 *
 * Même séquenceur que les autres musiques des jeux : toutes les 25 ms, on programme les croches
 * des 120 prochaines ms sur l'horloge audio. La musique suit le bouton son des bruitages.
 * Une piste Flow Music pourra la remplacer (comme pour le buzzer : public/jeux/pizzeria/boucle.mp3).
 */
import { sonActif } from './bruitages';

const NOTES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = n => {
  const [, nom, oct] = n.match(/^([A-G]#?)(\d)$/);
  return 440 * 2 ** ((NOTES[nom] + (Number(oct) + 1) * 12 - 69) / 12);
};

// 8 mesures de 6 croches (deux temps pointés). Une note par croche, null (silence), « - » tient.
const _ = null, T = '-';
const MELODIE = [
  ['E5', T, 'E5', 'E5', 'D5', 'C5'],
  ['D5', T, 'D5', 'D5', 'C5', 'B4'],
  ['C5', T, 'C5', 'C5', 'B4', 'A4'],
  ['B4', T, 'G#4', 'E4', T, _],
  ['A4', T, 'C5', 'E5', T, 'A5'],
  ['G5', T, 'F5', 'E5', T, 'D5'],
  ['C5', T, 'E5', 'B4', T, 'G#4'],
  ['A4', T, 'E4', 'A4', T, _],
];
// Par mesure : [basse, quinte, accord].
const ACCORDS = [
  ['A2', 'E3', ['A3', 'C4', 'E4']], ['E2', 'B2', ['G#3', 'B3', 'E4']], ['A2', 'E3', ['A3', 'C4', 'E4']], ['E2', 'B2', ['G#3', 'B3', 'D4']],
  ['A2', 'E3', ['A3', 'C4', 'E4']], ['D2', 'A2', ['A3', 'D4', 'F4']], ['E2', 'B2', ['G#3', 'B3', 'E4']], ['A2', 'E3', ['A3', 'C4', 'E4']],
];

let ctx = null, sortie = null, minuterie = null, bruit = null;
let pas = 0, prochaine = 0, tempo = 116, tension = false;

function contexte() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// Mandoline : une corde pincée (triangle + un peu de carré, filtre qui se referme vite).
function pince(t, f, vol = 0.07) {
  const fl = ctx.createBiquadFilter(), g = ctx.createGain();
  fl.type = 'lowpass'; fl.Q.value = 1.5;
  fl.frequency.setValueAtTime(4200, t);
  fl.frequency.exponentialRampToValueAtTime(1300, t + 0.12);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  fl.connect(g).connect(sortie);
  for (const [type, k] of [['triangle', 1], ['square', 0.25]]) {
    const o = ctx.createOscillator(), gk = ctx.createGain();
    o.type = type; o.frequency.value = f; gk.gain.value = k;
    o.connect(gk).connect(fl); o.start(t); o.stop(t + 0.22);
  }
}
// Accordéon : deux anches désaccordées, filtrées, vibrato léger ; attaque douce.
function anche(t, f, d, vol = 0.018) {
  const fl = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), prof = ctx.createGain();
  fl.type = 'lowpass'; fl.frequency.value = 2200;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.025);
  g.gain.setValueAtTime(vol, t + d * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  lfo.frequency.value = 5.5; prof.gain.value = 4;
  lfo.connect(prof);
  fl.connect(g).connect(sortie);
  for (const det of [-9, 9]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
    prof.connect(o.detune);
    o.connect(fl); o.start(t); o.stop(t + d + 0.02);
  }
  lfo.start(t); lfo.stop(t + d + 0.02);
}
function basse(t, f, d, vol = 0.2) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'triangle'; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(sortie); o.start(t); o.stop(t + d + 0.02);
}
function grelots(t, vol, d) {
  if (!bruit) {
    bruit = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = bruit.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = bruit; fl.type = 'bandpass'; fl.frequency.value = 7200; fl.Q.value = 2.5;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(fl).connect(g).connect(sortie); s.start(t); s.stop(t + d + 0.02);
}

function jouerPas(t, croche) {
  const mesure = Math.floor(pas / 6) % 8, c = pas % 6;
  const ligne = MELODIE[mesure];
  const n = ligne[c];
  if (n && n !== T) {
    let long = 1;
    while (c + long < 6 && ligne[c + long] === T) long += 1;
    // Trémolo de mandoline : la note tenue est repincée à la double croche, de plus en plus doux.
    const coups = long > 1 ? long * 2 : 1;
    for (let k = 0; k < coups; k++) pince(t + k * croche / 2, freq(n), 0.07 * (k ? 0.55 - k * 0.04 : 1));
  }
  const [b, quinte, accord] = ACCORDS[mesure];
  if (c === 0) basse(t, freq(b), croche * 2.6);
  if (c === 3) basse(t, freq(quinte), croche * 2.6);
  // Oom-pa-pa : l'accordéon sur les croches 2, 3, 5 et 6.
  if (c % 3) accord.forEach(x => anche(t, freq(x), croche * 0.8));
  grelots(t, c % 3 === 0 ? 0.05 : 0.022, c % 3 === 0 ? 0.12 : 0.05);
  pas += 1;
}

function boucle() {
  const croche = 60 / (tension ? tempo * 1.2 : tempo) / 3; // le tempo compte les temps pointés (trois croches)
  while (prochaine < ctx.currentTime + 0.12) {
    jouerPas(prochaine, croche);
    prochaine += croche;
  }
}

export const musiquePizzeria = {
  demarrer() {
    if (minuterie || !sonActif()) return;
    if (!contexte()) return;
    sortie = ctx.createGain();
    sortie.gain.setValueAtTime(0.0001, ctx.currentTime);
    sortie.gain.exponentialRampToValueAtTime(0.85, ctx.currentTime + 0.4);
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
    s.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    setTimeout(() => s.disconnect(), 450);
  },
  /** bpm : tempo du tour (temps pointés) ; enTension : les dernières secondes, elle s'emballe. */
  regler({ bpm, enTension } = {}) {
    if (bpm) tempo = bpm;
    if (enTension !== undefined) tension = enTension;
  },
  joue: () => !!minuterie,
};
