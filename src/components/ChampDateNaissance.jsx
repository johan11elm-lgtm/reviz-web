import { useState } from 'react';

// Date de naissance en trois listes (jour, mois, année). Le calendrier natif
// d'Android s'ouvre sur aujourd'hui : un élève né en 2013 devait remonter
// mois par mois ou deviner qu'il faut toucher l'année. Une liste déroulante
// native, elle, se comprend partout (Chrome, Samsung Internet, iOS).
// value / onChange : 'AAAA-MM-JJ', ou '' tant que les trois ne sont pas choisis.

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const ANNEE_COURANTE = new Date().getFullYear();
// Des plus jeunes (6 ans) aux plus âgés : les collégiens trouvent leur année en haut.
const ANNEES = Array.from({ length: ANNEE_COURANTE - 6 - 1950 + 1 }, (_, i) => ANNEE_COURANTE - 6 - i);

const deux = n => String(n).padStart(2, '0');

export default function ChampDateNaissance({ value, onChange, grand = false, idPrefix = 'naissance' }) {
  const [initJ, initM, initA] = value ? value.split('-').reverse() : ['', '', ''];
  const [jour, setJour]   = useState(initJ ? String(Number(initJ)) : '');
  const [mois, setMois]   = useState(initM ? String(Number(initM)) : '');
  const [annee, setAnnee] = useState(initA ?? '');

  function maj(j, m, a) {
    setJour(j); setMois(m); setAnnee(a);
    if (!j || !m || !a) { onChange(''); return; }
    // 31 février → dernier jour du mois, plutôt qu'une date invalide.
    const dernier = new Date(Number(a), Number(m), 0).getDate();
    const jj = Math.min(Number(j), dernier);
    if (jj !== Number(j)) setJour(String(jj));
    onChange(`${a}-${deux(m)}-${deux(jj)}`);
  }

  const cls = `auth-input auth-select${grand ? ' signup-input-lg' : ''}`;
  return (
    <div className="auth-date-selects" role="group" aria-label="Ta date de naissance">
      <select id={`${idPrefix}-jour`} className={cls} aria-label="Jour" required value={jour}
        onChange={e => maj(e.target.value, mois, annee)}>
        <option value="" disabled>Jour</option>
        {Array.from({ length: 31 }, (_, i) => <option key={i} value={String(i + 1)}>{i + 1}</option>)}
      </select>
      <select id={`${idPrefix}-mois`} className={cls} aria-label="Mois" required value={mois}
        onChange={e => maj(jour, e.target.value, annee)}>
        <option value="" disabled>Mois</option>
        {MOIS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
      </select>
      <select id={`${idPrefix}-annee`} className={cls} aria-label="Année" required value={annee}
        onChange={e => maj(jour, mois, e.target.value)}>
        <option value="" disabled>Année</option>
        {ANNEES.map(a => <option key={a} value={String(a)}>{a}</option>)}
      </select>
    </div>
  );
}
