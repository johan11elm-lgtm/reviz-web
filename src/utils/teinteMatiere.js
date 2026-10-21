/**
 * Teinte du héros selon la matière (handoff Chapitre du 21/10) : fiche chapitre, Résumé…
 * fond, bulles, point d'accent, rond intérieur (case en cours, numéros de « L'essentiel »)
 * et ombre teintée. Maths en lavande ; pêche comme Programme ; menthe et rose.
 */
export const TEINTES = {
  lavande: { fond: '#E4E0FA', bulle: '#C9C2F2', point: '#FFB37A', interieur: '#E4E0FA', ombre: 'rgba(90,70,160,.13)' },
  peche:   { fond: '#FFB37A', bulle: '#FFC596', point: '#C9C2F2', interieur: '#FFE6D2', ombre: 'rgba(150,70,20,.14)' },
  menthe:  { fond: '#DCF5E6', bulle: '#B9E8C9', point: '#FFB37A', interieur: '#DCF5E6', ombre: 'rgba(30,110,70,.13)' },
  rose:    { fond: '#FFD9E4', bulle: '#FFC2D4', point: '#C9C2F2', interieur: '#FFD9E4', ombre: 'rgba(160,60,90,.13)' },
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
