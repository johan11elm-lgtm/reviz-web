/**
 * Teinte du héros selon la matière (handoff Chapitre du 21/10) : fiche chapitre, Résumé…
 * fond, bulles, point d'accent, rond intérieur (case en cours, numéros de « L'essentiel »)
 * et ombre teintée. Maths en lavande ; pêche comme Programme ; menthe et rose.
 */
export const TEINTES = {
  lavande: { fond: 'var(--rv-lavande)', bulle: 'var(--rv-lavande-bulle)', point: 'var(--rv-peche)', interieur: 'var(--rv-lavande)', ombre: 'rgba(90,70,160,.13)' },
  peche:   { fond: 'var(--rv-peche)', bulle: 'var(--rv-peche-bulle)', point: 'var(--rv-lavande-bulle)', interieur: 'var(--rv-peche-pale)', ombre: 'rgba(150,70,20,.14)' },
  menthe:  { fond: 'var(--rv-menthe)', bulle: 'var(--rv-menthe-bulle)', point: 'var(--rv-peche)', interieur: 'var(--rv-menthe)', ombre: 'rgba(30,110,70,.13)' },
  rose:    { fond: 'var(--rv-rose)', bulle: 'var(--rv-rose-bulle)', point: 'var(--rv-lavande-bulle)', interieur: 'var(--rv-rose)', ombre: 'rgba(160,60,90,.13)' },
};

export function teinteMatiere(subject = '') {
  const s = subject.toLowerCase();
  if (/math/.test(s)) return TEINTES.lavande;
  if (/fran|philo|angl|espa|allem|langue|lv|latin/.test(s)) return TEINTES.rose;
  if (/svt|bio|vie|phys|chim|techno|nsi/.test(s)) return TEINTES.menthe;
  return TEINTES.peche;
}

/** Les variables CSS de la teinte, à poser sur le conteneur de la page (--ch-*). */
export const varsTeinte = t => ({ '--ch-fond': t.fond, '--ch-bulle': t.bulle, '--ch-point': t.point, '--ch-interieur': t.interieur, '--ch-ombre': t.ombre });
