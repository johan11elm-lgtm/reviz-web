import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Mascot } from '../Mascot';
import { BulleReviz } from '../reviz/BulleReviz';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { startCheckout, demanderAuParent, lienPourOffrir, MESSAGE_OFFRIR } from '../../services/billingService';
import { useAuth } from '../../context/AuthContext';
import { FORMULE_PAR_DEFAUT, prixDe } from '../../../api/_prix.js';
import { prochaineRemise, dansCombien, parSemaine } from '../../utils/remiseQuotas';
import { tarifFondateurOuvert } from '../../../api/_lancement.js';
import { ACHAT_DANS_L_APP } from '../../utils/achat';
import { mesurer } from '../../services/mesure';
import { BoltIcon, CameraIcon, ChatIcon } from '../Icons';
import { PREMIER_ECRIT } from '../../utils/planBrevet';
import '../RevizPlusAnnonce.css';
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
  const reviz = pose && <Mascot pose={pose} size={isDesktop ? 128 : 112} alt="" aria-hidden="true" className="rpo-reviz" />;
  const feuille = (
    <div className={`rpo-feuille${isDesktop ? ' rpo-feuille--fenetre' : ''}`} ref={ref} role="dialog" aria-modal="true" aria-label={label} onClick={e => e.stopPropagation()}>
      {!isDesktop && <span className="rpo-poignee" aria-hidden="true" />}
      {isDesktop && <button type="button" className="rpo-fermer" onClick={onClose} aria-label="Fermer"><Croix /></button>}
      {isDesktop && reviz}
      {children}
    </div>
  );
  // Téléphone (17/11) : Réviz dépasse du cadre, hors de la feuille qui défile. Avant, la feuille
  // ne défilait plus pour la laisser dépasser, et « Passer à Réviz+ » tombait sous l'écran.
  return createPortal(
    <div className="rpo-voile" onClick={onClose}>
      {!isDesktop && reviz
        ? <div className="rpo-cadre" onClick={e => e.stopPropagation()}>{reviz}{feuille}</div>
        : feuille}
    </div>,
    document.body,
  );
}

// Le titre reprend ce qui a bloqué l'élève (11/11, repris de Knowunity : un titre par blocage).
const TITRES = {
  limite_exercices: ['Continue tes exercices', 'Tes 3 séances du jour sont faites. Avec Réviz+, pas de limite.'],
  limite_scan: ['Scanne toutes tes leçons', 'Tes 5 scans de la semaine sont faits. Avec Réviz+, pas de limite.'],
  limite_ia: ['Pose toutes tes questions', 'Tes 10 questions de la semaine sont posées. Avec Réviz+, 50 par jour.'],
  fin_essai: ['Garde Réviz+', 'Ta semaine offerte est finie. Garde tes exercices sans limite.'],
  coach: ['Réviz IA, chaque jour', 'Avec Réviz+, 50 questions par jour au lieu de 10 par semaine.'],
  scan: ['Scanne sans compter', 'Avec Réviz+, tes scans sont illimités.'],
};
const TITRE_PAR_DEFAUT = ['Réviz+', 'Pour aller plus loin, quand tu veux.'];

const JOUR_MS = 86_400_000;

/** Jours avant la première épreuve écrite du brevet (3e seulement), ou null. */
export function joursAvantBrevet(classe, maintenant = Date.now()) {
  if (classe !== '3ème') return null;
  const j = Math.ceil((Date.parse(`${PREMIER_ECRIT}T08:00:00+02:00`) - maintenant) / JOUR_MS);
  return j > 0 ? j : null;
}

/**
 * Pourquoi ce n'est pas gratuit (repris de Knowunity, 17/11) : dit franchement, pour l'élève
 * et pour le parent qui lit par-dessus l'épaule.
 */
