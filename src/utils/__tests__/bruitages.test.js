import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Un faux AudioContext : on y lit l'état, on compte les reprises et les notes jouées.
const param = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });
class FauxContexte {
  constructor() { this.state = 'suspended'; this.currentTime = 0; this.notes = 0; this.resume = vi.fn(async () => { this.state = 'running'; }); FauxContexte.dernier = this; }
  createOscillator() { this.notes++; return { frequency: param(), connect: n => n, start() {}, stop() {} }; }
  createGain() { return { gain: param(), connect: n => n }; }
}
const visibilite = etat => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => etat });
  document.dispatchEvent(new Event('visibilitychange'));
};

let bruitages;
beforeEach(async () => {
  vi.resetModules();
  FauxContexte.dernier = undefined;
  localStorage.clear();
  window.AudioContext = FauxContexte;
  bruitages = await import('../bruitages');
});
afterEach(() => { vi.restoreAllMocks(); delete window.AudioContext; localStorage.clear(); visibilite('visible'); });

describe('Audio iOS : la reprise du contexte', () => {
  it('au premier appel, un contexte suspendu est repris', () => {
    const a = bruitages.contexteAudio();
    expect(a.resume).toHaveBeenCalledTimes(1);
  });

  it('un contexte « interrupted » (appel, verrouillage) est repris au prochain appel, comme un suspendu', () => {
    const a = bruitages.contexteAudio();
    a.state = 'interrupted';
    bruitages.contexteAudio();
    expect(a.resume).toHaveBeenCalledTimes(2);
  });

  it('un contexte qui tourne n’est pas repris, un contexte fermé non plus', () => {
    const a = bruitages.contexteAudio();
    a.resume.mockClear();
    a.state = 'running';
    bruitages.contexteAudio();
    a.state = 'closed';
    bruitages.contexteAudio();
    expect(a.resume).not.toHaveBeenCalled();
  });

  it('le geste de l’élève reprend le contexte interrupted', () => {
    const a = bruitages.contexteAudio();
    a.resume.mockClear();
    a.state = 'interrupted';
    window.dispatchEvent(new Event('pointerdown'));
    expect(a.resume).toHaveBeenCalledTimes(1);
  });

  it('le retour au premier plan reprend le contexte (suspendu ou interrupted), pas l’envoi en arrière-plan', () => {
    const a = bruitages.contexteAudio();
    a.resume.mockClear();
    a.state = 'interrupted';
    visibilite('hidden');
    expect(a.resume).not.toHaveBeenCalled();
    visibilite('visible');
    expect(a.resume).toHaveBeenCalledTimes(1);
    a.state = 'suspended';
    visibilite('visible');
    expect(a.resume).toHaveBeenCalledTimes(2);
  });

  it('sans contexte créé, le retour au premier plan ne crée rien', () => {
    visibilite('visible');
    expect(FauxContexte.dernier).toBeUndefined();
  });

  it('une reprise refusée (iOS sans geste) ne fait pas planter', () => {
    const a = bruitages.contexteAudio();
    a.state = 'interrupted';
    a.resume = vi.fn(() => Promise.reject(new Error('refusé')));
    expect(() => { visibilite('visible'); }).not.toThrow();
  });
});

describe('Le réglage du son (reviz-jeux-son)', () => {
  it('sans réglage, le son est actif et un bruitage sonne', () => {
    expect(bruitages.sonActif()).toBe(true);
    bruitages.jouer('ding');
    expect(FauxContexte.dernier.notes).toBeGreaterThan(0);
  });

  it('coupé après le chargement du module (connexion sans rechargement, autre onglet) : aucun son, aucun contexte audio', () => {
    localStorage.setItem('reviz-jeux-son', '0');
    expect(bruitages.sonActif()).toBe(false);
    bruitages.jouer('ding');
    bruitages.jouer('bravo');
    expect(FauxContexte.dernier).toBeUndefined();
  });

  it('remis ailleurs après avoir été coupé ici : le son revient sans recharger', () => {
    bruitages.bruitagesActifs(false);
    localStorage.setItem('reviz-jeux-son', '1');
    expect(bruitages.sonActif()).toBe(true);
    bruitages.jouer('ding');
    expect(FauxContexte.dernier.notes).toBeGreaterThan(0);
  });

  it('bruitagesActifs mémorise le choix sur l’appareil', () => {
    bruitages.bruitagesActifs(false);
    expect(localStorage.getItem('reviz-jeux-son')).toBe('0');
    bruitages.jouer('ding');
    expect(FauxContexte.dernier).toBeUndefined();
    bruitages.bruitagesActifs(true);
    expect(localStorage.getItem('reviz-jeux-son')).toBe('1');
    expect(bruitages.sonActif()).toBe(true);
  });

  it('stockage qui refuse l’écriture (quota plein) : le choix fait sur la page l’emporte sur l’ancienne valeur', () => {
    localStorage.setItem('reviz-jeux-son', '1');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    bruitages.bruitagesActifs(false);
    expect(bruitages.sonActif()).toBe(false);
    bruitages.jouer('ding');
    expect(FauxContexte.dernier).toBeUndefined();
  });

  it('stockage illisible : le son reste actif, et le choix fait sur la page est gardé', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('SecurityError'); });
    expect(bruitages.sonActif()).toBe(true);
    bruitages.bruitagesActifs(false);
    expect(bruitages.sonActif()).toBe(false);
  });
});
