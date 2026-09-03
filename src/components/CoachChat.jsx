import { Fragment, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModalA11y } from '../hooks/useModalA11y';
import { Mascot } from './Mascot';
import { sendCoachMessage, CHAT_MAX_MESSAGE_LENGTH } from '../services/chatService';
import { startCheckout } from '../services/billingService';
import './CoachChat.css';

// Amorces de conversation — affichées tant que l'élève n'a rien envoyé.
const SUGGESTIONS = [
  'Explique-moi ça simplement',
  'Donne-moi un exemple concret',
  "C'est quoi le plus important à retenir ?",
];

const ERROR_MESSAGES = {
  NETWORK_ERROR:      'Pas de connexion… Vérifie ton réseau et réessaie.',
  TIMEOUT:            'Ça a pris trop de temps. Réessaie dans un instant.',
  RATE_LIMIT:         "Beaucoup de monde d'un coup ! Patiente un petit moment.",
  UNAUTHORIZED:       'Connexion expirée — reconnecte-toi puis réessaie.',
  EMAIL_NOT_VERIFIED: "Confirme ton email d'abord (le lien qu'on t'a envoyé), puis reviens me voir !",
  LESSON_NOT_FOUND:   'Je ne retrouve plus cette leçon… Réessaie depuis « Mes cours ».',
};

/**
 * Carte d'entrée du coach — une ligne : la pose coach + le titre-question
 * suffisent à porter le sens.
 * @param {() => void} onClick  ouvre le sheet CoachChat
 */
export function CoachEntryCard({ onClick }) {
  return (
    <button
      type="button"
      className="rv-card rv-card--link rv-card--padded coach-entry-card"
      onClick={onClick}
    >
      <Mascot pose="coach" size={64} alt="" aria-hidden="true" />
      <span className="coach-entry-title">Un truc pas clair ?</span>
      <span className="coach-entry-arrow" aria-hidden="true">›</span>
    </button>
  );
}

/**
 * Bouton coach pour le slot droit du PageHeader des formats de révision.
 * @param {() => void} onClick  ouvre le sheet CoachChat
 */
export function CoachHeaderButton({ onClick }) {
  return (
    <button
      type="button"
      className="rv-bell-btn coach-header-btn"
      onClick={onClick}
      aria-label="Demander au coach"
      title="Demander au coach"
    >
      <Mascot pose="coach" size={30} alt="" aria-hidden="true" />
    </button>
  );
}

