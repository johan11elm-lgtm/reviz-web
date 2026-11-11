import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mascot } from '../components/Mascot';
import { Pantin } from '../components/Pantin';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { TEINTES, varsTeinte } from '../utils/teinteMatiere';
import { apiFetch } from '../services/apiClient';
import { mesurer } from '../services/mesure';
import { ACHAT_DANS_L_APP } from '../utils/achat';
import { prixDe, FORMULE_PAR_DEFAUT } from '../../api/_prix.js';
import { tarifFondateurOuvert } from '../../api/_lancement.js';
import { parSemaine } from '../utils/remiseQuotas';
import { nbsp } from '../utils/typography';
import './Profs.css';
import './Parents.css';

const EMAIL_OK = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[a-z]{2,24}$/i;

/**
 * /parents (11/11, repris de Knowunity : le parent paie seul, puis transmet un code à son enfant).
 * Le parent choisit sa formule, donne son adresse (reçu et code) et paie sur Stripe, sans compte.
 * Il récupère ensuite le code de son enfant (/parents/merci, et par e-mail) ; l'enfant l'active en
 * ouvrant le lien (api/_cadeau.js). Publique, sans Firebase, au « vous ». Pas de vente dans l'app
 * iOS (règle 3.1.1) : la page renvoie alors vers le site.
 */
