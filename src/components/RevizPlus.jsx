import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModalA11y } from '../hooks/useModalA11y';
import { Mascot } from './Mascot';
import { GemIcon, SparkIcon, CameraIcon, ChatIcon, SunIcon } from './Icons';
import { getScanStatus } from '../services/scanLimitService';
import { moisInscription, quotaCoachDuJour, phaseRevizPlus, joursAvant } from '../utils/revizPlus';
import { startCheckout } from '../services/billingService';
import {
  LANCEMENT_CHAT_LIMIT, FIN_LANCEMENT, DERNIER_JOUR_OFFERT, FIN_GRACE_FONDATEURS, DERNIER_JOUR_GRACE,
} from '../../api/_lancement.js';
import { PRIX, PRIX_FONDATEUR, remiseFondateur } from '../../api/_prix.js';
import './RevizPlus.css';

/**
 * Réviz+ — éléments de statut communs : badge (en-tête, coach), sceau
 * « Membre fondateur », carte récapitulative (profil, fiche) et fiche
 * « Ton Réviz+ ». Encre profonde + or : la même signature dans tous les thèmes.
 */

/** Pastille dorée « Réviz+ ». Bouton si onClick, sinon simple étiquette. */
export function RevizPlusBadge({ onClick, label = 'Réviz+', className = '' }) {
  const classes = ['rp-badge', className].filter(Boolean).join(' ');
  if (!onClick) {
    return <span className={classes}><GemIcon /><span>{label}</span></span>;
  }
  return (
    <button type="button" className={classes} onClick={onClick} aria-label="Voir mon Réviz+">
      <GemIcon /><span>{label}</span>
    </button>
  );
}

/** Sceau « Membre fondateur » (comptes créés pendant le lancement). */
export function FondateurSeal({ className = '' }) {
  return (
    <span className={['rp-seal', className].filter(Boolean).join(' ')}>
      <SparkIcon /><span>Membre fondateur</span>
    </span>
  );
}

/**
 * Ticket « prix fondateur » : ce que l'élève du lancement paiera après, face
 * au prix public barré. Forme de ticket (encoches) : un avantage à garder.
 */
export function TicketFondateur({ depuis, className = '' }) {
  return (
    <div className={['rp-ticket', className].filter(Boolean).join(' ')}>
      <div className="rp-ticket-main">
        <span className="rp-ticket-label">
          <SparkIcon /><span>Ton prix fondateur</span>
        </span>
        <span className="rp-ticket-prix">
          <span className="rp-ticket-montant">{PRIX_FONDATEUR.annuel.montant}</span>
          <span className="rp-ticket-cadence">{PRIX_FONDATEUR.annuel.cadence}</span>
          <s className="rp-ticket-barre" aria-label={`au lieu de ${PRIX.annuel.montant}`}>{PRIX.annuel.montant}</s>
        </span>
        <span className="rp-ticket-note">
          {phaseRevizPlus() === 'grace' || phaseRevizPlus() === 'payant'
            ? 'Tant que tu restes abonné.'
            : `Après le ${DERNIER_JOUR_OFFERT}, tant que tu restes abonné.`}
          {depuis && <> Membre depuis {depuis}.</>}
        </span>
      </div>
      <span className="rp-ticket-remise" aria-hidden="true">−{remiseFondateur()} %</span>
    </div>
  );
}

function Jauge({ icon, label, valeur, detail, pct }) {
  return (
    <div className="rp-meter">
      <span className="rp-meter-icon" aria-hidden="true">{icon}</span>
      <span className="rp-meter-text">
        <span className="rp-meter-label">{label}</span>
        <span className="rp-meter-detail">{detail}</span>
      </span>
      <span className="rp-meter-value">{valeur}</span>
      {typeof pct === 'number' && (
        <span className="rp-meter-bar" aria-hidden="true">
          <span className="rp-meter-fill" style={{ width: `${Math.max(4, Math.min(100, pct))}%` }} />
        </span>
      )}
    </div>
  );
}

/**
 * Carte Réviz+ : statut (offert / actif), membre fondateur, ce qu'il reste
 * cette semaine et aujourd'hui, accès aux thèmes.
 */
