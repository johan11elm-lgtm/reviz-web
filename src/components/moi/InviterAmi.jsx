import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { IS_NATIVE } from '../../services/apiClient';
import { mesurer } from '../../services/mesure';
import { Mascot } from '../Mascot';
import { PARRAINAGE_JOURS, PARRAINAGE_DELAI_JOURS, lienParrainage, normaliserCode } from '../../../api/_parrainage.js';
import { messageErreurParrainage } from '../../utils/parrainage';
import { nbsp } from '../../utils/typography';
import './PartageParent.css';
import './InviterAmi.css';

const dateCourte = ms => new Date(ms).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * « Moi » : « Invite un ami de ta classe » (parrainage, api/_parrainage.js). Le lien porte le code
 * de l'élève ; l'ami qui crée son compte avec reçoit 3 jours de Réviz+, et l'élève aussi. Un
 * nouveau compte (moins d'une semaine) peut aussi taper le code d'un ami. Avec un compte
 * seulement, et pas dans l'app iOS (qui ne propose pas Réviz+, règle 3.1.1 de l'App Store).
 */
/** @param {{ titre?: string }} p — sur téléphone, la carte vient dans sa propre section, avec ce titre. */
export function InviterAmi({ titre } = {}) {
  const { currentUser, isGuest, isPremium, parrainage = {}, chargerParrainage, utiliserCodeParrain } = useAuth();
  const [etat, setEtat] = useState(''); // '' | 'creation' | 'copie' | 'erreur'
  const [saisie, setSaisie] = useState(null); // null : champ fermé
  const [verif, setVerif] = useState({ en: false, erreur: '', ok: false });
  if (isGuest || !currentUser || IS_NATIVE) return null;

  const code = parrainage.code ?? null;
  const lien = code ? lienParrainage(code, typeof window !== 'undefined' ? window.location.origin : undefined) : null;
  const peutPartager = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const maintenant = Date.now();
  const offertJusquA = Number.isFinite(parrainage.fin) && parrainage.fin > maintenant ? parrainage.fin : null;
  const filleuls = parrainage.filleuls ?? 0;
  const cree = Date.parse(currentUser.metadata?.creationTime ?? '');
  const peutUtiliserCode = !Number.isFinite(parrainage.utiliseLe)
    && Number.isFinite(cree) && maintenant - cree < PARRAINAGE_DELAI_JOURS * 24 * 60 * 60 * 1000;

  async function partager(url) {
    mesurer('parrainage', { etape: 'partage', natif: peutPartager });
    try {
      await navigator.share({
        title: 'Réviz',
        text: `Je révise mes contrôles sur Réviz. Avec mon lien, tu as ${PARRAINAGE_JOURS} jours de Réviz+ offerts :`,
        url,
      });
    } catch { /* partage annulé */ }
  }
  async function inviter() {
    setEtat('creation');
    const r = await chargerParrainage?.();
    if (!r?.code) { setEtat('erreur'); return; }
    setEtat('');
    mesurer('parrainage', { etape: 'code' });
    if (peutPartager) await partager(lienParrainage(r.code, window.location.origin));
  }
  async function copier() {
    try {
      await navigator.clipboard.writeText(lien);
      setEtat('copie');
      mesurer('parrainage', { etape: 'copie' });
    } catch { /* presse-papiers refusé : le lien reste affiché */ }
  }
  async function valider(e) {
    e.preventDefault();
    const propre = normaliserCode(saisie ?? '');
    if (!propre) { setVerif({ en: false, erreur: messageErreurParrainage('CODE_INVALIDE'), ok: false }); return; }
    setVerif({ en: true, erreur: '', ok: false });
    const r = await utiliserCodeParrain?.(propre);
    mesurer('parrainage', { etape: 'saisie', resultat: r?.ok ? 'ok' : r?.erreur });
    setVerif(r?.ok ? { en: false, erreur: '', ok: true } : { en: false, erreur: messageErreurParrainage(r?.erreur), ok: false });
  }

  const carte = (
    <div className="pp ia">
      <div className="pp-haut">
        <span className="pp-rond ia-rond" aria-hidden="true"><Mascot pose="celebration" size={44} alt="" /></span>
        <span className="pp-txt">
          <b>Invite un ami de ta classe</b>
          <span>{nbsp(isPremium
            ? `Avec ton lien, il reçoit ${PARRAINAGE_JOURS} jours de Réviz+ en créant son compte.`
            : `Il reçoit ${PARRAINAGE_JOURS} jours de Réviz+ en créant son compte avec ton lien. Toi aussi.`)}</span>
        </span>
      </div>

      {(filleuls > 0 || offertJusquA) && (
        <p className="ia-bilan">
          {filleuls > 0 && <b>{filleuls === 1 ? '1 ami inscrit avec ton lien' : `${filleuls} amis inscrits avec ton lien`}</b>}
          {offertJusquA && <span>{nbsp(`Réviz+ offert jusqu’à ${dateCourte(offertJusquA)}.`)}</span>}
        </p>
      )}

      {!lien ? (
        <button type="button" className="pp-btn" onClick={inviter} disabled={etat === 'creation'}>
          {etat === 'creation' ? 'Création du lien…' : 'Inviter un ami'}
        </button>
      ) : (
        <div className="pp-actions">
          <input className="pp-lien" readOnly value={lien} aria-label="Ton lien d’invitation" onFocus={e => e.target.select()} />
          <div className="pp-boutons">
            <button type="button" className="pp-btn" onClick={copier}>{etat === 'copie' ? 'Lien copié' : 'Copier le lien'}</button>
            {peutPartager && <button type="button" className="pp-btn pp-btn--creme" onClick={() => partager(lien)}>Envoyer</button>}
          </div>
          <p className="pp-note">{nbsp(`Ton code : ${code}. Valable pour un nouveau compte.`)}</p>
        </div>
      )}
      {etat === 'erreur' && <p className="pp-erreur" role="alert">Le lien n’a pas pu être créé. Réessaie dans un instant.</p>}

      {verif.ok ? (
        <p className="ia-ok" role="status">{nbsp(`Code accepté : ${PARRAINAGE_JOURS} jours de Réviz+ pour toi et ton ami.`)}</p>
      ) : peutUtiliserCode && (
        saisie == null ? (
          <button type="button" className="ia-lien" onClick={() => setSaisie('')}>Un ami t’a donné son code ?</button>
        ) : (
          <form className="ia-saisie" onSubmit={valider}>
            <label htmlFor="ia-code">Le code de ton ami</label>
            <div className="ia-ligne">
              <input id="ia-code" className="pp-lien ia-code" value={saisie} maxLength={8} autoComplete="off" autoCapitalize="characters"
                spellCheck={false} placeholder="ABC234" onChange={e => setSaisie(e.target.value)}
                aria-invalid={verif.erreur ? true : undefined} aria-describedby={verif.erreur ? 'ia-erreur' : undefined} />
              <button type="submit" className="pp-btn ia-valider" disabled={verif.en}>{verif.en ? 'Vérification…' : 'Valider'}</button>
            </div>
            {verif.erreur && <p className="pp-erreur" id="ia-erreur" role="alert">{verif.erreur}</p>}
          </form>
        )
      )}
    </div>
  );
  return titre ? <section className="mo-section"><h2 className="mo-h2">{titre}</h2>{carte}</section> : carte;
}
