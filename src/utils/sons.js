/**
 * Bruitages de l'app hors Réviz Games (29/10) : bonne réponse, faute, combo, fin de séance, niveau,
 * récompenses, Battle, contrôle blanc. Fichiers MP3 fabriqués par reviz/sons-app/fabrique-sons.py
 * (synthèse, aucune licence) et choisis par Johan sur la planche d'écoute. Ils passent par le
 * contexte audio partagé des jeux (bruitages.js : un seul par page, repris après une interruption
 * iOS) et obéissent au même interrupteur (sonActif / bruitagesActifs, dans Réglages et dans les jeux).
 * Chaque son n'est téléchargé et décodé qu'une fois ; prechargerSons() le fait à l'avance, pour que
 * la première bonne réponse sonne à temps.
 */
import { sonActif, contexteAudio } from './bruitages'
import { PALIER_COMBO } from './xp'

const FICHIERS = import.meta.glob('../assets/sons/*.mp3', { eager: true, query: '?url', import: 'default' })
const URLS = Object.fromEntries(Object.entries(FICHIERS).map(([chemin, url]) => [chemin.match(/([^/]+)\.mp3$/)[1], url]))
export const NOMS_SONS = Object.keys(URLS)

// Les sons se mêlent à la musique de l'élève au lieu de la couper, et se taisent en mode silencieux
// (Safari 16.4+ et la vue web de l'app iOS ; ailleurs, la propriété n'existe pas).
try { if (typeof navigator !== 'undefined' && navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch { /* indisponible */ }

const tampons = new Map(); // nom -> AudioBuffer décodé
const enCours = new Map(); // nom -> Promise<AudioBuffer | null>

// Safari d'avant iOS 14 ne connaît que la forme à rappels de decodeAudioData.
function decoder(a, octets) {
  return new Promise((ok, ko) => {
    const p = a.decodeAudioData(octets, ok, ko);
    if (p && typeof p.then === 'function') p.then(ok, ko);
  });
}
function charger(a, nom) {
  if (tampons.has(nom)) return Promise.resolve(tampons.get(nom));
  if (!enCours.has(nom)) {
    enCours.set(nom, fetch(URLS[nom])
      // Dans l'app iOS, Capacitor sert les MP3 sans réponse HTTP : statut 0, mais le fichier est là.
      .then(r => { if (!r.ok && r.status !== 0) throw new Error(nom); return r.arrayBuffer(); })
      .then(octets => decoder(a, octets))
      .then(b => { tampons.set(nom, b); return b; })
      .catch(() => { enCours.delete(nom); return null; })); // réessayé au prochain appel
  }
  return enCours.get(nom);
}

/** Télécharge et décode à l'avance les sons d'un écran, sans rien jouer. */
export function prechargerSons(noms = NOMS_SONS) {
  if (!sonActif()) return;
  const a = contexteAudio();
  if (!a) return;
  for (const n of noms) if (URLS[n]) charger(a, n);
}

/**
 * Joue un son. `demi` : transposition en demi-tons (le combo monte la gamme) ; `dans` : décalage en
 * secondes. Un son pas encore décodé part dès qu'il l'est s'il arrive dans les 250 ms ; plus tard,
 * il ne tomberait plus à propos et on le laisse.
 */
export function jouerSon(nom, { demi = 0, dans = 0 } = {}) {
  if (!sonActif() || !URLS[nom]) return;
  const a = contexteAudio();
  if (!a) return;
  const lancer = b => {
    try {
      const s = a.createBufferSource();
      s.buffer = b;
      s.playbackRate.value = 2 ** (demi / 12);
      s.connect(a.destination);
      s.start(a.currentTime + dans);
    } catch { /* audio indisponible : on continue en silence */ }
  };
  if (tampons.has(nom)) return lancer(tampons.get(nom));
  const depart = Date.now();
  charger(a, nom).then(b => { if (b && Date.now() - depart < 250) lancer(b); });
}

// La bonne réponse monte la gamme majeure à chaque réponse du combo : do-ré-mi-fa jusqu'au palier
// (qui a son propre son), puis sol-la-si-do une fois le premier palier passé.
const GAMME = [0, 2, 4, 5, 7, 9, 11, 12];
export function demiCombo(n) {
  const k = Math.min(Math.max(n - 1, 0) % PALIER_COMBO, 3);
  return GAMME[k + (n > PALIER_COMBO ? 4 : 0)];
}

/** L'XP qui défile au bilan : un grain par pas, de plus en plus aigu (12 au plus), à partir de `depuis` s. */
export function rafaleXp(pas = 12, ecart = 0.065, depuis = 0) {
  for (let k = 0; k < Math.min(pas, 12); k++) jouerSon('xp', { demi: k, dans: depuis + k * ecart });
}
