import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Mascot } from './Mascot';
import { CheckIcon, RefreshIcon, LockIcon, UsersIcon } from './Icons';
import { CHAPTER_STATE_LABEL } from '../utils/programme';
import { QUESTIONS_PAR_PARTIE } from '../utils/battle';
import './ChapterPath.css';

// Décalage horizontal des étapes, façon sentier qui serpente (en unités de --path-step).
const WAVE = [0, 1, 1.6, 1, 0, -1, -1.6, -1];

// Ton de la pastille d'état (docs/design-grammaire.md §3).
const STATE_TONE = { commence: 'orange', 'a-revoir': 'orange', maitrise: 'green' };

const PERIODE_LABEL = { T1: '1er trimestre', T2: '2e trimestre', T3: '3e trimestre' };

/**
 * Chemin des chapitres d'une matière, façon parcours de jeu : une étape
 * ronde par chapitre, en zigzag, regroupées par trimestre. L'étape à faire
 * (premier chapitre non maîtrisé) est mise en avant avec la mascotte.
 * Toutes les étapes restent ouvertes : c'est un guide, pas un verrou.
 *
 * @param {Array} props.items      [{ chapter, state, dueCards }] dans l'ordre de l'année
 * @param {string} props.mascot    pose de mascotte de la matière
 * @param {string|null} props.selectedId
 * @param {(id: string|null) => void} props.onSelect
 * @param {(chapter) => void} props.onOpen      ouvrir le chapitre (réviser)
 * @param {(chapter) => void} [props.onBattle]  lancer une battle sur le chapitre
 * @param {string|null} props.opening           id en cours d'ouverture
 */
export function ChapterPath({ items, mascot, selectedId, onSelect, onOpen, onBattle, opening }) {
  const currentId = items.find(i => i.chapter.pret && i.state !== 'maitrise')?.chapter.id ?? null;
  const groups = [];
  for (const it of items) {
    const key = it.chapter.periode || 'T1';
    let g = groups.find(x => x.key === key);
    if (!g) { g = { key, items: [] }; groups.push(g); }
    g.items.push(it);
  }

  let index = 0;
  return (
    <div className="chapter-path">
      {groups.map(g => {
        const done = g.items.filter(i => i.state === 'maitrise').length;
        return (
          <section key={g.key} className="chapter-path-unit" aria-label={PERIODE_LABEL[g.key] ?? g.key}>
            <header className="chapter-path-unit-head">
              <span className="chapter-path-unit-title">{PERIODE_LABEL[g.key] ?? g.key}</span>
              <span className="chapter-path-unit-meta">{done} / {g.items.length} maîtrisés</span>
              <span className="chapter-path-unit-bar" aria-hidden="true">
                <span style={{ width: `${Math.round((done / g.items.length) * 100)}%` }} />
              </span>
            </header>
            <PathTrack items={g.items}>
              {g.items.map(it => {
                const i = index++;
                const offset = WAVE[i % WAVE.length];
                return (
                  <PathStep
                    key={it.chapter.id}
                    item={it}
                    offset={offset}
                    isCurrent={it.chapter.id === currentId}
                    isSelected={it.chapter.id === selectedId}
                    mascot={mascot}
                    onSelect={onSelect}
                    onOpen={onOpen}
                    onBattle={onBattle}
                    opening={opening}
                  />
                );
              })}
            </PathTrack>
          </section>
        );
      })}
    </div>
  );
}

// Ton d'un tronçon du sentier : celui de l'étape d'où il part.
function segmentTone(item) {
  if (!item.chapter.pret || item.state === 'nouveau') return 'todo';
  return item.state === 'maitrise' ? 'done' : 'started';
}

/**
 * Liste des étapes d'un trimestre + le sentier qui les relie. Le tracé
 * passe par le centre des ronds, mesurés après rendu : le zigzag vient du
 * CSS (et change de pas selon l'écran), la fiche ouverte pousse les étapes
 * suivantes ; on retrace donc à chaque changement de taille.
 */
function PathTrack({ items, children }) {
  const ref = useRef(null);
  const [geo, setGeo] = useState(null);

  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return undefined;
    const measure = () => {
      const origin = box.getBoundingClientRect();
      const points = [...box.querySelectorAll('.path-step-node')].map(n => {
        const r = n.getBoundingClientRect();
        return { x: r.left - origin.left + r.width / 2, y: r.top - origin.top + r.height / 2 };
      });
      setGeo({ w: origin.width, h: origin.height, points });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    box.querySelectorAll('.path-step').forEach(el => ro.observe(el));
    return () => ro.disconnect();
  }, [items]);

  const segments = [];
  if (geo) {
    for (let i = 0; i < geo.points.length - 1; i++) {
      const a = geo.points[i], b = geo.points[i + 1];
      const dy = (b.y - a.y) / 2;
      segments.push({
        d: `M${a.x} ${a.y} C${a.x} ${a.y + dy} ${b.x} ${b.y - dy} ${b.x} ${b.y}`,
        tone: segmentTone(items[i]),
      });
    }
  }

  return (
    <div className="chapter-path-track" ref={ref}>
      {geo && geo.w > 0 && (
        <svg className="chapter-path-trail" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} aria-hidden="true" focusable="false">
          {segments.map((s, i) => <path key={i} d={s.d} className={`chapter-path-trail-seg chapter-path-trail-seg--${s.tone}`} />)}
        </svg>
      )}
      <ol className="chapter-path-steps">{children}</ol>
    </div>
  );
}

