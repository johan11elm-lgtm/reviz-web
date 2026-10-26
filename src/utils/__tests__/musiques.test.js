import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Un faux contexte audio : des nœuds qui ne font rien, mais dont on compte les démarrages.
const param = (valeur = 0) => ({ value: valeur, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} });
function fauxContexte() {
  const c = {
    currentTime: 0, sampleRate: 8000, destination: {}, state: 'running',
    oscillateurs: 0, sources: [],
    createGain: () => ({ gain: param(1), connect(n) { return n; }, disconnect() {} }),
    createOscillator: () => { c.oscillateurs += 1; return { type: '', frequency: param(), detune: param(), connect(n) { return n; }, start() {}, stop() {} }; },
    createBiquadFilter: () => ({ type: '', frequency: param(), Q: param(), connect(n) { return n; } }),
    createBuffer: (_, n) => ({ getChannelData: () => new Float32Array(n) }),
    createBufferSource: () => {
      const s = { buffer: null, loop: false, playbackRate: param(1), connect(n) { return n; }, start: vi.fn(), stop: vi.fn() };
      c.sources.push(s);
      return s;
    },
    decodeAudioData: vi.fn(async () => ({ duration: 40 })),
  };
  return c;
}

let ctx;
vi.mock('../bruitages', () => ({ sonActif: () => true, contexteAudio: () => ctx }));

// La réponse du mp3 est tenue en main : on décide quand le chargement se termine.
let finirChargement, echouerChargement;
beforeEach(() => {
  ctx = fauxContexte();
  globalThis.fetch = vi.fn(() => new Promise((ok, ko) => {
    finirChargement = () => ok({ arrayBuffer: async () => new ArrayBuffer(8) });
    echouerChargement = () => ko(new Error('réseau'));
  }));
  vi.resetModules();
  window.history.replaceState({}, '', '/');
});
afterEach(() => { vi.useRealTimers(); window.history.replaceState({}, '', '/'); });

const attendre = () => new Promise(r => setTimeout(r, 0));
const demarrees = () => ctx.sources.filter(s => s.start.mock.calls.length);

const MUSIQUES = [
  ['magie', () => import('../musiqueMagie'), 'musiqueMagie'],
  ['lance', () => import('../musiqueLance'), 'musiqueLance'],
  ['buzzer', () => import('../musiqueBuzzer'), 'musiqueBuzzer'],
  ['pizzeria', () => import('../musiquePizzeria'), 'musiquePizzeria'],
  ['ninja', () => import('../musiqueNinja'), 'musiqueNinja'],
  ['taupe', () => import('../musiqueTaupe'), 'musiqueTaupe'],
  ['fin', () => import('../musiqueFin'), 'musiqueFin'],
];

describe.each(MUSIQUES)('musique %s (piste mp3)', (_nom, charger, cle) => {
  let musique;
  beforeEach(async () => { musique = (await charger())[cle]; });

  it('arrêtée pendant le premier chargement : aucune source ne démarre ensuite', async () => {
    musique.demarrer();
    musique.arreter();
    finirChargement();
    await attendre();
    expect(demarrees()).toHaveLength(0);
    expect(musique.joue()).toBe(false);
  });

  it('arrêtée puis relancée pendant le chargement : une seule source, pas d’orpheline', async () => {
    musique.demarrer();
    musique.arreter();
    musique.demarrer();
    finirChargement();
    await attendre();
    expect(demarrees()).toHaveLength(1);
    expect(musique.joue()).toBe(true);
  });

  it('chargement raté après l’arrêt : rien ne repart (ni piste, ni musique de secours)', async () => {
    musique.demarrer();
    musique.arreter();
    echouerChargement();
    await attendre();
    expect(demarrees()).toHaveLength(0);
    expect(musique.joue()).toBe(false);
  });

  it('démarrée normalement : une source en boucle', async () => {
    musique.demarrer();
    finirChargement();
    await attendre();
    expect(demarrees()).toHaveLength(1);
    expect(demarrees()[0].loop).toBe(true);
    musique.arreter();
  });

  it('liberer() relâche le morceau décodé : il est rechargé au prochain démarrage, pas avant', async () => {
    musique.demarrer();
    finirChargement();
    await attendre();
    musique.arreter();
    musique.demarrer(); // encore en mémoire : pas de nouvelle requête
    await attendre();
    expect(fetch).toHaveBeenCalledTimes(1);
    musique.arreter();
    musique.liberer();
    musique.demarrer();
    expect(fetch).toHaveBeenCalledTimes(2);
    finirChargement();
    await attendre();
    expect(demarrees()).toHaveLength(3); // la première, la relance sans requête, la dernière après liberer
  });

  it('liberer() pendant un chargement : le résultat n’est pas gardé', async () => {
    musique.demarrer();
    const premier = finirChargement;
    musique.arreter();
    musique.liberer();
    premier();
    await attendre();
    musique.demarrer();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

// Les versions composées en code : un séquenceur sur l'horloge audio, qui ne rattrape pas une veille.
describe.each(MUSIQUES.filter(([n]) => n !== 'fin'))('musique %s (version code)', (_nom, charger, cle) => {
  let musique;
  beforeEach(async () => {
    window.history.replaceState({}, '', '/?musique=code');
    vi.useFakeTimers();
    musique = (await charger())[cle];
  });

  // Fait battre le séquenceur (toutes les 25 ms) en faisant avancer l'horloge audio du même temps.
  const battre = (ms) => { for (let t = 0; t < ms; t += 25) { ctx.currentTime += 0.025; vi.advanceTimersByTime(25); } };

  it('joue en temps normal', () => {
    musique.demarrer();
    battre(1000);
    expect(ctx.oscillateurs).toBeGreaterThan(5);
    expect(musique.joue()).toBe(true);
    musique.arreter();
  });

  it('après une longue veille (30 s d’horloge audio d’un coup), repart du temps présent : pas de salve de notes', () => {
    musique.demarrer();
    battre(500);
    musique.regler({ bpm: 120 });
    const avant = ctx.oscillateurs;
    ctx.currentTime += 30; // la page est restée en arrière-plan : une seule battue au réveil
    vi.advanceTimersByTime(25);
    const rattrapees = ctx.oscillateurs - avant;
    // Un pas = quelques voix ; rattraper 30 s en aurait demandé des centaines.
    expect(rattrapees).toBeLessThan(40);
    battre(300);
    expect(ctx.oscillateurs - avant).toBeGreaterThan(rattrapees); // et la musique continue ensuite
    musique.arreter();
  });
});
