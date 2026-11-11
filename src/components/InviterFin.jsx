import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { IS_NATIVE } from '../services/apiClient';
import { mesurer } from '../services/mesure';
import { PARRAINAGE_JOURS, lienParrainage } from '../../api/_parrainage.js';
import { peutProposerInvitation, noterInvitationProposee } from '../utils/inviterFin';
import { nbsp } from '../utils/typography';
import './RappelDemain.css';

/**
 * Fin de séance réussie (11/11) : « Révise avec un ami de ta classe », le lien de parrainage en un
 * geste (partage du téléphone, sinon copié). Une carte à la fois : rien quand « Montre ça à tes
 * parents » s'affiche (accord parental à fournir). Avec un compte seulement, pas dans l'app iOS.
 * @param {{ score: number, total: number }} p
 */
export function InviterFin({ score, total }) {
  const { currentUser, isGuest, isPremium, consent, chargerParrainage } = useAuth() ?? {};
  const masque = consent?.status === 'a-fournir';
  const uid = currentUser?.uid;
  const [proposee] = useState(() => !masque && !isGuest && !IS_NATIVE && peutProposerInvitation(uid, score, total));
  const [etat, setEtat] = useState(''); // '' | 'creation' | 'partage' | 'copie' | 'erreur'
  const vu = useRef(false);
  useEffect(() => {
    if (!proposee || vu.current) return;
    vu.current = true;
    noterInvitationProposee(uid);
    mesurer('parrainage', { etape: 'fin_seance_vue' });
  }, [proposee, uid]);
  if (!proposee) return null;

  async function inviter() {
    setEtat('creation');
    const r = await chargerParrainage?.();
    if (!r?.code) { setEtat('erreur'); return; }
    const lien = lienParrainage(r.code, window.location.origin);
    mesurer('parrainage', { etape: 'fin_seance_partage' });
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Réviz', text: `Je révise mes contrôles sur Réviz. Avec mon lien, tu as ${PARRAINAGE_JOURS} jours de Réviz+ offerts :`, url: lien });
        setEtat('partage');
        return;
      } catch { /* partage annulé : on copie */ }
    }
    try { await navigator.clipboard.writeText(lien); setEtat('copie'); } catch { setEtat('erreur'); }
  }

  return (
    <section className="qz-carte qz-inviter" aria-labelledby="qz-inviter-titre">
      <h2 id="qz-inviter-titre" className="qz-titre2">{nbsp('Révise avec un ami de ta classe')}</h2>
      <p className="rd-texte">{nbsp(isPremium
        ? `Avec ton lien, il reçoit ${PARRAINAGE_JOURS} jours de Réviz+ en créant son compte.`
        : `${PARRAINAGE_JOURS} jours de Réviz+ pour vous deux, dès qu’il crée son compte avec ton lien.`)}</p>
      <div className="rd-actions">
        {etat === 'copie' || etat === 'partage' ? (
          <p className="rd-texte qz-inviter-ok" role="status">{etat === 'copie' ? 'Lien copié : envoie-le à ton ami.' : 'Envoyé. Merci !'}</p>
        ) : (
          <button type="button" className="fc-btn fc-btn--orange rd-btn" onClick={inviter} disabled={etat === 'creation'}>
            {etat === 'creation' ? 'Un instant…' : 'Inviter un ami'}
          </button>
        )}
      </div>
      {etat === 'erreur' && <p className="rd-texte" role="alert">{nbsp('Le lien n’a pas pu être créé. Tu le retrouves dans « Moi ».')}</p>}
    </section>
  );
}
