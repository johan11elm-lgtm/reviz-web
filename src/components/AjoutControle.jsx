import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useModalA11y } from '../hooks/useModalA11y';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { Mascot } from './Mascot';
import { ajouterControle } from '../services/agendaService';
import { track } from '../services/statsService';
import { MATIERES_CONTROLE, jourIso, ajouterJours, jourCourt, jourEnClair } from '../utils/agenda';
import '../pages/Agenda.css';

// Fond et tranche de chaque matière (handoff Agenda du 21/10).
const COULEURS = {
  maths: ['var(--rv-lavande)', 'var(--rv-lavande-bulle)'],
  francais: ['var(--rv-rose)', 'var(--rv-rose-tranche)'],
  histoire: ['var(--rv-peche-pale)', 'var(--rv-peche-bulle)'],
  geographie: ['var(--rv-peche-pale)', 'var(--rv-peche-bulle)'],
  svt: ['var(--rv-menthe)', 'var(--rv-menthe-tranche)'],
  'physique-chimie': ['var(--rv-lavande)', 'var(--rv-lavande-bulle)'],
  technologie: ['var(--rv-menthe)', 'var(--rv-menthe-tranche)'],
  anglais: ['var(--rv-menthe)', 'var(--rv-menthe-tranche)'],
  autre: ['#F3E6DA', '#EADBCB'],
};
export const couleursMatiere = slug => {
  const [fond, tranche] = COULEURS[slug] ?? COULEURS.autre;
  return { fond, tranche };
};

const JOURS_SEMAINE = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// Les prochains jours d'école (sans samedi ni dimanche), à partir de demain.
function prochainsJours(n) {
  const jours = [];
  let j = jourIso();
  while (jours.length < n) {
    j = ajouterJours(j, 1);
    const d = new Date(`${j}T12:00`).getDay();
    if (d !== 0 && d !== 6) jours.push(j);
  }
  return jours;
}

