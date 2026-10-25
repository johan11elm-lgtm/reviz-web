import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mascot } from './Mascot';
import { BulleReviz } from './reviz/BulleReviz';
import { Fenetre } from './revizplus/RevizPlusOffre';
import { track } from '../services/statsService';
import { startCheckout } from '../services/billingService';
import { phaseRevizPlus } from '../utils/revizPlus';
import {
  DERNIER_JOUR_OFFERT, PREMIER_PRELEVEMENT,
  VENTES_OUVERTES, tarifFondateurOuvert,
} from '../../api/_lancement.js';
import { PRIX_FONDATEUR } from '../../api/_prix.js';
import { CameraIcon, ChatIcon, SunIcon } from './Icons';
import './RevizPlusAnnonce.css';

// Une clé par période : l'élève revoit la popup quand la période change
// (lancement → trois derniers jours), et quand les ventes ouvrent.
const cle = (uid, phase) => `reviz-annonce-revizplus-${phase}${VENTES_OUVERTES ? '-ventes' : ''}-${uid}`;

/** La popup Réviz+ de la période en cours a-t-elle déjà été vue ? */
export function annonceRevizPlusVue(uid) {
  try { return localStorage.getItem(cle(uid, phaseRevizPlus())) === '1'; } catch { return true; }
}

function marquerVue(uid) {
  try { localStorage.setItem(cle(uid, phaseRevizPlus()), '1'); } catch { /* stockage indisponible */ }
}

const fondateur = `${PRIX_FONDATEUR.annuel.montant} par an`;

const reserve = `Abonne-toi avant le ${PREMIER_PRELEVEMENT} : tu gardes Réviz+ à ${fondateur}, tant que tu restes abonné. Rien n’est prélevé avant le ${PREMIER_PRELEVEMENT}.`;

// Sans compte à rebours : le titre dit la date, la bulle de Réviz le ton.
const TEXTES = {
  lancement: {
    bulle: ['Cadeau de lancement.', 'Tout Réviz+ est à toi.'],
    titre: `Réviz+ offert jusqu’au ${DERNIER_JOUR_OFFERT}`,
    sous: VENTES_OUVERTES ? reserve : `Tout Réviz+ est gratuit pour toi jusqu’au ${DERNIER_JOUR_OFFERT}. Rien à payer, rien à activer.`,
  },
  'derniers-jours': {
    bulle: ['Encore quelques jours.', 'Profites-en bien.'],
    titre: `Réviz+ offert jusqu’au ${DERNIER_JOUR_OFFERT}`,
    sous: VENTES_OUVERTES ? reserve : 'Ensuite, Réviz+ devient payant. Le programme et les révisions restent gratuits.',
  },
  prolonge: {
    bulle: ['Cadeau de lancement.', 'Profite de tout.'],
    titre: 'Réviz+ est offert',
    sous: 'Pendant le lancement, tout Réviz+ est gratuit pour toi. Rien à payer, rien à activer.',
  },
};

const AVANTAGES = [
  { icone: <CameraIcon />, teinte: 'lavande', titre: 'Scans illimités', detail: 'au lieu de 5 par semaine' },
  { icone: <ChatIcon />, teinte: 'peche', titre: 'Réviz IA illimitée', detail: 'au lieu de 10 questions par jour' },
  { icone: <SunIcon />, teinte: 'menthe', titre: 'Tous les thèmes', detail: '4 au lieu de 1' }, // sombre suspendu (SOMBRE_DISPONIBLE)
];

/**
 * Popup Réviz+ sur Home, une fois par période : offert jusqu'à la bascule, puis rappel des
 * derniers jours ; dès que les ventes sont ouvertes, elle propose de réserver le tarif fondateur.
 * Même feuille que Découvrir Réviz+ (feuille du bas sur téléphone, fenêtre sur ordinateur).
 */
export function RevizPlusAnnonce({ uid, onClose }) {
  const navigate = useNavigate();
  const fermer = () => { marquerVue(uid); onClose(); };
  const t = TEXTES[phaseRevizPlus()] ?? TEXTES.lancement;
  const [paiement, setPaiement] = useState(false);

  async function garder() {
    if (paiement) return;
    setPaiement(true);
    marquerVue(uid);
    track('revizplus_reserver_cta');
    try {
      await startCheckout('annuel'); // redirection pleine page en cas de succès
    } catch (err) {
      setPaiement(false);
      if (err.message === 'EMAIL_NOT_VERIFIED') navigate('/verify-email');
      else navigate('/reglages');
    }
  }

  return (
    <Fenetre label={t.titre} onClose={fermer}>
      <div className="rpo-panneau rpo-panneau--peche">
        <span className="ch-grain" aria-hidden="true" />
        <BulleReviz lignes={t.bulle} pointe="droite" className="rpo-bulle" />
        <Mascot pose="levelup" size={150} alt="" aria-hidden="true" />
      </div>
      <h2 className="rpa-titre">{t.titre}</h2>
      <p className="rpa-texte">{t.sous}</p>
      <ul className="rpa-liste">
        {AVANTAGES.map(a => (
          <li key={a.titre}><span className={`rpa-rond rpa-rond--${a.teinte}`} aria-hidden="true">{a.icone}</span><b>{a.titre}</b><span>{a.detail}</span></li>
        ))}
      </ul>
      {VENTES_OUVERTES && tarifFondateurOuvert() ? (
        <button type="button" className="rpo-btn" onClick={garder} disabled={paiement}>
          {paiement ? 'Ouverture du paiement…' : `Réserver à ${PRIX_FONDATEUR.annuel.montant}${PRIX_FONDATEUR.annuel.cadence}`}
        </button>
      ) : (
        <button type="button" className="rpo-btn" onClick={() => { marquerVue(uid); track('revizplus_offert_cta'); onClose(); navigate('/scan'); }}>
          Scanner une leçon
        </button>
      )}
      <button type="button" className="rpo-lien" onClick={fermer}>Plus tard</button>
    </Fenetre>
  );
}
