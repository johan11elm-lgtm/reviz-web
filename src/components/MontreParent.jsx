import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendParentalConsent, consentErrorMessage } from '../services/consentService';
import { track } from '../services/statsService';
import { mesurer } from '../services/mesure';
import { matiereSlug } from '../utils/programme';

const masquer = e => e.replace(/^(.)[^@]*(@.*)$/, '$1•••$2');

/**
 * Fin de quiz, pour un moins de 15 ans qui n'a pas encore donné l'adresse
 * d'un parent (« Plus tard ») : « Montre ça à tes parents ». L'élève tape
 * l'adresse, le parent reçoit son score et, dans le même mail, le bouton
 * d'autorisation. Seulement après un quiz réussi à moitié au moins : on
 * montre ce dont on est fier. Ne rend rien hors de cet état.
 * @param {{ score: number, total: number, lecon?: object|null }} p
 *   lecon = entrée de l'historique (chapterId, classe, matiere) pour que le
 *   serveur retrouve le titre du chapitre
 */
export function MontreParent({ score, total, lecon = null }) {
  const { consent, isGuest, currentUser, refreshGate } = useAuth() ?? {};
  const [adresse, setAdresse] = useState('');
  const [etat, setEtat] = useState(''); // '' | 'envoi' | 'envoye'
  const [erreur, setErreur] = useState('');
  const [envoyeA, setEnvoyeA] = useState('');
  const vu = useRef(false);

  const proposee = !isGuest && !!currentUser && total > 0 && score / total >= 0.5
    && (consent?.status === 'a-fournir' || etat === 'envoye');

  useEffect(() => {
    if (!proposee || vu.current) return;
    vu.current = true;
    mesurer('parent_montre', { etape: 'vue' });
  }, [proposee]);

  if (!proposee) return null;

  async function envoyer(e) {
    e.preventDefault();
    const a = adresse.trim();
    if (!/^\S+@\S+\.\S+$/.test(a)) { setErreur('Adresse e-mail invalide.'); return; }
    setEtat('envoi'); setErreur('');
    const chapitre = lecon?.chapterId && lecon?.classe && lecon?.matiere
      ? { classe: lecon.classe, matiere: matiereSlug(lecon.matiere), id: lecon.chapterId }
      : undefined;
    try {
      await sendParentalConsent(a, currentUser?.displayName ?? '', { score, total, ...(chapitre ? { chapitre } : {}) });
      track('consent_envoye');
      mesurer('parent_montre', { etape: 'envoye' });
      setEnvoyeA(masquer(a));
      setEtat('envoye');
      await refreshGate?.();
    } catch (err) {
      setEtat('');
      setErreur(consentErrorMessage(err.message));
    }
  }

  if (etat === 'envoye') {
    return (
      <section className="qz-carte qz-parent qz-parent--fait" aria-live="polite">
        <h2 className="qz-titre2">C'est parti</h2>
        <p className="qz-parent-texte">Ton parent va recevoir ton {score}/{total} à {envoyeA}. Le même mail lui demande son accord pour que tu gardes ton compte.</p>
      </section>
    );
  }

  return (
    <section className="qz-carte qz-parent" aria-labelledby="qz-titre-parent">
      <h2 id="qz-titre-parent" className="qz-titre2">Montre ça à tes parents</h2>
      <p className="qz-parent-texte">
        Envoie ton {score}/{total} à un parent. Il le reçoit par mail, avec le bouton pour accepter que tu gardes ton compte Réviz.
      </p>
      <form className="qz-parent-form" onSubmit={envoyer} noValidate>
        <input id="qz-parent-email" aria-label="Adresse e-mail d'un parent" className="qz-parent-input" type="email" inputMode="email" autoComplete="off"
          placeholder="adresse d'un parent" value={adresse} onChange={ev => { setAdresse(ev.target.value); setErreur(''); }} />
        <button type="submit" className="fc-btn fc-btn--orange qz-parent-btn" disabled={etat === 'envoi'}>
          {etat === 'envoi' ? 'Envoi…' : 'Envoyer'}
        </button>
      </form>
      {erreur && <p className="qz-parent-erreur" role="alert">{erreur}</p>}
    </section>
  );
}
