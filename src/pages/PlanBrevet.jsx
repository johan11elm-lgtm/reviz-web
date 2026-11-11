import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { Mascot } from '../components/Mascot';
import { Bloc, TitreDeux, BoutonFleche } from '../components/skin/Skin';
import { CheckIcon } from '../components/Icons';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { loadCatalogue, openChapter } from '../services/programmeService';
import { agendaLocal, chargerAgenda, ajouterControle } from '../services/agendaService';
import { loadRevisions } from '../services/revisionService';
import { mesurer } from '../services/mesure';
import { teinteMatiere } from '../utils/teinteMatiere';
import { joursEntre, jourIso, jourEnClair } from '../utils/agenda';
import { nbsp } from '../utils/typography';
import {
  ECRITS_BREVET, PREMIER_ECRIT, semainesBrevet, chapitresFaits, estFait, etatPlanBrevet, debutPlanBrevet,
} from '../utils/planBrevet';
import './PlanBrevet.css';

const CLASSE = '3ème';
const semaineDu = jour => new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

/**
 * Plan brevet prêt à l'emploi (11/11, repris de Knowunity) : les chapitres des écrits, semaine par
 * semaine jusqu'au 7 juin (utils/planBrevet.js), et les écrits à ajouter à l'agenda, où chacun aura
 * son plan de révision (J-5, J-3, J-1). Pour la 3e.
 */
