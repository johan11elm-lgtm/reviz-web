import { useEffect, useState } from 'react';
import { Fenetre } from './revizplus/RevizPlusOffre';
import { AjoutControle } from './AjoutControle';
import { mesurer } from '../services/mesure';
import { RAISONS_ABSENCE, noterRetourVu } from '../utils/retourAbsence';
import { nbsp } from '../utils/typography';
import '../components/RevizPlusAnnonce.css';
import './RetourAbsence.css';

/**
 * Accueil du retour (11/11, utils/retourAbsence.js) : « Content de te revoir », ce qui a éloigné
 * l'élève (mesuré : c'est notre plus grosse fuite), une réponse, puis la reprise en 5 minutes. Sans
 * contrôle à venir, il peut aussi noter le prochain, qui fait revenir trois fois plus le lendemain.
 * @param {{ uid: string, prenom?: string, jours: number, repere: string, aControle: boolean,
 *   onReprendre: Function, onClose: Function }} p
 */
export function RetourAbsence({ uid, prenom, jours, repere, aControle, onReprendre, onClose }) {
  const [raison, setRaison] = useState(null);
  const [feuille, setFeuille] = useState(false);
  const [note, setNote] = useState(false);
  useEffect(() => {
    noterRetourVu(uid, repere);
    mesurer('retour_absence', { etape: 'vue', jours });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const choix = RAISONS_ABSENCE.find(r => r.id === raison);
  const choisir = id => { setRaison(id); mesurer('retour_absence', { etape: 'raison', raison: id, jours }); };
  const reprendre = () => { mesurer('retour_absence', { etape: 'reprendre', raison }); onClose(); onReprendre(); };
  const fermer = () => { if (!raison) mesurer('retour_absence', { etape: 'ferme' }); onClose(); };

  return (
    <>
      <Fenetre label="Content de te revoir" pose={choix ? 'pointing' : 'hello'} onClose={fermer}>
        <h2 className="rpa-titre">{prenom ? `Content de te revoir, ${prenom}.` : 'Content de te revoir.'}</h2>
        <p className="rpa-texte" aria-live="polite">{nbsp(note
          ? 'C’est noté : ton plan de révision est prêt dans l’agenda.'
          : choix ? choix.reponse : `Ça fait ${jours} jours. Qu’est-ce qui t’a éloigné ?`)}</p>
        {!choix ? (
          <div className="ra-raisons" role="group" aria-label="Ce qui t’a éloigné">
            {RAISONS_ABSENCE.map(r => (
              <button key={r.id} type="button" className="ra-raison" onClick={() => choisir(r.id)}>{r.label}</button>
            ))}
          </div>
        ) : (
          <>
            <button type="button" className="rpo-btn" onClick={reprendre}>Reprendre en 5 minutes</button>
            {!aControle && !note && (
              <button type="button" className="rpo-btn rpo-btn--second" onClick={() => setFeuille(true)}>Noter mon prochain contrôle</button>
            )}
          </>
        )}
        <button type="button" className="rpo-lien" onClick={fermer}>Plus tard</button>
      </Fenetre>
      {feuille && (
        <AjoutControle initial={{}} onClose={() => setFeuille(false)}
          onSaved={() => { setFeuille(false); setNote(true); mesurer('retour_absence', { etape: 'controle' }); }} />
      )}
    </>
  );
}
