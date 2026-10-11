import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FORMULES } from '../../api/_prix.js';
import { PREMIER_PRELEVEMENT } from '../../api/_lancement.js';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { PageIntro } from '../components/PageIntro';
import { GemIcon, SunIcon, ChatIcon } from '../components/Icons';
import { FondateurSeal, RecapAbonnement, RevizPlusJauges } from '../components/RevizPlus';
import '../components/RevizPlus.css';
import './UpgradeSuccess.css';

// Paillettes dorées : une seule pluie à l'arrivée, aux couleurs de Réviz+.
const PAILLETTES = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 37) % 100,
  delay: (i % 6) * 0.18,
  rot: (i * 53) % 360,
  or: ['#F7DB9C', '#E3A94F', '#F2CD84'][i % 3],
}));

/**
 * Retour de Stripe après l'abonnement. L'adresse porte la formule et le
 * tarif fondateur (api/_checkout.js) ; le statut, lui, attend le webhook.
 */
export default function UpgradeSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fondateur = params.get('fondateur') === '1';
  const formule = FORMULES.includes(params.get('formule')) ? params.get('formule') : null;
  const { currentUser, refreshPremium, isPremium, abonnement } = useAuth();
  const [retriesExhausted, setRetriesExhausted] = useState(false);
  const prenom = currentUser?.displayName?.split(' ')[0];

  // Retry refreshPremium si le webhook Stripe n'a pas encore écrit dans
  // Firestore : backoff 2s/4s/8s/16s (~30s couverts) au lieu d'un seul essai —
  // sinon l'élève qui vient de payer revoit le PremiumModal jusqu'au reload.
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
  }, [isPremium]);

  const statut = !isPremium ? 'Activation…' : fondateur ? 'Réservé' : 'Actif';
  const sousTitre = fondateur
    ? `Prix fondateur réservé : rien n'est prélevé avant le ${PREMIER_PRELEVEMENT}.`
    : 'Ton abonnement est actif : tout est débloqué.';

  return (
    <div className="app ugs-page">
      <div className="ugs-paillettes" aria-hidden="true">
        {PAILLETTES.map((p, i) => (
          <span
            key={i}
            className="ugs-paillette"
            style={{ '--x': `${p.x}%`, '--delay': `${p.delay}s`, '--rot': `${p.rot}deg`, '--or': p.or }}
          />
        ))}
      </div>

      <PageHeader variant="title-only" />
      <PageIntro
        title={prenom ? `Bienvenue dans Réviz+, ${prenom} !` : 'Bienvenue dans Réviz+ !'}
        sub={sousTitre}
        mascot="celebration"
        className="ugs-intro"
      />

      <div className="content ugs-content">
        <section className="rp-card ugs-carte" aria-labelledby="ugs-carte-titre">
          <div className="rp-card-head ugs-carte-head">
            <span className="rp-wordmark"><GemIcon /><span>Réviz<span className="rp-wordmark-plus">+</span></span></span>
            <span className={`rp-status${isPremium ? '' : ' ugs-statut-attente'}`}>{statut}</span>
          </div>
          <h2 className="rp-card-title ugs-carte-titre" id="ugs-carte-titre">Ce que tu as maintenant</h2>
          {fondateur && <div className="rp-fondateur"><FondateurSeal /></div>}
          <RevizPlusJauges />
          <RecapAbonnement
            formule={formule ?? abonnement?.formule}
            fondateur={fondateur}
            annuleLe={abonnement?.annuleLe}
            periodeFin={abonnement?.periodeFin}
          />
        </section>

        <div className="ugs-suite">
          <h2 className="rv-section-title">Pour commencer</h2>
          <button type="button" className="rv-btn-cta rv-btn-cta--full" onClick={() => navigate('/scan')}>
            Scanner une leçon
          </button>
          <div className="rv-card rv-rows">
            <Link to="/reglages#themes" className="rv-row">
              <span className="rv-row-avatar" aria-hidden="true"><SunIcon /></span>
              <span className="rv-row-text">
                <span className="rv-row-title">Choisir mon thème</span>
                <span className="rv-row-sub">Nuit d’encre, Abricot, Sauge ou Prune</span>
              </span>
              <span className="rv-row-arrow" aria-hidden="true">›</span>
            </Link>
            <Link to="/coach" className="rv-row">
              <span className="rv-row-avatar" aria-hidden="true"><ChatIcon /></span>
              <span className="rv-row-text">
                <span className="rv-row-title">Poser une question au coach</span>
                <span className="rv-row-sub">Il connaît tes leçons, sans limite de messages</span>
              </span>
              <span className="rv-row-arrow" aria-hidden="true">›</span>
            </Link>
          </div>

          {!isPremium && retriesExhausted && (
            <button type="button" className="rv-btn-cta rv-btn-cta--ghost rv-btn-cta--full" onClick={() => refreshPremium()}>
              Vérifier mon abonnement
            </button>
          )}
          <p className="ugs-note">
            {fondateur
              ? <>Tu peux annuler avant le {PREMIER_PRELEVEMENT} sans rien payer, depuis les <Link to="/reglages#abonnement">Réglages</Link>.</>
              : <>Résiliable à tout moment depuis les <Link to="/reglages#abonnement">Réglages</Link>.</>}
          </p>
        </div>
      </div>
    </div>
  );
}
