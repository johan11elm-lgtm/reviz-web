/**
 * Musique de Tape-taupe !, composée en code (23/10) : une boucle de 8 mesures façon bal de la ferme
 * (hoedown), en sol majeur, qui sautille. Quatre voix en Web Audio : le banjo (mélodie pincée, sèche
 * et brillante, en doubles croches de remplissage), la contrebasse en « oum-pa » (fondamentale sur 1,
 * quinte sur 3), la planche à laver (frottements sur les contretemps) et un bloc de bois sur 2 et 4.
 * Chaque tour la rejoue plus vite (regler({ bpm })) ; dans les 3 dernières secondes du chrono
 * (enTension), elle s'emballe (+20 %) et la planche frotte chaque croche.
 *
 * Même séquenceur que Réviz lance (musiqueLance.js) : toutes les 25 ms, on programme les croches
 * des 120 prochaines ms sur l'horloge audio. Elle suit le bouton son.
 *
 * Deuxième version (23/10) : la piste « Whack Attack » choisie par Johan sur Google Flow Music
 * (polka à 138 BPM, public/jeux/taupe/musique.mp3, 2 min 02, fin fondue), jouée entière en boucle,
 * sans montage, accélérée à chaque tour (tempo du tour / 138) et de 20 % dans les dernières secondes.
 * C'est la version par défaut ; ?musique=code rejoue la version composée en code, qui sert aussi de
 * repli si le fichier ne se charge pas. Piste faite sur un compte Flow gratuit, sans usage
 * commercial : à regénérer avant le lancement.
 */
import { sonActif } from './bruitages';

const PISTE = { url: '/jeux/taupe/musique.mp3', bpm: 138 };

const NOTES = { C: 0, D: 2, E: 4, F: 5, 'F#': 6, G: 7, A: 9, B: 11 };
const freq = n => {
  const [, nom, oct] = n.match(/^([A-G]#?)(\d)$/);
  return 440 * 2 ** ((NOTES[nom] + (Number(oct) + 1) * 12 - 69) / 12);
};

const _ = null;
const MELODIE = [
  ['G4', 'B4', 'D5', 'B4', 'G5', _, 'D5', 'B4'],
  ['C5', 'E5', 'G5', 'E5', 'C5', _, 'A4', _],
  ['D5', 'F#5', 'A5', 'F#5', 'D5', 'C5', 'B4', 'A4'],
  ['G4', _, 'B4', 'D5', 'G4', _, _, 'D5'],
  ['G4', 'B4', 'D5', 'G5', 'F#5', 'E5', 'D5', 'B4'],
  ['C5', _, 'E5', 'G5', 'E5', 'C5', 'A4', 'C5'],
  ['D5', 'E5', 'F#5', 'A5', 'G5', 'F#5', 'E5', 'F#5'],
  ['G5', _, 'D5', _, 'G4', _, _, _],
];
// Par mesure : la fondamentale (temps 1) et la quinte (temps 3) de la contrebasse.
const BASSE = [['G2', 'D3'], ['C3', 'G2'], ['D3', 'A2'], ['G2', 'D3'], ['G2', 'D3'], ['C3', 'G2'], ['D3', 'A2'], ['G2', 'D2']];

let ctx = null, sortie = null, minuterie = null, bruit = null;
let pas = 0, prochaine = 0, tempo = 132, tension = false;

function contexte() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// Banjo : dent de scie et carré mêlés, filtre qui se ferme très vite (la peau tendue), un rien
// de glissé à l'attaque.
function banjo(t, f, vol = 0.07) {
  for (const [type, v] of [['sawtooth', vol], ['square', vol * 0.4]]) {
    const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f * 1.01, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.02);
    fl.type = 'lowpass'; fl.Q.value = 3;
    fl.frequency.setValueAtTime(5200, t);
    fl.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.4), t + 0.16);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    o.connect(fl).connect(g).connect(sortie); o.start(t); o.stop(t + 0.3);
  }
}
// Contrebasse pincée : sinus et triangle, attaque ronde, chute moyenne.
function basse(t, f, vol = 0.2) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'triangle'; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g).connect(sortie); o.start(t); o.stop(t + 0.32);
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
// Planche à laver : deux frottements rapprochés. Bloc de bois : un « toc » creux.
const planche = (t, vol = 0.05) => { souffle(t, 4200, 1.2, vol, 0.04); souffle(t + 0.03, 3600, 1.2, vol * 0.7, 0.04); };
function bloc(t, vol = 0.09) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(820, t); o.frequency.exponentialRampToValueAtTime(700, t + 0.05);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  o.connect(g).connect(sortie); o.start(t); o.stop(t + 0.08);
}

function jouerPas(t) {
  const mesure = Math.floor(pas / 8) % 8, croche = pas % 8;
  const note = MELODIE[mesure][croche];
  if (note) banjo(t, freq(note));
  const [b1, b3] = BASSE[mesure];
  if (croche === 0) basse(t, freq(b1));
  if (croche === 4) basse(t, freq(b3), 0.17);
  if (croche === 2 || croche === 6) bloc(t);
  if (croche % 2 === 1 || tension) planche(t);
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

// ── Version Flow Music : la piste entière en boucle, jouée à bpm / 138 ──
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
  regler({ bpm, enTension } = {}) {
    if (bpm) flux.bpm = bpm;
    if (enTension !== undefined) flux.tension = enTension;
    musiqueCode.regler({ bpm, enTension });
    if (ctx) flux.source?.playbackRate.setTargetAtTime(vitesse(), ctx.currentTime, enTension === undefined ? 0.3 : 0.1);
  },
  joue: () => flux.actif || musiqueCode.joue(),
};

const versionCode = !PISTE || (typeof location !== 'undefined' && new URLSearchParams(location.search).get('musique') === 'code');
export const musiqueTaupe = versionCode ? musiqueCode : musiqueFlow;
