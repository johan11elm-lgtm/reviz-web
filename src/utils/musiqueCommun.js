/**
 * Ce que les musiques des jeux ont en commun (musique*.js), pour que les sept se comportent pareil.
 *
 * - pisteDecodee : le mp3 d'une musique, chargé et décodé une seule fois, relâchable (liberer). Un
 *   morceau décodé pèse des dizaines de Mo en mémoire (~290 Mo pour les sept) : on ne les garde pas
 *   une fois les jeux quittés.
 * - sansRattrapage : le séquenceur des versions « composées en code » programme les notes sur
 *   l'horloge audio, à la volée. Si la page a été mise en veille ou en arrière-plan (les minuteries
 *   sont ralenties, voire gelées), il ne doit pas jouer d'un coup toutes les notes manquées.
 */

/** @param {string} url  le mp3, sous public/ */
export function pisteDecodee(url) {
  let tampon = null, chargement = null, version = 0;
  return {
    /** Le tampon décodé (promesse) ; un chargement en cours n'est pas relancé, un échec peut être réessayé. */
    charger(ctx) {
      if (tampon) return Promise.resolve(tampon);
      const v = version;
      chargement ??= fetch(url).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b))
        .then(t => { if (v === version) tampon = t; return t; })
        .catch(e => { if (v === version) chargement = null; throw e; });
      return chargement;
    },
    /** Relâche le tampon (et le chargement en cours, dont le résultat ne sera pas gardé). */
    liberer() { tampon = null; chargement = null; version += 1; },
    decodee: () => tampon !== null,
  };
}

// Au-delà de ce retard (s) sur l'horloge audio, on considère que le séquenceur a été suspendu.
const RETARD_MAX = 0.25;

/**
 * Où programmer la prochaine note : `prochaine` si le séquenceur est à l'heure, sinon le temps
 * présent (la mesure reprend là où elle en était, sans salve de notes rattrapées).
 */
export function sansRattrapage(prochaine, maintenant) {
  return prochaine < maintenant - RETARD_MAX ? maintenant + 0.05 : prochaine;
}
