import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Un faux AudioContext : on y lit l'état et on compte les reprises.
class FauxContexte {
  constructor() { this.state = 'suspended'; this.resume = vi.fn(async () => { this.state = 'running'; }); FauxContexte.dernier = this; }
}
const visibilite = etat => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => etat });
  document.dispatchEvent(new Event('visibilitychange'));
};

let bruitages;
beforeEach(async () => {
  vi.resetModules();
  FauxContexte.dernier = undefined;
  window.AudioContext = FauxContexte;
  bruitages = await import('../bruitages');
});
afterEach(() => { delete window.AudioContext; visibilite('visible'); });

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
