// -------------------------------------------------------
// Réviz — useBattle : une partie de Battle vue par un des deux téléphones
//
// Suit le salon battles/{code} en direct, tient l'horloge serveur et la
// présence du joueur, fait avancer la partie quand on est l'hôte, déclare
// l'abandon de l'adversaire parti, et fournit les actions de l'écran.
// Toute la logique de jeu vient de utils/battle.js.
// -------------------------------------------------------
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { contexteBattle } from '../services/battleConnexion'
import { apiFetch } from '../services/apiClient'
import {
  ecouterBattle, ecouterHorloge, tenirPresence, rejoindreBattle, lancerPartie, repondre,
  avancer, declarerAbandon, quitterBattle, lancerRevanche, marquerAbsent,
} from '../services/battleService'
import { loadCatalogue, loadChapterContent } from '../services/programmeService'
import {
  CHRONO_MS, RETOUR_MS, TEMPS_MIN_MS, phaseDeJeu, prochaineEtape, resoudrePartie, maintenantServeur,
} from '../utils/battle'

const TICK_MS = 100

/**
 * Contexte de jeu : le compte de l'élève, ou un invité anonyme s'il n'en a pas.
 * undefined pendant la connexion, null si elle a échoué.
 */
export function useContexteBattle() {
  const [ctx, setCtx] = useState(undefined)
  useEffect(() => {
    let vivant = true
    contexteBattle()
      .then(c => { if (vivant) setCtx(c) })
      .catch(() => { if (vivant) setCtx(null) })
    return () => { vivant = false }
  }, [])
  return ctx
}

/** Fin de partie : le serveur recalcule et range l'aura (api/battle-fin.js). */
async function envoyerFin(ctx, code) {
  const idToken = await ctx.jeton()
  const res = await apiFetch('/api/battle-fin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, code }),
  })
  if (!res.ok) throw new Error(`battle-fin ${res.status}`)
  return (await res.json()).compte ?? null
}

