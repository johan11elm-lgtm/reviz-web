import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { Mascot } from '../components/Mascot';
import { Bloc, TitreDeux, BoutonFleche } from '../components/skin/Skin';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { track } from '../services/statsService';
import {
  EPREUVES_BREVET, controleContinu, moyenneEpreuves, noteFinale, mentionBrevet, epreuvesNecessaires, formatNote,
} from '../utils/brevet';
import './SimulateurBrevet.css';

// Les enseignements obligatoires de 3e, comme sur le bulletin (l'élève peut laisser une case vide).
const MATIERES_3E = [
  'Français', 'Mathématiques', 'Histoire-géo-EMC', 'Langue vivante A', 'Langue vivante B', 'SVT',
  'Physique-chimie', 'Technologie', 'Arts plastiques', 'Éducation musicale', 'EPS',
];
const OBJECTIFS = [
  { seuil: 10, label: 'Avoir le brevet' },
  { seuil: 12, label: 'Mention assez bien' },
  { seuil: 14, label: 'Mention bien' },
  { seuil: 16, label: 'Mention très bien' },
  { seuil: 18, label: 'Félicitations du jury' },
];
const CLE = 'reviz-simulateur-brevet';

/** « 12,5 » ou « 12.5 » → 12.5 ; vide ou hors de 0-20 → null. */
function lireNote(texte) {
  const t = String(texte ?? '').trim().replace(',', '.');
  if (!t) return null;
  const v = Number(t);
  return Number.isFinite(v) && v >= 0 && v <= 20 ? v : null;
}
const horsBornes = texte => String(texte ?? '').trim() !== '' && lireNote(texte) === null;

function ChampNote({ id, label, detail, valeur, onChange }) {
  const faux = horsBornes(valeur);
  // Le nom du champ est l'intitulé seul ; le détail (durée, coefficient) le décrit.
  return (
    <div className="sb-champ">
      <span className="sb-champ-txt">
        <label className="sb-champ-label" htmlFor={id}>{label}</label>
        {detail && <span className="sb-champ-detail" id={`${id}-detail`}>{detail}</span>}
      </span>
      <span className={`sb-champ-saisie${faux ? ' sb-champ-saisie--faux' : ''}`}>
        <input id={id} type="text" inputMode="decimal" autoComplete="off" placeholder="–" value={valeur}
          aria-describedby={detail ? `${id}-detail` : undefined}
          onChange={e => onChange(e.target.value.replace(/[^0-9.,]/g, '').slice(0, 5))} aria-invalid={faux || undefined} />
        <span aria-hidden="true">/ 20</span>
      </span>
    </div>
  );
}

/**
 * Simulateur de notes du brevet 2027 (comparatif Nomad du 28/10, priorité 1) : le contrôle
 * continu (moyenne générale de 3e, ou matière par matière), les six épreuves, la note finale
 * et la mention, et surtout ce qu'il faut aux épreuves pour chaque mention. Règles et sources
 * dans utils/brevet.js. Les saisies restent sur l'appareil.
 */