function PourquoiPasGratuit() {
  return (
    <details className="rpo-pourquoi">
      <summary>Pourquoi Réviz+ n’est pas gratuit ?</summary>
      <p>Chaque question à Réviz IA et chaque leçon scannée nous coûtent de l’argent : l’intelligence artificielle se paie à l’usage. La version gratuite reste gratuite, sans publicité et sans revente de tes données. Réviz+ paie le reste, et c’est ce qui nous permet de continuer.</p>
    </details>
  );
}

/** « Découvrir Réviz+ » : ce que ça change, la formule, le paiement. */
export function DecouvrirRevizPlus({ onClose, lieu = 'autre' }) {
  const navigate = useNavigate();
  // Tunnel de vente (PostHog) : offre vue → caisse ouverte → payée (UpgradeSuccess).
  useEffect(() => { mesurer('offre', { etape: 'vue', lieu, achat: ACHAT_DANS_L_APP }); }, [lieu]);
  const fondateur = tarifFondateurOuvert();
  const [formule, setFormule] = useState(FORMULE_PAR_DEFAUT);
  const [paiement, setPaiement] = useState(false);
  const [erreur, setErreur] = useState('');
  const annuel = prixDe('annuel', fondateur);
  const mensuel = prixDe('mensuel', fondateur);
  const [titre, sousTitre] = TITRES[lieu] ?? TITRE_PAR_DEFAUT;
  // « Pour Alex » (Knowunity) : l'offre s'adresse à l'élève, et en 3e elle rappelle le brevet.
  const auth = useAuth() ?? {};
  const prenom = auth.currentUser?.displayName?.split(' ')[0] || '';
  const brevet = joursAvantBrevet(auth.getUserLevel?.()?.classe);
  const pour = [prenom && `Pour ${prenom}`, brevet && `brevet dans ${brevet} jours`].filter(Boolean).join(' · ');
  const comparatif = (
    <table className="rpo-compare">
      <thead><tr><th scope="col"><span className="rpo-sur">Ce que ça change</span></th><th scope="col">Gratuit</th><th scope="col"><span className="rpo-plus">Réviz+</span></th></tr></thead>
      <tbody>
        <tr><th scope="row">Séances d’exercices</th><td>3 par jour</td><td>Illimitées</td></tr>
        <tr><th scope="row">Scans de leçons</th><td>5 par semaine</td><td>Illimités</td></tr>
        <tr><th scope="row">Questions à Réviz IA</th><td>10 par semaine</td><td>50 par jour</td></tr>
        <tr><th scope="row">Thèmes</th><td>1</td><td>4</td></tr>
      </tbody>
    </table>
  );

  async function payer() {
    if (paiement) return;
    setPaiement(true); setErreur('');
    mesurer('offre', { etape: 'caisse', lieu, formule });
    try {
      await startCheckout(formule); // redirection pleine page en cas de succès
    } catch (err) {
      setPaiement(false);
      if (err.message === 'EMAIL_NOT_VERIFIED') navigate('/verify-email', { state: { raison: 'revizplus' } });
      else setErreur('Impossible d’ouvrir le paiement. Réessaie dans un moment.');
    }
  }

  if (!ACHAT_DANS_L_APP) {
    return (
      <Fenetre label="Réviz+" pose="hello" onClose={onClose}>
        <h2 className="rpo-titre">Réviz+</h2>
        <p className="rpo-sous">Pour aller plus loin, quand tu veux.</p>
        {comparatif}
        <button type="button" className="rpo-btn" onClick={onClose}>Compris</button>
      </Fenetre>
    );
  }

  const options = [
    // Ramené à la semaine (11/11) : moins d'un euro, comme Knowunity l'affiche.
    { id: 'annuel', titre: 'À l’année', prix: annuel, cadence: 'par an', detail: `soit ${parSemaine(annuel.centimes)} par semaine`, badge: true },
    { id: 'mensuel', titre: 'Au mois', prix: mensuel, cadence: 'par mois', detail: 'sans engagement' },
  ];
  return (
    <Fenetre label="Réviz+" pose="hello" onClose={onClose}>
      {pour && <span className="rpo-pour">{pour.charAt(0).toUpperCase() + pour.slice(1)}</span>}
      <h2 className="rpo-titre">{titre}</h2>
      <p className="rpo-sous">{sousTitre}</p>
      {fondateur && <span className="rpo-sceau">Membre fondateur</span>}
      {comparatif}
      <p className="rpo-preuve">Plus de 1 000 collégiens révisent déjà avec Réviz.</p>
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
      {formule === 'annuel' && <p className="rpo-note">Un an de Réviz+ coûte moins cher que deux heures de cours particulier.</p>}
      {erreur && <p className="rpo-erreur" role="alert">{erreur}</p>}
      <button type="button" className="rpo-btn" onClick={payer} disabled={paiement}>
        {paiement ? <><span className="rpo-anneau" aria-hidden="true" />Ouverture du paiement…</> : 'Passer à Réviz+'}
      </button>
      <p className="rpo-note rpo-note--centre"><Cadenas />Paiement sécurisé par Stripe. Sans engagement, résiliable à tout moment.</p>
      <ul className="rpo-rassure" aria-label="Nos engagements">
        <li><Coche />Sans publicité</li>
        <li><Coche />Données jamais revendues</li>
        <li><Coche />Un parent peut l’offrir</li>
      </ul>
      <DemanderParent lieu={lieu} enBouton />
      <PourquoiPasGratuit />
    </Fenetre>
  );
}