/** Calendrier d'un mois : jours passés grisés, week-end atténué. */
function Calendrier({ valeur, onChange }) {
  const auj = jourIso();
  const [mois, setMois] = useState(() => (valeur || auj).slice(0, 7));
  const [a, m] = mois.split('-').map(Number);
  const premier = new Date(a, m - 1, 1);
  const decalage = (premier.getDay() + 6) % 7;
  const nb = new Date(a, m, 0).getDate();
  const cases = [...Array(decalage).fill(null), ...Array.from({ length: nb }, (_, i) => `${mois}-${String(i + 1).padStart(2, '0')}`)];
  const changer = d => {
    const x = new Date(a, m - 1 + d, 1);
    setMois(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`);
  };
  return (
    <div className="ag-cal">
      <div className="ag-cal-tete">
        <button type="button" onClick={() => changer(-1)} disabled={mois <= auj.slice(0, 7)} aria-label="Mois précédent">‹</button>
        <b>{MOIS[m - 1]} {a}</b>
        <button type="button" onClick={() => changer(1)} aria-label="Mois suivant">›</button>
      </div>
      <div className="ag-cal-grille">
        {JOURS_SEMAINE.map((j, i) => <span key={i} className="ag-cal-nom">{j}</span>)}
        {cases.map((j, i) => j ? (
          <button key={j} type="button" className={`ag-cal-jour${j === valeur ? ' is-choisi' : ''}${i % 7 > 4 ? ' is-weekend' : ''}${j === auj ? ' is-auj' : ''}`}
            disabled={j < auj} onClick={() => onChange(j)} aria-label={jourEnClair(j)} aria-pressed={j === valeur}>{Number(j.slice(8))}</button>
        ) : <span key={i} />)}
      </div>
    </div>
  );
}

/**
 * « Ajouter un contrôle » (handoff Agenda du 21/10) : la matière en pastilles, la date en tuiles
 * (« Demain » et les prochains jours d'école, puis « Autre date » et le calendrier), l'intitulé
 * facultatif. Feuille du bas sur téléphone, fenêtre à deux colonnes sur ordinateur. `initial`
 * peut pré-remplir matière et date (cours touché dans l'emploi du temps).
 */
export function AjoutControle({ initial = {}, onClose, onSaved }) {
  const { currentUser } = useAuth();
  const isDesktop = useIsDesktop();
  const ref = useModalA11y(onClose);
  const tuiles = prochainsJours(4);
  const dateInitiale = initial.date && initial.date >= jourIso() ? initial.date : null;
  const [matiere, setMatiere] = useState(initial.matiere ?? null);
  const [date, setDate] = useState(dateInitiale);
  const [calendrier, setCalendrier] = useState(isDesktop || (dateInitiale && !tuiles.includes(dateInitiale)));
  const [titre, setTitre] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const demain = ajouterJours(jourIso(), 1);

  async function enregistrer(e) {
    e.preventDefault();
    if (!matiere || !date) return;
    setEnvoi(true);
    setErreur('');
    try {
      const agenda = await ajouterControle(currentUser, { matiere, titre: titre.trim(), date });
      track('agenda_controle_ajoute', { matiere });
      onSaved(agenda);
    } catch {
      setErreur('Le contrôle n’a pas pu être enregistré. Réessaie.');
      setEnvoi(false);
    }
  }

  const formulaire = (
    <>
      <span className="ag-champ-titre">Matière</span>
      <div className="ag-matieres">
        {MATIERES_CONTROLE.map(x => {
          const k = couleursMatiere(x.slug);
          const choisie = matiere === x.slug;
          return (
            <button key={x.slug} type="button" className={`ag-matiere${choisie ? ' is-choisie' : ''}`} aria-pressed={choisie} onClick={() => setMatiere(x.slug)}
              style={{ background: k.fond, boxShadow: choisie ? `0 0 0 2px var(--rv-encre), 0 4px 0 ${k.tranche}` : `0 4px 0 ${k.tranche}` }}>
              <span className="ag-matiere-rond" aria-hidden="true"><Mascot pose={x.mascot} size={30} alt="" /></span>
              {x.slug === 'autre' ? 'Autre' : x.label}
            </button>
          );
        })}
      </div>
      <span className="ag-champ-titre">Date</span>
      {!isDesktop && (
        <div className="ag-dates">
          {tuiles.map(j => (
            <button key={j} type="button" className={`ag-date-tuile${date === j ? ' is-choisie' : ''}`} aria-pressed={date === j} onClick={() => { setDate(j); setCalendrier(false); }}>
              <span>{j === demain ? 'Demain' : jourCourt(j).replace('.', '').replace(/^./, c => c.toUpperCase())}</span>
              <b>{Number(j.slice(8))}</b>
            </button>
          ))}
          <button type="button" className={`ag-date-tuile ag-date-tuile--autre${calendrier ? ' is-choisie' : ''}`} aria-pressed={calendrier} onClick={() => setCalendrier(true)}>Autre date</button>
        </div>
      )}
      {calendrier && !isDesktop && <Calendrier valeur={date} onChange={setDate} />}
      {date && <p className="ag-date-choisie">{jourEnClair(date).replace(/^./, c => c.toUpperCase())}</p>}
      <label className="ag-champ-titre" htmlFor="ajout-intitule">Intitulé <span>facultatif</span></label>
      <input id="ajout-intitule" className="ag-input" type="text" maxLength={80} placeholder="Chapitre ou sujet" value={titre} onChange={e => setTitre(e.target.value)} />
      {erreur && <p className="ag-erreur" role="alert">{erreur}</p>}
    </>
  );

  return (
    <div className="ag-voile" onClick={onClose}>
      <form className={`ag-feuille${isDesktop ? ' ag-feuille--fenetre' : ''}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby="ajout-controle-titre"
        onClick={e => e.stopPropagation()} onSubmit={enregistrer} noValidate>
        {!isDesktop && <span className="ag-poignee" aria-hidden="true" />}
        <div className="ag-feuille-tete">
          <h2 id="ajout-controle-titre">Ajouter un contrôle</h2>
          <button type="button" className="ag-fermer" onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        {isDesktop ? (
          <div className="ag-feuille-deux">
            <div>{formulaire}</div>
            <Calendrier valeur={date} onChange={setDate} />
          </div>
        ) : formulaire}
        <div className="ag-feuille-pied">
          {isDesktop && <button type="button" className="ag-btn ag-btn--creme" onClick={onClose}>Annuler</button>}
          <button type="submit" className="ag-btn" disabled={envoi || !matiere || !date}>{envoi ? 'Enregistrement…' : 'Ajouter'}</button>
        </div>
      </form>
    </div>
  );
}