export function RevizPlusCard({ onTheme, className = '' }) {
  const navigate = useNavigate();
  const { currentUser, isPremium, revizPlusOffert, estFondateur } = useAuth();
  const scans = getScanStatus();
  const coach = quotaCoachDuJour();
  const coachLimite = coach?.limit ?? LANCEMENT_CHAT_LIMIT;
  const scansIllimites = !Number.isFinite(scans.remaining);
  const depuis = moisInscription(currentUser?.metadata?.creationTime);

  const choisirTheme = onTheme ?? (() => navigate('/reglages#themes'));

  // Où en est la bascule (lancement → derniers jours → grâce des fondateurs).
  const phase = phaseRevizPlus();
  const enGrace = phase === 'grace' && revizPlusOffert;
  const plusQue = n => `plus que ${n}\u00a0jour${n > 1 ? 's' : ''}`;
  const sousTitre = isPremium
    ? 'Ton abonnement est actif.'
    : enGrace
      ? `Réviz+ est maintenant payant. Pour toi, il reste offert jusqu'au ${DERNIER_JOUR_GRACE} : ${plusQue(joursAvant(FIN_GRACE_FONDATEURS))}.`
      : phase === 'derniers-jours'
        ? `Offert jusqu'au ${DERNIER_JOUR_OFFERT} : ${plusQue(joursAvant(FIN_LANCEMENT))}.`
        : `Offert jusqu'au ${DERNIER_JOUR_OFFERT}. Rien à payer, rien à activer.`;

  // Pendant la grâce : s'abonner au tarif fondateur depuis la carte.
  const [paiement, setPaiement] = useState(null);
  const [erreur, setErreur] = useState('');
  async function garder(formule) {
    if (paiement) return;
    setPaiement(formule); setErreur('');
    try {
      await startCheckout(formule); // redirection pleine page en cas de succès
    } catch (err) {
      setPaiement(null);
      if (err.message === 'EMAIL_NOT_VERIFIED') navigate('/verify-email');
      else setErreur('Impossible d\'ouvrir le paiement. Réessaie dans un moment.');
    }
  }

  return (
    <section className={['rp-card', className].filter(Boolean).join(' ')} aria-labelledby="rp-card-titre">
      <span className="rp-card-mascot" aria-hidden="true">
        <Mascot pose="levelup" size={96} alt="" aria-hidden="true" />
      </span>

      <div className="rp-card-head">
        <span className="rp-wordmark"><GemIcon /><span>Réviz<span className="rp-wordmark-plus">+</span></span></span>
        <span className="rp-status">{isPremium ? 'Actif' : revizPlusOffert ? 'Offert' : 'Inactif'}</span>
      </div>

      <h2 className="rp-card-title" id="rp-card-titre">{enGrace ? 'Garde ton Réviz+' : 'Tout Réviz+ est à toi'}</h2>
      <p className="rp-card-sub">{sousTitre}</p>

      {estFondateur && !isPremium ? (
        <TicketFondateur depuis={depuis} />
      ) : estFondateur && (
        <div className="rp-fondateur">
          <FondateurSeal />
          {depuis && <span className="rp-fondateur-depuis">depuis {depuis}</span>}
        </div>
      )}

      <div className="rp-meters">
        <Jauge
          icon={<CameraIcon />}
          label="Leçons analysées"
          detail="cette semaine"
          valeur={scansIllimites ? 'Illimité' : `${scans.remaining} restantes`}
          pct={scansIllimites ? undefined : (scans.remaining / scans.limit) * 100}
        />
        <Jauge
          icon={<ChatIcon />}
          label="Coach"
          detail="aujourd’hui"
          valeur={coach ? `${coach.remaining} messages` : `${coachLimite} par jour`}
          pct={coach ? (coach.remaining / coachLimite) * 100 : undefined}
        />
        <Jauge icon={<SunIcon />} label="Thèmes" detail="à choisir dans les Réglages" valeur="4 débloqués" />
      </div>

      {enGrace ? (
        <>
          <button type="button" className="rp-cta" onClick={() => garder('annuel')} disabled={!!paiement}>
            {paiement === 'annuel' ? 'Ouverture du paiement…' : `Garder Réviz+ à ${PRIX_FONDATEUR.annuel.montant}${PRIX_FONDATEUR.annuel.cadence}`}
            <span aria-hidden="true">→</span>
          </button>
          <button type="button" className="rp-cta-lien" onClick={() => garder('mensuel')} disabled={!!paiement}>
            {paiement === 'mensuel' ? 'Ouverture du paiement…' : `ou ${PRIX_FONDATEUR.mensuel.montant} par mois, sans engagement`}
          </button>
          {erreur && <p className="rp-erreur" role="alert">{erreur}</p>}
        </>
      ) : (
        <button type="button" className="rp-cta" onClick={choisirTheme}>
          Choisir mon thème
          <span aria-hidden="true">→</span>
        </button>
      )}
    </section>
  );
}

/** Fiche « Ton Réviz+ » : panneau du bas sur téléphone, fenêtre centrée sur ordinateur. */
export function RevizPlusSheet({ onClose }) {
  const ref = useModalA11y(onClose);
  return (
    <div className="rp-sheet-fond" onClick={onClose}>
      <div
        className="rp-sheet"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Ton Réviz+"
        onClick={e => e.stopPropagation()}
      >
        <button type="button" className="rp-sheet-close" onClick={onClose} aria-label="Fermer">✕</button>
        <RevizPlusCard />
      </div>
    </div>
  );
}
