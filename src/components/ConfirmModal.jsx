import './ConfirmModal.css';

/**
 * Modale de confirmation avant suppression d'une leçon.
 * Props :
 *   lessonTitle  — titre de la leçon à afficher dans le message
 *   onConfirm    — appelé si l'utilisateur confirme
 *   onCancel     — appelé si l'utilisateur annule (ou clique sur le fond)
 */
export function ConfirmModal({ lessonTitle, onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-card" onClick={e => e.stopPropagation()}>
        <span className="confirm-icon">🗑️</span>
        <p className="confirm-title">Supprimer cette leçon ?</p>
        <p className="confirm-sub">« {lessonTitle} » sera retiré de ton historique.</p>
        <div className="confirm-btns">
          <button className="confirm-btn confirm-btn--cancel" onClick={onCancel}>
            Annuler
          </button>
          <button className="confirm-btn confirm-btn--delete" onClick={onConfirm}>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
