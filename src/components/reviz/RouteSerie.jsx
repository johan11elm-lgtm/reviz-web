// Les styles (fc-route, fc-case) sont ceux des jeux en plein écran, dans pages/Flashcards.css,
// que le Quiz importe aussi.

const Coche = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)
const RetourFleche = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
)
const Croix = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
)

/**
 * La route d'une série (flashcards, quiz) : une case par carte ou question, sur un pointillé.
 * notes[i] : null (à venir), 'sais' | 'presque' | 'revoir' (flashcards), 'juste' | 'faux' (quiz).
 * La case idx est en cours (plus grande, anneau orange ; vert ou orange foncé une fois répondue).
 * recap : la route de fin, sans case en cours.
 */
export function RouteSerie({ notes, idx, grand = false, recap = false }) {
  return (
    <ol className={`fc-route${grand ? ' fc-route--grand' : ''}${recap ? ' fc-route--recap' : ''}`} aria-hidden="true">
      {notes.map((n, i) => {
        const enCours = i === idx && !recap
        const classe = enCours ? `cours${n ? ` fc-case--cours-${n}` : ''}` : n ? `fait fc-case--${n}` : 'avenir'
        return (
          <li key={i} className={`fc-case fc-case--${classe}`}>
            {enCours ? <span>{i + 1}</span> : (
              <>
                {(n === 'sais' || n === 'juste') && <Coche />}
                {n === 'revoir' && <RetourFleche />}
                {n === 'faux' && <Croix />}
                {n === 'presque' && <i />}
                {!n && <span>{i + 1}</span>}
              </>
            )}
          </li>
        )
      })}
    </ol>
  )
}
