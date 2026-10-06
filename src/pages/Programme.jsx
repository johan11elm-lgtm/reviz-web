import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { PageHeader } from '../components/PageHeader';
import { PageIntro } from '../components/PageIntro';
import { Mascot } from '../components/Mascot';
import { GuestBanner } from '../components/GuestBanner';
import { CheckIcon, RefreshIcon } from '../components/Icons';
import { loadCatalogue, chapterProgress } from '../services/programmeService';
import { loadLessons } from '../services/historyService';
import { track } from '../services/statsService';
import { useIsDesktop } from '../hooks/useMediaQuery';
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

  useEffect(() => { track('programme_ouvert', { classe }); }, [classe]);

  useEffect(() => {
    let alive = true;
    setCatalogue(null);
    setError(null);
    loadCatalogue(classe)
      .then(c => { if (alive) setCatalogue(c); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [classe]);

  // État de chaque chapitre, calculé une fois par matière (tuiles et sous-titre).
  const matieres = useMemo(() => (catalogue?.matieres ?? []).map(m => {
    const items = m.chapitres.map(ch => ({ chapter: ch, ...chapterProgress(ch, lessons) }));
    return {
      ...m,
      items,
      commences: items.filter(i => i.state !== 'nouveau').length,
      maitrises: items.filter(i => i.state === 'maitrise').length,
      aRevoir: items.reduce((n, i) => n + (i.state === 'a-revoir' ? i.dueCards : 0), 0),
      // Même repère que le chemin de la matière : le premier chapitre non maîtrisé.
      prochain: items.find(i => i.chapter.pret && i.state !== 'maitrise') ?? null,
    };
  }), [catalogue, lessons]);
  const total = matieres.reduce((n, m) => n + m.items.length, 0);
  const commences = matieres.reduce((n, m) => n + m.commences, 0);
  // 8 matières → 4 colonnes sur ordinateur, 6 (en 6e) → 3 : jamais de trou en fin de grille.
  const cols = matieres.length % 4 === 0 ? 4 : matieres.length % 3 === 0 ? 3 : 4;

  return (
    <div className="app programme-page">
      <PageHeader
        variant="back"
        onBack={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))}
        className="rv-page-header--racine"
      />
      <PageIntro
        title="Mon programme"
        sub={!catalogue ? classe
          : commences ? `${classe} · ${commences} chapitre${commences > 1 ? 's' : ''} commencé${commences > 1 ? 's' : ''} sur ${total}`
          : `${classe} · ${total} chapitres, à réviser sans scanner`}
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
          <div className="programme-grid" role="status" aria-label="Chargement du programme…">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="rv-card programme-matiere programme-matiere--skeleton" aria-hidden="true">
                <div className="rv-skeleton rv-skeleton--icon" />
                <div className="rv-skeleton rv-skeleton--title" />
                <div className="rv-skeleton rv-skeleton--text" />
              </div>
            ))}
          </div>
        )}

        {catalogue && (
          <div className="programme-grid" style={{ '--programme-cols': cols }}>
            {matieres.map(m => <MatiereTile key={m.slug} m={m} onOpen={() => navigate(`/programme/${m.slug}`)} />)}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

/**
 * Tuile d'une matière : mascotte, avancement en une phrase, une encoche par
 * chapitre (même code couleur que le chemin), et sur ordinateur la
 * prochaine étape. Les cartes à revoir passent devant le reste.
 */
function MatiereTile({ m, onOpen }) {
  const isDesktop = useIsDesktop();
  const total = m.items.length;
  const fini = total > 0 && m.maitrises === total;
  const label = [
    `${total} chapitre${total > 1 ? 's' : ''}`,
    m.commences ? `${m.commences} commencé${m.commences > 1 ? 's' : ''}` : null,
    m.maitrises ? `${m.maitrises} maîtrisé${m.maitrises > 1 ? 's' : ''}` : null,
    m.aRevoir ? `${m.aRevoir} carte${m.aRevoir > 1 ? 's' : ''} à revoir` : null,
  ].filter(Boolean).join(' · ');

  let status;
  if (m.aRevoir) {
    status = <span className="programme-matiere-status programme-matiere-status--revoir"><RefreshIcon />{m.aRevoir} carte{m.aRevoir > 1 ? 's' : ''} à revoir</span>;
  } else if (fini) {
    status = <span className="programme-matiere-status programme-matiere-status--fini"><CheckIcon />Tout maîtrisé</span>;
  } else if (m.maitrises) {
    // Même repère que le rail de la page matière : les chapitres maîtrisés.
    status = <span className="programme-matiere-status">{m.maitrises} / {total} maîtrisé{m.maitrises > 1 ? 's' : ''}</span>;
  } else if (m.commences) {
    status = <span className="programme-matiere-status">{m.commences} / {total} commencé{m.commences > 1 ? 's' : ''}</span>;
  } else {
    status = <span className="programme-matiere-status">{total} chapitre{total > 1 ? 's' : ''}</span>;
  }

  return (
    <button
      type="button"
      className="rv-card rv-card--link programme-matiere"
      onClick={onOpen}
      aria-label={`${m.matiere} : ${label}`}
    >
      <Mascot pose={subjectMascot(m.matiere)} size={isDesktop ? 84 : 64} alt="" aria-hidden="true" className="programme-matiere-mascot" />
      <span className="programme-matiere-name">{m.matiere}</span>
      {status}
      <span className="programme-strip" aria-hidden="true">
        {m.items.map(it => (
          <span key={it.chapter.id} className={`programme-strip-seg programme-strip-seg--${it.chapter.pret ? it.state : 'bientot'}`} />
        ))}
      </span>
      {m.prochain && (
        <span className="programme-matiere-next">
          <span className="programme-matiere-next-label">Prochaine étape</span>
          <span className="programme-matiere-next-title">{m.prochain.chapter.titre}</span>
        </span>
      )}
    </button>
  );
}
