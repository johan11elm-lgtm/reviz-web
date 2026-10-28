import { useEffect, useMemo, useState } from 'react';
import { loadCatalogue, chapterProgress } from '../../services/programmeService';
import { loadLessons } from '../../services/historyService';

const Coche = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

/**
 * Colonne de gauche de la fiche chapitre sur ordinateur, comme la barre latérale des chapitres
 * de l'app Nomad : les chapitres de la matière, le chapitre ouvert cerclé d'orange. Un clic sur
 * un autre chapitre prêt l'ouvre à la place (onOuvrir). Rien pour une leçon scannée ou une
 * entrée trop ancienne (sans classe ni matière).
 */
export function ChapitresMatiere({ lessonId, onOuvrir, ouverture }) {
  const entree = useMemo(() => loadLessons().find(l => l.id === lessonId) ?? null, [lessonId]);
  const [catalogue, setCatalogue] = useState(null);
  useEffect(() => {
    if (!entree?.classe || !entree.matiere) return undefined;
    let vivant = true;
    loadCatalogue(entree.classe).then(c => { if (vivant) setCatalogue(c); }).catch(() => {});
    return () => { vivant = false; };
  }, [entree?.classe, entree?.matiere]);

  const matiere = catalogue?.matieres.find(m => m.matiere === entree?.matiere);
  if (!matiere) return null;
  const lessons = loadLessons();
  return (
    <nav className="nf-chapitres" aria-label={`Chapitres de ${entree.matiere}`}>
      <h2 className="nf-chapitres-titre">{entree.matiere}</h2>
      <ol className="nf-chapitres-liste">
        {matiere.chapitres.map((ch, i) => {
          const actif = ch.id === entree.chapterId;
          const etat = chapterProgress(ch, lessons).state;
          return (
            <li key={ch.id}>
              <button
                type="button"
                className={`nf-chapitre${actif ? ' nf-chapitre--actif' : ''}${etat === 'maitrise' ? ' nf-chapitre--fait' : ''}`}
                aria-current={actif ? 'page' : undefined}
                disabled={!ch.pret || !!ouverture}
                onClick={() => !actif && onOuvrir(entree.classe, entree.matiere, ch)}
              >
                <span className="nf-chapitre-num" aria-hidden="true">{etat === 'maitrise' ? <Coche /> : i + 1}</span>
                <span className="nf-chapitre-nom">{ch.titre}{ch.pret ? '' : ' · bientôt'}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
