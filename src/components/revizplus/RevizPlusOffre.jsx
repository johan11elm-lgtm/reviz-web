import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Mascot } from '../Mascot';
import { BulleReviz } from '../reviz/BulleReviz';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { startCheckout } from '../../services/billingService';
import { FORMULE_PAR_DEFAUT, prixDe } from '../../../api/_prix.js';
import { tarifFondateurOuvert } from '../../../api/_lancement.js';
import '../reviz/HerosMatiere.css';
import './RevizPlusOffre.css';

/**
 * Réviz+ (handoff Claude Design du 22/10) : la feuille « Découvrir » (comparatif gratuit / Réviz+,
 * choix de la formule, paiement Stripe), les limites atteintes (scan, Réviz IA) et le petit mot
 * quand le paiement est annulé. Sans pression : pas de compte à rebours, pas de prix barré.
 * Feuille du bas sur téléphone, fenêtre centrée sur ordinateur.
 */

const Croix = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
const Coche = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
const Cadenas = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="3" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);

/** Feuille (téléphone) ou fenêtre (ordinateur), Réviz qui dépasse en haut à droite. */
export function Fenetre({ label, pose, onClose, children }) {
  const isDesktop = useIsDesktop();
  const ref = useModalA11y(onClose, true);
  return createPortal(
    <div className="rpo-voile" onClick={onClose}>
      <div className={`rpo-feuille${isDesktop ? ' rpo-feuille--fenetre' : ''}`} ref={ref} role="dialog" aria-modal="true" aria-label={label} onClick={e => e.stopPropagation()}>
        {!isDesktop && <span className="rpo-poignee" aria-hidden="true" />}
        {isDesktop && <button type="button" className="rpo-fermer" onClick={onClose} aria-label="Fermer"><Croix /></button>}
        {pose && <Mascot pose={pose} size={isDesktop ? 128 : 112} alt="" aria-hidden="true" className="rpo-reviz" />}
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** « Découvrir Réviz+ » : ce que ça change, la formule, le paiement. */
export function DecouvrirRevizPlus({ onClose }) {
  const navigate = useNavigate();
  const fondateur = tarifFondateurOuvert();
  const [formule, setFormule] = useState(FORMULE_PAR_DEFAUT);
  const [paiement, setPaiement] = useState(false);
  const [erreur, setErreur] = useState('');
  const annuel = prixDe('annuel', fondateur);
  const mensuel = prixDe('mensuel', fondateur);

  async function payer() {
    if (paiement) return;
    setPaiement(true); setErreur('');
    try {
      await startCheckout(formule); // redirection pleine page en cas de succès
    } catch (err) {
      setPaiement(false);
      if (err.message === 'EMAIL_NOT_VERIFIED') navigate('/verify-email', { state: { raison: 'revizplus' } });
      else setErreur('Impossible d’ouvrir le paiement. Réessaie dans un moment.');
    }
  }

  const options = [
    { id: 'annuel', titre: 'À l’année', prix: annuel, cadence: 'par an', detail: `soit ${annuel.parMois} par mois`, badge: true },
    { id: 'mensuel', titre: 'Au mois', prix: mensuel, cadence: 'par mois', detail: 'sans engagement' },
  ];
  return (
    <Fenetre label="Réviz+" pose="hello" onClose={onClose}>
      <h2 className="rpo-titre">Réviz+</h2>
      <p className="rpo-sous">Pour aller plus loin, quand tu veux.</p>
      {fondateur && <span className="rpo-sceau">Membre fondateur</span>}
      <table className="rpo-compare">
        <thead><tr><th scope="col"><span className="rpo-sur">Ce que ça change</span></th><th scope="col">Gratuit</th><th scope="col"><span className="rpo-plus">Réviz+</span></th></tr></thead>
        <tbody>
          <tr><th scope="row">Scans de leçons</th><td>5 par semaine</td><td>Illimités</td></tr>
          <tr><th scope="row">Questions à Réviz IA</th><td>10 par semaine</td><td>50 par jour</td></tr>
          <tr><th scope="row">Thèmes</th><td>1</td><td>4</td></tr>
        </tbody>
      </table>
      <span className="rpo-sur rpo-sur--bloc">Ta formule</span>
      <div className="rpo-formules" role="radiogroup" aria-label="Ta formule">
        {options.map(o => (
          <button key={o.id} type="button" role="radio" aria-checked={formule === o.id} disabled={paiement}
            className={`rpo-formule${formule === o.id ? ' is-choisie' : ''}`} onClick={() => setFormule(o.id)}>
            <span className="rpo-radio" aria-hidden="true">{formule === o.id && <Coche />}</span>
            <span className="rpo-formule-txt">
              <b>{o.titre}</b>
              {o.badge && <span className="rpo-avantage">Le plus avantageux</span>}
              <span>{o.detail}</span>
            </span>
            <span className="rpo-prix"><b>{o.prix.montant}</b><span>{o.cadence}</span></span>
          </button>
        ))}
      </div>
      {fondateur && <p className="rpo-note">Ton prix fondateur reste le même tant que tu restes abonné.</p>}
      {erreur && <p className="rpo-erreur" role="alert">{erreur}</p>}
      <button type="button" className="rpo-btn" onClick={payer} disabled={paiement}>
        {paiement ? <><span className="rpo-anneau" aria-hidden="true" />Ouverture du paiement…</> : 'Passer à Réviz+'}
      </button>
      <p className="rpo-note rpo-note--centre"><Cadenas />Paiement sécurisé par Stripe. Résiliable à tout moment.</p>
    </Fenetre>
  );
}

const LIMITES = {
  scan: {
    pose: 'sleeping', teinte: 'lavande', points: 5,
    bulle: ['Belle semaine de travail.', 'Je fais une pause jusqu’à lundi.'],
    texte: 'Tu as utilisé tes 5 scans de la semaine. Ils reviennent lundi.',
    action: 'Scans illimités avec Réviz+',
  },
  ia: {
    pose: 'thinking', teinte: 'peche', points: 10,
    bulle: ['Que de bonnes questions.', 'Je reprends lundi.'],
    texte: 'Tu as utilisé tes 10 questions de la semaine. Elles reviennent lundi.',
    action: '50 questions par jour avec Réviz+',
  },
};

/**
 * Limite atteinte (scan de la semaine ou questions du jour) ; le programme reste accessible.
 * abonne : l'élève a déjà Réviz+ (ou l'a offert), on ne lui propose pas de l'acheter.
 */
export function LimiteAtteinte({ type = 'scan', limite, abonne = false, offertJusquau, onClose }) {
  const navigate = useNavigate();
  const [offre, setOffre] = useState(false);
  const l = LIMITES[type];
  const n = limite ?? l.points;
  if (offre) return <DecouvrirRevizPlus onClose={onClose} />;
  return (
    <Fenetre label="Limite atteinte" onClose={onClose}>
      <div className={`rpo-panneau rpo-panneau--${l.teinte}`}>
        <span className="ch-grain" aria-hidden="true" />
        <BulleReviz lignes={l.bulle} pointe="droite" className="rpo-bulle" />
        <Mascot pose={l.pose} size={150} alt="" aria-hidden="true" />
      </div>
      <div className="rpo-carte">
        <p>{l.texte.replace(/\b(5|10)\b/, String(n))}</p>
        {n <= 10 ? (
          <div className="rpo-points-ligne">
            <span className={`rpo-points rpo-points--${type}`} aria-hidden="true">{Array.from({ length: n }, (_, i) => <i key={i} />)}</span>
            <b>{n} sur {n}</b>
          </div>
        ) : <b className="rpo-points-total">{n} sur {n}</b>}
        {abonne && offertJusquau && <p className="rpo-carte-note">Réviz+ t’est offert jusqu’au {offertJusquau} : c’est déjà la limite la plus haute.</p>}
      </div>
      {!abonne && <button type="button" className="rpo-btn" onClick={() => setOffre(true)}>{l.action}</button>}
      <button type="button" className={`rpo-btn${abonne ? '' : ' rpo-btn--second'}`} onClick={() => { onClose?.(); navigate('/programme'); }}>{abonne ? 'Réviser mon programme' : 'Réviser mon programme en attendant'}</button>
      <button type="button" className="rpo-lien" onClick={onClose}>Plus tard</button>
    </Fenetre>
  );
}

/** Retour de Stripe sans payer : un petit mot calme, qui part seul après 5 s. */
export function ToastPaiementAnnule({ onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);
  return createPortal(
    <div className="rpo-toast" role="status">
      <span className="rpo-toast-rond" aria-hidden="true"><Mascot pose="pointing" size={56} alt="" /></span>
      <span><b>Pas de souci.</b>Réviz+ reste là si tu changes d’avis.</span>
      <button type="button" className="rpo-toast-fermer" onClick={onClose} aria-label="Fermer"><Croix /></button>
    </div>,
    document.body,
  );
}
