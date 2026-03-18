import { Link } from 'react-router-dom';
import './Welcome.css';

const LogoStar = () => (
  <svg className="wlc-star" viewBox="0 0 16 16" fill="none">
    <path
      d="M8 0 C8.3 2.8 8.8 4.2 10.2 5.6 11.6 7 13 7.5 16 8 13 8.5 11.6 9 10.2 10.4 8.8 11.8 8.3 13.2 8 16 7.7 13.2 7.2 11.8 5.8 10.4 4.4 9 3 8.5 0 8 3 7.5 4.4 7 5.8 5.6 7.2 4.2 7.7 2.8 8 0Z"
      fill="url(#wlcG)"
    />
    <defs>
      <linearGradient id="wlcG" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFB347" />
        <stop offset="100%" stopColor="#FF6B00" />
      </linearGradient>
    </defs>
  </svg>
);

const STEPS = [
  { icon: '📸', num: '1', title: 'Scanne',        desc: 'Photo ou texte de ta leçon — ça suffit.' },
  { icon: '🤖', num: '2', title: "L'IA analyse",  desc: 'Flashcards, quiz, résumé, carte mentale en secondes.' },
  { icon: '🏆', num: '3', title: 'Révise',         desc: 'Retiens vraiment. Progresse. Bats tes records.' },
];

const OUTPUTS = [
  { icon: '📝', label: 'Résumé',        color: '#22C55E' },
  { icon: '🃏', label: 'Flashcards',    color: '#6366F1' },
  { icon: '🧠', label: 'Carte mentale', color: '#A855F7' },
  { icon: '❓', label: 'Quiz',           color: '#FF6B00' },
];

export default function Welcome() {
  return (
    <div className="wlc-root">

      {/* ── Nav ── */}
      <nav className="wlc-nav">
        <div className="wlc-logo">
          <LogoStar />
          <span>réviz</span>
        </div>
        <Link to="/connexion" className="wlc-nav-link">Se connecter</Link>
      </nav>

      {/* ── Hero ── */}
      <section className="wlc-hero">
        <div className="wlc-badge">✦ Pour les collégiens</div>
        <h1 className="wlc-headline">
          Révise mieux.<br />Retiens plus.
        </h1>
        <p className="wlc-sub">
          L'IA transforme tes leçons en flashcards, quiz et résumés
          en quelques secondes.
        </p>
        <div className="wlc-subjects">
          {['📐','🧬','📖','⚛️','🌍','🎨','🏛️'].map((e, i) => (
            <span key={i}>{e}</span>
          ))}
        </div>
        <Link to="/inscription" className="wlc-btn-primary">
          Commencer gratuitement →
        </Link>
        <p className="wlc-hint">Aucune carte bancaire · Gratuit pour commencer</p>
      </section>

      <div className="wlc-divider" />

      {/* ── Comment ça marche ── */}
      <section className="wlc-section">
        <p className="wlc-label">COMMENT ÇA MARCHE</p>
        <h2 className="wlc-section-title">Simple comme bonjour</h2>
        <div className="wlc-steps">
          {STEPS.map((s, i) => (
            <div key={i} className="wlc-step">
              <div className="wlc-step-left">
                <div className="wlc-step-icon">{s.icon}</div>
                <div className="wlc-step-line" />
              </div>
              <div className="wlc-step-body">
                <span className="wlc-step-num">{s.num}</span>
                <span className="wlc-step-title">{s.title}</span>
                <p className="wlc-step-desc">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="wlc-divider" />

      {/* ── 4 formats ── */}
      <section className="wlc-section">
        <p className="wlc-label">LES FORMATS</p>
        <h2 className="wlc-section-title">4 outils en 1 scan</h2>
        <div className="wlc-grid">
          {OUTPUTS.map((o, i) => (
            <div key={i} className="wlc-card">
              <div className="wlc-card-icon" style={{ background: o.color + '15' }}>
                <span>{o.icon}</span>
              </div>
              <span className="wlc-card-label">{o.label}</span>
              <div className="wlc-card-dot" style={{ background: o.color }} />
            </div>
          ))}
        </div>
      </section>

      <div className="wlc-divider" />

      {/* ── CTA final ── */}
      <section className="wlc-section wlc-cta">
        <div className="wlc-logo wlc-cta-logo">
          <LogoStar />
          <span>réviz</span>
        </div>
        <h2 className="wlc-headline" style={{ fontSize: 26 }}>
          Prêt à réviser autrement ?
        </h2>
        <Link to="/inscription" className="wlc-btn-primary">
          Créer un compte
        </Link>
        <Link to="/connexion" className="wlc-btn-ghost">
          Se connecter
        </Link>
      </section>

    </div>
  );
}
