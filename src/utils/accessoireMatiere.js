import { subjectMascot } from './subjects';

// Accessoire de Réviz selon la matière (clé : pose de l'icône de matière, cf. subjects.js) ;
// les noms sont ceux de ACCESSOIRES dans components/Pantin.jsx.
const ACCESSOIRE_MATIERE = {
  maths: 'equerre', francais: 'lunettes', histgeo: 'explorateur', geo: 'carte', svt: 'plante',
  physique: 'labo', technonsi: 'ordi', langues: 'drapeau',
};

export const accessoireMatiere = matiere => (matiere ? ACCESSOIRE_MATIERE[subjectMascot(matiere)] ?? null : null);
