/**
 * Musique de Réviz lance, composée en code (22/10) : une boucle de 8 mesures façon cour de
 * récréation, en fa majeur, qui rebondit. Quatre voix en Web Audio : le marimba (mélodie, lames
 * de bois), la basse pincée (fondamentale et quinte, avec des notes de passage), une grosse caisse
 * douce sur les temps 1 et 3, des claquements de mains sur 2 et 4 et un shaker sur les contretemps.
 * Chaque tour la rejoue un peu plus vite (regler({ bpm })).
 *
 * Même séquenceur que la version code du tour de magie (musiqueMagie.js) : toutes les 25 ms, on
 * programme les croches des 120 prochaines ms sur l'horloge audio. Elle suit le bouton son.
 *
 * Deuxième version (23/10, refaite le soir) : la piste Google Flow Music « Clay Brain Hoops »
 * choisie par Johan, jouée entière en boucle, sans montage (public/jeux/lance/musique.mp3, 2 min 56 ;
 * source WAV dans refonte-2026-11/games-mondes/lance/musique/), accélérée à chaque tour. C'est la
 * version par défaut ; ?musique=code rejoue la version composée en code. Piste faite sur un compte
 * Flow gratuit, sans usage commercial : à regénérer avant le lancement.
 */
import { sonActif } from './bruitages';

const NOTES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = n => {
  const [, nom, oct] = n.match(/^([A-G]#?)(\d)$/);
  return 440 * 2 ** ((NOTES[nom] + (Number(oct) + 1) * 12 - 69) / 12);
};

const _ = null;
const MELODIE = [
  ['C5', _, 'F5', _, 'A5', 'G5', 'F5', _],
  ['G5', _, 'A5', 'G5', 'E5', _, 'C5', _],
  ['D5', _, 'F5', _, 'A#5', 'A5', 'G5', _],
  ['A5', _, 'G5', 'F5', 'E5', _, _, 'C5'],
  ['C5', _, 'F5', _, 'A5', 'G5', 'F5', 'A5'],
  ['C6', _, 'A5', _, 'F5', _, 'D5', _],
  ['A#4', 'D5', 'F5', 'A#5', 'G5', 'E5', 'C5', 'E5'],
  ['F5', _, 'C5', _, 'F5', _, _, _],
];
// Par mesure : [basse temps 1, basse temps 3, note de passage sur la dernière croche].
const BASSE = [
  ['F2', 'C3', 'E3'], ['C3', 'G2', 'A2'], ['A#2', 'F2', 'A2'], ['C3', 'G2', 'E2'],
  ['F2', 'C3', 'E3'], ['D3', 'A2', 'C3'], ['A#2', 'C3', 'E3'], ['F2', 'C3', 'C3'],
];

let ctx = null, sortie = null, minuterie = null, bruit = null;
let pas = 0, prochaine = 0, tempo = 120;

function contexte() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// Marimba : fondamentale sinus + partiel à ×4 (lame de bois), chute courte et ronde.
function marimba(t, f, vol = 0.1) {
  for (const [mult, v, d] of [[1, vol, 0.42], [3.98, vol * 0.22, 0.09], [10, vol * 0.05, 0.03]]) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f * mult;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(sortie); o.start(t); o.stop(t + d + 0.02);
  }
}
function basse(t, f, vol = 0.17, d = 0.3) {
  const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'triangle'; o.frequency.value = f;
  fl.type = 'lowpass'; fl.frequency.value = 900;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(fl).connect(g).connect(sortie); o.start(t); o.stop(t + d + 0.02);
}
function caisse(t) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.14);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(g).connect(sortie); o.start(t); o.stop(t + 0.2);
}
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
// Claquement de mains : trois petits souffles serrés (plusieurs mains), puis la queue.
const claque = t => [0, 0.008, 0.017].forEach((d, i) => souffle(t + d, 1300, 1.1, i === 2 ? 0.07 : 0.045, i === 2 ? 0.11 : 0.02));

function jouerPas(t) {
  const mesure = Math.floor(pas / 8) % 8, croche = pas % 8;
  const note = MELODIE[mesure][croche];
  if (note) marimba(t, freq(note));
  const [b1, b3, passage] = BASSE[mesure];
  if (croche === 0) basse(t, freq(b1));
  if (croche === 4) basse(t, freq(b3));
  if (croche === 7) basse(t, freq(passage), 0.1, 0.16);
  if (croche === 0 || croche === 4) caisse(t);
  if (croche === 2 || croche === 6) claque(t);
  if (croche % 2 === 1) souffle(t, 7000, 0.9, 0.018, 0.05);
  pas += 1;
}

function boucle() {
  const croche = 60 / tempo / 2;
  while (prochaine < ctx.currentTime + 0.12) {
    jouerPas(prochaine);
    prochaine += croche * (pas % 2 === 0 ? 0.94 : 1.06); // un rien de rebond
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
    const s = sortie;
    s.gain.cancelScheduledValues(ctx.currentTime);
    s.gain.setValueAtTime(s.gain.value, ctx.currentTime);
    s.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    setTimeout(() => s.disconnect(), 500);
  },
  regler({ bpm } = {}) { if (bpm) tempo = bpm; },
  joue: () => !!minuterie,
};

// ── Version Flow Music : la piste entière en boucle, jouée à bpm / tempo d'origine ──
// Piste demandée à 126 BPM ; au tour 1 elle joue à sa vitesse d'origine, puis +8 % par tour.
const BOUCLE = { url: '/jeux/lance/musique.mp3', bpm: 126 };
let tampon = null, chargement = null;
function charger() {
  chargement ??= fetch(BOUCLE.url).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(t => { tampon = t; })
    .catch(e => { chargement = null; throw e; });
  return chargement;
}
const flux = { source: null, bpm: 120, actif: false };
const vitesse = () => flux.bpm / BOUCLE.bpm;
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
    s.buffer = tampon; s.loop = true;
    s.playbackRate.value = vitesse();
    s.connect(sortie);
    s.start(ctx.currentTime + 0.05);
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
    if (bpm) { flux.bpm = bpm; musiqueCode.regler({ bpm }); }
    flux.source?.playbackRate.setTargetAtTime(vitesse(), ctx.currentTime, 0.3);
  },
  joue: () => flux.actif || musiqueCode.joue(),
};

const versionCode = typeof location !== 'undefined' && new URLSearchParams(location.search).get('musique') === 'code';
export const musiqueLance = versionCode ? musiqueCode : musiqueFlow;
