import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { etatPush, activerPush } from '../services/pushService';
import { mesurer } from '../services/mesure';
import { HEURE_RAPPEL } from '../utils/push';
import { peutDemander, noterDemande, ETATS_PROPOSABLES } from '../utils/demandeRappel';
import { Fenetre } from './revizplus/RevizPlusOffre';
import '../components/RevizPlusAnnonce.css';
import './RappelDemain.css';

/**
 * La demande, une fois par apparition : visible si l'élève a un compte, que le navigateur peut
 * encore proposer les notifications (ou, sur iPhone, après installation) et que la règle
 * d'espacement le permet (utils/demandeRappel.js). La demande est notée dès qu'elle s'affiche.
 */
function useDemande(lieu, condition = true) {
  const { currentUser, isGuest } = useAuth() ?? {};
  const uid = currentUser && !isGuest && !currentUser.isAnonymous ? currentUser.uid : null;
  const [etat] = useState(() => etatPush());
  const [visible] = useState(() => condition && !!uid && ETATS_PROPOSABLES.includes(etat) && peutDemander(uid));
  const note = useRef(false);
  useEffect(() => {
    if (!visible || note.current) return;
    note.current = true;
    noterDemande(uid);
    mesurer('rappel_propose', { lieu, etat });
  }, [visible, uid, lieu, etat]);
  return { visible, etat };
}

const TEXTE = `Un petit rappel à ${HEURE_RAPPEL}, seulement les jours d’école où tu n’as pas encore révisé.`;
const TEXTE_IPHONE = `Ajoute Réviz à ton écran d’accueil : tu pourras recevoir un rappel à ${HEURE_RAPPEL}, seulement les jours d’école où tu n’as pas encore révisé.`;

function useActivation(lieu) {
  const [reponse, setReponse] = useState(''); // '' | envoi | fait | refuse | plus-tard
  async function activer() {
    setReponse('envoi');
    const r = await activerPush(lieu);
    setReponse(r.ok ? 'fait' : 'refuse');
  }
  function plusTard() {
    mesurer('rappel_plus_tard', { lieu });
    setReponse('plus-tard');
  }
  return { reponse, activer, plusTard };
}

/** Fin de séance (exercices, quiz) : une carte sous le bilan. */
export function RappelDemain() {
  const lieu = 'fin_seance';
  const { visible, etat } = useDemande(lieu);
  const { reponse, activer, plusTard } = useActivation(lieu);
  if (!visible || reponse === 'plus-tard') return null;
  if (reponse === 'fait' || reponse === 'refuse') {
    return (
      <section className="qz-carte rd-carte rd-carte--fait" aria-live="polite">
        <p className="rd-texte">{reponse === 'fait'
          ? `C’est noté : un rappel demain à ${HEURE_RAPPEL} si tu n’as pas encore révisé.`
          : 'Pas de souci. Tu pourras l’activer plus tard dans Réglages.'}</p>
      </section>
    );
  }
  const iphone = etat === 'installer';
  return (
    <section className="qz-carte rd-carte" aria-labelledby="rd-titre">
      <h2 id="rd-titre" className="qz-titre2">{iphone ? 'Un rappel sur ton iPhone ?' : 'Je te rappelle demain ?'}</h2>
      <p className="rd-texte">{iphone ? TEXTE_IPHONE : TEXTE}</p>
      <div className="rd-actions">
        {iphone
          ? <Link to="/installer" className="fc-btn fc-btn--orange rd-btn" onClick={() => mesurer('rappel_installer', { lieu })}>Voir comment</Link>
          : <button type="button" className="fc-btn fc-btn--orange rd-btn" onClick={activer} disabled={reponse === 'envoi'}>{reponse === 'envoi' ? 'Un instant…' : 'Oui, rappelle-moi'}</button>}
        <button type="button" className="fc-lien rd-lien" onClick={plusTard}>Pas maintenant</button>
      </div>
    </section>
  );
}

/**
 * À l'ouverture (accueil), tant que ce n'est pas fait et que l'élève a déjà révisé : une petite
 * fenêtre. onClose : appelée quand elle se ferme (ou tout de suite si elle n'a rien à montrer).
 */
export function RappelOuverture({ onClose }) {
  const lieu = 'ouverture';
  const { visible, etat } = useDemande(lieu);
  const { reponse, activer, plusTard } = useActivation(lieu);
  useEffect(() => { if (!visible) onClose?.(); }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (reponse !== 'fait' && reponse !== 'refuse') return undefined;
    const t = setTimeout(() => onClose?.(), 1800);
    return () => clearTimeout(t);
  }, [reponse]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!visible) return null;
  const fermer = () => { if (!reponse) plusTard(); onClose?.(); };
  const iphone = etat === 'installer';
  const fini = reponse === 'fait' || reponse === 'refuse';
  return (
    <Fenetre label="Rappel de révision" pose="hello" onClose={fermer}>
      <h2 className="rpa-titre rd-titre-fenetre">{iphone ? 'Un rappel sur ton iPhone ?' : `Un rappel à ${HEURE_RAPPEL} ?`}</h2>
      <p className="rpa-texte">{fini
        ? (reponse === 'fait' ? `C’est noté : un rappel à ${HEURE_RAPPEL} les jours d’école où tu n’as pas encore révisé.` : 'Pas de souci. Tu pourras l’activer plus tard dans Réglages.')
        : (iphone ? TEXTE_IPHONE : `${TEXTE} Pour garder ta série sans y penser.`)}</p>
      {!fini && (iphone
        ? <Link to="/installer" className="rpo-btn rd-lien-btn" onClick={() => { mesurer('rappel_installer', { lieu }); onClose?.(); }}>Voir comment</Link>
        : <button type="button" className="rpo-btn" onClick={activer} disabled={reponse === 'envoi'}>{reponse === 'envoi' ? 'Un instant…' : 'Oui, rappelle-moi'}</button>)}
      {!fini && <button type="button" className="rpo-lien" onClick={fermer}>Pas maintenant</button>}
    </Fenetre>
  );
}
