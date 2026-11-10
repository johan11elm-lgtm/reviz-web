import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { lienPourParent, messagePourParent } from '../services/consentService';
import { track } from '../services/statsService';
import { mesurer } from '../services/mesure';
import './LienParent.css';

const peutPartager = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/**
 * « Lui envoyer un lien » : pour l'élève de moins de 15 ans qui ne connaît pas l'adresse
 * e-mail de son parent (près de deux sur trois ne la donnaient jamais, 10/11). Il envoie un
 * lien par message (feuille de partage du téléphone : WhatsApp, SMS…) ; le parent y saisit
 * lui-même son adresse et reçoit l'e-mail d'autorisation habituel. Sur ordinateur, ou si le
 * partage est annulé, le lien s'affiche pour être copié.
 * Le lien est demandé au serveur dès l'affichage : le partage part ainsi dans le geste même.
 * Safari sur iPhone refuse un partage lancé trop longtemps après le toucher (attente du réseau).
 * Tant que le parent n'a pas répondu, rien ne change pour l'élève (délai des 15 jours).
 * @param {{
 *   lieu: 'inscription'|'accord'|'fin_seance',  où le bouton est posé (mesure)
 *   resultat?: { score:number, total:number }|null,  score que l'élève veut montrer
 *   onEnvoye?: () => void,  appelé une fois le lien parti (partagé ou copié)
 *   libelle?: string, aide?: string, classeBouton?: string,
 * }} p
 */
export function LienParent({ lieu, resultat = null, onEnvoye, libelle = 'Lui envoyer un lien', aide = 'Si tu ne connais pas son adresse', classeBouton = 'en-btn-second' }) {
  const { refreshGate } = useAuth() ?? {};
  const [etat, setEtat] = useState(''); // '' | creation | pret | envoye | copie | erreur
  const [lien, setLien] = useState(null);

  // Le lien, préparé une fois à l'affichage (le score ne change pas tant que la carte est là).
  // Une seule demande, même quand React rejoue l'effet (mode strict) : la promesse est gardée.
  const preparation = useRef(null);
  useEffect(() => {
    let actif = true;
    preparation.current ??= Promise.resolve().then(() => lienPourParent(resultat));
    preparation.current
      .then(r => {
        if (!actif) return;
        if (r?.alreadyApproved) refreshGate?.();
        else if (r?.lien) setLien(l => l ?? r.lien);
      })
      .catch(() => { /* pas de réseau : le lien sera demandé au toucher */ });
    return () => { actif = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function envoye(moyen) {
    track('consent_lien');
    mesurer('consent_lien', { etape: moyen, lieu });
    setEtat(moyen === 'copie' ? 'copie' : 'envoye');
    onEnvoye?.();
  }

  async function partager(url) {
    try {
      await navigator.share({ text: messagePourParent(resultat), url });
      envoye('partage');
    } catch {
      // Partage annulé (ou refusé par le navigateur) : le lien reste là, à copier ou à renvoyer.
      mesurer('consent_lien', { etape: 'annule', lieu });
      setEtat('pret');
    }
  }

  async function creer() {
    // Lien déjà prêt : le partage s'ouvre tout de suite, sans attendre le serveur.
    if (lien) {
      mesurer('consent_lien', { etape: 'cree', lieu });
      if (peutPartager()) await partager(lien);
      else setEtat('pret');
      return;
    }
    setEtat('creation');
    try {
      const r = await lienPourParent(resultat);
      if (r.alreadyApproved) { await refreshGate?.(); setEtat('envoye'); return; }
      setLien(r.lien);
      mesurer('consent_lien', { etape: 'cree', lieu });
      if (peutPartager()) await partager(r.lien);
      else setEtat('pret');
    } catch {
      setEtat('erreur');
    }
  }

  async function copier() {
    try {
      await navigator.clipboard.writeText(`${messagePourParent(resultat)} ${lien}`);
      envoye('copie');
    } catch { /* presse-papiers refusé : le lien reste affiché, à sélectionner */ }
  }

  if (etat === 'envoye' || etat === 'copie') {
    return (
      <div className="lp lp--fait" role="status">
        <p className="lp-fait">
          {etat === 'copie'
            ? 'Message copié. Colle-le dans une conversation avec ton parent.'
            : 'C’est parti. Ton parent n’a plus qu’à ouvrir le lien.'}
        </p>
        {lien && (
          <button type="button" className="lp-lien-btn" onClick={() => (peutPartager() ? partager(lien) : copier())}>
            {peutPartager() ? 'Renvoyer le lien' : 'Copier à nouveau'}
          </button>
        )}
      </div>
    );
  }

  if (etat === 'pret' && lien) {
    return (
      <div className="lp lp--pret">
        <p className="lp-consigne">Envoie ce lien à ton parent, par message :</p>
        <input className="lp-champ" readOnly value={lien} aria-label="Lien à envoyer à ton parent" onFocus={e => e.target.select()} />
        <div className="lp-actions">
          <button type="button" className="lp-copier" onClick={copier}>Copier le message</button>
          {peutPartager() && <button type="button" className="lp-lien-btn" onClick={() => partager(lien)}>Partager</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="lp">
      <button type="button" className={classeBouton} onClick={creer} disabled={etat === 'creation'}>
        {etat === 'creation' ? 'Un instant…' : libelle}
        {aide && etat !== 'creation' && <small>{aide}</small>}
      </button>
      {etat === 'erreur' && <p className="lp-erreur" role="alert">Le lien n’a pas pu être créé. Réessaie dans un instant.</p>}
    </div>
  );
}
