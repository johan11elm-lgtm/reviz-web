import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FORMULES, prixDe } from '../../api/_prix.js';
import { PREMIER_PRELEVEMENT } from '../../api/_lancement.js';
import { useAuth } from '../context/AuthContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { Pantin } from '../components/Pantin';
import { dateCourte } from '../utils/revizPlus';
import '../components/reviz/HerosMatiere.css';
import './UpgradeSuccess.css';

const Croix = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
const Coche = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
const Chevron = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
);
const Icone = ({ d }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const APPAREIL = 'M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z';
const BULLE = 'M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H10l-4 3.5v-3.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z';
const PALETTE = 'M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.9 1.4-1.9-.5-1.2.3-2.6 1.6-2.6H17a3.5 3.5 0 0 0 3.5-3.5c0-5-3.8-9-8.5-9zM7.5 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3-3.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm4 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z';
const THEMES = ['#2A2D52', '#B2552E', '#3E7A5C', '#7A4688'];

/**
 * Merci (handoff Claude Design du 22/10) : retour de Stripe après l'abonnement. L'adresse porte
 * la formule et le tarif fondateur (api/_checkout.js) ; le statut, lui, attend le webhook :
 * « Activation… » pendant les essais, puis « Vérifier mon abonnement » après ~30 s.
 */
export default function UpgradeSuccess() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [params] = useSearchParams();
  const fondateur = params.get('fondateur') === '1';
  const formule = FORMULES.includes(params.get('formule')) ? params.get('formule') : null;
  const { currentUser, refreshPremium, isPremium, abonnement } = useAuth();
  const [retriesExhausted, setRetriesExhausted] = useState(false);
  const [verification, setVerification] = useState(false);
  const prenom = currentUser?.displayName?.split(' ')[0];
  const pantin = useRef(null);

  // Retry refreshPremium si le webhook Stripe n'a pas encore écrit dans
  // Firestore : backoff 2s/4s/8s/16s (~30s couverts) au lieu d'un seul essai —
  // sinon l'élève qui vient de payer revoit la limite jusqu'au reload.
  useEffect(() => {
    refreshPremium();
    if (isPremium) return;
    let cancelled = false;
    let timer = null;
    const delays = [2000, 4000, 8000, 16000];
    const attempt = (i) => {
      if (cancelled || i >= delays.length) {
        // Webhook toujours pas passé après ~30s : on laisse la main à l'élève.
        if (!cancelled && i >= delays.length) setRetriesExhausted(true);
        return;
      }
      timer = setTimeout(async () => {
        await refreshPremium();
        attempt(i + 1); // no-op si isPremium a changé : l'effet est re-monté
      }, delays[i]);
    };
    attempt(0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [isPremium]); // eslint-disable-line react-hooks/exhaustive-deps

  async function verifier() {
    setVerification(true);
    try { await refreshPremium(); } finally { setVerification(false); }
  }

  const f = formule ?? abonnement?.formule ?? 'annuel';
  const prix = prixDe(f, fondateur || !!abonnement?.fondateur);
  const echeance = abonnement?.annuleLe ? ['Se termine le', dateCourte(abonnement.annuleLe)]
    : fondateur ? ['Premier prélèvement', PREMIER_PRELEVEMENT]
    : abonnement?.periodeFin ? ['Prochain prélèvement', dateCourte(abonnement.periodeFin)] : null;

  const actif = isPremium;
  const titre = actif ? (prenom ? `Bienvenue dans Réviz+, ${prenom}.` : 'Bienvenue dans Réviz+.') : (prenom ? `Merci, ${prenom}.` : 'Merci.');
  const statut = actif ? (
    <div className="ugs-carte ugs-statut">
      <span className="ugs-rond ugs-rond--vert" aria-hidden="true"><Coche /></span>
      <b>{fondateur ? `Prix fondateur réservé : rien n’est prélevé avant le ${PREMIER_PRELEVEMENT}.` : 'Ton abonnement est actif : tout est débloqué.'}</b>
    </div>
  ) : (
    <div className="ugs-carte ugs-statut" role="status">
      <span className="ugs-rond ugs-rond--attente" aria-hidden="true"><i /></span>
      <span>
        <b>Activation…</b>
        <span>{retriesExhausted ? 'C’est un peu plus long que d’habitude.' : 'La confirmation du paiement arrive en quelques secondes.'}</span>
      </span>
    </div>
  );
  const verifierBtn = !actif && retriesExhausted && (
    <button type="button" className="ugs-btn ugs-btn--second" onClick={verifier} disabled={verification}>{verification ? 'Vérification…' : 'Vérifier mon abonnement'}</button>
  );

  const contenu = actif && (
    <>
      <h2 className="ugs-h2">Ce que tu as maintenant</h2>
      <ul className="ugs-carte ugs-liste">
        <li><span className="ugs-rond ugs-rond--lavande"><Icone d={APPAREIL} /></span><b>Scans de leçons illimités</b></li>
        <li><span className="ugs-rond ugs-rond--peche"><Icone d={BULLE} /></span><b>Questions à Réviz IA illimitées</b></li>
        <li><span className="ugs-rond ugs-rond--menthe"><Icone d={PALETTE} /></span><b>3 thèmes de couleur en plus</b>
          <span className="ugs-themes" aria-hidden="true">{THEMES.map(c => <i key={c} style={{ background: c }} />)}</span></li>
      </ul>
      <div className="ugs-carte ugs-formule">
        <span className="ugs-sur">Ta formule</span>
        <div><span>{f === 'mensuel' ? 'Au mois' : 'À l’année'}</span><b>{prix.montant}</b></div>
        {echeance && <div><span>{echeance[0]}</span><b>{echeance[1]}</b></div>}
      </div>
      <h2 className="ugs-h2">Pour commencer</h2>
      <button type="button" className="ugs-btn" onClick={() => navigate('/scan', { replace: true })}><Icone d={APPAREIL} />Scanner une leçon</button>
      <div className="ugs-carte ugs-liens">
        <Link to="/reglages#themes"><span className="ugs-rond ugs-rond--menthe"><Icone d={PALETTE} /></span><span><b>Choisir mon thème</b><span>Abricot, Sauge ou Prune</span></span><Chevron /></Link>
        <Link to="/coach"><span className="ugs-rond ugs-rond--peche"><Icone d={BULLE} /></span><span><b>Poser une question à Réviz IA</b></span><Chevron /></Link>
      </div>
      <p className="ugs-note">{fondateur
        ? <>Tu peux annuler avant le {PREMIER_PRELEVEMENT} sans rien payer, depuis les <Link to="/reglages#abonnement">Réglages</Link>.</>
        : <>Résiliable à tout moment depuis les <Link to="/reglages#abonnement">Réglages</Link>.</>}</p>
    </>
  );

  const reviz = (
    <Pantin ref={pantin} size={isDesktop ? 420 : 236} expression={actif ? 'fier' : 'determine'} entree={actif ? 'brasEnLair' : 'saut'} repli={null}
      onClick={() => pantin.current?.geste('saut')} label="Réviz, ta mascotte" />
  );
  const deco = (
    <>
      <span className="ugs-deco ugs-deco--a" aria-hidden="true" />
      <span className="ugs-deco ugs-deco--b" aria-hidden="true" />
      <span className="ch-grain" aria-hidden="true" />
    </>
  );
  const fermer = <button type="button" className="ugs-fermer" onClick={() => navigate('/', { replace: true })} aria-label="Fermer"><Croix /></button>;
  const titres = (
    <>
      <span className="ugs-sur">{actif ? 'Merci' : 'Réviz+'}</span>
      <h1 className="ugs-titre">{titre}</h1>
    </>
  );

  if (isDesktop) {
    return (
      <div className="app app--no-halo app--large ugs-page ugs-page--large">
        <div className="ugs-hero">{deco}{reviz}</div>
        <div className="content ugs-defile">
          {fermer}
          <div className="ugs-colonne">{titres}{statut}{verifierBtn}{contenu}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="app app--no-halo ugs-page">
      <div className="content ugs-defile">
        <div className={`ugs-hero${actif ? '' : ' ugs-hero--attente'}`}>
          {deco}
          <div className="ugs-hero-haut">{titres}{fermer}</div>
          <div className="ugs-hero-reviz">{reviz}</div>
        </div>
        <div className="ugs-colonne">{statut}{verifierBtn}{contenu}</div>
      </div>
    </div>
  );
}
