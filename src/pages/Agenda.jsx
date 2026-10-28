import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { Mascot } from '../components/Mascot';
import { AjoutControle, couleursMatiere } from '../components/AjoutControle';
import { PlanRevision } from '../components/PlanRevision';
import { preparerQuizErreurs } from '../services/erreursService';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { track } from '../services/statsService';
import {
  agendaLocal, chargerAgenda, ajouterControle, supprimerControle, marquerEtape, relierPronote, delierPronote,
  chargerCours, coursEnCache, messageErreurPronote,
} from '../services/agendaService';
import {
  controlesAVenir, matiereControle, matiereDuCours, nomDuCours, detailDuCours,
  jourIso, lundiDe, ajouterJours, joursDeLaSemaine, joursEntre, jourEnClair, jourCourt, heure,
} from '../utils/agenda';
import { estLienDemo } from '../utils/edtDemo';
import '../components/reviz/HerosMatiere.css';
import './Agenda.css';

const majuscule = t => t.charAt(0).toUpperCase() + t.slice(1);
const heureEnClair = debut => heure(debut).replace(/^0/, '').replace('h', ' h ').replace(/ 00$/, '').replace(/ h $/, ' h');

const Plus = ({ taille = 20 }) => (
  <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
);
const Croix = ({ taille = 16 }) => (
  <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
);
const Fleche = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
const Chevron = ({ sens = 'g' }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={sens === 'g' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} /></svg>
);
const Cloche = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" /></svg>
);

/** Compte à rebours : « J-3 », « Demain », « Aujourd'hui » (héros) ; « Dans 9 jours » (liste). */
const rebours = (n, court) => (n <= 0 ? 'Aujourd’hui' : n === 1 ? 'Demain' : court ? `J-${n}` : `Dans ${n} jours`);
const titreControle = c => [matiereControle(c.matiere).slug === 'autre' ? 'Contrôle' : matiereControle(c.matiere).label, c.titre].filter(Boolean).join(' · ');
const deMatiere = c => {
  const m = matiereControle(c.matiere);
  if (m.slug === 'autre') return 'Contrôle';
  const nom = m.label === m.label.toUpperCase() ? m.label : m.label.toLowerCase();
  return /^[aeiouyhé]/i.test(nom) ? `Contrôle d’${nom}` : `Contrôle de ${nom}`;
};

/** Ce que dit Réviz selon l'urgence du prochain contrôle. */
function bulle(prochain, n) {
  if (!prochain) return { lignes: ['Note tes contrôles ici.', 'Je te les rappelle la veille.'], humeur: 'content' };
  if (n <= 0) return { lignes: ['C’est aujourd’hui.', 'Un dernier coup d’œil ?'], humeur: 'determine' };
  if (n === 1) return { lignes: ['C’est demain.', 'Une dernière révision rapide ?'], humeur: 'reflechit' };
  const quand = n <= 6 ? jourEnClair(prochain.date).split(' ')[0] : `le ${jourEnClair(prochain.date).split(' ').slice(1).join(' ')}`;
  return { lignes: [`${deMatiere(prochain)} ${quand}.`, 'On s’y met ce soir ?'], humeur: 'content' };
}

/**
 * Agenda (handoff Claude Design du 21/10, en-tête façon app Nomad le 29/10) : ne pas se faire
 * surprendre par un contrôle. Ce que dit Réviz dans le bloc lavande, le prochain contrôle avec
 * son compte à rebours et son plan,
 * les contrôles suivants, puis l'emploi du temps Pronote semaine par semaine (un jour à la
 * fois sur téléphone, la semaine en grille horaire sur ordinateur). Pronote n'exporte que
 * l'emploi du temps : les contrôles, c'est l'élève qui les note.
 */
