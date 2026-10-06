import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { PageHeader } from '../components/PageHeader';
import { PageIntro } from '../components/PageIntro';
import { Mascot } from '../components/Mascot';
import { GuestBanner } from '../components/GuestBanner';
import { loadCatalogue, matiereProgress } from '../services/programmeService';
import { loadLessons } from '../services/historyService';
import { subjectMascot } from '../utils/subjects';
import { hasProgramme, PROGRAMME_FALLBACK } from '../utils/programme';
import './Programme.css';

/**
 * « Mon programme » — réviser sans scan : les matières de la classe de
 * l'élève, avec sa progression chapitre par chapitre. Les contenus sont
 * des fichiers statiques partagés (public/programme), donc disponibles en
 * mode essai comme avec un compte, sans quota ni appel IA.
 */
export default function Programme() {
  const navigate = useNavigate();
  const { getUserLevel, isGuest } = useAuth();
  const level = getUserLevel();
  // Classe affichée : celle de l'élève si son programme est publié, sinon la
  // première disponible (un élève de 4e peut parcourir la 3e en attendant).
  const classe = hasProgramme(level) ? level.classe : PROGRAMME_FALLBACK;
  const autreClasse = !!level?.classe && classe !== level.classe;

  const [catalogue, setCatalogue] = useState(null);
  const [error, setError] = useState(null);
  const lessons = useMemo(() => loadLessons(), []);

  useEffect(() => {
    let alive = true;
    setCatalogue(null);
    setError(null);
    loadCatalogue(classe)
      .then(c => { if (alive) setCatalogue(c); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [classe]);

  const total = catalogue?.matieres.reduce((n, m) => n + m.chapitres.length, 0) ?? 0;

  return (
    <div className="app programme-page">
      <PageHeader
        variant="back"
        onBack={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))}
      />
      <PageIntro
        title="Mon programme"
        sub={catalogue ? `${classe} · ${total} chapitres, à réviser sans scanner` : classe}
        mascot="reading"
      />

      <div className="content programme-content">
        {isGuest && <GuestBanner />}

        {autreClasse && (
          <p className="programme-note">
            Le programme de {level.classe} arrive bientôt. En attendant, voici celui de {classe}.
          </p>
        )}

        {error && (
          <div className="rv-empty-state programme-empty">
            <Mascot pose="confused" size={140} className="rv-empty-state-mascot" alt="" aria-hidden="true" />
            <h2 className="rv-empty-state-title">Programme indisponible</h2>
            <p className="rv-empty-state-sub">Impossible de charger les chapitres pour le moment. Vérifie ta connexion et réessaie.</p>
            <button type="button" className="rv-btn-cta" onClick={() => navigate(0)}>Réessayer</button>
          </div>
        )}

        {!catalogue && !error && (
          <div className="programme-skeleton" role="status" aria-label="Chargement du programme…">
            {[0, 1, 2].map(i => (
              <div key={i} className="rv-card rv-card--padded programme-matiere programme-matiere--skeleton" aria-hidden="true">
                <div className="rv-skeleton rv-skeleton--icon" />
                <div className="programme-matiere-text">
                  <div className="rv-skeleton rv-skeleton--title" />
                  <div className="rv-skeleton rv-skeleton--text" />
                </div>
              </div>
            ))}
          </div>
        )}

        {catalogue && catalogue.matieres.map(m => {
          const p = matiereProgress(m, lessons);
          const pct = p.total ? Math.round((p.commences / p.total) * 100) : 0;
          const meta = [
            `${p.total} chapitre${p.total > 1 ? 's' : ''}`,
            p.commences ? `${p.commences} commencé${p.commences > 1 ? 's' : ''}` : null,
            p.maitrises ? `${p.maitrises} maîtrisé${p.maitrises > 1 ? 's' : ''}` : null,
          ].filter(Boolean).join(' · ');
          return (
            <button
              key={m.slug}
              type="button"
              className="rv-card rv-card--link rv-card--padded programme-matiere"
              onClick={() => navigate(`/programme/${m.slug}`)}
              aria-label={`${m.matiere} : ${meta}`}
            >
              <Mascot pose={subjectMascot(m.matiere)} size={56} alt="" aria-hidden="true" className="programme-matiere-mascot" />
              <div className="programme-matiere-text">
                <div className="programme-matiere-name">{m.matiere}</div>
                <div className="programme-matiere-meta">{meta}</div>
                <div className="programme-bar" aria-hidden="true">
                  <div className="programme-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <span className="programme-chevron" aria-hidden="true">›</span>
            </button>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
