import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { IS_NATIVE } from '../../services/apiClient';
import { mesurer } from '../../services/mesure';
import { normaliserCodeCadeau, messageErreurCadeau } from '../../utils/cadeau';
import { nbsp } from '../../utils/typography';
import './PartageParent.css';
import './InviterAmi.css';

/**
 * « Moi » : « Un parent t'a offert Réviz+ ? » (11/11, api/_cadeau.js). L'élève tape le code reçu
 * de son parent (le lien l'active tout seul). Rien pour un abonné, un invité ou dans l'app iOS.
 */
export function CodeCadeau() {
  const { currentUser, isGuest, isPremium, activerCadeau } = useAuth();
  const [saisie, setSaisie] = useState(null);
  const [etat, setEtat] = useState({ en: false, erreur: '', ok: false });
  if (!currentUser || isGuest || IS_NATIVE || (isPremium && !etat.ok)) return null;
  if (etat.ok) return <p className="ia-ok" role="status">{nbsp('Réviz+ est activé. Merci à ton parent !')}</p>;

  async function valider(e) {
    e.preventDefault();
    const code = normaliserCodeCadeau(saisie ?? '');
    if (!code) { setEtat({ en: false, erreur: messageErreurCadeau('CODE_INVALIDE'), ok: false }); return; }
    setEtat({ en: true, erreur: '', ok: false });
    const r = await activerCadeau?.(code);
    mesurer('cadeau', { etape: 'saisie', resultat: r?.ok ? 'ok' : r?.erreur });
    setEtat(r?.ok ? { en: false, erreur: '', ok: true } : { en: false, erreur: messageErreurCadeau(r?.erreur), ok: false });
  }

  return saisie == null ? (
    <button type="button" className="ia-lien" onClick={() => setSaisie('')}>Un parent t’a offert Réviz+ ? Entre son code</button>
  ) : (
    <form className="ia-saisie" onSubmit={valider}>
      <label htmlFor="cc-code">Le code de ton parent</label>
      <div className="ia-ligne">
        <input id="cc-code" className="pp-lien ia-code" value={saisie} maxLength={10} autoComplete="off" autoCapitalize="characters"
          spellCheck={false} placeholder="ABCD-EFGH" onChange={e => setSaisie(e.target.value)}
          aria-invalid={etat.erreur ? true : undefined} aria-describedby={etat.erreur ? 'cc-erreur' : undefined} />
        <button type="submit" className="pp-btn ia-valider" disabled={etat.en}>{etat.en ? 'Vérification…' : 'Activer'}</button>
      </div>
      {etat.erreur && <p className="pp-erreur" id="cc-erreur" role="alert">{etat.erreur}</p>}
    </form>
  );
}
