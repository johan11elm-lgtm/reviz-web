// Étincelles qui jaillissent autour d'une bonne réponse (styles dans styles/components/mouvement.css).
// Le parent doit être positionné ; r0 et r1 : rayons de départ et d'arrivée, en px. Par défaut
// en éventail vers le haut, comme chez Nomad : rien ne mord sur le texte posé à côté.
// Angles en degrés depuis le haut, dans le sens des aiguilles d'une montre.
const EVENTAIL = [-110, -80, -50, -20, 10, 40, 65]

export function Etincelles({ r0 = 22, r1 = 36, angles = EVENTAIL, className = '' }) {
  return (
    <span className={`rv-etincelles ${className}`} style={{ '--r0': `${r0}px`, '--r1': `${r1}px` }} aria-hidden="true">
      {angles.map((a, i) => <i key={a} style={{ '--a': `${a}deg`, '--i': i }} />)}
    </span>
  )
}
