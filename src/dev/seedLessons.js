// -------------------------------------------------------
// Réviz — Seed de leçons de démo (DEV UNIQUEMENT)
//
// Écrit 12 leçons de collège (une par matière) dans
// users/{uid}/lessons via le client Firebase DÉJÀ AUTHENTIFIÉ —
// on passe donc par les règles Firestore normales, sans clé admin.
//
// Usage, depuis la console du navigateur sur le dev server :
//   const s = await import('/src/dev/seedLessons.js')
//   await s.seedLessons()      // ajoute les 12 leçons
//   await s.removeSeedLessons() // les retire toutes
//
// Les ids sont préfixés `seed-` : `removeSeedLessons` ne touche
// jamais aux leçons réellement scannées. À supprimer quand tu n'en
// as plus besoin — ce dossier n'a rien à faire dans un build.
// -------------------------------------------------------
import { db, auth } from '../services/firebaseConfig'
import { doc, collection, getDocs, writeBatch } from 'firebase/firestore'
import { syncFromFirestore } from '../services/historyService'
import LESSONS from './seed-lessons.json'

const PREFIXE = 'seed-'

function utilisateur() {
  const user = auth.currentUser
  if (!user) throw new Error('Personne n est connecté — connecte-toi dans l app avant de lancer le seed.')
  return user
}

/**
 * Ajoute les leçons de démo. Les entrées sont espacées d'une heure
 * dans le passé pour que la liste (triée par scannedAt décroissant)
 * garde l'ordre des matières.
 *
 * Idempotent : les ids sont dérivés de la matière, pas de l'horloge.
 * Relancer le seed écrase les mêmes documents au lieu d'en empiler.
 */
export async function seedLessons() {
  const user = utilisateur()
  const base = Date.now()

  const entrees = LESSONS.map((aiData, i) => {
    const scannedAt = base - i * 3600_000
    const cle = aiData.metadata.subject
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // accents
      .replace(/[^a-z0-9]+/g, '-')
    return {
      id: `${PREFIXE}${String(i + 1).padStart(2, '0')}-${cle}`,
      scannedAt,
      metadata: aiData.metadata,
      flashcardsCount: aiData.flashcards.length,
      quizCount: aiData.quiz.length,
      aiData,
    }
  })

  const batch = writeBatch(db)
  entrees.forEach(e => batch.set(doc(db, 'users', user.uid, 'lessons', e.id), e))
  await batch.commit()

  const toutes = await syncFromFirestore()
  return {
    compte:     user.email ?? user.uid,
    ajoutees:   entrees.length,
    matieres:   entrees.map(e => e.metadata.subject),
    totalApres: toutes.length,
  }
}

/** Retire uniquement les leçons posées par ce seed. */
export async function removeSeedLessons() {
  const user = utilisateur()
  const snap = await getDocs(collection(db, 'users', user.uid, 'lessons'))
  const cibles = snap.docs.filter(d => d.id.startsWith(PREFIXE))

  if (cibles.length) {
    const batch = writeBatch(db)
    cibles.forEach(d => batch.delete(d.ref))
    await batch.commit()
  }

  const toutes = await syncFromFirestore()
  return { supprimees: cibles.length, totalApres: toutes.length }
}
