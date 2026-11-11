import { Fragment } from 'react';

// Sorti de components/CoachChat.jsx le 11/11 : la page publique d'une conversation partagée
// (pages/PartageChat.jsx) l'utilise sans charger Firebase.
// Mise en forme des réponses du coach — le prompt n'autorise que **gras** et
// les puces "- ". Parsing minimal sans HTML injecté (React échappe tout) ;
// un ** non refermé reste affiché tel quel le temps du stream.
export function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

/** Rendu en ligne (gras + puces « • ») — conservé pour les usages simples. */
export function renderCoachText(text) {
  return renderInline(text.replace(/^- /gm, '• '));
}

/**
 * Rendu structuré d'une réponse : paragraphes, listes à puces, gras.
 * Les lignes vides séparent les paragraphes ; les lignes « - » / « • »
 * consécutives forment une liste.
 */
export function renderCoachMessage(text) {
  const blocks = [];
  let para = [];
  let list = [];
  const flushPara = () => {
    if (!para.length) return;
    blocks.push(
      <p key={`p${blocks.length}`}>
        {para.map((line, i) => (
          <Fragment key={i}>{renderInline(line)}{i < para.length - 1 && <br />}</Fragment>
        ))}
      </p>
    );
    para = [];
  };
  const flushList = () => {
    if (!list.length) return;
    blocks.push(
      <ul key={`l${blocks.length}`}>
        {list.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
      </ul>
    );
    list = [];
  };
  text.split('\n').forEach(raw => {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); return; }
    const bullet = line.match(/^[-•]\s+(.*)$/);
    if (bullet) { flushPara(); list.push(bullet[1]); return; }
    flushList();
    para.push(line);
  });
  flushPara();
  flushList();
  return blocks;
}