export default function PlanBrevet() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { currentUser, getUserLevel } = useAuth();
  const uid = currentUser?.uid ?? null;
  const troisieme = getUserLevel()?.classe === CLASSE;
  const aujourdhui = jourIso();
  const [catalogue, setCatalogue] = useState(null);
  const [erreur, setErreur] = useState(false);
  const [agenda, setAgenda] = useState(() => agendaLocal(uid));
  const [ajout, setAjout] = useState(''); // '' | 'en-cours' | 'erreur'
  const [ouverture, setOuverture] = useState(null);

  useEffect(() => { mesurer('plan_brevet', { etape: 'vu' }); }, []);
  useEffect(() => {
    if (!troisieme) return undefined;
    let vivant = true;
    loadCatalogue(CLASSE).then(c => { if (vivant) setCatalogue(c); }).catch(() => { if (vivant) setErreur(true); });
    if (currentUser) chargerAgenda(currentUser).then(a => { if (vivant) setAgenda(a); }).catch(() => {});
    return () => { vivant = false; };
  }, [troisieme, currentUser]);

  const debut = useMemo(() => (uid ? debutPlanBrevet(uid, aujourdhui) : aujourdhui), [uid, aujourdhui]);
  const semaines = useMemo(() => (catalogue ? semainesBrevet(catalogue, debut) : null), [catalogue, debut]);
  const faits = useMemo(() => chapitresFaits(loadRevisions()), []);
  const etat = semaines ? etatPlanBrevet(semaines, faits, aujourdhui) : null;
  const dansAgenda = ECRITS_BREVET.every(e => agenda.controles.some(c => c.brevet && c.date === e.date && c.matiere === e.matiere));
  const jours = joursEntre(aujourdhui, PREMIER_ECRIT);

  async function reviser(c) {
    setOuverture(c.ch.id);
    mesurer('plan_brevet', { etape: 'chapitre', matiere: c.slug });
    try {
      await openChapter(CLASSE, c.matiere, c.ch);
      navigate('/exercices');
    } catch {
      setOuverture(null);
      navigate(`/programme?matiere=${c.slug}`);
    }
  }
  async function ajouterEcrits() {
    if (!currentUser) return;
    setAjout('en-cours');
    try {
      let a = agenda;
      for (const e of ECRITS_BREVET) {
        if (a.controles.some(c => c.brevet && c.date === e.date && c.matiere === e.matiere)) continue;
        a = await ajouterControle(currentUser, { matiere: e.matiere, titre: e.titre, date: e.date, brevet: true });
      }
      setAgenda(a);
      setAjout('');
      mesurer('plan_brevet', { etape: 'agenda' });
    } catch {
      setAjout('erreur');
    }
  }

  const ligne = (c, { rattrapage = false } = {}) => {
    const fait = estFait(faits, c);
    const t = teinteMatiere(c.matiere);
    return (
      <li key={c.ch.id} className={`pb-chap${fait ? ' is-fait' : ''}`}>
        <span className="pb-chap-pastille" style={{ background: t.fond }} aria-hidden="true">{fait ? <CheckIcon /> : null}</span>
        <span className="pb-chap-txt">
          <span className="pb-chap-mat">{c.matiere}{rattrapage ? ' · à rattraper' : ''}</span>
          <b>{nbsp(c.ch.titre)}</b>
        </span>
        {fait ? <span className="pb-chap-fait">Fait</span> : (
          <button type="button" className="pb-chap-btn" onClick={() => reviser(c)} disabled={ouverture === c.ch.id}
            aria-label={`Réviser ${c.ch.titre}`}>{ouverture === c.ch.id ? '…' : 'Réviser'}</button>
        )}
      </li>
    );
  };

  let corps;
  if (!troisieme) {
    corps = (
      <section className="pb-carte">
        <p className="pb-texte">{nbsp('Le plan brevet est fait pour la 3e. Ta classe se change dans Réglages.')}</p>
        <BoutonFleche to="/">Retour à l’accueil</BoutonFleche>
      </section>
    );
  } else if (jours < 0) {
    corps = <section className="pb-carte"><p className="pb-texte">{nbsp('Les écrits du brevet 2027 sont passés. Bravo d’avoir tenu jusque-là.')}</p></section>;
  } else if (erreur) {
    corps = <section className="pb-carte"><p className="pb-texte" role="alert">{nbsp('Le programme n’a pas pu se charger. Vérifie ta connexion, puis réessaie.')}</p></section>;
  } else if (!etat) {
    corps = <section className="pb-carte"><p className="pb-texte">Un instant…</p></section>;
  } else {
    const suivantes = semaines.slice(etat.enCours + 1).filter(s => s.chapitres.length).slice(0, 3);
    corps = (
      <div className="pb-grille">
        <div className="pb-colonne">
          <section className="pb-carte" aria-labelledby="pb-semaine">
            <div className="pb-carte-tete">
              <h2 id="pb-semaine">Cette semaine</h2>
              <span className="pb-carte-sous">{`Semaine du ${semaineDu(etat.semaine.debut)}`}</span>
            </div>
            {etat.semaine.chapitres.length ? (
              <ul className="pb-liste">{etat.semaine.chapitres.map(c => ligne(c))}</ul>
            ) : <p className="pb-aide">{nbsp('Rien de nouveau cette semaine : profites-en pour rattraper, ou refais un chapitre déjà vu.')}</p>}
            {etat.aRattraper.length > 0 && (
              <>
                <h3 className="pb-h3">{etat.aRattraper.length === 1 ? '1 chapitre à rattraper' : `${etat.aRattraper.length} chapitres à rattraper`}</h3>
                <ul className="pb-liste">{etat.aRattraper.slice(0, 3).map(c => ligne(c, { rattrapage: true }))}</ul>
                {etat.aRattraper.length > 3 && <p className="pb-aide">{nbsp(`Et ${etat.aRattraper.length - 3} autres : un par jour, et tu es à jour.`)}</p>}
              </>
            )}
          </section>
          {suivantes.length > 0 && (
            <section className="pb-carte" aria-labelledby="pb-ensuite">
              <div className="pb-carte-tete"><h2 id="pb-ensuite">Les semaines suivantes</h2></div>
              <ul className="pb-semaines">
                {suivantes.map(s => (
                  <li key={s.debut}>
                    <span className="pb-semaines-date">{semaineDu(s.debut)}</span>
                    <span className="pb-semaines-chap">{nbsp(s.chapitres.map(c => c.ch.titre).join(' · '))}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <div className="pb-colonne pb-cote">
          <Bloc fond="encre" className="pb-progres">
            <span className="pb-progres-sur">Ton avancée</span>
            <span className="pb-progres-chiffre"><b>{etat.faits}</b> / {etat.total} {etat.total > 1 ? 'chapitres' : 'chapitre'}</span>
            <span className="pb-barre" aria-hidden="true"><span style={{ width: `${Math.round((100 * etat.faits) / etat.total)}%` }} /></span>
            <span className="pb-progres-sous">{nbsp('Un chapitre compte dès que tu l’as travaillé, en exercices, quiz ou cartes.')}</span>
          </Bloc>
          <section className="pb-carte" aria-labelledby="pb-ecrits">
            <div className="pb-carte-tete"><h2 id="pb-ecrits">Les écrits</h2></div>
            <ul className="pb-ecrits">
              {ECRITS_BREVET.map(e => (
                <li key={e.id}>
                  <span className="pb-ecrit-date">{jourEnClair(e.date)}</span>
                  <span className="pb-ecrit-txt"><b>{e.epreuve}</b><span>{e.horaire}</span></span>
                </li>
              ))}
            </ul>
            {dansAgenda ? (
              <p className="pb-ok"><CheckIcon /> {nbsp('Dans ton agenda : chaque épreuve aura son plan de révision.')}</p>
            ) : (
              <>
                <button type="button" className="pb-btn" onClick={ajouterEcrits} disabled={ajout === 'en-cours' || !currentUser}>
                  {ajout === 'en-cours' ? 'Ajout…' : 'Ajouter à mon agenda'}
                </button>
                <p className="pb-aide">{nbsp('Chaque épreuve aura son plan de révision, les derniers jours.')}</p>
              </>
            )}
            {ajout === 'erreur' && <p className="pb-erreur" role="alert">{nbsp('L’ajout n’a pas marché. Réessaie dans un instant.')}</p>}
          </section>
          <BoutonFleche to="/simulateur-brevet" teinte="contour">Simuler ma note</BoutonFleche>
        </div>
      </div>
    );
  }

  return (
    <div className={`app pb-page${isDesktop ? ' pb-page--large' : ''}`}>
      <div className="content pb-defile">
        <Bloc fond="lavande" as="header" className="pb-entete">
          <div className="pb-entete-txt">
            <span className="pb-surtitre">{jours >= 0 ? `Brevet 2027 · J-${jours}` : 'Brevet 2027'}</span>
            <TitreDeux as="h1" leger="Ton plan" fort="jusqu’au brevet" />
            <p className="pb-chapo">{nbsp(etat
              ? `${etat.total} ${etat.total > 1 ? 'chapitres' : 'chapitre'} des écrits, quelques-uns chaque semaine jusqu’au 7 juin. Ensuite, tu révises chaque épreuve dans l’agenda.`
              : 'Les chapitres des écrits, quelques-uns chaque semaine jusqu’au 7 juin.')}</p>
          </div>
          <Mascot pose="graduation" size={isDesktop ? 170 : 110} alt="" aria-hidden="true" className="pb-mascotte" priority />
        </Bloc>
        {corps}
      </div>
      <BottomNav />
    </div>
  );
}
