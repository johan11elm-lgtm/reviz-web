import { useEffect, useState } from 'react';
import { auth } from '../services/firebaseConfig';
import { apiFetch } from '../services/apiClient';
import { loadRevisions } from '../services/revisionService';
import { xpDeLaSemaine } from '../utils/ligue';

// La ligue de la semaine (api/_ligues.js), partagée par « Moi » et l'accueil (11/11) : gardée
// 5 minutes dans la session, pour ne pas redemander au serveur à chaque ouverture de l'accueil.
const DUREE_CACHE = 5 * 60_000;
const cle = uid => `reviz-ligue-${uid}`;

function enCache(uid) {
  try {
    const c = JSON.parse(sessionStorage.getItem(cle(uid)) || 'null');
    return c && Date.now() - c.t < DUREE_CACHE ? c.data : null;
  } catch { return null; }
}

// Une seule demande à la fois par élève : deux composants (ou le double montage de React en
// développement) partagent la même réponse, et le serveur n'ouvre pas deux transactions.
const enCours = new Map();
function demander(uid) {
  if (enCours.has(uid)) return enCours.get(uid);
  const p = (async () => {
    const idToken = await auth.currentUser?.getIdToken();
    const res = await apiFetch('/api/track?op=ligue', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, xpSemaine: xpDeLaSemaine(loadRevisions()) }),
    });
    const data = res.ok ? await res.json() : { erreur: true };
    if (res.ok) { try { sessionStorage.setItem(cle(uid), JSON.stringify({ t: Date.now(), data })); } catch { /* rien */ } }
    return data;
  })().catch(() => ({ erreur: true })).finally(() => enCours.delete(uid));
  enCours.set(uid, p);
  return p;
}

/** { chargement } puis la réponse du serveur ({ ligue, rang, … } | { attente } | { masquee } | { erreur }). */
export function useLigue(uid, { actif = true } = {}) {
  const [etat, setEtat] = useState(() => (uid && enCache(uid)) || { chargement: true });
  useEffect(() => {
    if (!uid || !actif || enCache(uid)) return undefined;
    let vivant = true;
    demander(uid).then(data => { if (vivant) setEtat(data); });
    return () => { vivant = false; };
  }, [uid, actif]);
  return [etat, setEtat];
}

export function oublierLigue(uid) {
  try { sessionStorage.removeItem(cle(uid)); } catch { /* rien */ }
}
