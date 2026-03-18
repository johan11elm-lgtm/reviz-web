import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Welcome.css';

const LogoStar = () => (
  <svg className="welcome-star" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8 0 C8.3 2.8 8.8 4.2 10.2 5.6 11.6 7 13 7.5 16 8 13 8.5 11.6 9 10.2 10.4 8.8 11.8 8.3 13.2 8 16 7.7 13.2 7.2 11.8 5.8 10.4 4.4 9 3 8.5 0 8 3 7.5 4.4 7 5.8 5.6 7.2 4.2 7.7 2.8 8 0Z"
      fill="url(#welcomeGrad)"
    />
    <defs>
      <linearGradient id="welcomeGrad" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFB347" />
        <stop offset="100%" stopColor="#FF6B00" />
      </linearGradient>
    </defs>
  </svg>
);

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('revealed');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

const STEPS = [
  { icon: '📸', title: 'Scanne', desc: 'Photo ou copie-colle ta leçon directement dans l\'app.' },
  { icon: '🤖', title: 'L\'IA analyse', desc: 'Flashcards, quiz, résumé et carte mentale générés en quelques secondes.' },
  { icon: '🏆', title: 'Révise', desc: 'Retiens vraiment. Progresse. Bats tes records.' },
];

const OUTPUTS = [
  { icon: '🃏', label: 'Flashcards', color: '#FF6B00' },
  { icon: '❓', label: 'Quiz', color: '#6C63FF' },
  { icon: '📄', label: 'Résumé', color: '#00C07F' },
  { icon: '🗺️', label: 'Carte mentale', color: '#FF3B7F' },
];

export default function Welcome() {
  useReveal();

  return (
    <div className="wlc-root">

      {/* ── Fond aurora ── */}
      <div className="wlc-aurora" aria-hidden="true">
        <div className="wlc-orb wlc-orb--1" />
        <div className="wlc-orb wlc-orb--2" />
        <div className="wlc-orb wlc-orb--3" />
      </div>

      {/* ── Section 1 : Hero ── */}
      <section className="wlc-section wlc-hero">
        <div className="wlc-hero-inner">
          <div className="wlc-logo" data-reveal>
            <LogoStar />
            <span>réviz</span>
          </div>

          <h1 className="wlc-headline" data-reveal>
            Révise mieux.<br />Retiens plus.
          </h1>

          <p className="wlc-sub" data-reveal>
            L'IA transforme tes leçons en flashcards,<br />quiz et résumés en quelques secondes.
          </p>

          <div className="wlc-emoji-row" data-reveal>
            <span>📐</span><span>🧬</span><span>📖</span><span>⚛️</span><span>🌍</span>
          </div>
        </div>

        <div className="wlc-scroll-hint" data-reveal>
          <span>Découvrir</span>
          <div className="wlc-scroll-arrow" />
        </div>
      </section>

      {/* ── Section 2 : Comment ça marche ── */}
      <section className="wlc-section wlc-how">
        <h2 className="wlc-section-title" data-reveal>Comment ça marche ?</h2>

        <div className="wlc-steps">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className="wlc-step"
              data-reveal
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="wlc-step-icon">{s.icon}</div>
              <div className="wlc-step-line" />
              <div className="wlc-step-content">
                <span className="wlc-step-title">{s.title}</span>
                <span className="wlc-step-desc">{s.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 3 : Ce que tu obtiens ── */}
      <section className="wlc-section wlc-outputs">
        <h2 className="wlc-section-title" data-reveal>Tout ce qu'il te faut</h2>
        <p className="wlc-section-sub" data-reveal>4 formats générés automatiquement</p>

        <div className="wlc-output-grid">
          {OUTPUTS.map((o, i) => (
            <div
              key={i}
              className="wlc-output-card"
              data-reveal
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="wlc-output-icon" style={{ background: o.color + '22', color: o.color }}>
                {o.icon}
              </div>
              <span className="wlc-output-label">{o.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 4 : CTA ── */}
      <section className="wlc-section wlc-cta-section">
        <div className="wlc-cta-box" data-reveal>
          <div className="wlc-cta-logo">
            <LogoStar />
            <span>réviz</span>
          </div>
          <h2 className="wlc-cta-title">Prêt à réviser autrement ?</h2>
          <p className="wlc-cta-sub">Gratuit pour commencer. Aucune carte bancaire.</p>

          <div className="wlc-cta-btns">
            <Link to="/inscription" className="wlc-btn wlc-btn--primary">
              Créer un compte
            </Link>
            <Link to="/connexion" className="wlc-btn wlc-btn--secondary">
              Se connecter
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