/** Titre et quiz du chapitre d'un salon (fichiers statiques du programme). */
function useChapitre(chapitre) {
  const [contenu, setContenu] = useState(null)
  const cle = chapitre ? `${chapitre.classe}/${chapitre.matiere}/${chapitre.id}` : null
  useEffect(() => {
    if (!chapitre) return
    let vivant = true
    Promise.all([
      loadChapterContent(chapitre.classe, chapitre.matiere, chapitre.id),
      loadCatalogue(chapitre.classe).catch(() => null),
    ]).then(([data, catalogue]) => {
      if (!vivant) return
      const titre = catalogue?.matieres
        .flatMap(m => m.chapitres).find(c => c.id === chapitre.id)?.titre ?? data.metadata?.title ?? 'Chapitre'
      setContenu({ titre, matiere: chapitre.matiere, quiz: data.quiz })
    }).catch(() => { if (vivant) setContenu({ erreur: true }) })
    return () => { vivant = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle])
  return contenu
}

/**
 * @param {string} code
 * @param {{ prenom: string, onRevanche?: (code: string) => void }} options
 */
export function useBattle(code, { prenom, onRevanche }) {
  const ctx = useContexteBattle()
  const [salon, setSalon] = useState(undefined)  // undefined : chargement ; null : introuvable ou fermé
  const [decalage, setDecalage] = useState(0)
  const [maintenantLocal, setMaintenantLocal] = useState(() => Date.now())
  const [mesReponses, setMesReponses] = useState({})
  const [erreurAction, setErreurAction] = useState(null)
  const contenu = useChapitre(salon?.chapitre)

  const uid = ctx?.uid
  const role = !salon || !uid ? null
    : salon.hote?.uid === uid ? 'hote'
    : salon.invite?.uid === uid ? 'invite'
    : 'spectateur'
  const maintenant = maintenantServeur(decalage, maintenantLocal)

  // --- Salon en direct et horloge serveur ---
  useEffect(() => {
    if (!ctx || !code) return
    const arreterSalon = ecouterBattle(ctx, code, setSalon, () => setSalon(null))
    const arreterHorloge = ecouterHorloge(ctx, setDecalage)
    return () => { arreterSalon(); arreterHorloge() }
  }, [ctx, code])

  // --- Présence : vraie tant que l'écran est ouvert et connecté ---
  const joue = role === 'hote' || role === 'invite'
  useEffect(() => {
    if (!ctx || !joue) return
    const arreter = tenirPresence(ctx, code, role)
    return () => {
      arreter()
      // Quitter l'écran en cours de partie, c'est partir : l'autre gagnera par forfait.
      marquerAbsent(ctx, code, role).catch(() => {})
    }
  }, [ctx, code, role, joue])

  const phase = useMemo(() => phaseDeJeu(salon, maintenant), [salon, maintenant])
  const quiz = contenu?.quiz ?? null

  // --- Horloge d'affichage : seulement quand quelque chose bouge avec le temps ---
  const enCours = salon?.etat === 'jeu' || (salon?.etat === 'fin' && phase.type === 'revelation')
  const adversaire = role === 'hote' ? salon?.invite : role === 'invite' ? salon?.hote : null
  const surveille = enCours || (joue && adversaire?.present === false && salon?.etat !== 'fin' && salon?.etat !== 'abandon')
  useEffect(() => {
    if (!surveille) return
    const id = setInterval(() => setMaintenantLocal(Date.now()), TICK_MS)
    return () => clearInterval(id)
  }, [surveille])

  // --- Hôte : fait avancer la partie (round suivant, fin) ---
  const etapeEnvoyee = useRef(null)
  useEffect(() => {
    if (role !== 'hote' || !quiz || salon?.etat !== 'jeu') return
    const etape = prochaineEtape(salon, quiz, maintenant)
    if (!etape) return
    const cle = `${etape.type}-${etape.n ?? ''}`
    if (etapeEnvoyee.current === cle) return
    etapeEnvoyee.current = cle
    avancer(ctx, code, etape).catch(() => { etapeEnvoyee.current = null })
  }, [ctx, code, role, quiz, salon, maintenant])

  // --- Adversaire parti depuis plus de RETOUR_MS : on déclare l'abandon ---
  const absentDepuis = useRef(null)
  const abandonEnvoye = useRef(false)
  useEffect(() => {
    if (!joue || !adversaire || salon.etat === 'fin' || salon.etat === 'abandon') { absentDepuis.current = null; return }
    if (adversaire.present !== false) { absentDepuis.current = null; return }
    absentDepuis.current ??= maintenantLocal
    if (maintenantLocal - absentDepuis.current >= RETOUR_MS && !abandonEnvoye.current) {
      abandonEnvoye.current = true
      declarerAbandon(ctx, code, adversaire.uid).catch(() => { abandonEnvoye.current = false })
    }
  }, [ctx, code, joue, adversaire, salon, maintenantLocal])

  // --- Invité : rejoint la revanche ouverte par l'hôte ---
  const revancheSuivie = useRef(null)
  useEffect(() => {
    if (role !== 'invite' || !salon?.revanche || revancheSuivie.current === salon.revanche) return
    revancheSuivie.current = salon.revanche
    rejoindreBattle(ctx, salon.revanche, prenom)
      .then(({ code: nouveau }) => onRevanche?.(nouveau))
      .catch(() => setErreurAction('revanche'))
  }, [ctx, role, salon, prenom, onRevanche])

  // --- Partie finie : le serveur compte l'aura (une fois, quel que soit le téléphone qui appelle) ---
  const [compte, setCompte] = useState(null)
  const finEnvoyee = useRef(false)
  const finie = salon?.etat === 'fin' || salon?.etat === 'abandon'
  useEffect(() => {
    if (!joue || !finie || salon.compte || finEnvoyee.current || !salon.invite) return
    finEnvoyee.current = true
    let essais = 0
    const tenter = () => envoyerFin(ctx, code).then(setCompte).catch(() => {
      // Une nouvelle tentative : la dernière écriture du salon peut arriver juste après.
      if (++essais < 2) setTimeout(tenter, 3000)
    })
    tenter()
  }, [ctx, code, joue, finie, salon])

  // --- Mesure du temps de réponse : depuis l'affichage de la question ---
  const affichage = useRef({})
  useEffect(() => {
    if (phase.type !== 'question' || affichage.current[phase.n]) return
    affichage.current[phase.n] = performance.now()
  }, [phase])

  const partie = useMemo(
    () => (quiz && salon?.invite ? resoudrePartie(salon, quiz, maintenant) : null),
    [salon, quiz, maintenant],
  )

  // --- Actions ---
  const executer = useCallback(async (nom, action) => {
    setErreurAction(null)
    try { return await action() } catch (err) { setErreurAction(err?.raison ?? nom); return null }
  }, [])

  const actions = useMemo(() => ({
    rejoindre: () => executer('rejoindre', () => rejoindreBattle(ctx, code, prenom)),
    lancer: () => executer('lancer', () => lancerPartie(ctx, code, maintenantServeur(decalage))),
    repondre: (n, choix) => {
      if (mesReponses[n] !== undefined) return
      const ms = Math.min(CHRONO_MS, Math.max(TEMPS_MIN_MS, performance.now() - (affichage.current[n] ?? performance.now())))
      setMesReponses(r => ({ ...r, [n]: choix }))
      return executer('repondre', () => repondre(ctx, code, n, { choix, ms }))
    },
    quitter: () => executer('quitter', () => quitterBattle(ctx, code, salon)),
    revanche: () => executer('revanche', async () => {
      const nouveau = await lancerRevanche(ctx, code, salon, { prenom, nbQuestions: quiz.length })
      onRevanche?.(nouveau)
      return nouveau
    }),
  }), [ctx, code, prenom, decalage, mesReponses, salon, quiz, executer, onRevanche])

  const etat = ctx === undefined || (ctx && salon === undefined) ? 'chargement'
    : ctx === null ? 'deconnecte'
    : salon === null ? 'introuvable'
    : contenu?.erreur ? 'chapitre'
    : 'pret'

  return {
    etat, salon, role, uid, adversaire, phase, partie, maintenant,
    avecCompte: !!ctx?.avecCompte,
    // Ce que le serveur a rangé : { [uid]: { delta, aura?, comptee, sansCompte? } }
    compte: salon?.compte ?? compte,
    chapitre: contenu?.erreur ? null : contenu, mesReponses, erreurAction, actions,
  }
}