export default function SimulateurBrevet() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const initial = (() => { try { return JSON.parse(localStorage.getItem(CLE) || 'null') ?? {}; } catch { return {}; } })();
  const [mode, setMode] = useState(initial.mode === 'detail' ? 'detail' : 'generale');
  const [generale, setGenerale] = useState(initial.generale ?? '');
  const [matieres, setMatieres] = useState(() => ({ ...Object.fromEntries(MATIERES_3E.map(m => [m, ''])), ...(initial.matieres ?? {}) }));
  const [facultatif, setFacultatif] = useState(initial.facultatif ?? '');
  const [epreuves, setEpreuves] = useState(() => ({ ...Object.fromEntries(EPREUVES_BREVET.map(e => [e.id, ''])), ...(initial.epreuves ?? {}) }));

  useEffect(() => { track('simulateur_brevet_ouvert'); }, []);
  useEffect(() => {
    try { localStorage.setItem(CLE, JSON.stringify({ mode, generale, matieres, facultatif, epreuves })); } catch { /* stockage indispo */ }
  }, [mode, generale, matieres, facultatif, epreuves]);

  const cc = mode === 'generale'
    ? lireNote(generale)
    : controleContinu(Object.values(matieres).map(lireNote), lireNote(facultatif));
  const ep = moyenneEpreuves(Object.fromEntries(Object.entries(epreuves).map(([k, v]) => [k, lireNote(v)])));
  const finale = cc !== null && ep !== null ? noteFinale(cc, ep) : null;
  const mention = finale !== null ? mentionBrevet(finale) : null;

  const resultat = (
    <Bloc fond="encre" className="sb-resultat" aria-live="polite">
      {finale !== null ? (
        <>
          <span className="sb-sur">Ta note au brevet</span>
          <span className="sb-note"><b>{formatNote(finale)}</b> / 20</span>
          <span className={`sb-mention${mention ? '' : ' sb-mention--rate'}`}>{mention ? mention.label : 'Pas encore admis'}</span>
          <span className="sb-detail">Contrôle continu {formatNote(cc)} · Épreuves {formatNote(ep)}</span>
        </>
      ) : (
        <>
          <span className="sb-sur">{cc === null ? 'Ton résultat' : `Contrôle continu : ${formatNote(cc)} / 20`}</span>
          <p className="sb-invite">{cc === null ? 'Entre ta moyenne de 3e pour voir ce qu’il te faut aux épreuves.' : 'Ce qu’il te faut de moyenne aux épreuves :'}</p>
        </>
      )}
      {cc !== null && (
        <ul className="sb-objectifs">
          {OBJECTIFS.map(o => {
            const besoin = epreuvesNecessaires(cc, o.seuil);
            const atteint = finale !== null && finale >= o.seuil;
            return (
              <li key={o.seuil} className={`sb-objectif${atteint ? ' sb-objectif--atteint' : ''}`}>
                <span>{o.label}</span>
                <b>{besoin === null ? 'Hors d’atteinte' : besoin === 0 ? 'Déjà acquis' : `${formatNote(besoin)} / 20`}</b>
              </li>
            );
          })}
        </ul>
      )}
    </Bloc>
  );

  return (
    <div className={`app sb-page${isDesktop ? ' sb-page--large' : ''}`}>
      <div className="content sb-defile">
        <Bloc fond="lavande" as="header" className="sb-entete">
          <div className="sb-entete-txt">
            <span className="sb-surtitre">Brevet 2027</span>
            <TitreDeux as="h1" leger="Simulateur de" fort="notes du brevet" />
            <p className="sb-chapo">Le contrôle continu compte pour 40 %, les épreuves de juin pour 60 %. Il faut 10 sur 20 pour l’avoir.</p>
          </div>
          <Mascot pose="graduation" size={isDesktop ? 190 : 120} alt="" aria-hidden="true" className="sb-mascotte" priority />
        </Bloc>

        <div className="sb-grille">
          <div className="sb-saisies">
            <section className="sb-carte" aria-labelledby="sb-cc">
              <div className="sb-carte-tete">
                <h2 id="sb-cc">Contrôle continu <span>40 %</span></h2>
                <div className="sb-onglets" role="radiogroup" aria-label="Saisie du contrôle continu">
                  <button type="button" role="radio" aria-checked={mode === 'generale'} className={mode === 'generale' ? 'is-actif' : ''} onClick={() => setMode('generale')}>Moyenne générale</button>
                  <button type="button" role="radio" aria-checked={mode === 'detail'} className={mode === 'detail' ? 'is-actif' : ''} onClick={() => setMode('detail')}>Par matière</button>
                </div>
              </div>
              {mode === 'generale' ? (
                <ChampNote id="sb-generale" label="Ta moyenne générale de 3e" detail="Celle du bulletin, ou ton estimation" valeur={generale} onChange={setGenerale} />
              ) : (
                <>
                  <p className="sb-aide">Tes moyennes annuelles de 3e. Une case vide ne compte pas.</p>
                  <div className="sb-champs">
                    {MATIERES_3E.map((m, i) => (
                      <ChampNote key={m} id={`sb-m${i}`} label={m} valeur={matieres[m]} onChange={v => setMatieres(x => ({ ...x, [m]: v }))} />
                    ))}
                    <ChampNote id="sb-facultatif" label="Option facultative" detail="Latin, grec… : les points au-dessus de 10 comptent" valeur={facultatif} onChange={setFacultatif} />
                  </div>
                </>
              )}
            </section>

            <section className="sb-carte" aria-labelledby="sb-ep">
              <div className="sb-carte-tete">
                <h2 id="sb-ep">Épreuves de juin <span>60 %</span></h2>
              </div>
              <div className="sb-champs">
                {EPREUVES_BREVET.map(e => (
                  <ChampNote key={e.id} id={`sb-${e.id}`} label={e.label} detail={`${e.detail} · coefficient ${formatNote(e.coef)}`}
                    valeur={epreuves[e.id]} onChange={v => setEpreuves(x => ({ ...x, [e.id]: v }))} />
                ))}
              </div>
            </section>
          </div>

          <div className="sb-cote">
            {resultat}
            <div className="sb-suite">
              <BoutonFleche onClick={() => navigate('/programme')}>Réviser le brevet</BoutonFleche>
              <p className="sb-sources">
                Simulation indicative : le jury reste souverain. Règles des sessions 2026 et 2027 : note de service
                du 2 septembre 2025 (BO n° 33), reprise pour 2027 par celle du 11 septembre 2026.
              </p>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