const cleFinEssai = uid => `reviz-fin-essai-vue-${uid}`;

/** L'écran de fin d'essai a-t-il déjà été montré sur cet appareil ? */
export function finEssaiVue(uid) {
  try { return localStorage.getItem(cleFinEssai(uid)) === '1'; } catch { return true; }
}

/**
 * Fin de l'essai de 7 jours (17/11) : jusqu'ici l'élève retombait sur la limite sans un mot.
 * Une fois par appareil, au retour sur l'accueil : ce qui revient en gratuit, puis l'offre.
 */
export function FinEssaiPlus({ uid, onClose }) {
  const [offre, setOffre] = useState(false);
  useEffect(() => {
    try { localStorage.setItem(cleFinEssai(uid), '1'); } catch { /* stockage indisponible */ }
    mesurer('offre', { etape: 'fin_essai' });
  }, [uid]);
  if (offre) return <DecouvrirRevizPlus lieu="fin_essai" onClose={onClose} />;
  return (
    <Fenetre label="Fin de Réviz+ offert" onClose={onClose}>
      <div className="rpo-panneau rpo-panneau--peche">
        <span className="ch-grain" aria-hidden="true" />
        <BulleReviz lignes={['Belle semaine avec toi.', 'On continue ensemble ?']} pointe="droite" className="rpo-bulle" />
        <Mascot pose="hello" size={150} alt="" aria-hidden="true" />
      </div>
      <h2 className="rpa-titre">Ta semaine de Réviz+ est finie</h2>
      <p className="rpa-texte">Tu gardes tout ce que tu as révisé. La version gratuite reprend ses limites :</p>
      <ul className="rpa-liste">
        <li><span className="rpa-rond rpa-rond--menthe" aria-hidden="true"><BoltIcon /></span><b>3 séances d’exercices</b><span>par jour</span></li>
        <li><span className="rpa-rond rpa-rond--lavande" aria-hidden="true"><CameraIcon /></span><b>5 scans de leçons</b><span>par semaine</span></li>
        <li><span className="rpa-rond rpa-rond--peche" aria-hidden="true"><ChatIcon /></span><b>10 questions à Réviz IA</b><span>par semaine</span></li>
      </ul>
      {ACHAT_DANS_L_APP && <button type="button" className="rpo-btn" onClick={() => setOffre(true)}>Garder Réviz+</button>}
      <DemanderParent lieu="fin_essai" />
      <button type="button" className={ACHAT_DANS_L_APP ? 'rpo-lien' : 'rpo-btn'} onClick={onClose}>{ACHAT_DANS_L_APP ? 'Continuer en gratuit' : 'Compris'}</button>
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
  exercices: {
    pose: 'trophy', teinte: 'peche', points: 3,
    bulle: ['Trois séances aujourd’hui.', 'Quel rythme !'],
    texte: 'Tu as fait tes 3 séances d’exercices du jour. Elles reviennent demain.',
    action: 'Exercices illimités avec Réviz+',
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
  // Compte à rebours jusqu'au retour du quota (11/11), mis à jour chaque minute.
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setMaintenant(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const dans = dansCombien(prochaineRemise(type, maintenant), maintenant);
  const texte = l.texte.replace(/\b(5|10)\b/, String(n)).replace(/(reviennent) (demain|lundi)\./, (_, v) => (dans ? `${v} ${dans}.` : _));
  useEffect(() => { if (!abonne) mesurer('offre', { etape: 'limite', lieu: `limite_${type}` }); }, [abonne, type]);
  if (offre) return <DecouvrirRevizPlus onClose={onClose} lieu={`limite_${type}`} />;
  return (
    <Fenetre label="Limite atteinte" onClose={onClose}>
      <div className={`rpo-panneau rpo-panneau--${l.teinte}`}>
        <span className="ch-grain" aria-hidden="true" />
        <BulleReviz lignes={l.bulle} pointe="droite" className="rpo-bulle" />
        <Mascot pose={l.pose} size={150} alt="" aria-hidden="true" />
      </div>
      <div className="rpo-carte">
        <p>{texte}</p>
        {n <= 10 ? (
          <div className="rpo-points-ligne">
            <span className={`rpo-points rpo-points--${type}`} aria-hidden="true">{Array.from({ length: n }, (_, i) => <i key={i} />)}</span>
            <b>{n} sur {n}</b>
          </div>
        ) : <b className="rpo-points-total">{n} sur {n}</b>}
        {abonne && offertJusquau && <p className="rpo-carte-note">Réviz+ t’est offert jusqu’au {offertJusquau} : c’est déjà la limite la plus haute.</p>}
      </div>
      {!abonne && ACHAT_DANS_L_APP && <button type="button" className="rpo-btn" onClick={() => setOffre(true)}>{l.action}</button>}
      {!abonne && <DemanderParent lieu={`limite_${type}`} />}
      <button type="button" className={`rpo-btn${abonne || !ACHAT_DANS_L_APP ? '' : ' rpo-btn--second'}`} onClick={() => { onClose?.(); navigate('/programme'); }}>{abonne ? 'Réviser mon programme' : 'Réviser mon programme en attendant'}</button>
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

/**
 * Essai de 7 jours (08/11) : la première limite d'exercices offre Réviz+ une semaine,
 * une seule fois par compte. Pas de prix ici : c'est un cadeau, valable aussi dans l'app iOS.
 */
export function CadeauEssaiPlus({ fin, onContinuer }) {
  useEffect(() => { mesurer('offre', { etape: 'essai', lieu: 'limite_exercices' }); }, []);
  const jusquau = new Date(fin).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
  return (
    <Fenetre label="Réviz+ offert 7 jours" onClose={onContinuer}>
      <div className="rpo-panneau rpo-panneau--peche">
        <span className="ch-grain" aria-hidden="true" />
        <BulleReviz lignes={['Trois séances aujourd’hui.', 'Tu mérites un cadeau.']} pointe="droite" className="rpo-bulle" />
        <Mascot pose="celebration" size={150} alt="" aria-hidden="true" />
      </div>
      <h2 className="rpa-titre">Réviz+ t’est offert 7 jours</h2>
      <p className="rpa-texte">Jusqu’au {jusquau}. Rien à payer, rien à activer.</p>
      <ul className="rpa-liste">
        <li><span className="rpa-rond rpa-rond--menthe" aria-hidden="true"><BoltIcon /></span><b>Exercices illimités</b><span>au lieu de 3 séances par jour</span></li>
        <li><span className="rpa-rond rpa-rond--lavande" aria-hidden="true"><CameraIcon /></span><b>Scans illimités</b><span>au lieu de 5 par semaine</span></li>
        <li><span className="rpa-rond rpa-rond--peche" aria-hidden="true"><ChatIcon /></span><b>Réviz IA chaque jour</b><span>50 questions par jour au lieu de 10 par semaine</span></li>
      </ul>
      <button type="button" className="rpo-btn" onClick={onContinuer}>Continuer ma séance</button>
    </Fenetre>
  );
}

const ERREURS_DEMANDE = {
  EMAIL_INVALIDE: 'Cette adresse ne semble pas valable.',
  EMAIL_ELEVE: 'C’est ton adresse : il faut celle d’un parent.',
  DEJA_DEMANDE: 'Tu as déjà envoyé une demande. Tu pourras en renvoyer une dans deux jours.',
  ABONNE: 'Tu as déjà Réviz+.',
};

const peutPartager = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/**
 * « Demander à un parent » (08/11) : le parent reçoit un lien pour offrir Réviz+, sans compte.
 * Site seulement : l'app iOS ne propose aucun achat (règle 3.1.1).
 * Depuis le 17/11 le lien part d'abord par message (feuille de partage du téléphone :
 * WhatsApp, SMS…) : un collégien connaît rarement l'adresse e-mail d'un parent, et personne
 * n'envoyait la demande. L'e-mail reste proposé en dessous. Sur ordinateur, ou si le partage
 * est annulé, le message se copie.
 * Le lien est demandé au serveur à l'ouverture du panneau : Safari sur iPhone refuse un
 * partage lancé trop longtemps après le toucher (attente du réseau).
 * @param {{ lieu?: string, enBouton?: boolean }} p  enBouton : un vrai bouton plutôt qu'un lien
 */
export function DemanderParent({ lieu = 'autre', enBouton = false }) {
  const { consent, isGuest } = useAuth();
  const [etat, setEtat] = useState('ferme'); // ferme | form | envoi | envoye | partage | copie
  const [email, setEmail] = useState(consent?.parentEmail ?? '');
  const [erreur, setErreur] = useState('');
  const [lien, setLien] = useState(null);
  const [message, setMessage] = useState(''); // '' | creation | pret | erreur
  const preparation = useRef(null);
  // L'adresse donnée pour l'accord parental arrive parfois après l'affichage (session en cache).
  const parentEmail = consent?.parentEmail ?? '';
  useEffect(() => { if (parentEmail) setEmail(e => e || parentEmail); }, [parentEmail]);
  if (!ACHAT_DANS_L_APP || isGuest) return null;

  /** Le lien, demandé une seule fois (la promesse est gardée, même en échec on pourra redemander). */
  function preparer() {
    preparation.current ??= lienPourOffrir().then(l => { setLien(l); return l; }).catch(err => { preparation.current = null; throw err; });
    return preparation.current;
  }

  function ouvrir() {
    setEtat('form');
    mesurer('offre', { etape: 'demande_parent_ouverte', lieu });
    preparer().catch(() => { /* pas de réseau : le lien sera redemandé au toucher */ });
  }

  async function partager(url) {
    try {
      await navigator.share({ text: MESSAGE_OFFRIR, url });
      mesurer('offre', { etape: 'demande_parent', lieu, moyen: 'message' });
      setEtat('partage');
    } catch {
      // Partage annulé (ou refusé par le navigateur) : le lien reste là, à copier ou à renvoyer.
      mesurer('offre', { etape: 'demande_parent_annulee', lieu });
      setMessage('pret');
    }
  }

  async function copier(url) {
    try {
      await navigator.clipboard.writeText(`${MESSAGE_OFFRIR} ${url}`);
      mesurer('offre', { etape: 'demande_parent', lieu, moyen: 'copie' });
      setEtat('copie');
    } catch { setMessage('pret'); /* presse-papiers refusé : le lien s'affiche, à sélectionner */ }
  }

  async function parMessage() {
    setErreur('');
    let url = lien;
    if (!url) {
      setMessage('creation');
      try { url = await preparer(); } catch (err) {
        setMessage('erreur');
        setErreur(ERREURS_DEMANDE[err.message] ?? 'Le lien n’a pas pu être créé. Réessaie dans un instant.');
        return;
      }
      setMessage('');
    }
    if (peutPartager()) await partager(url);
    else await copier(url);
  }

  async function envoyer(e) {
    e.preventDefault();
    if (etat === 'envoi') return;
    setEtat('envoi'); setErreur('');
    try {
      await demanderAuParent(email.trim());
      mesurer('offre', { etape: 'demande_parent', lieu, moyen: 'mail' });
      setEtat('envoye');
    } catch (err) {
      setErreur(ERREURS_DEMANDE[err.message] ?? 'L’e-mail n’est pas parti. Réessaie dans un moment.');
      setEtat('form');
    }
  }

  if (etat === 'ferme') {
    return (
      <button type="button" className={enBouton ? 'rpo-btn rpo-btn--second' : 'rpo-lien rpo-lien--parent'} onClick={ouvrir}>
        Demander à un parent de me l’offrir
      </button>
    );
  }
  if (etat === 'envoye') {
    return <p className="rpo-demande-ok" role="status"><Coche />C’est parti. Ton parent a reçu un e-mail pour t’offrir Réviz+.</p>;
  }
  if (etat === 'partage' || etat === 'copie') {
    return (
      <div className="rpo-demande-fait">
        <p className="rpo-demande-ok" role="status"><Coche />
          {etat === 'copie' ? 'Message copié. Colle-le dans une conversation avec ton parent.' : 'C’est parti. Ton parent n’a plus qu’à ouvrir le lien.'}
        </p>
        {lien && (
          <button type="button" className="rpo-lien" onClick={() => (peutPartager() ? partager(lien) : copier(lien))}>
            {peutPartager() ? 'Renvoyer le lien' : 'Copier à nouveau'}
          </button>
        )}
      </div>
    );
  }
  const occupe = etat === 'envoi' || message === 'creation';
  return (
    <form className="rpo-demande" onSubmit={envoyer}>
      <button type="button" className="rpo-btn rpo-btn--second rpo-demande-message" onClick={parMessage} disabled={occupe}>
        {message === 'creation' ? 'Un instant…' : peutPartager() ? 'Lui envoyer par message' : 'Copier le message à lui envoyer'}
      </button>
      {message === 'pret' && lien && (
        <input className="rpo-demande-lien" readOnly value={lien} aria-label="Lien à envoyer à ton parent" onFocus={e => e.target.select()} />
      )}
      <p className="rpo-note">Il reçoit un lien pour t’offrir Réviz+, sans créer de compte.</p>
      <span className="rpo-demande-ou">ou par e-mail</span>
      <label htmlFor="rpo-demande-email">L’adresse e-mail d’un parent</label>
      <input id="rpo-demande-email" type="email" inputMode="email" autoComplete="off" required
        value={email} onChange={e => setEmail(e.target.value)} placeholder="parent@exemple.fr" disabled={etat === 'envoi'} />
      {erreur && <p className="rpo-erreur" role="alert">{erreur}</p>}
      <button type="submit" className="rpo-btn rpo-btn--second" disabled={occupe}>
        {etat === 'envoi' ? 'Envoi…' : 'Envoyer la demande'}
      </button>
    </form>
  );
}