function stepIcon(state, pret) {
  if (!pret) return <LockIcon />;
  if (state === 'maitrise') return <CheckIcon />;
  if (state === 'a-revoir') return <RefreshIcon />;
  return null;
}

function PathStep({ item, offset, isCurrent, isSelected, mascot, onSelect, onOpen, onBattle, opening }) {
  const { chapter, state, dueCards } = item;
  const pret = !!chapter.pret;
  const icon = stepIcon(state, pret);
  const status = !pret ? 'Bientôt' : state === 'a-revoir' ? `${dueCards} à revoir` : CHAPTER_STATE_LABEL[state];
  // La bulle part du côté où il reste de la place.
  const side = offset > 0 ? 'left' : 'right';

  return (
    <li
      className={`path-step path-step--${pret ? state : 'bientot'}${isCurrent ? ' path-step--current' : ''}`}
      style={{ '--offset': offset }}
    >
      {isCurrent && !isSelected && (
        <span className="path-step-cta" aria-hidden="true">{state === 'nouveau' ? 'Commencer' : 'Continuer'}</span>
      )}
      <button
        type="button"
        className="path-step-node"
        disabled={!pret}
        aria-expanded={isSelected}
        aria-label={`${chapter.ordre}. ${chapter.titre} — ${status}`}
        onClick={() => onSelect(isSelected ? null : chapter.id)}
      >
        <span className="path-step-face">
          {icon ?? <span className="path-step-num">{chapter.ordre}</span>}
        </span>
      </button>
      {/* Étiquette accrochée à l'étape : même info que le nom accessible du rond, d'où aria-hidden ; un clic dessus ouvre aussi la fiche. */}
      <span
        className={`path-step-label path-step-label--${side}`}
        aria-hidden="true"
        onClick={pret ? () => onSelect(isSelected ? null : chapter.id) : undefined}
      >
        <span className="path-step-label-meta">
          <span className="path-step-label-num">Chap. {chapter.ordre}</span>
          {(state !== 'nouveau' || !pret) && <span className="path-step-label-status">{status}</span>}
        </span>
        <span className="path-step-label-title">{chapter.titre}</span>
      </span>

      {isCurrent && (
        <Mascot pose={mascot} size={88} alt="" aria-hidden="true" className={`path-step-mascot path-step-mascot--${side}`} />
      )}

      {isSelected && (
        <StepCard
          chapter={chapter}
          status={status}
          state={state}
          onClose={() => onSelect(null)}
          onOpen={() => onOpen(chapter)}
          onBattle={onBattle && chapter.quiz >= QUESTIONS_PAR_PARTIE ? () => onBattle(chapter) : null}
          busy={opening === chapter.id}
        />
      )}
    </li>
  );
}

function StepCard({ chapter, status, state, onClose, onOpen, onBattle, busy }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.querySelector('.path-card-cta')?.focus();
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const cta = busy ? 'Ouverture…' : state === 'nouveau' ? 'Commencer le chapitre' : state === 'maitrise' ? 'Revoir le chapitre' : 'Continuer le chapitre';
  return (
    <div className="path-card" ref={ref} role="dialog" aria-label={chapter.titre}>
      <div className="path-card-top">
        <span className="path-card-num">Chapitre {chapter.ordre}</span>
        <span className={`rv-pill${STATE_TONE[state] ? ` rv-pill--${STATE_TONE[state]}` : ''}`}>{status}</span>
      </div>
      <h3 className="path-card-title">{chapter.titre}</h3>
      <p className="path-card-meta">
        Résumé · {chapter.flashcards} cartes · {chapter.quiz} questions · carte mentale
      </p>
      {chapter.notions?.length > 0 && (
        <div className="path-card-notions">
          <span className="rv-eyebrow">Tu sauras</span>
          <ul className="rv-bullets">
            {chapter.notions.slice(0, 4).map(n => <li key={n}>{n}</li>)}
          </ul>
        </div>
      )}
      <button type="button" className="rv-btn-cta rv-btn-cta--full path-card-cta" onClick={onOpen} disabled={busy}>
        <span>{cta}</span>
        <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
      </button>
      {onBattle && (
        <button type="button" className="rv-btn-cta rv-btn-cta--full rv-btn-cta--ghost rv-btn-cta--center path-card-battle" onClick={onBattle} disabled={busy}>
          <UsersIcon /> Lancer une battle
        </button>
      )}
    </div>
  );
}
