import { useEffect, useRef } from 'react';
import { Mascot } from './Mascot';
import { CheckIcon, RefreshIcon, LockIcon, StarIcon, BookOpenIcon, FlashcardsIcon, QuizIcon } from './Icons';
import { CHAPTER_STATE_LABEL } from '../utils/programme';
import './ChapterPath.css';

// Décalage horizontal des étapes, façon sentier qui serpente (en unités de --path-step).
const WAVE = [0, 1, 1.6, 1, 0, -1, -1.6, -1];

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
 * @param {string|null} props.opening           id en cours d'ouverture
 */
export function ChapterPath({ items, mascot, selectedId, onSelect, onOpen, opening }) {
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
            </header>
            <ol className="chapter-path-steps">
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
                    opening={opening}
                  />
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function stepIcon(state, pret) {
  if (!pret) return <LockIcon />;
  if (state === 'maitrise') return <CheckIcon />;
  if (state === 'a-revoir') return <RefreshIcon />;
  return null;
}

function PathStep({ item, offset, isCurrent, isSelected, mascot, onSelect, onOpen, opening }) {
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
      <span className={`path-step-label path-step-label--${side}`} aria-hidden="true">{chapter.titre}</span>

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
          busy={opening === chapter.id}
        />
      )}
    </li>
  );
}

function StepCard({ chapter, status, state, onClose, onOpen, busy }) {
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
        <span className={`path-card-status path-card-status--${state}`}>{status}</span>
        <span className="path-card-num">Chapitre {chapter.ordre}</span>
      </div>
      <h3 className="path-card-title">{chapter.titre}</h3>
      {chapter.notions?.length > 0 && (
        <ul className="path-card-notions">
          {chapter.notions.slice(0, 4).map(n => <li key={n}><StarIcon />{n}</li>)}
        </ul>
      )}
      <div className="path-card-formats" aria-hidden="true">
        <span><FlashcardsIcon /> {chapter.flashcards} cartes</span>
        <span><QuizIcon /> {chapter.quiz} questions</span>
        <span><BookOpenIcon /> résumé et carte mentale</span>
      </div>
      <button type="button" className="rv-btn-cta rv-btn-cta--full path-card-cta" onClick={onOpen} disabled={busy}>
        <span>{cta}</span>
        <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
      </button>
    </div>
  );
}
