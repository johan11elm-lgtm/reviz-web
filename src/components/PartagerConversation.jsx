import { useState } from 'react';
import { Fenetre } from './revizplus/RevizPlusOffre';
import { auth } from '../services/firebaseConfig';
import { apiFetch } from '../services/apiClient';
import { mesurer } from '../services/mesure';
import { nbsp } from '../utils/typography';
import '../components/RevizPlusAnnonce.css';
import './PartagerConversation.css';

const Fleche = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
  </svg>
);

/**
 * « Partager » une conversation avec Réviz IA (11/11, api/_partageChat.js) : un lien que l'élève
 * envoie à un ami ; qui l'ouvre lit la conversation sur /partage/:id, sans compte, puis peut
 * essayer Réviz. Seul le texte part, sans prénom ni pièce jointe ; le lien marche 30 jours.
 * @param {{ messages: object[], titre?: string|null, className?: string }} p
 */
export function PartagerConversation({ messages, titre = null, className = 'ia-rond' }) {
  const [ouvert, setOuvert] = useState(false);
  const [etat, setEtat] = useState({ en: false, lien: null, erreur: '', copie: false });
  if (!messages?.some(m => m.role === 'assistant')) return null;
  const peutPartager = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  async function creer() {
    setEtat({ en: true, lien: null, erreur: '', copie: false });
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await apiFetch('/api/track?op=partage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, titre, messages }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) throw new Error(data.error ?? 'ERREUR');
      const lien = `${window.location.origin}/partage/${data.id}`;
      mesurer('partage_chat', { etape: 'cree', messages: messages.length });
      setEtat({ en: false, lien, erreur: '', copie: false });
      if (peutPartager) navigator.share({ title: 'Réviz IA', text: titre ? `Ma conversation avec Réviz IA sur « ${titre} » :` : 'Ma conversation avec Réviz IA :', url: lien }).catch(() => {});
    } catch (err) {
      setEtat({ en: false, lien: null, erreur: err.message === 'TROP' ? 'Tu as déjà créé beaucoup de liens aujourd’hui. Réessaie demain.' : 'Le lien n’a pas pu être créé. Réessaie dans un instant.', copie: false });
    }
  }
  async function copier() {
    try { await navigator.clipboard.writeText(etat.lien); setEtat(e => ({ ...e, copie: true })); } catch { /* le lien reste affiché */ }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => { setOuvert(true); mesurer('partage_chat', { etape: 'ouvert' }); }} aria-haspopup="dialog" aria-label="Partager cette conversation"><Fleche /></button>
      {ouvert && (
        <Fenetre label="Partager cette conversation" pose="pointing" onClose={() => setOuvert(false)}>
          <h2 className="rpa-titre">Partager cette conversation</h2>
          <p className="rpa-texte">{nbsp('Qui ouvre le lien lit cette conversation, sans ton prénom. N’y mets rien de personnel. Le lien marche 30 jours.')}</p>
          {etat.lien ? (
            <>
              <input className="pc-lien" readOnly value={etat.lien} aria-label="Le lien de la conversation" onFocus={e => e.target.select()} />
              <button type="button" className="rpo-btn" onClick={copier}>{etat.copie ? 'Lien copié' : 'Copier le lien'}</button>
              {peutPartager && <button type="button" className="rpo-btn rpo-btn--second" onClick={() => navigator.share({ url: etat.lien }).catch(() => {})}>Envoyer</button>}
            </>
          ) : (
            <button type="button" className="rpo-btn" onClick={creer} disabled={etat.en}>{etat.en ? 'Création du lien…' : 'Créer le lien'}</button>
          )}
          {etat.erreur && <p className="pc-erreur" role="alert">{etat.erreur}</p>}
          <button type="button" className="rpo-lien" onClick={() => setOuvert(false)}>Fermer</button>
        </Fenetre>
      )}
    </>
  );
}
