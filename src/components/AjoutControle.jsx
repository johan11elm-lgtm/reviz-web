import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useModalA11y } from '../hooks/useModalA11y';
import { Mascot } from './Mascot';
import { XIcon } from './Icons';
import { ajouterControle } from '../services/agendaService';
import { track } from '../services/statsService';
import {
  MATIERES_CONTROLE, matiereControle, intituleControle, jourIso, ajouterJours,
  jourEnClair, jourCourt, moisCourt,
} from '../utils/agenda';
import '../pages/Agenda.css';

const ETAPES = ['matiere', 'date', 'sujet'];

// Les prochains jours d'école (sans samedi ni dimanche), à partir de demain.
function prochainsJours(n = 8) {
  const jours = [];
  let j = jourIso();
  while (jours.length < n) {
    j = ajouterJours(j, 1);
    const d = new Date(`${j}T12:00`).getDay();
    if (d !== 0 && d !== 6) jours.push(j);
  }
  return jours;
}

/**
 * « Ajouter un contrôle », une question par écran : matière, date, sujet
 * (facultatif). Un choix fait passer à l'écran suivant. `initial` peut
 * pré-remplir matière et date (cours touché dans l'agenda) : on va alors
 * directement au sujet.
 */
export function AjoutControle({ initial = {}, onClose, onSaved }) {
  const { currentUser } = useAuth();
  const ref = useModalA11y(onClose);
  const dateInitiale = initial.date && initial.date >= jourIso() ? initial.date : null;
  const [matiere, setMatiere] = useState(initial.matiere ?? null);
  const [date, setDate] = useState(dateInitiale);
  const [etape, setEtape] = useState(initial.matiere && dateInitiale ? 2 : initial.matiere ? 1 : 0);
  const [autreDate, setAutreDate] = useState(false);
  const [titre, setTitre] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const demain = ajouterJours(jourIso(), 1);

  function choisirMatiere(slug) { setMatiere(slug); setEtape(1); }
  function choisirDate(j) { setDate(j); setErreur(''); setEtape(2); }

  async function enregistrer(e) {
    e.preventDefault();
    if (!matiere || !date) return;
    setEnvoi(true);
    setErreur('');
    try {
      const agenda = await ajouterControle(currentUser, { matiere, titre, date });
      track('agenda_controle_ajoute', { matiere });
      onSaved(agenda);
    } catch {
      setErreur("Le contrôle n'a pas pu être enregistré. Réessaie.");
      setEnvoi(false);
    }
  }

  const m = matiere ? matiereControle(matiere) : null;
  const titres = ["C'est en quelle matière ?", "C'est quand ?", 'Sur quoi ?'];

  return (
    <div className="agenda-overlay" onClick={onClose}>
      <form
        className="agenda-modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ajout-controle-titre"
        onClick={e => e.stopPropagation()}
        onSubmit={enregistrer}
        noValidate
      >
        <div className="agenda-modal-head">
          {etape > 0 ? (
            <button type="button" className="agenda-modal-icone" onClick={() => setEtape(etape - 1)} aria-label="Étape précédente">←</button>
          ) : <span className="agenda-modal-icone" aria-hidden="true" />}
          <span className="agenda-modal-etapes" aria-label={`Étape ${etape + 1} sur 3`}>
            {ETAPES.map((id, i) => <span key={id} className={`agenda-modal-point${i <= etape ? ' fait' : ''}`} />)}
          </span>
          <button type="button" className="agenda-modal-icone" onClick={onClose} aria-label="Fermer"><XIcon /></button>
        </div>

        <h2 id="ajout-controle-titre" className="agenda-modal-titre">{titres[etape]}</h2>

        {etape === 0 && (
          <div className="agenda-matieres" key="matiere">
            {MATIERES_CONTROLE.map(x => (
              <button
                key={x.slug}
                type="button"
                className={`agenda-matiere${matiere === x.slug ? ' active' : ''}`}
                aria-pressed={matiere === x.slug}
                onClick={() => choisirMatiere(x.slug)}
              >
                <Mascot pose={x.mascot} size={44} alt="" aria-hidden="true" />
                <span>{x.label}</span>
              </button>
            ))}
          </div>
        )}

        {etape === 1 && (
          <div className="agenda-etape" key="date">
            <p className="agenda-modal-sous">{m && intituleControle({ matiere })}</p>
            <div className="agenda-dates">
              {prochainsJours().map(j => (
                <button
                  key={j}
                  type="button"
                  className={`agenda-date${date === j ? ' active' : ''}`}
                  onClick={() => choisirDate(j)}
                  aria-label={jourEnClair(j)}
                >
                  <span className="agenda-date-jour">{j === demain ? 'Demain' : jourCourt(j)}</span>
                  <span className="agenda-date-num">{Number(j.slice(8))}</span>
                  <span className="agenda-date-mois">{moisCourt(j)}</span>
                </button>
              ))}
            </div>
            {autreDate ? (
              <input
                className="agenda-input"
                type="date"
                aria-label="Date du contrôle"
                min={demain}
                autoFocus
                onChange={e => e.target.value >= jourIso() && choisirDate(e.target.value)}
              />
            ) : (
              <button type="button" className="agenda-lien agenda-autre-date" onClick={() => setAutreDate(true)}>
                Une autre date
              </button>
            )}
          </div>
        )}

        {etape === 2 && m && (
          <div className="agenda-etape" key="sujet">
            <div className="agenda-recap">
              <span className="rv-row-avatar"><Mascot pose={m.mascot} size={36} alt="" aria-hidden="true" /></span>
              <span className="rv-row-text">
                <span className="rv-row-title">{intituleControle({ matiere })}</span>
                <span className="rv-row-sub">{jourEnClair(date)}</span>
              </span>
            </div>
            <label className="agenda-label" htmlFor="ajout-controle-sujet">
              Le chapitre ou le thème <span className="agenda-facultatif">· facultatif</span>
            </label>
            <input
              id="ajout-controle-sujet"
              className="agenda-input"
              type="text"
              maxLength={80}
              placeholder="Ex. théorème de Pythagore"
              value={titre}
              onChange={e => setTitre(e.target.value)}
            />
            <p className="agenda-modal-sous">Réviz te le rappellera la veille au soir.</p>
            {erreur && <p className="agenda-relier-erreur" role="alert">{erreur}</p>}
            <button type="submit" className="rv-btn-cta agenda-modal-ok" disabled={envoi}>
              {envoi ? 'Enregistrement…' : 'Ajouter le contrôle'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
