import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mascot } from './Mascot';
import { openChapter } from '../services/programmeService';
import { loadRevisions } from '../services/revisionService';
import { mesurer } from '../services/mesure';
import { jourIso } from '../utils/agenda';
import { nbsp } from '../utils/typography';
import { semainesBrevet, chapitresFaits, estFait, etatPlanBrevet, debutPlanBrevet } from '../utils/planBrevet';
import './LignePlanBrevet.css';

const CLASSE = '3ème';
const chapitres = n => (n === 1 ? '1 chapitre' : `${n} chapitres`);

/** Ce que dit la ligne : la semaine en cours, et ce qu'il reste à rattraper. */
export function resumePlanBrevet(etat, faits) {
  const semaine = etat.semaine.chapitres;
  const faitsSemaine = semaine.filter(c => estFait(faits, c)).length;
  const morceaux = [];
  if (semaine.length) {
    morceaux.push(faitsSemaine === semaine.length
      ? `Semaine bouclée : ${faitsSemaine} sur ${semaine.length}`
      : `Cette semaine : ${faitsSemaine} sur ${chapitres(semaine.length)}`);
  }
  if (etat.aRattraper.length) morceaux.push(`${chapitres(etat.aRattraper.length)} à rattraper`);
  if (!morceaux.length) morceaux.push('Rien de nouveau cette semaine');
  return morceaux.join(' · ');
}

/** Le chapitre à proposer : d'abord le retard, puis la semaine, puis l'avance sur les suivantes. */
export function chapitreSuivant(semaines, etat, faits) {
  const pasFait = c => !estFait(faits, c);
  return etat.aRattraper[0]
    ?? etat.semaine.chapitres.find(pasFait)
    ?? semaines.slice(etat.enCours + 1).flatMap(s => s.chapitres).find(pasFait)
    ?? null;
}

/**
 * Accueil de la 3e (11/11) : le plan brevet en une carte, juste sous « On fait quoi
 * aujourd'hui ? » (sur ordinateur, dans la colonne de droite). La semaine en cours, le retard, et
 * le prochain chapitre en un bouton. La grande carte reste dans « À la une ».
 */
export function LignePlanBrevet({ catalogue, classe }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth() ?? {};
  const [ouverture, setOuverture] = useState(false);
  const uid = currentUser?.uid ?? null;
  const aujourdhui = jourIso();
  const pret = classe === CLASSE && catalogue?.matieres?.length > 0;

  const plan = useMemo(() => {
    if (!pret) return null;
    const semaines = semainesBrevet(catalogue, uid ? debutPlanBrevet(uid, aujourdhui) : aujourdhui);
    const faits = chapitresFaits(loadRevisions());
    const etat = etatPlanBrevet(semaines, faits, aujourdhui);
    return { etat, resume: resumePlanBrevet(etat, faits), suivant: chapitreSuivant(semaines, etat, faits) };
  }, [pret, catalogue, uid, aujourdhui]);
  if (!plan || !plan.etat.total) return null;

  const { etat, resume, suivant } = plan;
  async function reviser() {
    if (!suivant) return;
    setOuverture(true);
    mesurer('plan_brevet', { etape: 'chapitre', matiere: suivant.slug, lieu: 'accueil' });
    try {
      await openChapter(CLASSE, suivant.matiere, suivant.ch);
      navigate('/exercices');
    } catch {
      setOuverture(false);
      navigate(`/programme?matiere=${suivant.slug}`);
    }
  }

  return (
    <section className="lpb" aria-labelledby="lpb-titre">
      <span className="lpb-ico" aria-hidden="true"><Mascot pose="examen" size={40} alt="" /></span>
      <span className="lpb-txt">
        <Link to="/plan-brevet" id="lpb-titre" className="lpb-titre">Ton plan brevet</Link>
        <span className={`lpb-resume${etat.aRattraper.length ? ' lpb-resume--retard' : ''}`}>{nbsp(resume)}</span>
      </span>
      <span className="lpb-barre" role="progressbar" aria-label="Chapitres du plan faits"
        aria-valuemin={0} aria-valuemax={etat.total} aria-valuenow={etat.faits}>
        <span style={{ width: `${Math.round((100 * etat.faits) / etat.total)}%` }} />
      </span>
      {suivant ? (
        <button type="button" className="lpb-btn" onClick={reviser} disabled={ouverture}>
          <span className="lpb-btn-sur">{ouverture ? 'Ouverture…' : 'Réviser'}</span>
          <span className="lpb-btn-ch">{nbsp(suivant.ch.titre)}</span>
        </button>
      ) : (
        <Link to="/plan-brevet" className="lpb-btn lpb-btn--lien">Voir le plan</Link>
      )}
    </section>
  );
}
