/**
 * Musique de « Réviz se trompe ? », composée en code (23/10) : un générique de jeu télé, en do
 * majeur, qui sautille. Quatre voix synthétisées en Web Audio : les cuivres (mélodie, deux dents de
 * scie un peu désaccordées et filtrées), la basse qui rebondit en octaves, des accords piqués sur
 * les contretemps, et une batterie (grosse caisse, caisse claire, charleston). Le tempo monte à
 * chaque tour ; dans les dernières secondes du chrono (tension), un tic-tac s'ajoute.
 *
 * Même séquenceur que la musique du tour de magie : toutes les 25 ms, on programme les croches des
 * 120 prochaines ms sur l'horloge audio. La musique suit le bouton son des bruitages.
 *
 * Deuxième version (23/10), par défaut : une piste générée sur Google Flow Music (« Clay Showdown
 * (Alt) », 120 BPM), montée en boucle par assets-src/jeux/buzzer/boucle.py : 8 mesures de 16 s
 * exactement, fin fondue dans le début, deux périodes par fichier (on boucle une fenêtre d'une
 * période au milieu, ce qui absorbe le décalage de l'encodeur MP3). Elle est accélérée à chaque
 * tour (le tempo du tour / 128) ; le tic-tac des dernières secondes reste synthétisé par-dessus.
 * ?musique=code rejoue la version composée en code. Attention : piste faite sur un compte Flow
 * gratuit, sans usage commercial, à regénérer avant le lancement (comme celle de la magie).
 */
import { sonActif } from './bruitages';

