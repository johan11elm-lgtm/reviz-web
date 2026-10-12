import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { PageHeader } from '../components/PageHeader';
import { PageIntro } from '../components/PageIntro';
import { Mascot } from '../components/Mascot';
import { AjoutControle } from '../components/AjoutControle';
import { XIcon } from '../components/Icons';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { track } from '../services/statsService';
import {
  agendaLocal, chargerAgenda, supprimerControle, relierPronote, delierPronote,
  chargerCours, coursEnCache, messageErreurPronote,
} from '../services/agendaService';
import {
  controlesAVenir, compteARebours, intituleControle, matiereControle, matiereDuCours,
  nomDuCours, detailDuCours, jourIso, lundiDe, ajouterJours, joursDeLaSemaine,
  jourEnClair, jourCourt, heure,
} from '../utils/agenda';
import './Agenda.css';

/**
 * Agenda — les contrôles que l'élève note lui-même (compte à rebours,
 * rappel la veille dans l'app iOS) et, s'il le relie, son emploi du temps
 * Pronote reconstruit semaine par semaine. Pronote n'exporte que l'emploi
 * du temps : les contrôles se saisissent ici.
 */
export default function Agenda() {
  const navigate = useNavigate();
  const { currentUser, isGuest } = useAuth();
  const [agenda, setAgenda] = useState(() => agendaLocal(currentUser?.uid));
  const [ajout, setAjout] = useState(null); // null | { matiere?, date? }

  useEffect(() => { track('agenda_ouvert'); }, []);
  useEffect(() => {
    let vivant = true;
    chargerAgenda(currentUser).then(a => { if (vivant) setAgenda(a); });
    return () => { vivant = false; };
  }, [currentUser]);

  const aujourdhui = jourIso();
  const aVenir = controlesAVenir(agenda.controles, aujourdhui);

  function reviser(c) {
    track('agenda_reviser', { matiere: c.matiere });
    navigate(c.matiere === 'autre' ? '/cours' : `/programme/${c.matiere}`);
  }

  async function retirer(c) {
    setAgenda(await supprimerControle(currentUser, c.id));
  }

  return (
    <div className="app agenda-page">
      <PageHeader
        variant="back"
        onBack={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))}
        className="rv-page-header--racine"
      />
      <PageIntro
        title="Agenda"
        sub={aVenir.length
          ? `${aVenir.length} contrôle${aVenir.length > 1 ? 's' : ''} à venir`
          : 'Tes contrôles et ton emploi du temps'}
        mascot="writing"
      />

      <div className="content agenda-content">
        <section className="agenda-controles" aria-labelledby="agenda-controles-titre">
          <h2 id="agenda-controles-titre" className="rv-section-title">Contrôles à venir</h2>
          {aVenir.length > 0 ? (
            <div className="rv-card rv-rows">
              {aVenir.map(c => {
                const m = matiereControle(c.matiere);
                return (
                  <div key={c.id} className="rv-row agenda-controle">
                    <button type="button" className="agenda-controle-main" onClick={() => reviser(c)}>
                      <span className="rv-row-avatar"><Mascot pose={m.mascot} size={36} alt="" aria-hidden="true" /></span>
                      <span className="rv-row-text">
                        <span className="rv-row-title">{intituleControle(c)}</span>
                        <span className="rv-row-sub">{[c.titre, jourEnClair(c.date)].filter(Boolean).join(' · ')}</span>
                        <span className="rv-pill rv-pill--orange agenda-controle-pill">{compteARebours(c.date, aujourdhui)}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="agenda-controle-suppr"
                      onClick={() => retirer(c)}
                      aria-label={`Retirer ${intituleControle(c)} du ${jourEnClair(c.date)}`}
                    >
                      <XIcon />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="agenda-vide">
              Note tes contrôles ici : Réviz te les rappelle sur l'accueil
              {' '}et la veille au soir dans l'app.
            </p>
          )}
          <button type="button" className="rv-btn-cta agenda-ajouter" onClick={() => setAjout({})}>
            Ajouter un contrôle
          </button>
        </section>

        <EmploiDuTemps
          user={currentUser}
          isGuest={isGuest}
          lien={agenda.pronote}
          controles={agenda.controles}
          onAgenda={setAgenda}
          onAjout={setAjout}
        />
      </div>

      {ajout && (
        <AjoutControle
          initial={ajout}
          onClose={() => setAjout(null)}
          onSaved={a => { setAgenda(a); setAjout(null); }}
        />
      )}

      <BottomNav />
    </div>
  );
}

function EmploiDuTemps({ user, isGuest, lien, controles, onAgenda, onAjout }) {
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
      <section className="rv-card agenda-relier" aria-labelledby="agenda-edt-titre">
        <h2 id="agenda-edt-titre" className="agenda-relier-titre">Ton emploi du temps Pronote</h2>
        <p className="agenda-relier-texte">Crée ton compte pour relier Pronote : ta semaine s'affichera ici.</p>
        <Link to="/inscription" className="rv-btn-cta rv-btn-cta--ghost">Créer mon compte</Link>
      </section>
    );
  }

  if (!lien) return <RelierPronote user={user} onAgenda={onAgenda} />;

  const jours = joursDeLaSemaine(lundi, cours ?? []);
  const choisi = jours.includes(jourChoisi) ? jourChoisi : jours[0];
  const controlesDuJour = jour => controles.filter(c => c.date === jour);

  return (
    <section className="agenda-edt" aria-labelledby="agenda-edt-titre">
      <div className="agenda-edt-head">
        <h2 id="agenda-edt-titre" className="rv-section-title">Emploi du temps</h2>
        <div className="agenda-semaine">
          <button type="button" className="agenda-semaine-btn" onClick={() => setLundi(ajouterJours(lundi, -7))} aria-label="Semaine précédente">‹</button>
          <span className="agenda-semaine-label">Semaine du {jourEnClair(lundi).replace(/^lundi /, '')}</span>
          <button type="button" className="agenda-semaine-btn" onClick={() => setLundi(ajouterJours(lundi, 7))} aria-label="Semaine suivante">›</button>
        </div>
      </div>

      {/* Téléphone : un jour à la fois, choisi ici. Ordinateur : toute la semaine en colonnes. */}
      <div className="agenda-jours" role="tablist" aria-label="Jour">
        {jours.map(j => (
          <button
            key={j}
            type="button"
            role="tab"
            aria-selected={j === choisi}
            aria-label={`${jourEnClair(j)}${controlesDuJour(j).length ? ', contrôle ce jour-là' : ''}`}
            className={`agenda-jour-chip${j === choisi ? ' active' : ''}${j === aujourdhui ? ' aujourdhui' : ''}`}
            onClick={() => setJourChoisi(j)}
          >
            <span className="agenda-jour-chip-nom">{jourCourt(j)}</span>
            <span className="agenda-jour-chip-num">{Number(j.slice(8))}</span>
            {controlesDuJour(j).length > 0 && <span className="agenda-jour-chip-dot" aria-hidden="true" />}
          </button>
        ))}
      </div>

      {erreur && (
        <div className="agenda-erreur" role="alert">
          <span>{erreur}</span>
          <button type="button" className="agenda-lien" onClick={charger}>Réessayer</button>
        </div>
      )}

      {!cours && !erreur && <p className="agenda-chargement" role="status">Chargement de ta semaine…</p>}

      {cours && isDesktop && (
        <GrilleSemaine jours={jours} cours={cours} controles={controles} aujourdhui={aujourdhui} onAjout={onAjout} />
      )}

      {cours && !isDesktop && (
        <div className="agenda-grille">
          {jours.map(j => {
            const duJour = cours.filter(c => c.debut.startsWith(j));
            const ctrl = controlesDuJour(j);
            return (
              <div key={j} className={`agenda-colonne${j === choisi ? ' choisi' : ''}${j === aujourdhui ? ' aujourdhui' : ''}`}>
                <h3 className="agenda-colonne-titre">{jourEnClair(j)}</h3>
                {ctrl.map(c => (
                  <p key={c.id} className="agenda-colonne-controle">
                    <span className="rv-pill rv-pill--orange">{intituleControle(c)}</span>
                  </p>
                ))}
                {duJour.length === 0 ? (
                  <p className="agenda-colonne-vide">Pas de cours</p>
                ) : (
                  <ol className="agenda-cours">
                    {duJour.map((c, i) => {
                      const matiere = matiereDuCours(c.titre);
                      const detail = [detailDuCours(c.titre), salleEnClair(c.salle)].filter(Boolean).join(' · ');
                      return (
                        <li key={`${c.debut}-${i}`}>
                          <button
                            type="button"
                            className={`agenda-cours-item${c.annule ? ' annule' : ''}`}
                            onClick={() => onAjout({ matiere: matiere ?? 'autre', date: j })}
                            aria-label={`${nomDuCours(c.titre)} à ${heure(c.debut)}. Ajouter un contrôle ce jour-là`}
                          >
                            <span className="agenda-cours-heure">{heure(c.debut)}<br /><span>{heure(c.fin)}</span></span>
                            <span className={`agenda-cours-barre matiere-${matiere ?? 'autre'}`} aria-hidden="true" />
                            <span className="agenda-cours-texte">
                              <span className="agenda-cours-nom">{nomDuCours(c.titre)}</span>
                              {(detail || c.annule) && (
                                <span className="agenda-cours-detail">{c.annule ? 'Annulé' : detail}</span>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="agenda-pied">
        {isDesktop ? 'Clique sur' : 'Touche'} un cours pour y noter un contrôle.{' '}
        <button type="button" className="agenda-lien" onClick={async () => onAgenda(await delierPronote(user))}>
          Délier Pronote
        </button>
      </p>
    </section>
  );
}

const minutes = debut => Number(debut.slice(11, 13)) * 60 + Number(debut.slice(14, 16));
const PAS = 15; // une rangée de grille = 15 minutes

/**
 * Ordinateur : la semaine en vraie grille horaire. Chaque cours est placé
 * selon son début et sa fin, donc tous les jours s'alignent heure par heure.
 * Les contrôles vivent dans l'en-tête du jour (hauteur fixe).
 */
function GrilleSemaine({ jours, cours, controles, aujourdhui, onAjout }) {
  const enMinutes = cours.flatMap(c => [minutes(c.debut), minutes(c.fin)]);
  const debut = Math.floor(Math.min(8 * 60, ...enMinutes) / 60) * 60;
  const fin = Math.ceil(Math.max(17 * 60, ...enMinutes) / 60) * 60;
  const rangees = (fin - debut) / PAS;
  const heures = Array.from({ length: (fin - debut) / 60 }, (_, i) => debut / 60 + i);
  const colonnes = { '--agenda-jours': jours.length, '--agenda-rangees': rangees };

  return (
    <div className="agenda-semaine-grille" style={colonnes}>
      <div className="agenda-semaine-tetes">
        <span aria-hidden="true" />
        {jours.map(j => {
          const ctrl = controles.filter(c => c.date === j);
          return (
            <div key={j} className={`agenda-tete${j === aujourdhui ? ' aujourdhui' : ''}`}>
              <span className="agenda-tete-jour">{jourCourt(j)} {Number(j.slice(8))}</span>
              <span className="agenda-tete-controle">
                {ctrl.length > 0 && (
                  <><span className="agenda-tete-point" aria-hidden="true" />{ctrl.map(intituleControle).join(', ')}</>
                )}
              </span>
            </div>
          );
        })}
      </div>
      <div className="agenda-semaine-corps">
        {heures.map((h, i) => (
          <span key={h} className="agenda-heure" style={{ gridRow: `${i * 4 + 1} / span 4` }}>{h}h</span>
        ))}
        {jours.map((j, col) => cours.filter(c => c.debut.startsWith(j)).map((c, i) => {
          const matiere = matiereDuCours(c.titre);
          const de = (minutes(c.debut) - debut) / PAS + 1;
          const a = Math.max(de + 1, (minutes(c.fin) - debut) / PAS + 1);
          const detail = [detailDuCours(c.titre), salleEnClair(c.salle)].filter(Boolean).join(' · ');
          return (
            <button
              key={`${j}-${i}`}
              type="button"
              className={`agenda-bloc matiere-${matiere ?? 'autre'}${c.annule ? ' annule' : ''}`}
              style={{ gridColumn: col + 2, gridRow: `${de} / ${a}` }}
              onClick={() => onAjout({ matiere: matiere ?? 'autre', date: j })}
              aria-label={`${jourEnClair(j)}, ${nomDuCours(c.titre)} de ${heure(c.debut)} à ${heure(c.fin)}${c.annule ? ', annulé' : ''}. Ajouter un contrôle ce jour-là`}
            >
              <span className="agenda-bloc-nom">{nomDuCours(c.titre)}</span>
              <span className="agenda-bloc-detail">{c.annule ? 'Annulé' : `${heure(c.debut)}${detail ? ` · ${detail}` : ''}`}</span>
            </button>
          );
        }))}
      </div>
    </div>
  );
}

// « 105 » → « salle 105 » ; « Salle de musique », « Labo 2 », « Piscine » restent tels quels.
function salleEnClair(salle) {
  if (!salle) return '';
  return /^[A-Z]?\d+[A-Z]?$/i.test(salle.trim()) ? `salle ${salle.trim()}` : salle.trim();
}

const TUTO_PRONOTE = [
  <>Dans Pronote, ouvre le <b>menu</b> en haut à droite.</>,
  <>Touche <b>Mes données</b>, puis <b>Compte</b>.</>,
  <>Choisis <b>Export au format ICal</b>.</>,
  <>Touche <b>Copier l'adresse</b>, puis reviens ici.</>,
];

function RelierPronote({ user, onAgenda }) {
  const [saisie, setSaisie] = useState('');
  const [etat, setEtat] = useState('');
  const [erreur, setErreur] = useState('');
  const lien = useMemo(() => saisie.trim(), [saisie]);

  async function verifier(valeur) {
    setErreur('');
    setEtat('verif');
    try {
      // On vérifie que Pronote répond avant d'enregistrer le lien.
      const lundi = lundiDe(jourIso());
      await chargerCours(user, valeur, { du: lundi, au: ajouterJours(lundi, 6) });
      track('agenda_pronote_relie');
      onAgenda(await relierPronote(user, valeur));
    } catch (err) {
      setErreur(messageErreurPronote(err.message));
      setEtat('');
    }
  }

  // Le plus simple après « Copier l'adresse » dans Pronote : un seul bouton.
  async function coller() {
    try {
      const texte = (await navigator.clipboard.readText()).trim();
      if (!texte) return setErreur("Le presse-papiers est vide : copie d'abord l'adresse dans Pronote.");
      setSaisie(texte);
      verifier(texte);
    } catch {
      setErreur('Colle le lien dans le champ ci-dessous.');
    }
  }

  return (
    <section className="rv-card agenda-relier" aria-labelledby="agenda-edt-titre">
      <h2 id="agenda-edt-titre" className="agenda-relier-titre">Relie ton emploi du temps Pronote</h2>
      <p className="agenda-relier-texte">Ta semaine s'affiche ici, toujours à jour. Réviz ne voit que tes horaires de cours, pas tes notes.</p>

      {/* Le vrai parcours, capturé sur le site de démonstration de Pronote
          (élève fictive) : on glisse d'une étape à l'autre sur téléphone. */}
      <ol className="agenda-tuto">
        {TUTO_PRONOTE.map((etape, i) => (
          <li key={i} className="agenda-tuto-etape">
            <span className="agenda-tuto-num">{i + 1}</span>
            <img className="agenda-tuto-capture" src={`/agenda/pronote-${i + 1}.webp`} alt="" loading="lazy" />
            <p className="agenda-tuto-texte">{etape}</p>
          </li>
        ))}
      </ol>
      <p className="agenda-tuto-note">Pas trouvé dans l'app Pronote ? Fais-le depuis le site Pronote de ton établissement, dans ton navigateur.</p>

      <button type="button" className="rv-btn-cta rv-btn-cta--ghost agenda-coller" onClick={coller} disabled={etat === 'verif'}>
        {etat === 'verif' ? 'Vérification…' : 'Coller le lien'}
      </button>
      <form className="agenda-relier-form" onSubmit={e => { e.preventDefault(); if (lien) verifier(lien); }} noValidate>
        <label className="agenda-label" htmlFor="agenda-lien">Ou colle-le toi-même</label>
        <div className="agenda-relier-ligne">
          <input
            id="agenda-lien"
            className="agenda-input"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://….index-education.net/pronote/ical/…"
            value={saisie}
            onChange={e => setSaisie(e.target.value)}
          />
          <button type="submit" className="agenda-relier-ok" disabled={!lien || etat === 'verif'} aria-label="Relier Pronote">›</button>
        </div>
        {erreur && <p className="agenda-relier-erreur" role="alert">{erreur}</p>}
      </form>
    </section>
  );
}
