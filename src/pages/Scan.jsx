import { CameraIcon, PencilIcon, BulbIcon, FrameIcon, SunIcon, SearchIcon, FileTextIcon } from '../components/Icons';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PremiumModal } from '../components/PremiumModal';
import { PageHeader } from '../components/PageHeader';
import { GuestWall } from '../components/GuestWall';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { Mascot } from '../components/Mascot';
import { startAnalysis, startAnalysisFromImage } from '../services/aiService';
import { getScanStatus } from '../services/scanLimitService';
import { LESSON_TEXT_MAX_LABEL, isLessonTextTooLong, truncateLessonText } from '../utils/lessonText';
import './Scan.css';

export default function Scan() {
  // `?mode=texte` (retour depuis une erreur d'Analyse) : onglet Texte ouvert
  // et texte collé restauré, pour corriger sans tout recoller.
  const [searchParams] = useSearchParams();
  const restoreText = searchParams.get('mode') === 'texte';
  const [activeTab, setActiveTab]     = useState(restoreText ? 'texte' : 'photo');
  const [lessonText, setLessonText]   = useState(() => (restoreText && localStorage.getItem('reviz-lesson-text')) || '');
  const [showLimit, setShowLimit]     = useState(false);
  const [showLevelRequired, setShowLevelRequired] = useState(false);
  const [tipOpen, setTipOpen]         = useState(false);
  const [camStatus, setCamStatus]     = useState('idle'); // 'idle' | 'active' | 'denied' | 'error'
  const videoRef      = useRef(null);
  const streamRef     = useRef(null);
  const fileInputRef  = useRef(null);
  const facingModeRef = useRef('environment');
  const navigate  = useNavigate();
  const { getUserLevel, isGuest } = useAuth();
  const userLevel = getUserLevel();
  // Ordinateur : les deux panneaux (photo, texte) côte à côte, sans onglets.
  const double = useIsDesktop();
  const [dropping, setDropping] = useState(false);

  // Démarrer la caméra quand on est sur l'onglet photo
  useEffect(() => {
    if ((activeTab !== 'photo' && !double) || isGuest) {
      stopCamera();
      return;
    }
    startCamera();
    return () => stopCamera();
  }, [activeTab, isGuest, double]);

  // Poste sans caméra (ordinateur du CDI) : on ouvre directement l'onglet Texte.
  useEffect(() => {
    if (isGuest) return;
    navigator.mediaDevices?.enumerateDevices?.()
      .then(list => { if (!list.some(d => d.kind === 'videoinput')) setActiveTab('texte'); })
      .catch(() => {});
  }, [isGuest]);

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
    importFile(e.target.files?.[0]);
  }

  // Glisser-déposer d'une image (ordinateur)
  function handleDrop(e) {
    e.preventDefault();
    setDropping(false);
    const file = Array.from(e.dataTransfer?.files ?? []).find(f => f.type.startsWith('image/'));
    if (file) importFile(file);
  }

  function importFile(file) {
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

  const textTooLong = isLessonTextTooLong(lessonText);

  const handleAnalyse = () => {
    if (!checkLevel()) return;
    if (!checkLimit()) return;
    // Au-delà de la limite serveur, le bouton annonce qu'on analyse le début :
    // on envoie le texte coupé proprement plutôt que d'essuyer un TEXT_TOO_LONG.
    const text = textTooLong ? truncateLessonText(lessonText) : lessonText;
    localStorage.removeItem('reviz-ai-data');
    localStorage.setItem('reviz-lesson-text', text);
    startAnalysis(text, userLevel);
    navigate('/analyse');
  };

  // Mode essai : le scan passe par une API authentifiée → compte requis.
  if (isGuest) {
    return <GuestWall action="scanner tes leçons" text="Le scan de leçons demande un compte. C'est gratuit, et tout ce que tu as révisé en mode essai te suit." />;
  }

  return (
    <div className="app scan-page">
      <PageHeader
        variant="back"
        title="Scanner"
        onBack={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))}
      />

      {/* Tabs Photo / Texte (sur ordinateur, les deux panneaux sont visibles) */}
      {!double && (
      <div className="scan-tabs-wrap">
        <div className="scan-tabs" role="tablist" aria-label="Mode de scan">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'photo'}
            className={`scan-tab${activeTab === 'photo' ? ' scan-tab--active' : ''}`}
            onClick={() => setActiveTab('photo')}
          >
            <CameraIcon /> Photo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'texte'}
            className={`scan-tab${activeTab === 'texte' ? ' scan-tab--active' : ''}`}
            onClick={() => setActiveTab('texte')}
          >
            <PencilIcon /> Texte
          </button>
        </div>
      </div>
      )}

      {/* Content */}
      <div className={`scan-content${double ? ' scan-content--double' : ''}`}>
        {(double || activeTab === 'photo') && (
          <section className="scan-panel scan-panel--photo" aria-label="Photo d'une leçon">
            {double && <h2 className="scan-panel-title">Photo d'une leçon</h2>}
            {/* Viewfinder — chrome beige autour, intérieur sombre */}
            <div
              className={`scan-viewfinder-shell${dropping ? ' scan-viewfinder-shell--drop' : ''}`}
              onDragOver={e => { e.preventDefault(); if (!dropping) setDropping(true); }}
              onDragLeave={() => setDropping(false)}
              onDrop={handleDrop}
            >
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
                          du navigateur, ou importe une photo.
                        </p>
                        <button type="button" className="scan-retry-btn" onClick={startCamera}>
                          Réessayer
                        </button>
                        <button type="button" className="scan-retry-btn" onClick={() => fileInputRef.current?.click()}>
                          Importer une photo
                        </button>
                      </>
                    )}
                    {camStatus === 'error' && (
                      <>
                        <Mascot pose="scanphone" size={120} glow />
                        <p className="scan-placeholder-title">Pas de caméra ici</p>
                        <p className="scan-placeholder-sub">Importe la photo de ta leçon, ou colle son texte.</p>
                        <button type="button" className="scan-retry-btn" onClick={() => fileInputRef.current?.click()}>
                          Importer une photo
                        </button>
                        <button type="button" className="scan-retry-btn" onClick={startCamera}>
                          Réessayer la caméra
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <p className="scan-drop-hint">Tu peux aussi glisser une photo ici.</p>

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
              <span className="scan-tip-trigger-icon"><BulbIcon /></span>
              <span className="scan-tip-trigger-label">Conseils pour un bon scan</span>
              <span className="scan-tip-trigger-arrow" aria-hidden="true">›</span>
            </button>
          </section>
        )}
        {(double || activeTab === 'texte') && (
          <section className="scan-panel scan-panel--texte" aria-label="Texte de la leçon">
            {double && <h2 className="scan-panel-title">Texte de la leçon</h2>}
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
                className={`scan-char-counter${textTooLong ? ' scan-char-counter--over' : lessonText.length >= 200 ? ' scan-char-counter--ok' : ''}`}
                aria-live="polite"
              >
                {textTooLong
                  ? `${lessonText.length.toLocaleString('fr-FR')} / ${LESSON_TEXT_MAX_LABEL} caractères max`
                  : `${lessonText.length} / 200 caractères`}
              </div>
            </div>

            {textTooLong && (
              <p className="scan-text-over">
                {`Ta leçon est longue : Réviz analysera les ${LESSON_TEXT_MAX_LABEL} premiers caractères. Scanne la suite dans une seconde leçon.`}
              </p>
            )}

            <button
              type="button"
              className="rv-btn-cta rv-btn-cta--full"
              disabled={!lessonText.trim()}
              onClick={handleAnalyse}
            >
              {textTooLong ? `Analyser les ${LESSON_TEXT_MAX_LABEL} premiers caractères` : 'Analyser'}
            </button>
          </section>
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
            <span className="scan-tip-emoji" aria-hidden="true"><FrameIcon /></span>
            <div className="scan-tip-text">
              <strong>Cadre droit.</strong> Le texte horizontal, sans angle.
            </div>
          </li>
          <li className="scan-tip-item">
            <span className="scan-tip-emoji" aria-hidden="true"><SunIcon /></span>
            <div className="scan-tip-text">
              <strong>Bien éclairé.</strong> Évite les ombres et les reflets brillants.
            </div>
          </li>
          <li className="scan-tip-item">
            <span className="scan-tip-emoji" aria-hidden="true"><SearchIcon /></span>
            <div className="scan-tip-text">
              <strong>Texte net.</strong> Approche-toi jusqu'à ce que les lettres soient lisibles.
            </div>
          </li>
          <li className="scan-tip-item">
            <span className="scan-tip-emoji" aria-hidden="true"><FileTextIcon /></span>
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