export default function Agenda() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { currentUser, isGuest, hasRevizPlus } = useAuth();
  const [agenda, setAgenda] = useState(() => agendaLocal(currentUser?.uid));
  const [ajout, setAjout] = useState(null); // null | { matiere?, date? }
  const [toast, setToast] = useState(null); // { texte, annuler? }
  const minuteur = useRef(null);

  useEffect(() => { track('agenda_ouvert'); }, []);
  useEffect(() => {
    let vivant = true;
    chargerAgenda(currentUser).then(a => { if (vivant) setAgenda(a); });
    return () => { vivant = false; };
  }, [currentUser]);
  const montrer = (texte, annuler) => {
    clearTimeout(minuteur.current);
    setToast({ texte, annuler });
    minuteur.current = setTimeout(() => setToast(null), 4000);
  };
  useEffect(() => () => clearTimeout(minuteur.current), []);

  const aujourdhui = jourIso();
  const aVenir = controlesAVenir(agenda.controles, aujourdhui);
  const [prochain, ...suite] = aVenir;
  const n = prochain ? joursEntre(aujourdhui, prochain.date) : 0;
  const { lignes } = bulle(prochain, n);
  const c = prochain ? couleursMatiere(prochain.matiere) : null;

  function reviser(ctrl) {
    track('agenda_reviser', { matiere: ctrl.matiere });
    navigate(ctrl.matiere === 'autre' ? '/cours' : `/programme?matiere=${ctrl.matiere}`);
  }
  // Une étape du plan lancée compte comme faite (le jour même) : l'élève révise le chapitre.
  // Le quiz sur les points ratés (J-3) ouvre les questions ratées de la matière, s'il y en a.
  async function lancerEtape(ctrl, etape) {
    track('agenda_plan_etape', { matiere: ctrl.matiere, etape: etape.id });
    setAgenda(await marquerEtape(currentUser, ctrl.id, etape.id));
    if (etape.id === 'quiz' && preparerQuizErreurs(currentUser?.uid, ctrl.matiere)) navigate('/quiz?erreurs=1');
    else reviser(ctrl);
  }
  async function retirer(ctrl) {
    setAgenda(await supprimerControle(currentUser, ctrl.id));
    montrer('Contrôle retiré.', async () => {
      setAgenda(await ajouterControle(currentUser, { matiere: ctrl.matiere, titre: ctrl.titre ?? '', date: ctrl.date }));
      setToast(null);
    });
  }

  // Ce que dit Réviz, dans le bloc lavande de l'accueil (façon app Nomad, 29/10) ; sans contrôle
  // noté, la ligne blanche pour en ajouter un, comme leur « Ajouter une évaluation ».
  const blocReviz = (
    <section className="na-bloc" aria-label="Réviz">
      <span className="na-bloc-reviz" aria-hidden="true">
        <Mascot pose={!prochain ? 'writing' : n <= 2 ? 'fire' : 'pointing'} size={isDesktop ? 110 : 86} alt="" />
      </span>
      <p className="na-bloc-txt">{lignes.join(' ').replace(/ ([?!:;])/g, '\u00a0$1')}</p>
      {!prochain && (
        <button type="button" className="na-ligne" onClick={() => setAjout({})}>
          <span className="na-ligne-icone" aria-hidden="true"><Plus /></span>
          <span className="na-ligne-txt">
            <span className="na-ligne-titre">Ajouter un contrôle</span>
            <span className="na-ligne-sous">Réviz te prépare un plan de révision jour par jour</span>
          </span>
          <span className="na-ligne-fleche" aria-hidden="true"><Fleche /></span>
        </button>
      )}
      {!prochain && isGuest && <p className="na-note">Mode essai · tes contrôles restent sur cet appareil.</p>}
    </section>
  );
  const carteProchain = prochain ? (
    <div className="ag-carte ag-prochain">
      <div className="ag-prochain-haut">
        <span className="ag-rond ag-rond--grand" style={{ background: c.fond }} aria-hidden="true"><Mascot pose={matiereControle(prochain.matiere).mascot} size={isDesktop ? 60 : 48} alt="" /></span>
        <span className="ag-prochain-txt">
          <span className="ag-sur">Prochain contrôle</span>
          <b>{titreControle(prochain)}</b>
          <span>{majuscule(jourEnClair(prochain.date))}</span>
        </span>
        <span className={`ag-rebours${n <= 1 ? ' ag-rebours--mot' : ''}`} style={{ background: c.fond, boxShadow: `0 5px 0 ${c.tranche}` }}>{rebours(n, true)}</span>
      </div>
      <PlanRevision controle={prochain} agenda={agenda} hasRevizPlus={hasRevizPlus} className="ag-plan"
        onLancer={e => lancerEtape(prochain, e)} onDebloquer={() => navigate('/reglages')} />
      <div className="ag-prochain-bas">
        <button type="button" className="ag-btn" onClick={() => reviser(prochain)}>Réviser<Fleche /></button>
        {isDesktop && <p className="ag-rappel"><Cloche />Chaque étape sur l’accueil, et un rappel le jour venu sur iPhone.</p>}
      </div>
      <button type="button" className="ag-retirer ag-retirer--coin" onClick={() => retirer(prochain)} aria-label="Retirer ce contrôle"><Croix taille={14} /></button>
    </div>
  ) : null;
  const listeSuite = prochain && (
    <section className="ag-section" aria-labelledby="ag-suivants">
      <div className="ag-section-tete">
        <h2 id="ag-suivants" className="ag-h2">Contrôles suivants</h2>
        <button type="button" className="ag-pilule" onClick={() => setAjout({})}><Plus taille={16} />{isDesktop ? 'Ajouter un contrôle' : 'Ajouter'}</button>
      </div>
      {suite.length ? (
        <ul className="ag-liste">
          {suite.map(x => {
            const k = couleursMatiere(x.matiere);
            const j = joursEntre(aujourdhui, x.date);
            return (
              <li key={x.id} className="ag-ligne">
                <button type="button" className="ag-ligne-ouvrir" onClick={() => reviser(x)}>
                  <span className="ag-rond" style={{ background: k.fond }} aria-hidden="true"><Mascot pose={matiereControle(x.matiere).mascot} size={isDesktop ? 40 : 42} alt="" /></span>
                  <span className="ag-ligne-txt">
                    <b>{titreControle(x)}</b>
                    <span>{majuscule(jourEnClair(x.date))}</span>
                  </span>
                  <span className={`ag-dans${j <= 7 ? ' is-proche' : ''}`}><i />{rebours(j)}</span>
                </button>
                <button type="button" className="ag-retirer" onClick={() => retirer(x)} aria-label="Retirer ce contrôle"><Croix /></button>
              </li>
            );
          })}
        </ul>
      ) : <p className="ag-rien">Rien d’autre de noté pour l’instant.</p>}
    </section>
  );
  const edt = (
    <EmploiDuTemps
      user={currentUser}
      isGuest={isGuest}
      lien={agenda.pronote}
      controles={aVenir}
      onAgenda={(a, message) => { setAgenda(a); if (message) montrer(message); }}
      onAjout={setAjout}
      onReviser={reviser}
      onCompte={() => navigate('/inscription')}
    />
  );
  const entete = (
    <header className="na-entete">
      <div className="na-entete-txt">
        <span className="ag-date">{majuscule(jourEnClair(aujourdhui))}</span>
        <h1 className="ag-titre">Agenda</h1>
      </div>
      {isDesktop
        ? <button type="button" className="na-ajouter" onClick={() => setAjout({})}><Plus taille={18} />Ajouter un contrôle</button>
        : <button type="button" className="ag-ajouter-rond" onClick={() => setAjout({})} aria-label="Ajouter un contrôle"><Plus /></button>}
    </header>
  );

  return (
    <div className={`app app--no-halo ag-page na-page${isDesktop ? ' app--large ag-page--large' : ''}`}>
      <div className="content ag-defile">
        <div className="na-cadre">
          {entete}
          {isDesktop ? (
            <div className="ag-grille">
              <div className="ag-gauche">
                {blocReviz}
                {carteProchain}
                {listeSuite}
              </div>
              <div className="ag-droite">{edt}</div>
            </div>
          ) : (
            <>
              {blocReviz}
              {carteProchain}
              {prochain && <p className="ag-rappel ag-rappel--tel"><Cloche />Chaque étape sur l’accueil, et un rappel le jour venu sur iPhone.</p>}
              {listeSuite}
              {edt}
            </>
          )}
        </div>
      </div>
      {ajout && (
        <AjoutControle
          initial={ajout}
          onClose={() => setAjout(null)}
          onSaved={a => { setAgenda(a); setAjout(null); montrer('Contrôle ajouté.'); }}
        />
      )}
      {toast && (
        <div className="ag-toast" role="status">
          <span>{toast.texte}</span>
          {toast.annuler && <button type="button" onClick={toast.annuler}>Annuler</button>}
        </div>
      )}
      <BottomNav />
    </div>
  );
}

