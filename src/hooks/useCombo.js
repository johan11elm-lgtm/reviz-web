import { useCallback, useEffect, useRef, useState } from 'react'
import { PALIER_COMBO } from '../utils/xp'
import { jouerSon, prechargerSons, demiCombo } from '../utils/sons'

/**
 * Le combo d'une séance (29/10) : les bonnes réponses d'affilée. À chaque palier (5, 10, 15…),
 * un bonus d'XP ; une erreur le casse (« Combo cassé » s'affiche un instant s'il valait 2 ou plus).
 * `palier` : le palier qui vient d'être atteint, le temps de l'annoncer (null sinon).
 * Chaque réponse sonne (utils/sons) : la bonne réponse monte la gamme avec le combo, le palier
 * remplace la bonne réponse, « combo cassé » remplace la faute. `sons: false` pour une séance muette ;
 * `sonFaute: false` quand l'élève se note lui-même (flashcards) : avouer « à revoir » ne sonne pas faux.
 */
export function useCombo({ sons = true, sonFaute = true } = {}) {
  const courant = useRef(0)
  // Lu sans attendre un rendu (fin de séance déclenchée dans le même geste que la dernière réponse).
  const etat = useRef({ max: 0, paliers: 0 })
  const [combo, setCombo] = useState(0)
  const [max, setMax] = useState(0)
  const [paliers, setPaliers] = useState(0)
  const [casse, setCasse] = useState(false)
  const [palier, setPalier] = useState(null)
  const minuteur = useRef(null)
  useEffect(() => () => clearTimeout(minuteur.current), [])
  // Décodés dès l'ouverture de la séance : la première bonne réponse sonne à temps.
  useEffect(() => { if (sons) prechargerSons(['bonne', 'faute', 'palier', 'casse', 'fin', 'xp', 'niveau']) }, [sons])
  const annoncer = (nouveauPalier, estCasse, duree) => {
    clearTimeout(minuteur.current)
    setPalier(nouveauPalier)
    setCasse(estCasse)
    minuteur.current = setTimeout(() => { setCasse(false); setPalier(null) }, duree)
  }

  const bonne = useCallback(() => {
    const n = courant.current + 1
    courant.current = n
    etat.current = { max: Math.max(etat.current.max, n), paliers: etat.current.paliers + (n % PALIER_COMBO === 0 ? 1 : 0) }
    setCombo(n)
    setMax(m => Math.max(m, n))
    if (sons) jouerSon(n % PALIER_COMBO === 0 ? 'palier' : 'bonne', { demi: demiCombo(n) })
    if (n % PALIER_COMBO === 0) {
      setPaliers(p => p + 1)
      annoncer(n, false, 1600)
    } else {
      setPalier(null) // le « +10 XP » ne reste pas affiché sur la réponse suivante
    }
  }, [sons])
  const faute = useCallback(() => {
    const avant = courant.current
    courant.current = 0
    setCombo(0)
    if (sons && sonFaute) jouerSon(avant >= 2 ? 'casse' : 'faute')
    if (avant >= 2) annoncer(null, true, 1400)
  }, [sons, sonFaute])

  const instantane = useCallback(() => ({ ...etat.current }), [])
  /** Nouvelle séance (« Refaire ») : le combo repart de zéro. */
  const remettre = useCallback(() => {
    courant.current = 0
    etat.current = { max: 0, paliers: 0 }
    setCombo(0); setMax(0); setPaliers(0); setCasse(false); setPalier(null)
  }, [])
  return { combo, max, paliers, casse, palier, bonne, faute, instantane, remettre }
}
