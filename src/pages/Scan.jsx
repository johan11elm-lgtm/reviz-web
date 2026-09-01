import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PremiumModal } from '../components/PremiumModal';
import { PageHeader } from '../components/PageHeader';
import { Mascot } from '../components/Mascot';
import { startAnalysis, startAnalysisFromImage } from '../services/aiService';
import { getScanStatus } from '../services/scanLimitService';
import './Scan.css';

export default function Scan() {
  const [activeTab, setActiveTab]     = useState('photo');
  const [lessonText, setLessonText]   = useState('');
  const [showLimit, setShowLimit]     = useState(false);
  const [showLevelRequired, setShowLevelRequired] = useState(false);
  const [tipOpen, setTipOpen]         = useState(false);
  const [camStatus, setCamStatus]     = useState('idle'); // 'idle' | 'active' | 'denied' | 'error'
  const videoRef      = useRef(null);
  const streamRef     = useRef(null);
  const fileInputRef  = useRef(null);
  const facingModeRef = useRef('environment');
  const navigate  = useNavigate();
  const { getUserLevel } = useAuth();
  const userLevel = getUserLevel();

  // Démarrer la caméra quand on est sur l'onglet photo
  useEffect(() => {
    if (activeTab !== 'photo') {
      stopCamera();
      return;
    }
    startCamera();
    return () => stopCamera();
  }, [activeTab]);

  async function startCamera() {
    try {
      const constraints = { video: { facingMode: facingModeRef.current } }
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch {
        // Fallback : sans contrainte de caméra (iOS compatibility)
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      }
      streamRef.current = stream;
      setCamStatus('active');
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCamStatus('denied');
      } else {
        setCamStatus('error');
      }
    }
  }

  // Assigner le stream à la vidéo après que camStatus passe à 'active'
  useEffect(() => {
    if (camStatus === 'active' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [camStatus]);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCamStatus('idle');
  }

  // Vérifie que le niveau scolaire est configuré (l'IA en a besoin pour adapter).
  function checkLevel() {
    if (!userLevel?.cycle) {
      setShowLevelRequired(true);
      return false;
    }
    return true;
  }

  // Vérifie la limite de scans avant de lancer l'analyse
  function checkLimit() {
    const status = getScanStatus();
    if (!status.canScan) {
      setShowLimit(true);
      return false;
    }
    return true;
  }

  // Capturer une frame et l'envoyer à l'analyse (via canvas → base64)
  function handleCapture() {
    if (!videoRef.current || camStatus !== 'active') return;
    if (!checkLevel()) return;
    if (!checkLimit()) return;
    const canvas = document.createElement('canvas');
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    localStorage.removeItem('reviz-ai-data');
    localStorage.removeItem('reviz-lesson-text');
    localStorage.setItem('reviz-captured-image', imageData);
    startAnalysisFromImage(imageData, userLevel);   // pré-lancer l'appel API immédiatement
    navigate('/analyse');
  }

  async function handleFlipCamera() {
    stopCamera();
    facingModeRef.current = facingModeRef.current === 'environment' ? 'user' : 'environment';
    await startCamera();
  }

  function handleMediaImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!checkLevel()) return;
    if (!checkLimit()) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const imageData = ev.target.result;
      localStorage.removeItem('reviz-ai-data');
      localStorage.removeItem('reviz-lesson-text');
      localStorage.setItem('reviz-captured-image', imageData);
      startAnalysisFromImage(imageData, userLevel);
      navigate('/analyse');
    };
    reader.readAsDataURL(file);
  }

  const handleAnalyse = () => {
    if (!checkLevel()) return;
    if (!checkLimit()) return;
    localStorage.removeItem('reviz-ai-data');
    localStorage.setItem('reviz-lesson-text', lessonText);
    startAnalysis(lessonText, userLevel);
    navigate('/analyse');
  };

  return (
    <div className="app scan-page">
      <PageHeader
        variant="back"
        title="Scanner"
        onBack={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))}
      />

      {/* Tabs Photo / Texte */}
      <div className="scan-tabs-wrap">
        <div className="scan-tabs" role="tablist" aria-label="Mode de scan">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'photo'}
            className={`scan-tab${activeTab === 'photo' ? ' scan-tab--active' : ''}`}
            onClick={() => setActiveTab('photo')}
          >
            📷 Photo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'texte'}
            className={`scan-tab${activeTab === 'texte' ? ' scan-tab--active' : ''}`}
            onClick={() => setActiveTab('texte')}
          >
            ✏️ Texte
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="scan-content">
        {activeTab === 'photo' ? (
          <>
            {/* Viewfinder — chrome beige autour, intérieur sombre */}
            <div className="scan-viewfinder-shell">
              <div className="viewfinder">
                {/* Flux vidéo — toujours dans le DOM pour que le ref soit dispo */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`cam-video${camStatus === 'active' ? '' : ' cam-video-hidden'}`}
                />

                {camStatus === 'active' && (
                  <>
                    <div className="corner corner-tl" />
                    <div className="corner corner-tr" />
                    <div className="corner corner-bl" />
                    <div className="corner corner-br" />
                    <div className="scan-line" />
                  </>
                )}

                {camStatus !== 'active' && (
                  <div className="scan-placeholder">
                    {camStatus === 'idle' && (
                      <>
                        <Mascot pose="scanphone" size={140} glow animate priority />
                        <p className="scan-placeholder-title">J'allume la caméra…</p>
                      </>
                    )}
                    {camStatus === 'denied' && (
                      <>
                        <Mascot pose="confused" size={120} glow />
                        <p className="scan-placeholder-title">Accès caméra refusé</p>
                        <p className="scan-placeholder-sub">
                          Pour scanner, j'ai besoin de la caméra. Active-la dans les réglages
                          du navigateur.
                        </p>
                        <button type="button" className="scan-retry-btn" onClick={startCamera}>
                          Réessayer
                        </button>
                      </>
                    )}
                    {camStatus === 'error' && (
                      <>
                        <Mascot pose="confused" size={120} glow />
                        <p className="scan-placeholder-title">Caméra indisponible</p>
                        <p className="scan-placeholder-sub">Petit pépin technique. On retente ?</p>
                        <button type="button" className="scan-retry-btn" onClick={startCamera}>
                          Réessayer
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Shutter row */}
            <div className="scan-shutter-row">
              <button
                type="button"
                className="scan-side-btn"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Importer depuis la galerie"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleMediaImport}
              />

              <button
                type="button"
                className={`scan-shutter${camStatus !== 'active' ? ' scan-shutter--disabled' : ''}`}
                onClick={handleCapture}
                disabled={camStatus !== 'active'}
                aria-label="Capturer"
              >
                <span className="scan-shutter-inner" />
              </button>

              <button
                type="button"
                className={`scan-side-btn${camStatus !== 'active' ? ' scan-side-btn--disabled' : ''}`}
                onClick={handleFlipCamera}
                disabled={camStatus !== 'active'}
                aria-label="Retourner la caméra"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 4v6h6"/>
                  <path d="M23 20v-6h-6"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
              </button>
            </div>

            {/* Tip trigger — ouvre la bottom sheet */}
            <button
              type="button"
              className="scan-tip-trigger"
              onClick={() => setTipOpen(true)}
            >
              <span className="scan-tip-trigger-icon">💡</span>
              <span className="scan-tip-trigger-label">Conseils pour un bon scan</span>
              <span className="scan-tip-trigger-arrow" aria-hidden="true">›</span>
            </button>
          </>
        ) : (
          <>
            {/* Mode texte — mascotte writing + textarea + counter + CTA */}
            <div className="scan-text-hero">
              <Mascot pose="writing" size={120} glow priority />
              <p className="scan-text-hint">
                Colle ton énoncé ci-dessous. À partir de <strong>200&nbsp;caractères</strong>,
                je fais du bon boulot.
              </p>
            </div>

            <div className="scan-textarea-wrap">
              <textarea
                className="scan-textarea"
                value={lessonText}
                onChange={e => setLessonText(e.target.value)}
                placeholder="Colle le texte de ta leçon…"
                autoFocus
              />
              <div
                className={`scan-char-counter${lessonText.length >= 200 ? ' scan-char-counter--ok' : ''}`}
                aria-live="polite"
              >
                {lessonText.length} / 200 caractères
              </div>
            </div>

            <button
              type="button"
              className="rv-btn-cta rv-btn-cta--full"
              disabled={!lessonText.trim()}
              onClick={handleAnalyse}
            >
              🤖 Analyser
            </button>
          </>
        )}
      </div>

      {/* Backdrop pour la sheet tips */}
      {tipOpen && (
        <div
          className="scan-tip-backdrop"
          onClick={() => setTipOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Bottom sheet — toujours dans le DOM pour l'animation slide */}
      <aside
        className={`rv-sheet--bottom scan-tip-sheet${tipOpen ? '' : ' rv-sheet--bottom-hidden'}`}
        aria-hidden={!tipOpen}
        aria-label="Conseils pour un bon scan"
      >
        <div className="rv-sheet-handle" />
        <header className="scan-tip-sheet-header">
          <h2 className="scan-tip-sheet-title">4 réflexes pour un scan nickel</h2>
          <button
            type="button"
            className="scan-tip-close"
            onClick={() => setTipOpen(false)}
            aria-label="Fermer"
          >
            ×
          </button>
        </header>
        <ul className="scan-tip-list">
          <li className="scan-tip-item">
            <span className="scan-tip-emoji" aria-hidden="true">📐</span>
            <div className="scan-tip-text">
              <strong>Cadre droit.</strong> Le texte horizontal, sans angle.
            </div>
          </li>
          <li className="scan-tip-item">
            <span className="scan-tip-emoji" aria-hidden="true">💡</span>
            <div className="scan-tip-text">
              <strong>Bien éclairé.</strong> Évite les ombres et les reflets brillants.
            </div>
          </li>
          <li className="scan-tip-item">
            <span className="scan-tip-emoji" aria-hidden="true">🔍</span>
            <div className="scan-tip-text">
              <strong>Texte net.</strong> Approche-toi jusqu'à ce que les lettres soient lisibles.
            </div>
          </li>
          <li className="scan-tip-item">
            <span className="scan-tip-emoji" aria-hidden="true">📄</span>
            <div className="scan-tip-text">
              <strong>Une leçon à la fois.</strong> Pas plusieurs énoncés sur la même photo.
            </div>
          </li>
        </ul>
      </aside>

      {showLimit && (
        <PremiumModal
          onClose={() => setShowLimit(false)}
          used={getScanStatus().used}
          limit={getScanStatus().limit}
        />
      )}

      {/* Modale niveau requis — restylée DS-aligned */}
      {showLevelRequired && (
        <div
          className="scan-modal-overlay"
          onClick={() => setShowLevelRequired(false)}
        >
          <div
            className="rv-card rv-card--modal scan-level-modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="scan-level-modal-title"
          >
            <Mascot pose="graduation" size={120} glow />
            <h2 id="scan-level-modal-title" className="scan-level-modal-title">
              Dis-moi d'abord ton niveau
            </h2>
            <p className="scan-level-modal-sub">
              J'adapte tes révisions à ta classe — ça se règle en 10 secondes.
            </p>
            <div className="scan-level-modal-actions">
              <button
                type="button"
                className="rv-btn-cta rv-btn-cta--ghost"
                onClick={() => setShowLevelRequired(false)}
              >
                Plus tard
              </button>
              <button
                type="button"
                className="rv-btn-cta"
                onClick={() => {
                  setShowLevelRequired(false);
                  navigate('/profil');
                }}
              >
                Aller au profil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
