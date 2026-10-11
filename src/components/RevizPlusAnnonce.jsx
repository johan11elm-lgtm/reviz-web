import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModalA11y } from '../hooks/useModalA11y';
import { Mascot } from './Mascot';
import { CameraIcon, ChatIcon, SunIcon } from './Icons';
import { track } from '../services/statsService';
import { startCheckout } from '../services/billingService';
import { phaseRevizPlus, joursAvant } from '../utils/revizPlus';
import {
  LANCEMENT_SCAN_LIMIT, LANCEMENT_CHAT_LIMIT, FIN_LANCEMENT, DERNIER_JOUR_OFFERT, DERNIER_JOUR_GRACE,
} from '../../api/_lancement.js';
import { PRIX, PRIX_FONDATEUR } from '../../api/_prix.js';
import './battle/BattleAnnonce.css';

// Une clé par période : l'élève revoit la popup quand la période change
// (lancement → trois derniers jours → grâce des fondateurs).
const cle = (uid, phase) => `reviz-annonce-revizplus-${phase}-${uid}`;

/** La popup Réviz+ de la période en cours a-t-elle déjà été vue ? */
export function annonceRevizPlusVue(uid) {
  try { return localStorage.getItem(cle(uid, phaseRevizPlus())) === '1'; } catch { return true; }
}

function marquerVue(uid) {
  try { localStorage.setItem(cle(uid, phaseRevizPlus()), '1'); } catch { /* stockage indisponible */ }
}

const plusQue = n => `Plus que ${n}\u00a0jour${n > 1 ? 's' : ''}`;
const fondateur = `${PRIX_FONDATEUR.annuel.montant} par an au lieu de ${PRIX.annuel.montant}`;

const TEXTES = {
  lancement: {
    pill: () => 'Offert',
    titre: `Réviz+ offert jusqu’au ${DERNIER_JOUR_OFFERT}`,
    sous: `Tout Réviz+ est gratuit pour toi jusqu’au ${DERNIER_JOUR_OFFERT}. Ensuite, comme tu t’es inscrit pendant le lancement, tu le gardes à ${fondateur}.`,
  },
  'derniers-jours': {
    pill: () => plusQue(joursAvant(FIN_LANCEMENT)),
    titre: `Réviz+ offert jusqu’au ${DERNIER_JOUR_OFFERT}`,
    sous: `Ensuite Réviz+ devient payant. Toi, tu le gardes offert jusqu’au ${DERNIER_JOUR_GRACE}, puis à ${fondateur} si tu t’abonnes.`,
  },
  prolonge: {
    pill: () => 'Offert',
    titre: 'Réviz+ est offert',
    sous: `Pendant le lancement, tout Réviz+ est gratuit pour toi. Ensuite, comme tu t’es inscrit pendant le lancement, tu le gardes à ${fondateur}.`,
  },
  grace: {
    pill: () => 'Membre fondateur',
    titre: 'Garde ton Réviz+',
    sous: `Réviz+ est maintenant payant. Pour toi, il reste offert jusqu’au ${DERNIER_JOUR_GRACE}. Ensuite, ${fondateur}, ou ${PRIX_FONDATEUR.mensuel.montant} par mois.`,
  },
};

/**
 * Popup Réviz+ sur Home, une fois par période : offert jusqu'à la bascule,
 * rappel des derniers jours, puis grâce des fondateurs avec l'abonnement.
 * Même gabarit que la popup de la Battle.
 */
export function RevizPlusAnnonce({ uid, onClose }) {
  const navigate = useNavigate();
  const fermer = () => { marquerVue(uid); onClose(); };
  const ref = useModalA11y(fermer);
  const phase = phaseRevizPlus();
  const t = TEXTES[phase] ?? TEXTES.lancement;
  const [paiement, setPaiement] = useState(false);

  async function garder() {
    if (paiement) return;
    setPaiement(true);
    marquerVue(uid);
    track('revizplus_grace_cta');
    try {
      await startCheckout('annuel'); // redirection pleine page en cas de succès
    } catch (err) {
      setPaiement(false);
      if (err.message === 'EMAIL_NOT_VERIFIED') navigate('/verify-email');
      else navigate('/reglages');
    }
  }

  return (
    <div className="battle-annonce-fond" onClick={fermer}>
      <div
        className="battle-annonce-carte"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="revizplus-annonce-titre"
        onClick={e => e.stopPropagation()}
      >
        <div className="battle-annonce-visuel" aria-hidden="true">
          <Mascot pose="levelup" size={124} alt="" aria-hidden="true" />
        </div>
        <span className="rv-pill rv-pill--orange battle-annonce-pill">{t.pill()}</span>
        <h2 className="battle-annonce-titre" id="revizplus-annonce-titre">{t.titre}</h2>
        <p className="battle-annonce-sous">{t.sous}</p>
        <ul className="battle-regles">
          <li><CameraIcon /><span>Jusqu’à {LANCEMENT_SCAN_LIMIT} leçons analysées par semaine, au lieu de 5</span></li>
          <li><ChatIcon /><span>Le coach, jusqu’à {LANCEMENT_CHAT_LIMIT} messages par jour</span></li>
          <li><SunIcon /><span>Tous les thèmes de couleur</span></li>
        </ul>
        <div className="battle-annonce-actions">
          {phase === 'grace' ? (
            <button type="button" className="rv-btn-cta rv-btn-cta--full" onClick={garder} disabled={paiement}>
              <span>{paiement ? 'Ouverture du paiement…' : `Garder Réviz+ à ${PRIX_FONDATEUR.annuel.montant}${PRIX_FONDATEUR.annuel.cadence}`}</span>
              <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
            </button>
          ) : (
            <button type="button" className="rv-btn-cta rv-btn-cta--full" onClick={() => { marquerVue(uid); track('revizplus_offert_cta'); navigate('/scan'); }}>
              <span>Scanner une leçon</span>
              <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
            </button>
          )}
          <button type="button" className="rv-btn-cta rv-btn-cta--full rv-btn-cta--ghost rv-btn-cta--center" onClick={fermer}>
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
