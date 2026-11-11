import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Fenetre } from './revizplus/RevizPlusOffre';
import { loadRevisions } from '../services/revisionService';
import { mesurer } from '../services/mesure';
import {
  DUREES, EVENEMENT, lireConcentration, demarrer, mettreEnPause, reprendre, arreter,
  etatConcentration, minuteur, bilanConcentration,
} from '../utils/concentration';
import { nbsp } from '../utils/typography';
import '../components/RevizPlusAnnonce.css';
import './Concentration.css';

/** La fenêtre qui lance une séance : la durée, puis « C'est parti ». */
export function LancerConcentration({ onClose }) {
  const { currentUser } = useAuth() ?? {};
  const [minutes, setMinutes] = useState(25);
  const lancer = () => { demarrer(currentUser.uid, minutes); mesurer('concentration', { etape: 'lancee', minutes }); onClose(); };
  return (
    <Fenetre label="Mode concentration" pose="pointing" onClose={onClose}>
      <h2 className="rpa-titre">Mode concentration</h2>
      <p className="rpa-texte">{nbsp('Un temps pour réviser sans distraction : range ton téléphone dans tes notifications, le minuteur te suit dans l’app. À la fin, ton bilan.')}</p>
      <div className="cc-durees" role="radiogroup" aria-label="Durée">
        {DUREES.map(m => (
          <button key={m} type="button" role="radio" aria-checked={minutes === m} className={`cc-duree${minutes === m ? ' is-choisie' : ''}`} onClick={() => setMinutes(m)}>
            <b>{m}</b> min
          </button>
        ))}
      </div>
      <button type="button" className="rpo-btn" onClick={lancer}>C’est parti</button>
      <button type="button" className="rpo-lien" onClick={onClose}>Plus tard</button>
    </Fenetre>
  );
}

/**
 * Le minuteur du mode concentration (11/11), posé une fois pour toutes les pages : une pastille
 * avec le temps qui reste, pause et arrêt ; à la fin, le bilan de la séance.
 */
export function ConcentrationFlottante() {
  const { currentUser, isGuest } = useAuth() ?? {};
  const uid = currentUser?.uid;
  const [c, setC] = useState(() => (uid ? lireConcentration(uid) : null));
  const [maintenant, setMaintenant] = useState(() => Date.now());

  useEffect(() => {
    if (!uid) return undefined;
    const relire = () => setC(lireConcentration(uid));
    relire();
    window.addEventListener(EVENEMENT, relire);
    window.addEventListener('storage', relire);
    return () => { window.removeEventListener(EVENEMENT, relire); window.removeEventListener('storage', relire); };
  }, [uid]);
  useEffect(() => {
    if (!c || c.pauseLe) return undefined;
    const t = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(t);
  }, [c]);

  if (!uid || isGuest || !c) return null;
  const e = etatConcentration(c, maintenant);

  if (e.fini) {
    const b = bilanConcentration(loadRevisions(), c.debut, Date.now());
    const lignes = [
      b.exercices && `${b.exercices} séance${b.exercices > 1 ? 's' : ''} d’exercices`,
      b.quiz && `${b.quiz} quiz`,
      b.flashcards && `${b.flashcards} série${b.flashcards > 1 ? 's' : ''} de flashcards`,
      b.lectures && `${b.lectures} fiche${b.lectures > 1 ? 's' : ''} relue${b.lectures > 1 ? 's' : ''}`,
    ].filter(Boolean);
    const fermer = () => { mesurer('concentration', { etape: 'finie', minutes: Math.round(c.duree / 60_000), seances: lignes.length, xp: b.xp }); arreter(uid); };
    return (
      <Fenetre label="Séance de concentration terminée" pose="celebration" onClose={fermer}>
        <h2 className="rpa-titre">{`${Math.round(c.duree / 60_000)} minutes de concentration`}</h2>
        <p className="rpa-texte">{nbsp(lignes.length ? 'Voilà ce que tu as fait pendant ce temps.' : 'Rien de noté pendant ce temps : la prochaine fois, lance une séance d’exercices.')}</p>
        {lignes.length > 0 && (
          <ul className="cc-bilan">
            {lignes.map(l => <li key={l}>{l}</li>)}
            {b.xp > 0 && <li><b>{`+${b.xp} XP`}</b></li>}
          </ul>
        )}
        <p className="rpa-texte">{nbsp('Lève-toi cinq minutes avant la suite : ça aide à retenir.')}</p>
        <button type="button" className="rpo-btn" onClick={fermer}>Terminer</button>
      </Fenetre>
    );
  }

  return (
    <div className={`cc-pastille${e.enPause ? ' is-pause' : ''}`} role="timer" aria-label={`Mode concentration : ${minuteur(e.restant)} restantes${e.enPause ? ', en pause' : ''}`}>
      <span className="cc-point" aria-hidden="true" />
      <b className="cc-temps">{minuteur(e.restant)}</b>
      {e.enPause
        ? <button type="button" className="cc-bouton" onClick={() => reprendre(uid)}>Reprendre</button>
        : <button type="button" className="cc-bouton" onClick={() => mettreEnPause(uid)}>Pause</button>}
      <button type="button" className="cc-bouton cc-bouton--arret" onClick={() => { mesurer('concentration', { etape: 'arretee' }); arreter(uid); }} aria-label="Arrêter le mode concentration">✕</button>
    </div>
  );
}
