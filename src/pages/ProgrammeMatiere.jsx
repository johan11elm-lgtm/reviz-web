import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { PageHeader } from '../components/PageHeader';
import { PageIntro } from '../components/PageIntro';
import { Mascot } from '../components/Mascot';
import { loadCatalogue, chapterProgress, openChapter } from '../services/programmeService';
import { loadLessons } from '../services/historyService';
import { subjectMascot } from '../utils/subjects';
import { hasProgramme, PROGRAMME_FALLBACK, CHAPTER_STATE_LABEL } from '../utils/programme';
import './Programme.css';

/**
 * Les chapitres d'une matière, dans l'ordre de l'année, avec l'état de
 * l'élève sur chacun. Ouvrir un chapitre le charge comme une leçon
 * (reviz-ai-data + historique) puis mène au choix des formats (/analyse).
 */
export default function ProgrammeMatiere() {
  const { matiere: slug } = useParams();
  const navigate = useNavigate();
  const { getUserLevel } = useAuth();
  const level = getUserLevel();
  const classe = hasProgramme(level) ? level.classe : PROGRAMME_FALLBACK;

  const [catalogue, setCatalogue] = useState(null);
  const [error, setError] = useState(null);      // 'catalogue' | 'chapitre'
  const [opening, setOpening] = useState(null);  // id du chapitre en cours d'ouverture
  const [lessons] = useState(() => loadLessons());

  useEffect(() => {
    let alive = true;
    loadCatalogue(classe)
      .then(c => { if (alive) setCatalogue(c); })
      .catch(() => { if (alive) setError('catalogue'); });
    return () => { alive = false; };
  }, [classe]);

  const entry = catalogue?.matieres.find(m => m.slug === slug) ?? null;

  async function open(ch) {
    if (!ch.pret || opening) return;
    setOpening(ch.id);
    setError(null);
    try {
      await openChapter(classe, entry.matiere, ch);
      navigate('/analyse');
    } catch {
      setError('chapitre');
      setOpening(null);
    }
  }

  const title = entry?.matiere ?? (catalogue ? 'Matière inconnue' : '');
  const count = entry?.chapitres.length ?? 0;

  return (
    <div className="app programme-page">
      <PageHeader variant="back" onBack={() => navigate('/programme')} />
      <PageIntro
        title={title || 'Mon programme'}
        sub={entry ? `${classe} · ${count} chapitre${count > 1 ? 's' : ''}, dans l'ordre de l'année` : classe}
        mascot={entry ? subjectMascot(entry.matiere) : 'reading'}
        mascotSize={140}
      />

      <div className="content programme-content programme-content--liste">
        {error === 'chapitre' && (
          <div className="rv-callout rv-callout--orange programme-callout" role="alert">
            Ce chapitre n'a pas pu être chargé. Vérifie ta connexion et réessaie.
          </div>
        )}

        {error === 'catalogue' && (
          <div className="rv-empty-state programme-empty">
            <Mascot pose="confused" size={140} className="rv-empty-state-mascot" alt="" aria-hidden="true" />
            <h2 className="rv-empty-state-title">Programme indisponible</h2>
            <p className="rv-empty-state-sub">Impossible de charger les chapitres pour le moment.</p>
            <button type="button" className="rv-btn-cta" onClick={() => navigate(0)}>Réessayer</button>
          </div>
        )}

        {catalogue && !entry && (
          <div className="rv-empty-state programme-empty">
            <Mascot pose="search" size={140} className="rv-empty-state-mascot" alt="" aria-hidden="true" />
            <h2 className="rv-empty-state-title">Matière introuvable</h2>
            <button type="button" className="rv-btn-cta" onClick={() => navigate('/programme')}>Voir mon programme</button>
          </div>
        )}

        {entry && entry.chapitres.map(ch => {
          const { state, dueCards } = chapterProgress(ch, lessons);
          const busy = opening === ch.id;
          const pill = busy
            ? 'Ouverture…'
            : !ch.pret
              ? 'Bientôt'
              : state === 'a-revoir'
                ? `${dueCards} à revoir`
                : CHAPTER_STATE_LABEL[state];
          return (
            <button
              key={ch.id}
              type="button"
              className={`rv-card rv-card--link rv-card--padded programme-chapitre programme-chapitre--${state}${ch.pret ? '' : ' programme-chapitre--bientot'}`}
              disabled={!ch.pret || (!!opening && !busy)}
              aria-busy={busy || undefined}
              onClick={() => open(ch)}
            >
              <span className="programme-chapitre-num" aria-hidden="true">{ch.ordre}</span>
              <div className="programme-chapitre-text">
                <div className="programme-chapitre-title">{ch.titre}</div>
                {ch.notions?.length > 0 && (
                  <div className="programme-chapitre-notions">{ch.notions.slice(0, 3).join(' · ')}</div>
                )}
              </div>
              <span className={`programme-chapitre-state programme-chapitre-state--${ch.pret ? state : 'bientot'}`}>{pill}</span>
            </button>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
