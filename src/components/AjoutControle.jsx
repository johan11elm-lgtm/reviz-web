import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useModalA11y } from '../hooks/useModalA11y';
import { Mascot } from './Mascot';
import { XIcon } from './Icons';
import { ajouterControle } from '../services/agendaService';
import { track } from '../services/statsService';
import { MATIERES_CONTROLE, jourIso, ajouterJours } from '../utils/agenda';
import '../pages/Agenda.css';

// Le prochain jour d'école (sans samedi ni dimanche), à partir de demain.
function prochainsJours(n = 1) {
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
 * « Ajouter un contrôle » (refonte validée), une seule feuille en trois
 * gestes : matière, date, sujet (facultatif). `initial` peut pré-remplir
 * matière et date (cours touché dans l'agenda).
 */
export function AjoutControle({ initial = {}, onClose, onSaved }) {
  const { currentUser } = useAuth();
  const ref = useModalA11y(onClose);
  const demain = ajouterJours(jourIso(), 1);
  const dateInitiale = initial.date && initial.date >= jourIso() ? initial.date : prochainsJours(1)[0];
  const [matiere, setMatiere] = useState(initial.matiere ?? null);
  const [date, setDate] = useState(dateInitiale);
  const [titre, setTitre] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

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
        <span className="agenda-modal-poignee" aria-hidden="true" />
        <div className="agenda-modal-head">
          <h2 id="ajout-controle-titre" className="agenda-modal-titre">Ajouter un contrôle</h2>
          <button type="button" className="agenda-modal-icone" onClick={onClose} aria-label="Fermer"><XIcon /></button>
        </div>

        <div className="agenda-matieres">
          {MATIERES_CONTROLE.map(x => (
            <button
              key={x.slug}
              type="button"
              className={`agenda-matiere${matiere === x.slug ? ' active' : ''}`}
              aria-pressed={matiere === x.slug}
              onClick={() => setMatiere(x.slug)}
            >
              <span className="agenda-matiere-rond"><Mascot pose={x.mascot} size={34} alt="" aria-hidden="true" /></span>
              <span>{x.label}</span>
            </button>
          ))}
        </div>

        <label className="agenda-label" htmlFor="ajout-controle-date">Date</label>
        <input
          id="ajout-controle-date"
          className="agenda-input"
          type="date"
          min={demain}
          value={date}
          onChange={e => e.target.value >= jourIso() && setDate(e.target.value)}
        />

        <label className="agenda-label" htmlFor="ajout-controle-sujet">
          Sur quoi ? <span className="agenda-facultatif">facultatif</span>
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
        {erreur && <p className="agenda-relier-erreur" role="alert">{erreur}</p>}
        <button type="submit" className="agenda-modal-ok" disabled={envoi || !matiere}>
          {envoi ? 'Enregistrement…' : 'Ajouter le contrôle'}
        </button>
      </form>
    </div>
  );
}
