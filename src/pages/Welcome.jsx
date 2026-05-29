import { Link } from 'react-router-dom';
import { Mascot } from '../components/Mascot';
import './Welcome.css';

const STEPS = [
  { icon: '📸', tone: 'orange', num: '1', title: 'Scanne',        desc: 'Photo ou texte de ta leçon — ça suffit.' },
  { icon: '🤖', tone: 'violet', num: '2', title: "L'IA analyse",  desc: 'Flashcards, quiz, résumé et carte mentale en quelques secondes.' },
  { icon: '🏆', tone: 'green',  num: '3', title: 'Révise',        desc: 'Retiens vraiment. Progresse. Bats tes records.' },
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
              Révise mieux.<br />Retiens plus.
            </h1>
            <p className="wlc-sub">
              L'IA transforme tes leçons en flashcards, quiz et résumés —
              calibrés pour ton programme de collège ou de lycée.
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
            <h2 className="wlc-section-title">Simple comme bonjour</h2>
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

          {/* ── 4 formats ── */}
          <section className="wlc-section">
            <p className="wlc-label">LES FORMATS</p>
            <h2 className="wlc-section-title">4 outils en 1 scan</h2>
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
            <h2 className="wlc-cta-title">Prêt à réviser autrement ?</h2>
            <p className="wlc-cta-sub">
              Rejoins les élèves qui révisent plus malin avec Réviz.
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
