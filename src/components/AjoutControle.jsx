import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useModalA11y } from '../hooks/useModalA11y';
import { Mascot } from './Mascot';
import { ajouterControle } from '../services/agendaService';
import { track } from '../services/statsService';
import { MATIERES_CONTROLE, jourIso } from '../utils/agenda';
import '../pages/Agenda.css';

/**
 * Fenêtre « Ajouter un contrôle » : matière, date, ce qui tombe (facultatif).
 * `initial` peut pré-remplir la matière et la date (cours touché dans l'agenda).
 */
export function AjoutControle({ initial = {}, onClose, onSaved }) {
  const { currentUser } = useAuth();
  const ref = useModalA11y(onClose);
  const [matiere, setMatiere] = useState(initial.matiere ?? null);
  const [date, setDate] = useState(initial.date && initial.date >= jourIso() ? initial.date : '');
  const [titre, setTitre] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  async function enregistrer(e) {
    e.preventDefault();
    if (!matiere) return setErreur('Choisis la matière.');
    if (!date) return setErreur('Choisis la date du contrôle.');
    if (date < jourIso()) return setErreur('Cette date est déjà passée.');
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
        <h2 id="ajout-controle-titre" className="agenda-modal-titre">Ajouter un contrôle</h2>

        <fieldset className="agenda-fieldset">
          <legend className="agenda-label">Matière</legend>
          <div className="agenda-matieres">
            {MATIERES_CONTROLE.map(m => (
              <button
                key={m.slug}
                type="button"
                className={`agenda-matiere${matiere === m.slug ? ' active' : ''}`}
                aria-pressed={matiere === m.slug}
                onClick={() => { setMatiere(m.slug); setErreur(''); }}
              >
                <Mascot pose={m.mascot} size={28} alt="" aria-hidden="true" />
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="agenda-label" htmlFor="ajout-controle-date">Date</label>
        <input
          id="ajout-controle-date"
          className="agenda-input"
          type="date"
          min={jourIso()}
          value={date}
          onChange={e => { setDate(e.target.value); setErreur(''); }}
        />

        <label className="agenda-label" htmlFor="ajout-controle-sujet">Sur quoi ? <span className="agenda-facultatif">facultatif</span></label>
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

        <div className="agenda-modal-btns">
          <button type="button" className="rv-btn-cta rv-btn-cta--ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="rv-btn-cta" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Ajouter'}</button>
        </div>
      </form>
    </div>
  );
}
