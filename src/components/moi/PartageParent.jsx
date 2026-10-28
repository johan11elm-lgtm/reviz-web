import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../services/firebaseConfig';
import { apiFetch } from '../../services/apiClient';
import { Mascot } from '../Mascot';
import './PartageParent.css';

/**
 * « Moi » : le lien de l'espace parent (api/_espaceParent.js), que l'élève envoie à ses parents.
 * Le parent y voit ce que l'élève révise et ses contrôles, pas ses notes. Avec un compte
 * seulement (en mode essai, rien n'est enregistré en ligne).
 */
export function PartageParent() {
  const { currentUser, isGuest } = useAuth();
  const [etat, setEtat] = useState(''); // '' | 'creation' | 'pret' | 'copie' | 'erreur'
  const [lien, setLien] = useState(null);
  if (isGuest || !currentUser) return null;
  const peutPartager = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  async function partager(url) {
    try {
      await navigator.share({ title: 'Mes révisions sur Réviz', text: 'Ce que je révise sur Réviz, et mes contrôles :', url });
    } catch { /* partage annulé */ }
  }
  async function creer() {
    setEtat('creation');
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('UNAUTHORIZED');
      const res = await apiFetch('/api/track?op=lien-parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error(`API_${res.status}`);
      const { lien: url } = await res.json();
      setLien(url);
      setEtat('pret');
      if (peutPartager) await partager(url);
    } catch {
      setEtat('erreur');
    }
  }
  async function copier() {
    try {
      await navigator.clipboard.writeText(lien);
      setEtat('copie');
    } catch { /* presse-papiers refusé : le lien reste affiché */ }
  }

  return (
    <div className="pp">
      <div className="pp-haut">
        <span className="pp-rond" aria-hidden="true"><Mascot pose="writing" size={44} alt="" /></span>
        <span className="pp-txt">
          <b>Espace parent</b>
          <span>Un lien pour que tes parents voient ce que tu révises et tes contrôles. Pas tes notes.</span>
        </span>
      </div>
      {!lien ? (
        <button type="button" className="pp-btn" onClick={creer} disabled={etat === 'creation'}>
          {etat === 'creation' ? 'Création du lien…' : 'Partager à mes parents'}
        </button>
      ) : (
        <div className="pp-actions">
          <input className="pp-lien" readOnly value={lien} aria-label="Lien de l’espace parent" onFocus={e => e.target.select()} />
          <div className="pp-boutons">
            <button type="button" className="pp-btn" onClick={copier}>{etat === 'copie' ? 'Lien copié' : 'Copier le lien'}</button>
            {peutPartager && <button type="button" className="pp-btn pp-btn--creme" onClick={() => partager(lien)}>Envoyer</button>}
          </div>
          <p className="pp-note">Valable 60 jours. Envoie-le seulement à tes parents.</p>
        </div>
      )}
      {etat === 'erreur' && <p className="pp-erreur" role="alert">Le lien n’a pas pu être créé. Réessaie dans un instant.</p>}
    </div>
  );
}
