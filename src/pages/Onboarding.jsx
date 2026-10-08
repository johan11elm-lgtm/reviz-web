import { ResumeIcon, FlashcardsIcon, MindmapIcon, QuizIcon, CameraIcon, BookOpenIcon } from '../components/Icons';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatLevelLabel } from '../utils/levels';
import { hasProgramme } from '../utils/programme';
import { Mascot } from '../components/Mascot';
import './Onboarding.css';

// Trois écrans, courts : ce que Réviz fabrique, les deux façons de réviser,
// et un premier geste. Le texte reste factuel (pas de bulle de dialogue).
const SLIDES = ['formats', 'how', 'go'];

const FORMATS = [
  { icon: <ResumeIcon />,     tone: 'green',  label: 'Résumé',        sub: "L'essentiel" },
  { icon: <FlashcardsIcon />, tone: 'violet', label: 'Flashcards',    sub: 'Pour mémoriser' },
  { icon: <MindmapIcon />,    tone: 'pink',   label: 'Carte mentale', sub: "Vue d'ensemble" },
  { icon: <QuizIcon />,       tone: 'orange', label: 'Quiz',          sub: 'Pour te tester' },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [animDir, setAnimDir] = useState('in');
  const { currentUser, getUserLevel } = useAuth();
  const navigate = useNavigate();
  const prenom = currentUser?.displayName?.split(' ')[0] ?? 'toi';
  const userLevel = getUserLevel();
  const levelLabel = formatLevelLabel(userLevel);
  // Collège : le programme de la classe est prêt, c'est le chemin le plus court.
  // Lycée : on scanne d'abord, le programme montré est celui de 3e.
  const programmePret = hasProgramme(userLevel);
  const classeProgramme = programmePret ? userLevel.classe : '3ème';

  useEffect(() => {
    if (currentUser && localStorage.getItem(`reviz-onboarded-${currentUser.uid}`)) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  function markOnboarded() {
    if (currentUser) localStorage.setItem(`reviz-onboarded-${currentUser.uid}`, '1');
  }

  function handleNext() {
    setAnimDir('out');
    setTimeout(() => {
      setStep(s => Math.min(s + 1, SLIDES.length - 1));
      setAnimDir('in');
    }, 180);
  }

  function finish(to) {
    markOnboarded();
    navigate(to, { replace: to === '/' });
  }

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;
  const mascotPose = slide === 'formats' ? 'hello' : slide === 'how' ? 'scan' : 'fire';

  return (
    <div className="app onboarding-page">
      <header className="onb-top">
        <ol className="onb-progress" aria-label={`Étape ${step + 1} sur ${SLIDES.length}`}>
          {SLIDES.map((id, i) => (
            <li key={id} className={`onb-progress-seg${i <= step ? ' onb-progress-seg--on' : ''}`} aria-current={i === step ? 'step' : undefined} />
          ))}
        </ol>
        {!isLast && (
          <button type="button" className="onb-skip" onClick={() => finish('/')}>
            Passer
          </button>
        )}
      </header>

      <main className={`onb-body onb-anim-${animDir}`} key={slide}>
        <Mascot
          pose={mascotPose}
          size={150}
          glow
          animate={slide !== 'how'}
          priority
        />

        {slide === 'formats' && (
          <>
            <div className="onb-heading">
              <h1 className="onb-title">Salut {prenom}</h1>
              {levelLabel && <span className="rv-pill rv-pill--orange onb-level-chip">{levelLabel}</span>}
              <p className="onb-sub">
                Chaque leçon devient quatre supports de révision. Tu révises avec ceux qui te conviennent.
              </p>
            </div>
            <ul className="rv-card onb-formats">
              {FORMATS.map((f, i) => (
                <li key={f.label} className="onb-format" style={{ animationDelay: `${120 + i * 60}ms` }}>
                  <span className={`rv-icon-square rv-icon-square--${f.tone}`} aria-hidden="true">{f.icon}</span>
                  <span className="onb-format-text">
                    <span className="onb-format-label">{f.label}</span>
                    <span className="onb-format-sub">{f.sub}</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {slide === 'how' && (
          <>
            <div className="onb-heading">
              <h1 className="onb-title">Deux façons de réviser</h1>
              <p className="onb-sub">Sans rien scanner, ou à partir de ta propre leçon.</p>
            </div>
            <ul className="onb-ways">
              <li className="rv-card onb-way" style={{ animationDelay: '120ms' }}>
                <span className="onb-way-art onb-way-art--orange"><Mascot pose="reading" size={56} alt="" aria-hidden="true" /></span>
                <span className="onb-way-text">
                  <span className="onb-way-label">Mon programme</span>
                  <span className="onb-way-sub">
                    {programmePret
                      ? `Les chapitres de ${classeProgramme}, déjà prêts, dans l'ordre de l'année.`
                      : 'Les chapitres de 3ème, déjà prêts. Ta classe arrive bientôt.'}
                  </span>
                </span>
              </li>
              <li className="rv-card onb-way" style={{ animationDelay: '200ms' }}>
                <span className="onb-way-art onb-way-art--violet"><Mascot pose="scanphone" size={56} alt="" aria-hidden="true" /></span>
                <span className="onb-way-text">
                  <span className="onb-way-label">Scanner une leçon</span>
                  <span className="onb-way-sub">Photo ou texte : les quatre supports en quelques secondes.</span>
                </span>
              </li>
            </ul>
          </>
        )}

        {slide === 'go' && (
          <div className="onb-heading">
            <h1 className="onb-title">On commence ?</h1>
            <p className="onb-sub">Chaque révision compte pour ton niveau et ta série de jours.</p>
          </div>
        )}
      </main>

      <footer className="onb-footer">
        {!isLast ? (
          <button type="button" className="rv-btn-cta rv-btn-cta--full onb-next" onClick={handleNext}>
            <span>Continuer</span>
            <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
          </button>
        ) : programmePret ? (
          <>
            <button type="button" className="rv-btn-cta rv-btn-cta--full onb-next" onClick={() => finish('/programme')}>
              <span><BookOpenIcon className="onb-cta-ico" aria-hidden="true" /> Ouvrir mon programme</span>
              <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
            </button>
            <button type="button" className="rv-btn-cta rv-btn-cta--ghost rv-btn-cta--full rv-btn-cta--center onb-secondary" onClick={() => finish('/scan')}>
              <CameraIcon className="onb-cta-ico" aria-hidden="true" /> Scanner une leçon
            </button>
          </>
        ) : (
          <>
            <button type="button" className="rv-btn-cta rv-btn-cta--full onb-next" onClick={() => finish('/scan')}>
              <span><CameraIcon className="onb-cta-ico" aria-hidden="true" /> Scanner ma première leçon</span>
              <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
            </button>
            <button type="button" className="rv-btn-cta rv-btn-cta--ghost rv-btn-cta--full rv-btn-cta--center onb-secondary" onClick={() => finish('/programme')}>
              <BookOpenIcon className="onb-cta-ico" aria-hidden="true" /> Voir le programme de 3ème
            </button>
          </>
        )}
        {isLast && (
          <button type="button" className="rv-btn-ghost onb-home" onClick={() => finish('/')}>
            Voir l'accueil d'abord
          </button>
        )}
      </footer>
    </div>
  );
}
