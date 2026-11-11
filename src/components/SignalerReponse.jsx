import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalA11y } from '../hooks/useModalA11y';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { signalerReponse } from '../services/signalementService';
import { mesurer } from '../services/mesure';
import './battle/AnnonceBattle.css';
import './SignalerReponse.css';

const RAISONS = [
  ['faux', 'C’est faux'],
  ['choquant', 'C’est choquant ou déplacé'],
  ['hors-sujet', 'Ça ne répond pas à ma question'],
  ['autre', 'Autre chose'],
];
// Une question d'exercice ou de quiz (11/11, mêmes valeurs que RAISONS_QUESTION dans api/avis.js).
const RAISONS_QUESTION = [
  ['confuse', 'La question n’est pas claire'],
  ['plusieurs', 'Plusieurs réponses sont justes'],
  ['faux', 'La correction est fausse'],
  ['hors-programme', 'Ce n’est pas dans mon programme'],
  ['trop-dur', 'C’est beaucoup trop dur'],
  ['autre', 'Autre chose'],
];
const TEXTES = {
  ia: { titre: 'Signaler cette réponse', texte: 'Réviz IA peut se tromper. Dis-nous ce qui ne va pas : on relit la réponse et on corrige.', merci: 'Merci, on relit cette réponse.' },
  question: { titre: 'Signaler cette question', texte: 'Une question mal posée ? Dis-nous ce qui ne va pas : on la relit et on la corrige.', merci: 'Merci, on relit cette question.' },
};

/**
 * « Signaler » sous une réponse de Réviz IA : l'élève choisit une raison, la réponse part avec
 * sa question pour être relue (services/signalementService.js). Une fois envoyé, le lien laisse
 * place à un merci, pour cette réponse.
 * @param {string} reponse   texte de la réponse signalée
 * @param {string} [question] la question de l'élève juste avant
 * @param {string|null} [lessonId]
 * @param {string} [className]
 */
export function SignalerReponse({ reponse, question, lessonId = null, className = '', type = 'ia', format }) {
  const [ouvert, setOuvert] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const textes = TEXTES[type === 'ia' ? 'ia' : 'question'];
  if (envoye) return <p className={`sig-merci ${className}`} role="status">{textes.merci}</p>;
  return (
    <>
      <button type="button" className={`sig-lien ${className}`} onClick={() => setOuvert(true)}>
        <Drapeau /> Signaler
      </button>
      {ouvert && <Feuille {...{ reponse, question, lessonId, type, format, textes }} onClose={() => setOuvert(false)} onEnvoye={() => { setOuvert(false); setEnvoye(true); }} />}
    </>
  );
}

function Feuille({ reponse, question, lessonId, type, format, textes, onClose, onEnvoye }) {
  const raisons = type === 'ia' ? RAISONS : RAISONS_QUESTION;
  const isDesktop = useIsDesktop();
  const ref = useModalA11y(onClose);
  const [raison, setRaison] = useState(null);
  const [precision, setPrecision] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function envoyer() {
    if (!raison || enCours) return;
    setEnCours(true);
    setErreur(null);
    try {
      await signalerReponse({ raison, reponse, question, precision: precision.trim(), lessonId, ...(type === 'ia' ? {} : { type, format }) });
      if (type !== 'ia') mesurer('signalement', { type, raison, format });
      onEnvoye();
    } catch (err) {
      setErreur(err.message === 'UNAUTHORIZED' ? 'Reconnecte-toi, puis réessaie.' : 'L’envoi n’a pas marché. Vérifie ta connexion et réessaie.');
      setEnCours(false);
    }
  }

  return createPortal(
    <div className="ban-voile" onClick={onClose}>
      <div className={`ban-feuille${isDesktop ? ' ban-feuille--fenetre' : ''}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby="sig-titre" onClick={e => e.stopPropagation()}>
        {!isDesktop && <span className="ban-poignee" aria-hidden="true" />}
        <h2 className="ban-titre sig-titre" id="sig-titre">{textes.titre}</h2>
        <p className="ban-texte">{textes.texte}</p>
        <div className="sig-raisons" role="radiogroup" aria-labelledby="sig-titre">
          {raisons.map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={raison === v} className={`sig-raison${raison === v ? ' sig-raison--choisie' : ''}`} onClick={() => setRaison(v)}>
              <span className="sig-rond" aria-hidden="true" />{label}
            </button>
          ))}
        </div>
        <textarea className="sig-precision" rows={2} maxLength={500} placeholder="Tu veux préciser ? (facultatif)" value={precision} onChange={e => setPrecision(e.target.value)} aria-label="Préciser le problème" />
        {erreur && <p className="sig-erreur" role="alert">{erreur}</p>}
        <div className="ban-actions">
          <button type="button" className="ban-btn" onClick={envoyer} disabled={!raison || enCours}>{enCours ? 'Envoi…' : 'Envoyer'}</button>
          <button type="button" className="ban-plus-tard" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const Drapeau = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>
);
