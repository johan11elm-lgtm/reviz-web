import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Welcome.css';

const LogoStar = () => (
  <svg className="wlc-star" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8 0 C8.3 2.8 8.8 4.2 10.2 5.6 11.6 7 13 7.5 16 8 13 8.5 11.6 9 10.2 10.4 8.8 11.8 8.3 13.2 8 16 7.7 13.2 7.2 11.8 5.8 10.4 4.4 9 3 8.5 0 8 3 7.5 4.4 7 5.8 5.6 7.2 4.2 7.7 2.8 8 0Z"
      fill="url(#wlcGrad)"
    />
    <defs>
      <linearGradient id="wlcGrad" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFB347" />
        <stop offset="100%" stopColor="#FF6B00" />
      </linearGradient>
    </defs>
  </svg>
);

/* ── Scroll parallax + section color hook ─────────── */
function useScrollFX() {
  useEffect(() => {
    const root = document.documentElement;

    // Parallax : met à jour --sy au scroll
    const onScroll = () => {
      root.style.setProperty('--sy', window.scrollY + 'px');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Color shift par section
    const SECTION_COLORS = {
      'hero':    '10, 10, 15',
      'how':     '12, 8, 22',
      'outputs': '6, 18, 14',
      'cta':     '14, 8, 18',
    };
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const key = e.target.dataset.section;
            const color = SECTION_COLORS[key];
            if (color) root.style.setProperty('--bg-rgb', color);
          }
        });
      },
      { threshold: 0.4 }
    );
    document.querySelectorAll('[data-section]').forEach((el) =>
      sectionObserver.observe(el)
    );

    // Scroll reveal
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('revealed');
            revealObserver.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll('[data-reveal]').forEach((el) =>
      revealObserver.observe(el)
    );

    return () => {
      window.removeEventListener('scroll', onScroll);
      sectionObserver.disconnect();
      revealObserver.disconnect();
    };
  }, []);
}

const STEPS = [
  { icon: '📸', title: 'Scanne',       desc: 'Photo ou texte de ta leçon — ça suffit.' },
  { icon: '🤖', title: "L'IA analyse", desc: 'Flashcards, quiz, résumé, carte mentale générés en quelques secondes.' },
  { icon: '🏆', title: 'Révise',       desc: 'Retiens vraiment. Progresse. Bats tes records.' },
];

const OUTPUTS = [
  { icon: '🃏', label: 'Flashcards',   color: '#FF6B00' },
  { icon: '❓', label: 'Quiz',          color: '#6C63FF' },
  { icon: '📄', label: 'Résumé',        color: '#00C07F' },
  { icon: '🗺️', label: 'Carte mentale', color: '#FF3B7F' },
];

export default function Welcome() {
  useScrollFX();

  return (
    <div className="wlc-root">

      {/* ── Aurora fond parallax ── */}
      <div className="wlc-aurora" aria-hidden="true">
        <div className="wlc-orb wlc-orb--1" />
        <div className="wlc-orb wlc-orb--2" />
        <div className="wlc-orb wlc-orb--3" />
        <div className="wlc-orb wlc-orb--4" />
      </div>

      {/* ── 1. HERO ── */}
      <section className="wlc-section wlc-hero" data-section="hero">
        <div className="wlc-hero-inner">
          <div className="wlc-logo" data-reveal>
            <LogoStar />
            <span>réviz</span>
          </div>

          <h1 className="wlc-headline" data-reveal>
            Révise mieux.<br />Retiens plus.
          </h1>

          <p className="wlc-sub" data-reveal>
            L'IA transforme tes leçons en flashcards,<br />
            quiz et résumés en quelques secondes.
          </p>

          <div className="wlc-subjects" data-reveal>
            {['📐','🧬','📖','⚛️','🌍','🎨','🏛️'].map((e, i) => (
              <span key={i} style={{ animationDelay: `${i * 0.1}s` }}>{e}</span>
            ))}
          </div>
        </div>

        <div className="wlc-scroll-hint" data-reveal>
          <span>Découvrir</span>
          <div className="wlc-chevron">
            <div /><div />
          </div>
        </div>
      </section>

      {/* ── 2. COMMENT ÇA MARCHE ── */}
      <section className="wlc-section wlc-how" data-section="how">
        <h2 className="wlc-section-title" data-reveal>Comment ça marche ?</h2>

        <div className="wlc-steps">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className="wlc-step"
              data-reveal
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <div className="wlc-step-num">{i + 1}</div>
              <div className="wlc-step-icon">{s.icon}</div>
              <div className="wlc-step-text">
                <span className="wlc-step-title">{s.title}</span>
                <span className="wlc-step-desc">{s.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. OUTPUTS ── */}
      <section className="wlc-section wlc-outputs" data-section="outputs">
        <h2 className="wlc-section-title" data-reveal>4 formats en 1 scan</h2>
        <p className="wlc-section-sub" data-reveal>Tout ce qu'il faut pour vraiment réviser</p>

        <div className="wlc-grid">
          {OUTPUTS.map((o, i) => (
            <div
              key={i}
              className="wlc-card"
              data-reveal
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="wlc-card-icon" style={{ background: o.color + '22' }}>
                <span style={{ fontSize: 28 }}>{o.icon}</span>
              </div>
              <span className="wlc-card-label">{o.label}</span>
              <div className="wlc-card-dot" style={{ background: o.color }} />
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. CTA ── */}
      <section className="wlc-section wlc-cta-section" data-section="cta">
        <div className="wlc-cta-box" data-reveal>
          <div className="wlc-cta-logo">
            <LogoStar />
            <span>réviz</span>
          </div>
          <h2 className="wlc-cta-title">Prêt à réviser autrement ?</h2>
          <p className="wlc-cta-hint">Gratuit pour commencer · Aucune carte bancaire</p>

          <Link to="/inscription" className="wlc-btn wlc-btn--primary">
            Créer un compte
          </Link>
          <Link to="/connexion" className="wlc-btn wlc-btn--ghost">
            Se connecter
          </Link>
        </div>
      </section>

    </div>
  );
}
