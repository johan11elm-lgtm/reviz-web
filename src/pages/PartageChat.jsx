import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Mascot } from '../components/Mascot';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { TEINTES, varsTeinte } from '../utils/teinteMatiere';
import { apiFetch } from '../services/apiClient';
import { mesurer } from '../services/mesure';
import { renderCoachMessage } from '../utils/messageCoach';
import { nbsp } from '../utils/typography';
import './Profs.css';
import './PartageChat.css';

/**
 * /partage/:id (11/11, api/_partageChat.js) : une conversation avec Réviz IA qu'un élève a
 * partagée. Lisible sans compte ni Firebase, pas indexée ; en bas, de quoi essayer Réviz.
 */
export default function PartageChat() {
  const { id } = useParams();
  const isDesktop = useIsDesktop();
  const [etat, setEtat] = useState({ chargement: true });

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
  useEffect(() => {
    let vivant = true;
    apiFetch(`/api/track?op=partage&id=${encodeURIComponent(id ?? '')}`)
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!vivant) return;
        setEtat(res.ok ? data : { introuvable: true });
        mesurer('partage_chat', { etape: res.ok ? 'lu' : 'introuvable' });
      })
      .catch(() => { if (vivant) setEtat({ erreur: true }); });
    return () => { vivant = false; };
  }, [id]);

  const racine = `app app--no-halo ch-page pr-page pch-page${isDesktop ? ' app--large ch-page--large pr-page--large' : ''}`;
  return (
    <div className={racine} style={varsTeinte(TEINTES.lavande)}>
      <div className="content pr-defile">
        <header className="ch-hero pr-hero pch-hero">
          <span className="ch-grain" aria-hidden="true" />
          <Link to="/welcome" className="pr-logo" aria-label="Réviz, accueil">Réviz</Link>
          <div className="pr-hero-corps">
            <span className="pr-sur">Une conversation partagée</span>
            <h1 className="pr-titre">{etat.titre ? nbsp(etat.titre) : 'Avec Réviz IA'}</h1>
          </div>
        </header>
        <main className="pr-colonne">
          {etat.chargement && <p className="pch-statut" role="status">Chargement de la conversation…</p>}
          {(etat.introuvable || etat.erreur) && (
            <section className="pr-carte pch-carte"><p className="pr-carte-texte" role="alert">{nbsp(etat.introuvable ? 'Cette conversation n’est plus disponible : un lien marche 30 jours.' : 'La conversation n’a pas pu s’afficher. Réessaie dans un instant.')}</p></section>
          )}
          {etat.messages && (
            <section className="pr-carte pch-carte" aria-label="La conversation">
              <div className="pch-fil">
                {etat.messages.map((m, i) => (m.role === 'user'
                  ? <div key={i} className="pch-eleve">{m.content}</div>
                  : <div key={i} className="pch-reponse"><span className="pch-ia" aria-hidden="true"><Mascot pose="coach" size={30} alt="" /></span><div className="pch-reponse-txt">{renderCoachMessage(m.content)}</div></div>))}
              </div>
            </section>
          )}
          <section className="pr-carte pch-carte pch-cta" aria-labelledby="pch-cta">
            <h2 id="pch-cta" className="pr-carte-titre">Toi aussi, pose tes questions à Réviz IA</h2>
            <p className="pr-carte-texte">{nbsp('Réviz explique ton cours pas à pas, sans faire les devoirs à ta place. Et tout le programme de la 6e à la 3e, en flashcards, quiz et exercices en jeu.')}</p>
            <Link to="/welcome" className="pr-btn pch-btn" onClick={() => mesurer('partage_chat', { etape: 'essayer' })}>Essayer Réviz gratuitement</Link>
          </section>
        </main>
      </div>
    </div>
  );
}
