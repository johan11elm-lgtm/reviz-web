import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

let t, visibilite;
beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  visibilite = etat => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => etat });
    document.dispatchEvent(new Event('visibilitychange'));
  };
  visibilite('visible');
  t = await import('../tempsDeJeu');
});
afterEach(() => { visibilite('visible'); vi.useRealTimers(); });

describe('Le temps des jeux, arrêté en arrière-plan', () => {
  it('tempsJeu() suit performance.now() tant que la page est au premier plan', () => {
    const a = t.tempsJeu();
    vi.advanceTimersByTime(500);
    expect(t.tempsJeu() - a).toBe(500);
  });

  it('tempsJeu() ne compte pas le temps passé en arrière-plan', () => {
    const a = t.tempsJeu();
    vi.advanceTimersByTime(1000);
    visibilite('hidden');
    vi.advanceTimersByTime(60_000);
    expect(t.tempsJeu() - a).toBe(1000); // figé pendant l'absence
    visibilite('visible');
    vi.advanceTimersByTime(200);
    expect(t.tempsJeu() - a).toBe(1200);
  });

  it('un horodatage de requestAnimationFrame pris pendant l’absence est ramené à l’instant du départ', () => {
    const a = t.tempsJeu();
    visibilite('hidden');
    vi.advanceTimersByTime(5000);
    expect(t.tempsJeu(performance.now()) - a).toBe(0);
  });

  it('une minuterie se gèle en arrière-plan et reprend avec le temps qui lui restait', () => {
    const f = vi.fn();
    t.minuterie(f, 1000);
    vi.advanceTimersByTime(400);
    visibilite('hidden');
    vi.advanceTimersByTime(120_000);
    expect(f).not.toHaveBeenCalled();
    visibilite('visible');
    vi.advanceTimersByTime(599);
    expect(f).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('une minuterie créée en arrière-plan ne part qu’au retour', () => {
    const f = vi.fn();
    visibilite('hidden');
    t.minuterie(f, 300);
    vi.advanceTimersByTime(10_000);
    expect(f).not.toHaveBeenCalled();
    visibilite('visible');
    vi.advanceTimersByTime(300);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('annuler() empêche la minuterie, au premier plan comme gelée', () => {
    const f = vi.fn(), g = vi.fn();
    const m = t.minuterie(f, 500);
    const n = t.minuterie(g, 500);
    t.annuler(m);
    visibilite('hidden');
    t.annuler(n);
    visibilite('visible');
    vi.advanceTimersByTime(5000);
    expect(f).not.toHaveBeenCalled();
    expect(g).not.toHaveBeenCalled();
  });

  it('une minuterie ne part qu’une fois, et peut en lancer une autre', () => {
    const ordre = [];
    t.minuterie(() => { ordre.push('a'); t.minuterie(() => ordre.push('b'), 100); }, 100);
    vi.advanceTimersByTime(1000);
    expect(ordre).toEqual(['a', 'b']);
  });

  it('surArrierePlan() prévient du départ et du retour, une fois chacun, jusqu’au désabonnement', () => {
    const f = vi.fn();
    const fin = t.surArrierePlan(f);
    visibilite('hidden'); visibilite('hidden');
    visibilite('visible');
    expect(f.mock.calls).toEqual([[true], [false]]);
    fin();
    visibilite('hidden');
    expect(f).toHaveBeenCalledTimes(2);
  });
});
