import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { Mascot } from '../components/Mascot';
import { GuestBanner } from '../components/GuestBanner';
import { loadCatalogue, chapterProgress } from '../services/programmeService';
import { loadLessons, restoreLesson } from '../services/historyService';
import { track } from '../services/statsService';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { subjectMascot } from '../utils/subjects';
import { hasProgramme, PROGRAMME_CLASSES, PROGRAMME_FALLBACK } from '../utils/programme';
import './Programme.css';

/**
 * « Programme » (refonte du 20/10) — réviser sans scan : les matières de la classe de
 * l'élève, avec sa progression chapitre par chapitre. Les contenus sont
 * des fichiers statiques partagés (public/programme), donc disponibles en
 * mode essai comme avec un compte, sans quota ni appel IA.
 */
const PASTELS = ['#FFD7BE', '#E4E0FA', '#FFE6D2', '#DCF5E6', '#FFD9E4', '#E4E0FA', '#FFE6D2', '#DCF5E6'];
const court = c => c.replace('ème', 'e');

export default function Programme() {
  const navigate = useNavigate();
  const { getUserLevel, isGuest } = useAuth();
  const isDesktop = useIsDesktop();
  const level = getUserLevel();
  // Classe de l'élève si son programme est publié, sinon la 3e (lycée). Il
  // peut parcourir une autre classe sans changer la sienne.
  const classeEleve = hasProgramme(level) ? level.classe : PROGRAMME_FALLBACK;
  const [classe, setClasse] = useState(classeEleve);
  const autreClasse = !!level?.classe && !hasProgramme(level);
  const [choix, setChoix] = useState(false);

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

  const matieres = useMemo(() => (catalogue?.matieres ?? []).map((m, i) => {
    const items = m.chapitres.map(ch => ({ chapter: ch, ...chapterProgress(ch, lessons) }));
    return {
      ...m,
      items,
      fond: PASTELS[i % PASTELS.length],
      commences: items.filter(i => i.state !== 'nouveau').length,
      maitrises: items.filter(i => i.state === 'maitrise').length,
      aRevoir: items.reduce((n, i) => n + (i.state === 'a-revoir' ? i.dueCards : 0), 0),
    };
  }), [catalogue, lessons]);
  const total = matieres.reduce((n, m) => n + m.items.length, 0);

  // « À reprendre » : le dernier chapitre ouvert de cette classe.
  const reprise = useMemo(() => {
    for (const l of lessons) {
      if (l.source !== 'programme' || (l.classe && l.classe !== classe)) continue;
      const m = matieres.find(x => x.items.some(it => it.lesson?.id === l.id));
      if (!m) continue;
      const it = m.items.find(x => x.lesson?.id === l.id);
      return { lesson: l, m, it };
    }
    return null;
  }, [lessons, matieres, classe]);
  const scannees = lessons.filter(l => l.source !== 'programme').length;

  const selecteur = isDesktop ? (
    <div className="prg-classes" role="radiogroup" aria-label="Classe">
      {PROGRAMME_CLASSES.map(c => (
        <button key={c} type="button" role="radio" aria-checked={c === classe}
          className={`prg-classe${c === classe ? ' prg-classe--on' : ''}`} onClick={() => setClasse(c)}>{court(c)}</button>
      ))}
    </div>
  ) : (
    <div className="prg-choix">
      <button type="button" className="prg-choix-btn" aria-expanded={choix} aria-haspopup="listbox" onClick={() => setChoix(v => !v)}>
        {court(classe)} <span aria-hidden="true">▾</span>
      </button>
      {choix && (
        <ul className="prg-choix-liste" role="listbox" aria-label="Classe">
          {PROGRAMME_CLASSES.map(c => (
            <li key={c} role="option" aria-selected={c === classe}>
              <button type="button" onClick={() => { setClasse(c); setChoix(false); }}>{c}{c === classeEleve ? ' · ta classe' : ''}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="app app--no-halo programme-page prg-page">
      <div className="content programme-content prg-content">
        <div className="prg-tete">
          <h1 className="prg-titre">Programme</h1>
          {selecteur}
        </div>

        {isGuest && <GuestBanner />}

        {autreClasse && classe === classeEleve && (
          <p className="programme-note">
            Le programme de {level.classe} arrive bientôt. En attendant, voici celui de {classe}.
          </p>
        )}

        {reprise && (
          <button
            type="button"
            className="prg-reprise"
            onClick={() => { restoreLesson(reprise.lesson.id); navigate('/analyse'); }}
          >
            <span className="prg-reprise-rond" aria-hidden="true" />
            <span className="prg-grain" aria-hidden="true" />
            <Mascot pose={subjectMascot(reprise.m.matiere)} size={isDesktop ? 240 : 150} alt="" aria-hidden="true" className="prg-reprise-mascotte" />
            <span className="prg-reprise-txt">
              <span className="prg-surtitre">À reprendre</span>
              <span className="prg-reprise-titre">{reprise.it.chapter.titre}</span>
              <span className="prg-reprise-meta">
                {reprise.m.matiere} · {reprise.it.dueCards > 0 ? `${reprise.it.dueCards} carte${reprise.it.dueCards > 1 ? 's' : ''} à travailler` : reprise.it.state === 'maitrise' ? 'Maîtrisé' : 'Commencé'}
              </span>
              <span className="prg-reprise-btn">Reprendre</span>
            </span>
          </button>
        )}

        {error && (
          <div className="rv-empty-state programme-empty">
            <Mascot pose="confused" size={140} className="rv-empty-state-mascot" alt="" aria-hidden="true" />
            <h2 className="rv-empty-state-title">Programme indisponible</h2>
            <p className="rv-empty-state-sub">Impossible de charger les chapitres pour le moment. Vérifie ta connexion et réessaie.</p>
            <button type="button" className="rv-btn-cta" onClick={() => navigate(0)}>Réessayer</button>
          </div>
        )}

        {!error && (
          <>
            <div className="prg-sous-tete">
              <h2 className="prg-titre2">Tes matières</h2>
              {catalogue && <span className="prg-compte">{matieres.length} matières · {total} chapitres</span>}
            </div>
            {!catalogue ? (
              <div className="prg-liste" role="status" aria-label="Chargement du programme…">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="prg-matiere" aria-hidden="true">
                    <div className="rv-skeleton rv-skeleton--icon" />
                    <div className="rv-skeleton rv-skeleton--title" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="prg-liste">
                {matieres.map(m => <MatiereRangee key={m.slug} m={m} onOpen={() => navigate(`/programme/${m.slug}`)} isDesktop={isDesktop} />)}
              </div>
            )}
          </>
        )}

        {!isGuest && (
          <Link to="/cours" className="prg-scans">
            <span className="prg-scans-rond" aria-hidden="true"><Mascot pose="scanphone" size={44} alt="" /></span>
            <span className="prg-scans-txt">
              <span className="prg-scans-titre">Tes leçons scannées</span>
              <span className="prg-scans-meta">{scannees ? `${scannees} leçon${scannees > 1 ? 's' : ''}` : 'Une photo de ton cahier, et Réviz prépare tout'}</span>
            </span>
            <span className="prg-fleche" aria-hidden="true">›</span>
          </Link>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

/**
 * Une matière : mascotte sur son aplat, état en une pastille (grammaire §3),
 * barre des chapitres maîtrisés.
 */
function MatiereRangee({ m, onOpen, isDesktop }) {
  const total = m.items.length;
  const fini = total > 0 && m.maitrises === total;
  let pill;
  if (m.aRevoir) pill = <span className="rv-pill rv-pill--orange">{m.aRevoir} à travailler</span>;
  else if (fini) pill = <span className="rv-pill rv-pill--green">Maîtrisé</span>;
  else if (m.maitrises) pill = <span className="rv-pill rv-pill--green">{m.maitrises} maîtrisé{m.maitrises > 1 ? 's' : ''}</span>;
  else if (m.commences) pill = <span className="rv-pill rv-pill--orange">Commencé</span>;
  else pill = <span className="rv-pill">À découvrir</span>;
  const pct = total ? Math.max(4, Math.round((m.maitrises / total) * 100)) : 0;
  const vert = m.maitrises > 0 && !m.aRevoir && m.commences === m.maitrises;

  return (
    <button
      type="button"
      className="prg-matiere"
      onClick={onOpen}
      aria-label={`${m.matiere} : ${m.maitrises} sur ${total} chapitres maîtrisés`}
    >
      <span className="prg-matiere-rond" style={{ background: m.fond }} aria-hidden="true">
        <Mascot pose={subjectMascot(m.matiere)} size={isDesktop ? 56 : 50} alt="" />
      </span>
      <span className="prg-matiere-txt">
        <span className="prg-matiere-haut">
          <span className="prg-matiere-nom">{m.matiere}</span>
          {pill}
        </span>
        <span className="prg-barre" aria-hidden="true"><span style={{ width: `${pct}%`, background: vert ? '#34C77B' : '#1B1A23' }} /></span>
        <span className="prg-matiere-meta">{`${m.maitrises} / ${total} ${isDesktop ? 'maîtrisés' : 'chapitres maîtrisés'}`}</span>
      </span>
    </button>
  );
}