function EmploiDuTemps({ user, isGuest, lien, controles, onAgenda, onAjout, onReviser, onCompte }) {
  const isDesktop = useIsDesktop();
  const aujourdhui = jourIso();
  // Le week-end, on montre déjà la semaine qui vient.
  const debutParDefaut = (() => {
    const lundi = lundiDe(aujourdhui);
    const jourSemaine = new Date().getDay();
    return jourSemaine === 0 || jourSemaine === 6 ? ajouterJours(lundi, 7) : lundi;
  })();
  const [lundi, setLundi] = useState(debutParDefaut);
  const [jourChoisi, setJourChoisi] = useState(aujourdhui);
  const [cours, setCours] = useState(() => {
    const cache = user ? coursEnCache(user.uid) : null;
    return cache?.du === debutParDefaut ? cache.cours : null;
  });
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async () => {
    if (!lien || !user) return;
    setErreur('');
    try {
      setCours(await chargerCours(user, lien, { du: lundi, au: ajouterJours(lundi, 6) }));
    } catch (err) {
      setErreur(messageErreurPronote(err.message));
    }
  }, [lien, user, lundi]);
  useEffect(() => { setCours(null); charger(); }, [charger]);

  if (isGuest) {
    return (
      <section className="ag-carte ag-relier ag-relier--essai" aria-labelledby="ag-edt">
        <h2 id="ag-edt" className="ag-relier-titre">Ton emploi du temps Pronote</h2>
        <p className="ag-relier-txt">Pour le relier ici, il te faut un compte gratuit.</p>
        <button type="button" className="ag-btn" onClick={onCompte}>Créer mon compte gratuit</button>
        <p className="ag-note">Tes contrôles, tu peux déjà les noter sur cet appareil.</p>
      </section>
    );
  }
  if (!lien) return <RelierPronote user={user} onAgenda={onAgenda} grand={isDesktop} />;

  const jours = joursDeLaSemaine(lundi, cours ?? []);
  const choisi = jours.includes(jourChoisi) ? jourChoisi : jours[0];
  const duJour = j => controles.filter(x => x.date === j);
  const delier = async () => onAgenda(await delierPronote(user), 'Pronote délié.');
  const semaine = (
    <div className="ag-semaine">
      <button type="button" className="ag-semaine-btn" onClick={() => setLundi(ajouterJours(lundi, -7))} aria-label="Semaine précédente"><Chevron /></button>
      <span>Semaine du {jourEnClair(lundi).replace(/^lundi /, '')}</span>
      <button type="button" className="ag-semaine-btn" onClick={() => setLundi(ajouterJours(lundi, 7))} aria-label="Semaine suivante"><Chevron sens="d" /></button>
    </div>
  );
  const etat = erreur ? (
    <div className="ag-edt-etat" role="alert">
      <b>Ta semaine n’a pas pu se charger.</b>
      <span>{erreur}</span>
      <button type="button" className="ag-pilule" onClick={charger}>Réessayer</button>
    </div>
  ) : !cours ? (
    <div className="ag-edt-etat ag-edt-etat--charge" role="status"><span className="ag-anneau" aria-hidden="true" />Chargement de ta semaine…</div>
  ) : null;

  // ── Ordinateur : la semaine entière en grille horaire ──
  if (isDesktop) {
    return (
      <section className="ag-carte ag-edt ag-edt--grand" aria-labelledby="ag-edt">
        <div className="ag-edt-tete">
          <h2 id="ag-edt" className="ag-h2">Emploi du temps</h2>
          <span className="ag-relie"><i />Pronote relié</span>
          <button type="button" className="ag-delier" onClick={delier}>Délier</button>
          <span className="ag-flex" />
          {semaine}
        </div>
        {etat ?? <GrilleSemaine jours={jours} cours={cours} controles={controles} aujourdhui={aujourdhui} onAjout={onAjout} />}
      </section>
    );
  }

  // ── Téléphone : un jour à la fois ──
  const coursDuJour = (cours ?? []).filter(x => x.debut.startsWith(choisi));
  const apresMidi = coursDuJour.length > 0 && coursDuJour.every(x => Number(x.debut.slice(11, 13)) < 13);
  return (
    <section className="ag-section ag-edt" aria-labelledby="ag-edt">
      <div className="ag-section-tete">
        <h2 id="ag-edt" className="ag-h2">Emploi du temps</h2>
        <span className="ag-relie"><i />Pronote relié</span>
      </div>
      {semaine}
      <div className="ag-jours" role="tablist" aria-label="Jour">
        {jours.map(j => (
          <button key={j} type="button" role="tab" aria-selected={j === choisi}
            aria-label={`${jourEnClair(j)}${duJour(j).length ? ', contrôle ce jour-là' : ''}`}
            className={`ag-jour${j === choisi ? ' is-choisi' : ''}${j === aujourdhui ? ' is-auj' : ''}`} onClick={() => setJourChoisi(j)}>
            <span>{majuscule(jourCourt(j).replace('.', ''))}</span>
            <b>{Number(j.slice(8))}</b>
            {duJour(j).length > 0 && <i aria-hidden="true" />}
          </button>
        ))}
      </div>
      {etat ?? (
        <div className="ag-carte ag-jour-carte">
          <span className="ag-sur ag-sur--doux">{jourEnClair(choisi).toUpperCase()}{choisi === aujourdhui ? ' · AUJOURD’HUI' : ''}</span>
          {duJour(choisi).map(x => (
            <div key={x.id} className="ag-ctrl-jour" style={{ background: couleursMatiere(x.matiere).fond }}>
              <span className="ag-ctrl-jour-txt"><span className="ag-sur">Contrôle noté</span><b>{titreControle(x)}</b></span>
              <button type="button" className="ag-pilule ag-pilule--orange" onClick={() => onReviser(x)}>Réviser</button>
            </div>
          ))}
          {coursDuJour.length ? (
            <ol className="ag-cours">
              {coursDuJour.map((x, i) => {
                const m = matiereDuCours(x.titre);
                const detail = [salleEnClair(x.salle), detailDuCours(x.titre)].filter(Boolean).join(' · ');
                return (
                  <li key={`${x.debut}-${i}`}>
                    <button type="button" className={`ag-cours-ligne${x.annule ? ' is-annule' : ''}`} onClick={() => onAjout({ matiere: m ?? 'autre', date: choisi })}
                      aria-label={`${nomDuCours(x.titre)} à ${heure(x.debut)}. Noter un contrôle ce jour-là`}>
                      <span className="ag-heure"><b>{heureEnClair(x.debut)}</b><span>{heureEnClair(x.fin)}</span></span>
                      <span className="ag-rond ag-rond--petit" style={{ background: couleursMatiere(m ?? 'autre').fond }} aria-hidden="true">{m && <Mascot pose={matiereControle(m).mascot} size={34} alt="" />}</span>
                      <span className="ag-cours-txt"><b>{nomDuCours(x.titre)}</b><span>{x.annule ? 'Annulé' : detail}</span></span>
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : <p className="ag-pas-cours">Pas de cours</p>}
          {apresMidi && <p className="ag-pas-cours ag-pas-cours--pointe">Pas de cours cet après-midi.</p>}
        </div>
      )}
      <p className="ag-pied">Touche un cours pour y noter un contrôle. <button type="button" className="ag-delier" onClick={delier}>Délier Pronote</button></p>
    </section>
  );
}

const minutes = debut => Number(debut.slice(11, 13)) * 60 + Number(debut.slice(14, 16));

/**
 * Ordinateur : la semaine en grille horaire, 1 px par minute. Chaque cours est placé selon son
 * début et sa fin ; un contrôle se voit sous l'en-tête du jour et sur les cours de sa matière.
 */
function GrilleSemaine({ jours, cours, controles, aujourdhui, onAjout }) {
  const enMinutes = cours.flatMap(x => [minutes(x.debut), minutes(x.fin)]);
  const debut = Math.floor(Math.min(8 * 60, ...enMinutes) / 60) * 60;
  const fin = Math.ceil(Math.max(17 * 60, ...enMinutes) / 60) * 60;
  const heures = Array.from({ length: (fin - debut) / 60 + 1 }, (_, i) => debut / 60 + i);
  return (
    <div className="ag-grille-semaine" style={{ '--ag-jours': jours.length }}>
      <div className="ag-gs-tetes">
        <span />
        {jours.map(j => {
          const ctrl = controles.filter(x => x.date === j);
          return (
            <div key={j} className="ag-gs-tete-col">
              <span className={`ag-gs-tete${j === aujourdhui ? ' is-auj' : ''}`}>{majuscule(jourCourt(j).replace('.', ''))} <b>{Number(j.slice(8))}</b></span>
              {ctrl.map(x => <span key={x.id} className="ag-gs-ctrl"><i />Contrôle · {matiereControle(x.matiere).slug === 'autre' ? (x.titre || 'Autre') : matiereControle(x.matiere).label}</span>)}
            </div>
          );
        })}
      </div>
      <div className="ag-gs-corps" style={{ height: fin - debut }}>
        <div className="ag-gs-heures">
          {heures.map(h => <span key={h} style={{ top: (h * 60 - debut) }}>{h} h</span>)}
        </div>
        {jours.map(j => {
          const ctrl = controles.filter(x => x.date === j).map(x => x.matiere);
          const leurs = cours.filter(x => x.debut.startsWith(j));
          return (
            <div key={j} className={`ag-gs-col${j === aujourdhui ? ' is-auj' : ''}`}>
              {leurs.length === 0 && <span className="ag-gs-vide">Pas de cours</span>}
              {leurs.map((x, i) => {
                const m = matiereDuCours(x.titre);
                const k = couleursMatiere(m ?? 'autre');
                const estCtrl = m && ctrl.includes(m);
                const detail = salleEnClair(x.salle);
                return (
                  <button key={i} type="button" className={`ag-bloc${estCtrl ? ' is-ctrl' : ''}${x.annule ? ' is-annule' : ''}`}
                    style={{ top: minutes(x.debut) - debut, height: Math.max(26, minutes(x.fin) - minutes(x.debut) - 4), background: k.fond }}
                    onClick={() => onAjout({ matiere: m ?? 'autre', date: j })}
                    aria-label={`${jourEnClair(j)}, ${nomDuCours(x.titre)} de ${heure(x.debut)} à ${heure(x.fin)}${x.annule ? ', annulé' : ''}. Noter un contrôle ce jour-là`}>
                    <b>{nomDuCours(x.titre)}{estCtrl && <em>Contrôle</em>}</b>
                    <span>{x.annule ? 'Annulé' : [heureEnClair(x.debut), detail].filter(Boolean).join(' · ')}</span>
                    <span className="ag-bloc-noter"><Plus taille={12} />Noter un contrôle</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// « 105 » → « Salle 105 » ; « Salle de musique », « Labo 2 », « Piscine » restent tels quels.
function salleEnClair(salle) {
  if (!salle) return '';
  return /^[A-Z]?\d+[A-Z]?$/i.test(salle.trim()) ? `Salle ${salle.trim()}` : salle.trim();
}

/** Relier Pronote : l'intérêt, les 4 étapes, « Coller le lien » ou le champ. */
function RelierPronote({ user, onAgenda, grand }) {
  const [saisie, setSaisie] = useState('');
  const [verif, setVerif] = useState(false);
  const [erreur, setErreur] = useState('');
  const geste = grand ? 'Clique sur' : 'Touche';
  const ETAPES = [
    <>Dans Pronote, ouvre le menu de ton profil en haut à droite.</>,
    <>{geste} <b>Mes données</b>, puis <b>Compte</b>.</>,
    <>Choisis <b>Export au format iCal</b>.</>,
    <>{geste} <b>Copier l’adresse</b>, puis reviens ici.</>,
  ];

  async function verifier(valeur) {
    if (!/^(https?|webcal):\/\//i.test(valeur) && !estLienDemo(valeur)) { setErreur('Ce lien ne ressemble pas à une adresse iCal Pronote.'); return; }
    setErreur('');
    setVerif(true);
    try {
      // On vérifie que Pronote répond avant d'enregistrer le lien.
      const lundi = lundiDe(jourIso());
      await chargerCours(user, valeur, { du: lundi, au: ajouterJours(lundi, 6) });
      track('agenda_pronote_relie');
      onAgenda(await relierPronote(user, valeur), 'Pronote relié.');
    } catch (err) {
      setErreur(messageErreurPronote(err.message));
      setVerif(false);
    }
  }
  async function coller() {
    try {
      const texte = (await navigator.clipboard.readText()).trim();
      if (!texte) { setErreur('Le presse-papiers est vide. Copie l’adresse dans Pronote, puis reviens.'); return; }
      setSaisie(texte);
      verifier(texte);
    } catch {
      setErreur('Je n’ai pas pu lire le presse-papiers. Colle le lien ci-dessous.');
    }
  }

  return (
    <section className={`ag-carte ag-relier${grand ? ' ag-relier--grand' : ''}`} aria-labelledby="ag-edt">
      <h2 id="ag-edt" className="ag-relier-titre">{grand ? 'Relie ton emploi du temps Pronote' : 'Relie Pronote'}</h2>
      <p className="ag-relier-txt">Ton emploi du temps s’affiche ici, semaine par semaine.</p>
      <p className="ag-relier-info">Pronote ne partage que l’emploi du temps. Tes contrôles, c’est toi qui les notes.</p>
      <ol className="ag-etapes">
        {ETAPES.map((e, i) => <li key={i}><i>{i + 1}</i><span>{e}</span></li>)}
      </ol>
      <button type="button" className="ag-btn" onClick={coller} disabled={verif}>{verif ? 'Vérification…' : 'Coller le lien'}</button>
      <form className="ag-relier-form" onSubmit={e => { e.preventDefault(); if (saisie.trim()) verifier(saisie.trim()); }} noValidate>
        <label htmlFor="ag-lien">Ou colle-le toi-même</label>
        <div className="ag-relier-ligne">
          <input id="ag-lien" type="url" inputMode="url" autoComplete="off" placeholder="https://…/ical/…" value={saisie} onChange={e => setSaisie(e.target.value)} />
          <button type="submit" className="ag-pilule" disabled={!saisie.trim() || verif}>Relier</button>
        </div>
        {erreur && <p className="ag-erreur" role="alert">{erreur}</p>}
      </form>
    </section>
  );
}