export default function Parents() {
  const isDesktop = useIsDesktop();
  const [params] = useSearchParams();
  const annule = params.get('annule') === '1';
  const fondateur = tarifFondateurOuvert();
  const annuel = prixDe('annuel', fondateur);
  const mensuel = prixDe('mensuel', fondateur);
  const [formule, setFormule] = useState(FORMULE_PAR_DEFAUT);
  const [email, setEmail] = useState('');
  const [etat, setEtat] = useState(''); // '' | 'envoi' | 'erreur' | 'email'

  async function offrir(e) {
    e.preventDefault();
    if (!EMAIL_OK.test(email.trim())) { setEtat('email'); return; }
    setEtat('envoi');
    mesurer('offre', { etape: 'caisse', lieu: 'parents', formule });
    try {
      const res = await apiFetch('/api/abonnement?op=cadeau', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'caisse', formule, email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error ?? 'ERREUR');
      window.location.assign(data.url);
    } catch (err) {
      setEtat(err.message === 'EMAIL' ? 'email' : 'erreur');
    }
  }

  const sousTitre = <p className="pr-sous">{nbsp('Exercices illimités, un plan pour chaque contrôle et Réviz IA chaque jour. De la 6e à la 3e, toutes les matières.')}</p>;
  const reviz = <Pantin expression="content" entree="coucou" size={isDesktop ? 380 : 150} repli={null} className="pr-reviz" />;
  const racine = `app app--no-halo ch-page pr-page pa-page${isDesktop ? ' app--large ch-page--large pr-page--large' : ''}`;
  const formules = [
    { id: 'annuel', titre: 'À l’année', prix: annuel.montant, cadence: 'par an', detail: `soit ${parSemaine(annuel.centimes)} par semaine`, badge: 'Le plus avantageux' },
    { id: 'mensuel', titre: 'Au mois', prix: mensuel.montant, cadence: 'par mois', detail: 'sans engagement' },
  ];

  return (
    <div className={racine} style={varsTeinte(TEINTES.peche)}>
      <div className="content pr-defile">
        <header className="ch-hero pr-hero">
          <span className="ch-grain" aria-hidden="true" />
          <span className="pr-deco pr-deco--a" aria-hidden="true" />
          <span className="pr-point" aria-hidden="true" />
          <Link to="/welcome" className="pr-logo" aria-label="Réviz, accueil">Réviz</Link>
          <div className="pr-hero-corps">
            <div className="pr-hero-textes">
              <span className="pr-sur">Pour les parents</span>
              <h1 className="pr-titre">Offrez Réviz+ à votre enfant</h1>
              {isDesktop ? sousTitre : <div className="pr-hero-rangee">{sousTitre}{reviz}</div>}
            </div>
            {isDesktop && reviz}
          </div>
        </header>

        <main className="pr-colonne">
          {annule && <p className="pa-info" role="status">Le paiement n’a pas abouti, rien n’a été prélevé. Vous pouvez réessayer.</p>}

          <section className="pr-carte pa-carte" aria-labelledby="pa-change">
            <h2 id="pa-change" className="pr-carte-titre">Ce que Réviz+ change pour lui</h2>
            <ul className="pa-liste">
              <li><span className="pa-rond pa-rond--menthe" aria-hidden="true"><Mascot pose="muscu" size={40} alt="" /></span><span><b>Exercices illimités</b>au lieu de 3 séances par jour</span></li>
              <li><span className="pa-rond pa-rond--lavande" aria-hidden="true"><Mascot pose="examen" size={40} alt="" /></span><span><b>Un plan pour chaque contrôle</b>jour par jour, jusqu’au contrôle blanc la veille</span></li>
              <li><span className="pa-rond pa-rond--peche" aria-hidden="true"><Mascot pose="coach" size={40} alt="" /></span><span><b>Réviz IA chaque jour</b>il explique pas à pas, sans faire les devoirs à sa place</span></li>
              <li><span className="pa-rond pa-rond--rose" aria-hidden="true"><Mascot pose="writing" size={40} alt="" /></span><span><b>L’espace parent</b>ce qu’il révise et ses contrôles, pas ses notes</span></li>
            </ul>
          </section>

          <section className="pr-carte pa-carte" aria-labelledby="pa-prix">
            <h2 id="pa-prix" className="pr-carte-titre">Moins cher qu’un cours particulier</h2>
            <p className="pr-carte-texte">{nbsp(`Un cours particulier coûte souvent 20 à 40 € de l’heure, pour une seule matière. Réviz+ à l’année : ${annuel.montant}, soit ${parSemaine(annuel.centimes)} par semaine, pour toutes les matières.`)}</p>
          </section>

          {ACHAT_DANS_L_APP ? (
            <form className="pr-carte pa-carte pa-form" aria-labelledby="pa-offrir" onSubmit={offrir} noValidate>
              <h2 id="pa-offrir" className="pr-carte-titre">Votre formule</h2>
              <div className="pa-formules" role="radiogroup" aria-label="Votre formule">
                {formules.map(f => (
                  <button key={f.id} type="button" role="radio" aria-checked={formule === f.id} disabled={etat === 'envoi'}
                    className={`pa-formule${formule === f.id ? ' is-choisie' : ''}`} onClick={() => setFormule(f.id)}>
                    <span className="pa-formule-txt"><b>{f.titre}</b>{f.badge && <span className="pa-badge">{f.badge}</span>}<span>{nbsp(f.detail)}</span></span>
                    <span className="pa-formule-prix"><b>{f.prix}</b><span>{f.cadence}</span></span>
                  </button>
                ))}
              </div>
              <label className="pa-label" htmlFor="pa-email">Votre adresse e-mail</label>
              <input id="pa-email" className="pa-input" type="email" inputMode="email" autoComplete="email" value={email}
                onChange={e => { setEmail(e.target.value); if (etat === 'email') setEtat(''); }} placeholder="vous@exemple.fr"
                aria-invalid={etat === 'email' ? true : undefined} aria-describedby="pa-email-aide" />
              <p id="pa-email-aide" className="pa-aide">{nbsp('Pour le reçu et le code de votre enfant. Rien d’autre.')}</p>
              {etat === 'email' && <p className="pa-erreur" role="alert">Cette adresse ne semble pas valable.</p>}
              {etat === 'erreur' && <p className="pa-erreur" role="alert">Le paiement n’a pas pu s’ouvrir. Réessayez dans un instant.</p>}
              <button type="submit" className="pr-btn pa-btn" disabled={etat === 'envoi'}>{etat === 'envoi' ? 'Ouverture du paiement…' : 'Offrir Réviz+'}</button>
              <p className="pa-aide pa-aide--centre">{nbsp('Paiement sécurisé par Stripe. Résiliable à tout moment.')}</p>
            </form>
          ) : (
            <section className="pr-carte pa-carte"><p className="pr-carte-texte">{nbsp('Réviz+ ne se prend pas dans l’app iPhone.')}</p></section>
          )}

          <section className="pr-carte pa-carte" aria-labelledby="pa-comment">
            <h2 id="pa-comment" className="pr-carte-titre">Comment ça marche</h2>
            <ol className="pa-etapes">
              <li><b>Vous payez</b>{nbsp(' : une minute, sans créer de compte.')}</li>
              <li><b>Vous recevez son code</b>{nbsp(' : à l’écran et par e-mail, avec un lien à lui envoyer.')}</li>
              <li><b>Il ouvre le lien</b>{nbsp(' et crée son compte gratuit, ou se connecte : Réviz+ s’active tout seul.')}</li>
            </ol>
          </section>
        </main>
      </div>
    </div>
  );
}
