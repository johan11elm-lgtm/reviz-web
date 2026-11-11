import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mascot } from '../components/Mascot';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { TEINTES, varsTeinte } from '../utils/teinteMatiere';
import { apiFetch } from '../services/apiClient';
import { mesurer } from '../services/mesure';
import { ecrireCodeCadeau, lienCadeau } from '../utils/cadeau';
import { nbsp } from '../utils/typography';
import './Profs.css';
import './Parents.css';

/**
 * /parents/merci?session=… : retour de Stripe après le paiement d'un parent (api/_cadeau.js).
 * Le code de l'enfant, le lien à lui envoyer (copier ou partager), et ce qui se passe ensuite.
 * Le webhook peut arriver après : la page demande le code au serveur, qui le dérive du paiement.
 */
export default function ParentsMerci() {
  const isDesktop = useIsDesktop();
  const [params] = useSearchParams();
  const session = params.get('session');
  const [etat, setEtat] = useState({ chargement: true, code: null, erreur: null });
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        const res = await apiFetch('/api/abonnement?op=cadeau', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'code', session }),
        });
        const data = await res.json().catch(() => ({}));
        if (!vivant) return;
        if (!res.ok || !data.code) { setEtat({ chargement: false, code: null, erreur: data.error ?? 'ERREUR' }); return; }
        setEtat({ chargement: false, code: data.code, erreur: null });
        mesurer('offre', { etape: 'payee', lieu: 'parents', formule: data.formule });
      } catch {
        if (vivant) setEtat({ chargement: false, code: null, erreur: 'RESEAU' });
      }
    })();
    return () => { vivant = false; };
  }, [session]);

  const lien = etat.code ? lienCadeau(etat.code, window.location.origin) : null;
  const peutPartager = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  async function copier() {
    try { await navigator.clipboard.writeText(lien); setCopie(true); } catch { /* le lien reste affiché */ }
  }
  async function partager() {
    try { await navigator.share({ title: 'Réviz+', text: 'Je t’offre Réviz+ ! Ouvre ce lien et crée ton compte :', url: lien }); } catch { /* annulé */ }
  }

  const racine = `app app--no-halo ch-page pr-page pa-page${isDesktop ? ' app--large ch-page--large pr-page--large' : ''}`;
  return (
    <div className={racine} style={varsTeinte(TEINTES.menthe)}>
      <div className="content pr-defile">
        <header className="ch-hero pr-hero pa-hero-court">
          <span className="ch-grain" aria-hidden="true" />
          <Link to="/welcome" className="pr-logo" aria-label="Réviz, accueil">Réviz</Link>
          <div className="pr-hero-corps">
            <div className="pr-hero-textes">
              <span className="pr-sur">Merci</span>
              <h1 className="pr-titre">{etat.code ? 'Réviz+ est offert' : 'Votre paiement'}</h1>
            </div>
          </div>
        </header>
        <main className="pr-colonne">
          {etat.chargement && <section className="pr-carte pa-carte"><p className="pr-carte-texte" role="status">Un instant, on prépare le code de votre enfant…</p></section>}
          {etat.erreur && (
            <section className="pr-carte pa-carte">
              <p className="pr-carte-texte" role="alert">{nbsp(etat.erreur === 'PAS_PAYE'
                ? 'Le paiement n’est pas encore confirmé. Le code vous arrive par e-mail dans quelques minutes.'
                : 'Le code n’a pas pu s’afficher. Il vous arrive par e-mail dans quelques minutes ; sinon, répondez à cet e-mail.')}</p>
            </section>
          )}
          {etat.code && (
            <>
              <section className="pr-carte pa-carte pa-code-carte" aria-labelledby="pa-code">
                <span className="pa-rond pa-rond--menthe" aria-hidden="true"><Mascot pose="celebration" size={44} alt="" /></span>
                <h2 id="pa-code" className="pr-carte-titre">Le code de votre enfant</h2>
                <p className="pa-code" aria-label={`Code : ${etat.code.split('').join(' ')}`}>{ecrireCodeCadeau(etat.code)}</p>
                <p className="pr-carte-texte">{nbsp('Envoyez-lui ce lien : il l’ouvre sur son téléphone, crée son compte gratuit ou se connecte, et Réviz+ s’active tout seul.')}</p>
                <input className="pa-input pa-lien" readOnly value={lien} aria-label="Le lien à envoyer à votre enfant" onFocus={e => e.target.select()} />
                <div className="pa-boutons">
                  <button type="button" className="pr-btn pa-btn" onClick={copier}>{copie ? 'Lien copié' : 'Copier le lien'}</button>
                  {peutPartager && <button type="button" className="pa-btn-second" onClick={partager}>Envoyer par message</button>}
                </div>
                <p className="pa-aide">{nbsp('Le code et le lien vous ont aussi été envoyés par e-mail. Il peut aussi taper le code dans Réviz, onglet « Moi ».')}</p>
              </section>
              <section className="pr-carte pa-carte">
                <h2 className="pr-carte-titre">Et ensuite ?</h2>
                <p className="pr-carte-texte">{nbsp('Résiliable à tout moment : répondez simplement à l’e-mail reçu. Pour suivre ses révisions, il pourra vous envoyer le lien de l’espace parent depuis son onglet « Moi ».')}</p>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
