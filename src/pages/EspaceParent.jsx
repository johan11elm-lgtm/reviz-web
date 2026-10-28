import { useEffect, useState } from 'react';
import { apiFetch } from '../services/apiClient';
import { Mascot } from '../components/Mascot';
import { Bloc, TitreDeux, LogoReviz } from '../components/skin/Skin';
import { matiereSlug } from '../utils/programme';
import './EspaceParent.css';

/*
 * Espace parent (comparatif Nomad du 28/10, priorité 1) : la page qu'ouvre le lien que l'élève
 * partage depuis « Moi ». Route publique, sans Firebase ni compte : les données viennent de
 * /api/track?op=parent avec le lien signé (api/_espaceParent.js). Le parent voit l'effort
 * (jours, chapitres, formats), les contrôles à venir et la préparation, pas les notes.
 */

const FORMATS = { quiz: 'Quiz', flashcards: 'Flashcards', resume: 'Résumé', mindmap: 'Carte mentale', exercices: 'Exercices en jeu' };
const majuscule = s => s.charAt(0).toUpperCase() + s.slice(1);
const jourEnClair = j => majuscule(new Date(`${j}T12:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));
const classeLisible = c => String(c ?? '').replace(/^(\d)ème$/, '$1e');
const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;

/** Les 30 derniers jours, du plus ancien au plus récent (« AAAA-MM-JJ », heure de Paris). */
function trenteJours() {
  const jours = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    jours.push(new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(d));
  }
  return jours;
}

export default function EspaceParent() {
  const [etat, setEtat] = useState({ statut: 'chargement' });
  const params = new URLSearchParams(window.location.search);
  const u = params.get('u'), e = params.get('e'), t = params.get('t'), v = params.get('v') ?? '0';

  useEffect(() => {
    document.title = 'Espace parent · Réviz';
    if (!u || !e || !t) { setEtat({ statut: 'invalide' }); return; }
    let vivant = true;
    apiFetch(`/api/track?op=parent&u=${encodeURIComponent(u)}&e=${encodeURIComponent(e)}&v=${encodeURIComponent(v)}&t=${encodeURIComponent(t)}`)
      .then(async r => {
        if (!vivant) return;
        if (r.status === 403 || r.status === 404) {
          const { error } = await r.json().catch(() => ({}));
          setEtat({ statut: error === 'LIEN_COUPE' ? 'coupe' : 'invalide' });
          return;
        }
        if (!r.ok) throw new Error(String(r.status));
        setEtat({ statut: 'ok', d: await r.json() });
      })
      .catch(() => { if (vivant) setEtat({ statut: 'erreur' }); });
    return () => { vivant = false; };
  }, [u, e, t, v]);

  const tete = (
    <header className="ep-tete">
      <a href="https://revizapp.fr" className="ep-logo" aria-label="Réviz"><LogoReviz /></a>
      <span className="ep-tete-sur">Espace parent</span>
    </header>
  );

  if (etat.statut !== 'ok') {
    const msg = etat.statut === 'chargement'
      ? { titre: 'Un instant…', texte: 'On récupère les révisions.' }
      : etat.statut === 'invalide'
        ? { titre: 'Ce lien n’est plus valable', texte: 'Il a expiré ou il est incomplet. Votre enfant peut vous en envoyer un nouveau depuis Réviz : onglet « Moi », puis « Espace parent ».' }
        : etat.statut === 'coupe'
          ? { titre: 'L’accès est en pause', texte: 'Votre enfant a coupé l’accès à son espace parent depuis ses réglages Réviz. Il peut vous envoyer un nouveau lien quand il le souhaite.' }
        : { titre: 'La page n’a pas pu se charger', texte: 'Vérifiez votre connexion, puis rechargez la page.' };
    return (
      <div className="ep-page">
        {tete}
        <main className="ep-contenu">
          <Bloc fond="peche" className="ep-message" role={etat.statut === 'chargement' ? 'status' : 'alert'}>
            <Mascot pose={etat.statut === 'chargement' ? 'reading' : 'thinking'} size={110} alt="" aria-hidden="true" />
            <div>
              <h1>{msg.titre}</h1>
              <p>{msg.texte}</p>
            </div>
          </Bloc>
        </main>
      </div>
    );
  }

  const { d } = etat;
  const prenom = d.prenom || 'votre enfant';
  const actifs = new Set(d.jours);
  const bande = trenteJours();
  const expire = Number(e) * 1000;

  return (
    <div className="ep-page">
      {tete}
      <main className="ep-contenu">
        <Bloc fond="peche" as="section" className="ep-entete" aria-labelledby="ep-titre">
          <div className="ep-entete-txt">
            <TitreDeux as="h1" id="ep-titre" leger="Les révisions de" fort={prenom} />
            <p className="ep-chapo">
              {d.classe ? `${classeLisible(d.classe)} · ` : ''}les 30 derniers jours sur Réviz. Vous voyez ce qu’il ou elle révise, pas ses notes.
            </p>
          </div>
          <Mascot pose="writing" size={150} alt="" aria-hidden="true" className="ep-mascotte" priority />
        </Bloc>

        <section className="ep-chiffres" aria-label="En chiffres">
          <div className="ep-chiffre"><b>{d.joursRevision}</b><span>{d.joursRevision > 1 ? 'jours de révision' : 'jour de révision'} sur 30</span></div>
          <div className="ep-chiffre"><b>{d.quizTermines}</b><span>{d.quizTermines > 1 ? 'quiz terminés' : 'quiz terminé'}</span></div>
          <div className="ep-chiffre"><b>{d.chapitres.length}</b><span>{d.chapitres.length > 1 ? 'chapitres travaillés' : 'chapitre travaillé'}</span></div>
        </section>

        <section className="ep-carte" aria-labelledby="ep-jours">
          <h2 id="ep-jours">Ses jours de révision</h2>
          <ol className="ep-bande" aria-label={`${pluriel(d.joursRevision, 'jour', 'jours')} de révision sur les 30 derniers`}>
            {bande.map(j => (
              <li key={j} className={actifs.has(j) ? 'is-actif' : ''} title={`${jourEnClair(j)}${actifs.has(j) ? ' : a révisé' : ''}`} />
            ))}
          </ol>
          <p className="ep-legende"><span className="ep-pastille" aria-hidden="true" />A révisé ou joué la partie du jour</p>
        </section>

        <div className="ep-colonnes">
          <section className="ep-carte" aria-labelledby="ep-controles">
            <h2 id="ep-controles">Ses contrôles à venir</h2>
            {d.controles.length ? (
              <ul className="ep-liste">
                {d.controles.map((c, i) => (
                  <li key={i} className="ep-controle">
                    <span className="ep-rond" aria-hidden="true"><Mascot pose="examen" size={36} alt="" /></span>
                    <span className="ep-controle-txt">
                      <b>{[c.matiere, c.titre].filter(Boolean).join(' · ')}</b>
                      <span>{jourEnClair(c.date)} · plan de révision {c.etapesFaites}/{c.etapes}</span>
                    </span>
                    <span className={`ep-etat ep-etat--${c.etat === 'Prêt' ? 'pret' : c.etat === 'En bonne voie' ? 'voie' : 'pas'}`}>{c.etat}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ep-vide">Aucun contrôle noté dans son agenda Réviz pour l’instant.</p>
            )}
          </section>

          <section className="ep-carte" aria-labelledby="ep-chapitres">
            <h2 id="ep-chapitres">Ce qu’il ou elle a révisé</h2>
            {d.chapitres.length ? (
              <ul className="ep-liste">
                {d.chapitres.map((ch, i) => (
                  <li key={i} className="ep-chapitre">
                    <span className="ep-rond" aria-hidden="true">
                      <Mascot pose={poseMatiere(ch.matiere)} size={36} alt="" />
                    </span>
                    <span className="ep-chapitre-txt">
                      <b>{ch.titre || (ch.matiere ? `Un chapitre de ${ch.matiere === ch.matiere.toUpperCase() ? ch.matiere : ch.matiere.toLowerCase()}` : 'Un chapitre')}</b>
                      <span className="ep-formats">
                        {ch.formats.map(f => <span key={f} className="ep-format">{FORMATS[f] ?? f}</span>)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ep-vide">Pas encore de révision ces 30 derniers jours.</p>
            )}
          </section>
        </div>

        <Bloc fond={d.revizPlus ? 'menthe' : 'lavande'} as="section" className="ep-revizplus" aria-labelledby="ep-rp">
          <h2 id="ep-rp">{d.revizPlus ? 'Réviz+ est actif' : 'Réviz+'}</h2>
          <p>
            {d.revizPlus
              ? 'Plan de révision pour chaque contrôle, Réviz IA et scans illimités. L’abonnement se gère depuis l’app, dans Réglages.'
              : 'Un plan de révision pour chaque contrôle, Réviz IA et les scans de leçons sans limite. 6,99 € par mois ou 49 € par an, sans engagement, sans publicité.'}
          </p>
          {!d.revizPlus && <a className="ep-lien" href="https://revizapp.fr/tarifs">Voir l’offre</a>}
        </Bloc>

        <p className="ep-pied">
          Ce lien est personnel : ne le partagez pas. Il reste valable jusqu’au {new Date(expire).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.
          Une question ? Répondez à un e-mail de Réviz ou écrivez à johan@revizapp.fr.
        </p>
      </main>
    </div>
  );
}

const POSES = { maths: 'maths', francais: 'francais', histoire: 'histgeo', geographie: 'geo', svt: 'svt', 'physique-chimie': 'physique', anglais: 'langues', technologie: 'technonsi' };
function poseMatiere(matiere) {
  return POSES[matiereSlug(matiere ?? '')] ?? 'reading';
}