const NOTES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = n => {
  const [, nom, oct] = n.match(/^([A-G]#?)(\d)$/);
  return 440 * 2 ** ((NOTES[nom] + (Number(oct) + 1) * 12 - 69) / 12);
};

// 8 mesures de 8 croches. Mélodie : une note par croche ou null (silence) ; « - » tient la note.
const _ = null, T = '-';
const MELODIE = [
  ['G4', _, 'C5', _, 'E5', _, 'G5', 'E5'],
  ['A5', T, 'G5', 'E5', 'C5', _, 'E5', _],
  ['F5', _, 'A5', _, 'C6', _, 'A5', 'F5'],
  ['G5', 'F5', 'E5', 'D5', 'B4', _, 'D5', _],
  ['E5', _, 'G5', _, 'C6', _, 'B5', 'C6'],
  ['A5', T, 'E5', _, 'C5', _, 'E5', 'A5'],
  ['F5', _, 'D5', 'F5', 'G5', _, 'B4', 'D5'],
  ['C5', _, 'G4', _, 'C5', T, T, _],
];
// Par demi-mesure : [basse, accord].
const ACCORDS = [
  ['C3', ['E4', 'G4', 'C5']], ['C3', ['E4', 'G4', 'C5']], ['A2', ['E4', 'A4', 'C5']], ['A2', ['E4', 'A4', 'C5']],
  ['F2', ['F4', 'A4', 'C5']], ['F2', ['F4', 'A4', 'C5']], ['G2', ['D4', 'G4', 'B4']], ['G2', ['F4', 'G4', 'B4']],
  ['C3', ['E4', 'G4', 'C5']], ['C3', ['E4', 'G4', 'C5']], ['A2', ['E4', 'A4', 'C5']], ['A2', ['E4', 'A4', 'C5']],
  ['D3', ['D4', 'F4', 'A4']], ['G2', ['D4', 'F4', 'B4']], ['C3', ['E4', 'G4', 'C5']], ['C3', ['E4', 'G4', 'C5']],
];

let ctx = null, sortie = null, minuterie = null, bruit = null;
let pas = 0, prochaine = 0, tempo = 128, tension = false;

function contexte() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// Cuivres : deux dents de scie désaccordées, filtre qui s'ouvre à l'attaque (le « blat » du cuivre).
function cuivre(t, f, d, vol = 0.05) {
  const fl = ctx.createBiquadFilter(), g = ctx.createGain();
  fl.type = 'lowpass'; fl.Q.value = 2;
  fl.frequency.setValueAtTime(700, t);
  fl.frequency.exponentialRampToValueAtTime(3200, t + 0.04);
  fl.frequency.exponentialRampToValueAtTime(1400, t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.setValueAtTime(vol * 0.8, t + d * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  fl.connect(g).connect(sortie);
  for (const det of [-7, 7]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
    o.connect(fl); o.start(t); o.stop(t + d + 0.02);
  }
}
// Basse : triangle bien rond, attaque sèche.
function basse(t, f, d, vol = 0.18) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'triangle'; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(sortie); o.start(t); o.stop(t + d + 0.02);
}
// Accord piqué : carrés filtrés, très courts.
function pique(t, f, vol = 0.02) {
  const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'square'; o.frequency.value = f;
  fl.type = 'lowpass'; fl.frequency.value = 1800;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
  o.connect(fl).connect(g).connect(sortie); o.start(t); o.stop(t + 0.13);
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
function grosseCaisse(t) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.3, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(g).connect(sortie); o.start(t); o.stop(t + 0.2);
}
function tic(t, haut) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.value = haut ? 1500 : 1150;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.07, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.connect(g).connect(sortie); o.start(t); o.stop(t + 0.07);
}

function jouerPas(t, croche) {
  const mesure = Math.floor(pas / 8) % 8, c = pas % 8;
  const ligne = MELODIE[mesure];
  const n = ligne[c];
  if (n && n !== T) {
    let long = 1;
    while (c + long < 8 && ligne[c + long] === T) long += 1;
    cuivre(t, freq(n), croche * long * 0.92);
  }
  const [b, accord] = ACCORDS[mesure * 2 + (c >= 4 ? 1 : 0)];
  // Basse en octaves qui rebondissent : fondamentale sur le temps, octave sur le contretemps.
  if (c % 2 === 0) basse(t, freq(b) * (c % 4 === 2 ? 2 : 1), croche * 0.9);
  if (c % 2 === 1) accord.forEach(x => pique(t, freq(x)));
  if (c === 0 || c === 4) grosseCaisse(t);
  if (c === 2 || c === 6) { souffle(t, 1800, 0.7, 0.09, 0.14); souffle(t, 200, 1, 0.05, 0.08, 'lowpass'); }
  souffle(t, 8000, 1.2, c % 2 ? 0.025 : 0.012, 0.04, 'highpass');
  if (tension) tic(t, c % 2 === 0);
  pas += 1;
}

function boucle() {
  const croche = 60 / tempo / 2;
  while (prochaine < ctx.currentTime + 0.12) {
    jouerPas(prochaine, croche);
    prochaine += croche;
  }
}

const musiqueCode = {
  demarrer() {
    if (minuterie || !sonActif()) return;
    if (!contexte()) return;
    sortie = ctx.createGain();
    sortie.gain.setValueAtTime(0.0001, ctx.currentTime);
    sortie.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 0.4);
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
  /** bpm : tempo du tour ; enTension : le tic-tac des dernières secondes. */
  regler({ bpm, enTension } = {}) {
    if (bpm) tempo = bpm;
    if (enTension !== undefined) tension = enTension;
  },
  joue: () => !!minuterie,
};

// ── Version Flow Music : la boucle, jouée de plus en plus vite ──
const BOUCLE = '/jeux/buzzer/boucle.mp3';
const PERIODE = 16; // secondes, exactement (8 mesures à 120 BPM)
const BASE = 128; // tempo du premier tour : vitesse 1
let tampon = null, chargement = null, minuterieTic = null, prochainTic = 0, numTic = 0;
function charger() {
  chargement ??= fetch(BOUCLE).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(t => { tampon = t; })
    .catch(e => { chargement = null; throw e; });
  return chargement;
}
const flux = { source: null, bpm: BASE, actif: false };
const vitesse = () => flux.bpm / BASE;
// Tic-tac des dernières secondes, calé sur la noire de la piste (120 BPM à vitesse 1).
function tictac() {
  const noire = 60 / (120 * vitesse());
  while (prochainTic < ctx.currentTime + 0.12) {
    if (tension) tic(prochainTic, numTic % 2 === 0);
    prochainTic += noire; numTic += 1;
  }
}
const musiqueFlow = {
  async demarrer() {
    if (flux.actif || !sonActif() || !contexte()) return;
    flux.actif = true;
    sortie = ctx.createGain();
    sortie.gain.setValueAtTime(0.0001, ctx.currentTime);
    sortie.gain.exponentialRampToValueAtTime(0.55, ctx.currentTime + 0.6);
    sortie.connect(ctx.destination);
    try { await charger(); } catch { flux.actif = false; musiqueCode.demarrer(); return; }
    if (!flux.actif) return; // arrêtée pendant le chargement
    const s = ctx.createBufferSource();
    s.buffer = tampon; s.loop = true; s.loopStart = 0.5; s.loopEnd = 0.5 + PERIODE;
    s.playbackRate.value = vitesse();
    s.connect(sortie);
    s.start(ctx.currentTime + 0.05, 0.5);
    flux.source = s;
    prochainTic = ctx.currentTime + 0.05; numTic = 0;
    minuterieTic = setInterval(tictac, 25);
  },
  arreter() {
    musiqueCode.arreter();
    if (!flux.actif) return;
    flux.actif = false;
    tension = false;
    clearInterval(minuterieTic); minuterieTic = null;
    const out = sortie, s = flux.source;
    flux.source = null;
    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setValueAtTime(out.gain.value, ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    setTimeout(() => { s?.stop(); out.disconnect(); }, 500);
  },
  regler({ bpm, enTension } = {}) {
    if (bpm) flux.bpm = bpm;
    if (enTension !== undefined) tension = enTension;
    flux.source?.playbackRate.setTargetAtTime(vitesse(), ctx.currentTime, 0.3);
  },
  joue: () => flux.actif,
};

const versionCode = typeof location !== 'undefined' && new URLSearchParams(location.search).get('musique') === 'code';
export const musiqueBuzzer = versionCode ? musiqueCode : musiqueFlow;
