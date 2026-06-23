import { Link } from 'react-router-dom';
import { Mascot } from '../components/Mascot';
import './Welcome.css';

const STEPS = [
  { icon: '📸', tone: 'orange', num: '1', title: 'Prends en photo', desc: 'Ta leçon, même mal écrite, même en bazar. Ou colle ton texte.' },
  { icon: '🤖', tone: 'violet', num: '2', title: "L'IA fait le tri", desc: "Flashcards, quiz, résumé et carte mentale prêts en quelques secondes." },
  { icon: '🏆', tone: 'green',  num: '3', title: 'Et tu révises',    desc: '10 minutes dans le bus suffisent. Et là, ça rentre vraiment.' },
];

const BENEFITS = [
  { icon: '🌙', tone: 'orange', title: 'Récupère tes soirées', desc: "Plus besoin de tout recopier à la main. Le travail de tri, c'est fait." },
  { icon: '🎯', tone: 'violet', title: 'Calibré sur ton programme', desc: 'Collège et lycée, matière par matière. Rien d\'inutile, rien à côté.' },
  { icon: '🧠', tone: 'pink',   title: 'Retiens pour de vrai', desc: 'Les bonnes cartes reviennent au bon moment pour ancrer la mémoire.' },
  { icon: '🔥', tone: 'green',  title: 'Garde le rythme', desc: 'Séries, niveaux et défis pour t\'y tenir sans avoir à te forcer.' },
];

const FORMATS = [
  { icon: '📝', tone: 'green',  label: 'Résumé' },
  { icon: '🃏', tone: 'violet', label: 'Flashcards' },
  { icon: '🧠', tone: 'pink',   label: 'Carte mentale' },
  { icon: '❓', tone: 'orange', label: 'Quiz' },
];

const SUBJECTS = ['📐', '🧬', '📖', '⚛️', '🌍', '💻', '⚖️', '🤔', '🎨', '🏛️'];

export default function Welcome() {
  return (
    <div className="app">

      {/* ── Nav ── */}
      <nav className="wlc-nav" aria-label="Navigation principale">
        <div className="wlc-logo">
          <Mascot pose="reading" size={28} priority alt="" aria-hidden="true" />
          <span>réviz</span>
        </div>
        <Link to="/connexion" className="wlc-nav-link">Se connecter</Link>
      </nav>

      <div className="wlc-scroll">
        <main>

          {/* ── Hero ── */}
          <section className="wlc-hero">
            <Mascot
              pose="hello"
              size={156}
              glow
              animate
              priority
              className="wlc-hero-mascot"
            />
            <span className="rv-pill rv-pill--orange wlc-badge">✦ Collège · Lycée</span>
            <h1 className="wlc-headline">
              Ta leçon en photo.<br />Prêt pour le contrôle.
            </h1>
            <p className="wlc-sub">
              Réviz transforme tes cours en flashcards, quiz et résumés
              en quelques secondes. Tu révises en 10 minutes — pas toute la soirée.
            </p>
            <div className="wlc-subjects" aria-hidden="true">
              {SUBJECTS.map((e, i) => <span key={i}>{e}</span>)}
            </div>
            <Link to="/inscription" className="rv-btn-cta rv-btn-cta--full wlc-cta-btn">
              Commencer gratuitement
              <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
            </Link>
            <p className="wlc-hint">Aucune carte bancaire · Gratuit pour commencer</p>
          </section>

          {/* ── Comment ça marche ── */}
          <section className="wlc-section">
            <p className="wlc-label">COMMENT ÇA MARCHE</p>
            <h2 className="wlc-section-title">3 étapes, zéro prise de tête</h2>
            <ul className="wlc-steps">
              {STEPS.map((s) => (
                <li key={s.num} className="wlc-step">
                  <span className={`rv-icon-square rv-icon-square--xl rv-icon-square--${s.tone}`} aria-hidden="true">
                    {s.icon}
                  </span>
                  <div className="wlc-step-text">
                    <span className="wlc-step-title">
                      <span className="wlc-step-num">{s.num}</span>
                      {s.title}
                    </span>
                    <span className="wlc-step-desc">{s.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* ── Pourquoi Réviz ── */}
          <section className="wlc-section">
            <p className="wlc-label">POURQUOI RÉVIZ</p>
            <h2 className="wlc-section-title">Réviser, sans la galère</h2>
            <ul className="wlc-steps">
              {BENEFITS.map((b) => (
                <li key={b.title} className="wlc-step">
                  <span className={`rv-icon-square rv-icon-square--xl rv-icon-square--${b.tone}`} aria-hidden="true">
                    {b.icon}
                  </span>
                  <div className="wlc-step-text">
                    <span className="wlc-step-title">{b.title}</span>
                    <span className="wlc-step-desc">{b.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* ── 4 formats ── */}
          <section className="wlc-section">
            <p className="wlc-label">LES FORMATS</p>
            <h2 className="wlc-section-title">4 façons de réviser, 1 seul scan</h2>
            <div className="wlc-grid">
              {FORMATS.map((f) => (
                <div key={f.label} className="wlc-grid-item">
                  <span className={`rv-icon-square rv-icon-square--xl rv-icon-square--${f.tone}`} aria-hidden="true">
                    {f.icon}
                  </span>
                  <span className="wlc-grid-label">{f.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── CTA final ── */}
          <section className="wlc-cta">
            <Mascot pose="fire" size={120} glow animate className="wlc-cta-mascot" />
            <h2 className="wlc-cta-title">Ton prochain contrôle ?<br />Tu vas le gérer.</h2>
            <p className="wlc-cta-sub">
              Scanne ta première leçon en moins d'une minute. C'est gratuit.
            </p>
            <Link to="/inscription" className="rv-btn-cta rv-btn-cta--full wlc-cta-btn">
              Créer un compte gratuit
              <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
            </Link>
            <Link to="/connexion" className="rv-btn-cta rv-btn-cta--ghost rv-btn-cta--full wlc-cta-btn">
              J'ai déjà un compte
            </Link>
          </section>

          {/* ── Footer ── */}
          <footer className="wlc-footer">
            <Link to="/legal/mentions-legales">Mentions légales</Link>
            <span aria-hidden="true">·</span>
            <Link to="/legal/cgu">CGU</Link>
            <span aria-hidden="true">·</span>
            <Link to="/legal/confidentialite">Confidentialité</Link>
          </footer>

        </main>
      </div>

    </div>
  );
}