// Mise en forme des réponses du coach — le prompt n'autorise que **gras** et
// les puces "- ". Parsing minimal sans HTML injecté (React échappe tout) ;
// un ** non refermé reste affiché tel quel le temps du stream.
function renderInline(text) {
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

/** Une ligne du fil côté coach : avatar + bulle (ou indicateur de frappe). */
function CoachRow({ children, typing = false }) {
  return (
    <div className="coach-row coach-row--coach">
      <Mascot pose="coach" size={30} className="coach-avatar" alt="" aria-hidden="true" />
      {typing ? (
        <div className="coach-bubble coach-bubble--coach coach-bubble--typing" aria-label="Le coach réfléchit">
          <span /><span /><span />
        </div>
      ) : (
        <div className="coach-bubble coach-bubble--coach">{children}</div>
      )}
    </div>
  );
}

function storageKey(lessonId) { return `reviz-coach-${lessonId}`; }

function loadConversation(lessonId) {
  try { return JSON.parse(sessionStorage.getItem(storageKey(lessonId)) || '[]'); }
  catch { return []; }
}

/**
 * Conversation avec le coach — messages, amorces, saisie. Cœur partagé par
 * le bottom sheet (formats de révision) et la page /coach.
 * La conversation vit en sessionStorage (fermée avec l'onglet, jamais persistée
 * côté serveur — minimisation des données, public mineur).
 * @param {string} lessonId      leçon Firestore (contexte résolu côté serveur)
 * @param {string} [prefill]     question pré-remplie (hook de friction du quiz)
 * @param {string} [className]
 */
export function CoachConversation({ lessonId, prefill, className = '' }) {
  const { isPremium, getUserLevel } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState(() => loadConversation(lessonId));
  const [input, setInput]             = useState('');
  const [draft, setDraft]             = useState(null);   // réponse en cours de stream
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError]             = useState(null);
  const [quotaOut, setQuotaOut]       = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const scrollRef = useRef(null);

  // Changement de leçon → conversation de cette leçon.
  useEffect(() => { setMessages(loadConversation(lessonId)); setError(null); setQuotaOut(false); }, [lessonId]);

  // Question pré-remplie (ex. « pourquoi » après une mauvaise réponse de quiz) :
  // posée dans le champ à l'ouverture, l'élève reste libre de la modifier.
  useEffect(() => {
    if (prefill) setInput(prefill);
  }, [prefill]);

  useEffect(() => {
    try { sessionStorage.setItem(storageKey(lessonId), JSON.stringify(messages)); }
    catch { /* stockage plein : la conversation reste en mémoire */ }
  }, [messages, lessonId]);

  // Suivre le fil : toujours caler la vue sur le dernier message / delta.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, draft, quotaOut, error]);

  async function send(text) {
    const content = text.trim();
    if (!content || isStreaming || quotaOut) return;

    const history = [...messages, { role: 'user', content }];
    setMessages(history);
    setInput('');
    setError(null);
    setIsStreaming(true);
    setDraft('');

    try {
      const { text: reply } = await sendCoachMessage({
        lessonId,
        history,
        level: getUserLevel(),
        onDelta: setDraft,
      });
      setMessages([...history, { role: 'assistant', content: reply }]);
    } catch (err) {
      if (err.message === 'CHAT_LIMIT') {
        setQuotaOut(true);
      } else {
        setError(ERROR_MESSAGES[err.message] ?? 'Oups, ça a coincé. Réessaie dans un instant.');
      }
      // La question reste affichée mais n'est pas comptée comme répondue :
      // on la retire de l'historique envoyé, l'élève peut la reposer.
      setMessages(messages);
      setInput(content);
    } finally {
      setIsStreaming(false);
      setDraft(null);
    }
  }

  async function handleUpgrade() {
    if (upgradeLoading) return;
    setUpgradeLoading(true);
    try {
      await startCheckout(); // redirection pleine page en cas de succès
    } catch (err) {
      setUpgradeLoading(false);
      if (err.message === 'EMAIL_NOT_VERIFIED') navigate('/verify-email');
      else setError('Impossible d\'ouvrir le paiement. Réessaie dans un moment.');
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className={['coach-conversation', className].filter(Boolean).join(' ')}>
        <div className="coach-messages" ref={scrollRef} role="log" aria-live="polite">
          <CoachRow>
            Salut ! Un truc pas clair dans cette leçon ? Pose-moi ta question, je t'explique.
          </CoachRow>

          {messages.map((m, i) => (
            m.role === 'user' ? (
              <div key={i} className="coach-row coach-row--user">
                <div className="coach-bubble coach-bubble--user">{m.content}</div>
              </div>
            ) : (
              <CoachRow key={i}>{renderCoachMessage(m.content)}</CoachRow>
            )
          ))}

          {isStreaming && (
            draft ? <CoachRow>{renderCoachMessage(draft)}</CoachRow> : <CoachRow typing />
          )}

          {error && (
            <div className="coach-notice" role="alert">{error}</div>
          )}

          {quotaOut && (
            <div className="coach-quota">
              <CoachRow>
                {isPremium
                  ? 'Wow, on a beaucoup discuté aujourd\'hui ! On se retrouve demain pour la suite.'
                  : 'Tu as utilisé tous tes messages du jour ! On se retrouve demain, ou passe à Réviz+ pour continuer maintenant.'}
              </CoachRow>
              {!isPremium && (
                <button
                  type="button"
                  className="rv-btn-cta coach-upgrade-btn"
                  onClick={handleUpgrade}
                  disabled={upgradeLoading}
                >
                  <span>{upgradeLoading ? 'Redirection…' : 'Passer à Réviz+'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {messages.length === 0 && !isStreaming && !quotaOut && (
          <div className="coach-suggestions">
            <span className="coach-suggestions-label">Pour commencer</span>
            <div className="coach-suggestions-row">
              {SUGGESTIONS.map(s => (
                <button
                  type="button"
                  key={s}
                  className="coach-suggestion-chip"
                  onClick={() => send(s)}
                >{s}</button>
              ))}
            </div>
          </div>
        )}

        <form className="coach-input-row" onSubmit={handleSubmit}>
          <div className="coach-input-pill">
            <input
              className="coach-input"
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Pose ta question…"
              maxLength={CHAT_MAX_MESSAGE_LENGTH}
              disabled={isStreaming || quotaOut}
              aria-label="Ta question sur la leçon"
            />
            <button
              type="submit"
              className="coach-send-btn"
              disabled={!input.trim() || isStreaming || quotaOut}
              aria-label="Envoyer la question"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </form>
    </div>
  );
}

/**
 * Coach de révision — bottom sheet de chat contextuel (formats de révision).
 * Enveloppe <CoachConversation /> d'un overlay, d'un en-tête et de la
 * gestion modale (focus, Échap).
 * @param {string} [prefill]  question pré-remplie à l'ouverture (hook de friction)
 */
export function CoachChat({ isOpen, onClose, lessonId, lessonTitle, prefill }) {
  const ref = useModalA11y(onClose, isOpen);
  if (!isOpen) return null;

  return (
    <div className="coach-overlay" onClick={onClose}>
      <div
        className="coach-sheet"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Coach Réviz — pose tes questions sur la leçon"
        onClick={e => e.stopPropagation()}
      >
        <div className="coach-header">
          <Mascot pose="coach" size={44} alt="" aria-hidden="true" />
          <div className="coach-header-text">
            <span className="coach-header-title">Coach Réviz</span>
            <span className="coach-header-sub">{lessonTitle}</span>
          </div>
          <button
            type="button"
            className="coach-close-btn"
            onClick={onClose}
            aria-label="Fermer le coach"
          >✕</button>
        </div>
        <CoachConversation lessonId={lessonId} prefill={prefill} />
      </div>
    </div>
  );
}
