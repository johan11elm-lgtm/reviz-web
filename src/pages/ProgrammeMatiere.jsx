import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { PageHeader } from '../components/PageHeader';
import { PageIntro } from '../components/PageIntro';
import { Mascot } from '../components/Mascot';
import { loadCatalogue, chapterProgress, openChapter } from '../services/programmeService';
import { ChapterPath } from '../components/ChapterPath';
import { loadLessons } from '../services/historyService';
import { subjectMascot } from '../utils/subjects';
import { hasProgramme, PROGRAMME_FALLBACK } from '../utils/programme';
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
  const [selectedId, setSelectedId] = useState(null);

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
  const items = (entry?.chapitres ?? []).map(ch => ({ chapter: ch, ...chapterProgress(ch, lessons) }));
  const maitrises = items.filter(i => i.state === 'maitrise').length;

  return (
    <div className="app programme-page">
      {/* Retour = revenir en arrière dans l'historique (sinon on empile /programme et le retour boucle entre les deux pages) ; arrivée directe : on remplace par la liste. */}
      <PageHeader variant="back" onBack={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/programme', { replace: true }))} />
      <PageIntro
        title={title || 'Mon programme'}
        sub={entry ? `${classe} · ${count} chapitre${count > 1 ? 's' : ''}, dans l'ordre de l'année` : classe}
        mascot={entry ? subjectMascot(entry.matiere) : 'reading'}
        mascotSize={140}
      />

      <div className="content programme-content programme-content--chemin">
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

        {entry && (
          <div className="programme-path-layout">
            <ChapterPath
              items={items}
              mascot={subjectMascot(entry.matiere)}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onOpen={open}
              onBattle={ch => navigate(`/battle?${new URLSearchParams({ classe, matiere: entry.matiere, chapitre: ch.id })}`)}
              opening={opening}
            />
            <aside className="programme-path-rail" aria-label="Ta progression">
              <div className="rv-card rv-card--padded programme-path-summary">
                <Mascot pose={subjectMascot(entry.matiere)} size={72} alt="" aria-hidden="true" />
                <div className="programme-path-summary-text">
                  <div className="programme-path-summary-title">{entry.matiere}</div>
                  <div className="programme-path-summary-sub">{maitrises} / {count} chapitres maîtrisés</div>
                  <div className="programme-bar" aria-hidden="true"><div className="programme-bar-fill" style={{ width: `${count ? Math.round((maitrises / count) * 100) : 0}%` }} /></div>
                </div>
              </div>
              <div className="rv-card rv-card--padded programme-path-legend">
                <div className="programme-path-legend-title">Comment ça marche</div>
                <p>Avance chapitre par chapitre. Une étape devient verte quand toutes ses cartes sont acquises, orange quand des cartes reviennent à revoir.</p>
                <p>Tu peux ouvrir n'importe quel chapitre, dans l'ordre que tu veux.</p>
              </div>
            </aside>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
