import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mascot } from '../Mascot';
import { restoreLesson } from '../../services/historyService';
import { loadCatalogue, chapterProgress } from '../../services/programmeService';
import { summarizeCards } from '../../services/srsService';
import { subjectMascot } from '../../utils/subjects';

const pluriel = (n, mot, motPluriel = `${mot}s`) => `${n} ${n > 1 ? motPluriel : mot}`;
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const cle = d => new Date(d).toDateString();

function lundiDe(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

// Meilleure série de jours de révision d'affilée.
function meilleureSerie(revisions) {
  const jours = [...new Set(revisions.map(r => { const d = new Date(r.revisedAt); d.setHours(0, 0, 0, 0); return d.getTime(); }))].sort((a, b) => a - b);
  let meilleure = jours.length ? 1 : 0, courante = 1;
  for (let i = 1; i < jours.length; i++) {
    courante = Math.round((jours[i] - jours[i - 1]) / 864e5) === 1 ? courante + 1 : 1;
    meilleure = Math.max(meilleure, courante);
  }
  return meilleure;
}

/** Ma semaine : les révisions jour par jour, du lundi à aujourd'hui, et la meilleure série. */
export function MaSemaine({ revisions }) {
  const auj = new Date();
  const lundi = lundiDe(auj);
  const parJour = {};
  revisions.forEach(r => { parJour[cle(r.revisedAt)] = (parJour[cle(r.revisedAt)] ?? 0) + 1; });
  const jours = JOURS.map((nom, i) => {
    const d = new Date(lundi); d.setDate(lundi.getDate() + i);
    return { nom, n: d > auj ? null : parJour[cle(d)] ?? 0, auj: cle(d) === cle(auj) };
  });
  const max = Math.max(1, ...jours.map(j => j.n ?? 0));
  const cetteSemaine = jours.reduce((s, j) => s + (j.n ?? 0), 0);
  const actifs = jours.filter(j => j.n).length;
  return (
    <div className="mo-carte mo-bloc">
      <div className="mo-bloc-tete"><h2 className="mo-h3">Ma semaine</h2><span>{pluriel(cetteSemaine, 'révision')}</span></div>
      <div className="mo-semaine" role="img" aria-label={`${pluriel(actifs, 'jour')} de révision cette semaine`}>
        {jours.map(j => (
          <span key={j.nom} className={`mo-jour${j.auj ? ' is-auj' : ''}${j.n === null ? ' is-avenir' : ''}`}>
            <span className="mo-jour-piste"><i style={{ height: `${j.n ? Math.max(14, Math.round(j.n / max * 100)) : 0}%` }} /></span>
            <b>{j.auj ? 'Auj.' : j.nom}</b>
          </span>
        ))}
      </div>
      <p className="mo-bloc-pied">Meilleure série : <b>{pluriel(meilleureSerie(revisions), 'jour')}</b></p>
    </div>
  );
}

/** Ma mémoire : où en sont les flashcards (répétition espacée), et par où reprendre. */
export function MaMemoire({ lecons }) {
  const navigate = useNavigate();
  const s = useMemo(() => summarizeCards(lecons), [lecons]);
  const prio = s.lecons.slice(0, 3);
  const pct = n => (s.total ? `${(n / s.total) * 100}%` : '0%');
  const reviser = lecon => { restoreLesson(lecon.id); navigate('/flashcards'); };
  return (
    <section className="mo-carte mo-bloc" aria-labelledby="mo-memoire">
      <div className="mo-bloc-tete"><h2 id="mo-memoire" className="mo-h3">Ma mémoire</h2></div>
      {s.total === 0 ? (
        <div className="mo-memoire-vide">
          <Mascot pose="flashcard" size={64} alt="" aria-hidden="true" />
          <p><b>Pas encore de flashcards</b>Ouvre un chapitre de ton programme : ses cartes arrivent ici.</p>
          <button type="button" className="mo-btn mo-btn--creme" onClick={() => navigate('/programme')}>Mon programme</button>
        </div>
      ) : (
        <>
          <p className="mo-memoire-grand"><b>{s.dues}</b>{s.dues > 1 ? 'cartes à revoir' : 'carte à revoir'} aujourd’hui, sur {s.total}</p>
          <div className="mo-memoire-barre" aria-hidden="true">
            <i className="is-memoire" style={{ width: pct(s.enMemoire) }} />
            <i className="is-revoir" style={{ width: pct(s.aRevoir) }} />
            <i className="is-nouvelles" style={{ width: pct(s.nouvelles) }} />
          </div>
          <ul className="mo-legende">
            <li><i className="is-memoire" />En mémoire <b>{s.enMemoire}</b></li>
            <li><i className="is-revoir" />À revoir <b>{s.aRevoir}</b></li>
            <li><i className="is-nouvelles" />Pas encore vues <b>{s.nouvelles}</b></li>
          </ul>
          {prio.length === 0 ? (
            <p className="mo-bloc-pied">Tout est à jour. Les prochaines cartes reviendront au bon moment.</p>
          ) : (
            <>
              <ul className="mo-prio">
                {prio.map(({ lesson, dues }) => (
                  <li key={lesson.id}>
                    <button type="button" onClick={() => reviser(lesson)} aria-label={`Revoir ${pluriel(dues, 'carte')} de ${lesson.metadata?.title}`}>
                      <Mascot pose={subjectMascot(lesson.metadata?.subject)} size={32} alt="" aria-hidden="true" />
                      <span><b>{lesson.metadata?.title}</b><span>{lesson.metadata?.subject}</span></span>
                      <em>{dues}</em>
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="mo-btn" onClick={() => reviser(prio[0].lesson)}>Réviser maintenant</button>
            </>
          )}
        </>
      )}
    </section>
  );
}

/** Mon programme : l'avancement de chaque matière, en cases ; toucher une matière l'ouvre. */
export function MonProgramme({ classe, lecons }) {
  const navigate = useNavigate();
  const [catalogue, setCatalogue] = useState(null);
  const [erreur, setErreur] = useState(false);
  useEffect(() => {
    let vivant = true;
    setCatalogue(null); setErreur(false);
    loadCatalogue(classe).then(c => { if (vivant) setCatalogue(c); }).catch(() => { if (vivant) setErreur(true); });
    return () => { vivant = false; };
  }, [classe]);
  const matieres = useMemo(() => (catalogue?.matieres ?? []).map(m => {
    const items = m.chapitres.map(ch => ({ chapitre: ch, ...chapterProgress(ch, lecons) }));
    return {
      ...m, items,
      commences: items.filter(i => i.state !== 'nouveau').length,
      maitrises: items.filter(i => i.state === 'maitrise').length,
      aRevoir: items.reduce((n, i) => n + (i.state === 'a-revoir' ? i.dueCards : 0), 0),
    };
  }), [catalogue, lecons]);
  const total = matieres.reduce((n, m) => n + m.items.length, 0);
  const commences = matieres.reduce((n, m) => n + m.commences, 0);
  return (
    <section className="mo-carte mo-bloc" aria-labelledby="mo-programme">
      <div className="mo-bloc-tete"><h2 id="mo-programme" className="mo-h3">Mon programme</h2>{total > 0 && <span>{commences} sur {pluriel(total, 'chapitre')}</span>}</div>
      {erreur ? <p className="mo-bloc-pied">Le programme ne se charge pas pour le moment. Vérifie ta connexion.</p>
        : !catalogue ? <p className="mo-bloc-pied" role="status">Chargement du programme…</p> : (
          <>
            <ul className="mo-matieres">
              {matieres.map(m => {
                const n = m.items.length;
                const detail = m.maitrises ? `${m.maitrises} / ${n} ${m.maitrises > 1 ? 'maîtrisés' : 'maîtrisé'}`
                  : m.commences ? `${m.commences} / ${n} ${m.commences > 1 ? 'commencés' : 'commencé'}` : pluriel(n, 'chapitre');
                return (
                  <li key={m.slug}>
                    <button type="button" onClick={() => navigate(`/programme?matiere=${m.slug}`)}
                      aria-label={`${m.matiere} : ${detail}${m.aRevoir ? `, ${pluriel(m.aRevoir, 'carte')} à revoir` : ''}`}>
                      <Mascot pose={subjectMascot(m.matiere)} size={36} alt="" aria-hidden="true" />
                      <span className="mo-matiere-txt">
                        <span className="mo-matiere-ligne"><b>{m.matiere}</b><span>{detail}</span></span>
                        <span className="mo-cases" aria-hidden="true">
                          {m.items.map(it => <i key={it.chapitre.id} className={`is-${it.chapitre.pret ? it.state : 'bientot'}`} />)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <ul className="mo-legende mo-legende--programme">
              <li><i className="is-commence" />Commencé</li>
              <li><i className="is-a-revoir" />À revoir</li>
              <li><i className="is-maitrise" />Maîtrisé</li>
            </ul>
          </>
        )}
    </section>
  );
}
