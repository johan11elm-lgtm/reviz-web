import { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { auth, db } from '../../services/firebaseConfig';
import { apiFetch } from '../../services/apiClient';
import { loadRevisions } from '../../services/revisionService';
import { mesurer } from '../../services/mesure';
import { Mascot } from '../Mascot';
import { NOMS_LIGUES, xpDeLaSemaine, messageLigue, finDeLigue, resultatVu, noterResultatVu } from '../../utils/ligue';
import { nbsp } from '../../utils/typography';
import './CarteLigue.css';

const VISIBLES = 10;

/**
 * « Ta ligue » dans Moi (11/11, repris de Knowunity, api/_ligues.js) : le groupe de la semaine
 * (30 élèves au plus), sa place, la zone de montée ou de descente, et une fois le résultat de la
 * semaine passée. Chacun n'apparaît que sous un pseudo ; « Ne plus apparaître » le retire.
 * Avec un compte seulement.
 */
export function CarteLigue({ titre }) {
  const { currentUser, isGuest } = useAuth();
  const [etat, setEtat] = useState({ chargement: true });
  const uid = currentUser?.uid;

  useEffect(() => {
    if (!uid || isGuest) return undefined;
    let vivant = true;
    (async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const res = await apiFetch('/api/track?op=ligue', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, xpSemaine: xpDeLaSemaine(loadRevisions()) }),
        });
        const data = await res.json().catch(() => ({}));
        if (vivant) setEtat(res.ok ? data : { erreur: true });
        if (res.ok && data.ligue) mesurer('ligue', { etape: 'vue', ligue: data.ligue, rang: data.rang, total: data.total });
      } catch {
        if (vivant) setEtat({ erreur: true });
      }
    })();
    return () => { vivant = false; };
  }, [uid, isGuest]);

  if (!uid || isGuest || etat.chargement || etat.erreur || etat.masquee) return null;

  async function masquer() {
    mesurer('ligue', { etape: 'masquee' });
    try { await setDoc(doc(db, 'users', uid), { ligueMasquee: true }, { merge: true }); } catch { /* réessaiera */ }
    setEtat({ masquee: true });
  }

  let corps;
  if (etat.attente) {
    corps = <p className="lg-texte">{nbsp('Gagne des XP cette semaine pour entrer dans ta ligue : un groupe de 30 élèves, classés par XP.')}</p>;
  } else {
    const r = etat.resultat;
    const annonce = r && !resultatVu(uid, etat.fin)
      ? (r.apres !== r.avant
        ? (['bronze', 'argent', 'or'].indexOf(r.apres) > ['bronze', 'argent', 'or'].indexOf(r.avant)
          ? `Bravo : ${r.rang}e la semaine dernière, tu montes en ligue ${NOMS_LIGUES[r.apres]}.`
          : `${r.rang}e sur ${r.total} la semaine dernière : tu repars en ligue ${NOMS_LIGUES[r.apres]}.`)
        : `${r.rang}e sur ${r.total} la semaine dernière : tu restes en ligue ${NOMS_LIGUES[r.apres]}.`)
      : null;
    if (annonce) noterResultatVu(uid, etat.fin);
    const membres = etat.membres ?? [];
    const visibles = membres.slice(0, VISIBLES);
    const moi = membres.find(m => m.moi);
    if (moi && moi.rang > VISIBLES) visibles.push(moi);
    corps = (
      <>
        {annonce && <p className="lg-annonce" role="status">{nbsp(annonce)}</p>}
        <p className="lg-texte"><b>{`${etat.rang}e sur ${etat.total}`}</b>{nbsp(` · ${finDeLigue(etat.fin)}. ${messageLigue(etat)}`)}</p>
        <ol className="lg-liste" aria-label="Classement de ton groupe">
          {visibles.map(m => {
            const zone = etat.zones?.montee && m.rang <= etat.zones.montee ? 'montee' : etat.zones?.descente && m.rang >= etat.zones.descente ? 'descente' : '';
            return (
              <li key={m.rang} className={`lg-ligne${m.moi ? ' is-moi' : ''}${zone ? ` lg-ligne--${zone}` : ''}`}>
                <span className="lg-rang">{m.rang}</span>
                <span className="lg-pseudo">{m.moi ? <><b>Toi</b> · {m.pseudo}</> : m.pseudo}</span>
                <span className="lg-xp">{m.xp} XP</span>
              </li>
            );
          })}
        </ol>
      </>
    );
  }

  const carte = (
    <section className={`lg lg--${etat.ligue ?? 'bronze'}`} aria-labelledby="lg-titre">
      <div className="lg-tete">
        <span className="lg-rond" aria-hidden="true"><Mascot pose="trophy" size={40} alt="" /></span>
        <span className="lg-titres">
          <h3 id="lg-titre" className="lg-titre">{etat.ligue ? `Ligue ${NOMS_LIGUES[etat.ligue]}` : 'Ta ligue'}</h3>
          <span className="lg-sous">{nbsp(etat.zones?.montee ? `Les ${etat.zones.montee} premiers montent dimanche soir` : etat.ligue === 'or' ? 'La meilleure ligue : les derniers redescendent dimanche soir' : 'Bronze, Argent, Or : un classement par semaine')}</span>
        </span>
      </div>
      {corps}
      <button type="button" className="lg-masquer" onClick={masquer}>Ne plus apparaître dans les ligues</button>
    </section>
  );
  return titre ? <section className="mo-section"><h2 className="mo-h2">{titre}</h2>{carte}</section> : carte;
}
