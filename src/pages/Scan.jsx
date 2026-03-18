import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Drawer } from '../components/Drawer';
import { startAnalysis, startAnalysisFromImage } from '../services/aiService';
import './Scan.css';

export default function Scan() {
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [activeTab, setActiveTab]     = useState('photo');
  const [lessonText, setLessonText]   = useState('');
  const [camStatus, setCamStatus]     = useState('idle'); // 'idle' | 'active' | 'denied' | 'error'
  const videoRef      = useRef(null);
  const streamRef     = useRef(null);
  const fileInputRef  = useRef(null);
  const facingModeRef = useRef('environment');
  const navigate  = useNavigate();
  const { currentUser } = useAuth();
  const initiale = currentUser?.displayName?.[0]?.toUpperCase() ?? '?';

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

  // Capturer une frame et l'envoyer à l'analyse (via canvas → base64)
  function handleCapture() {
    if (!videoRef.current || camStatus !== 'active') return;
    const canvas = document.createElement('canvas');
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    localStorage.removeItem('reviz-ai-data');
    localStorage.removeItem('reviz-lesson-text');
    localStorage.setItem('reviz-captured-image', imageData);
    startAnalysisFromImage(imageData);   // pré-lancer l'appel API immédiatement
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
    const reader = new FileReader();
    reader.onload = (ev) => {
      const imageData = ev.target.result;
      localStorage.removeItem('reviz-ai-data');
      localStorage.removeItem('reviz-lesson-text');
      localStorage.setItem('reviz-captured-image', imageData);
      startAnalysisFromImage(imageData);
      navigate('/analyse');
    };
    reader.readAsDataURL(file);
  }

  const handleAnalyse = () => {
    localStorage.removeItem('reviz-ai-data');
    localStorage.setItem('reviz-lesson-text', lessonText);
    startAnalysis(lessonText);
    navigate('/analyse');
  };

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/')}>←</button>
        <span className="header-title">Scanner une leçon</span>
        <div className="header-avatar" onClick={() => setDrawerOpen(true)}>{initiale}</div>
      </div>

      {/* Tabs */}
      <div className="scan-tabs-wrap">
        <div className="scan-tabs">
          <button
            className={`scan-tab${activeTab === 'photo' ? ' active' : ''}`}
            onClick={() => setActiveTab('photo')}
          >
            📷 Photo
          </button>
          <button
            className={`scan-tab${activeTab === 'texte' ? ' active' : ''}`}
            onClick={() => setActiveTab('texte')}
          >
            ✏️ Texte
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="content">
        {activeTab === 'photo' ? (
          <>
            <div className="viewfinder">
              <div className="corner corner-tl" />
              <div className="corner corner-tr" />
              <div className="corner corner-bl" />
              <div className="corner corner-br" />

              {/* Flux caméra — toujours dans le DOM pour que le ref soit disponible */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`cam-video${camStatus === 'active' ? '' : ' cam-video-hidden'}`}
              />

              {/* Scan line uniquement quand caméra active */}
              {camStatus === 'active' && <div className="scan-line" />}

              {/* États sans caméra */}
              {camStatus !== 'active' && (
                <div className="cam-placeholder">
                  {camStatus === 'denied' && (
                    <>
                      <span className="viewfinder-icon">🚫</span>
                      <span className="viewfinder-hint">Accès à la caméra refusé</span>
                      <button className="cam-retry-btn" onClick={startCamera}>Réessayer</button>
                    </>
                  )}
                  {camStatus === 'error' && (
                    <>
                      <span className="viewfinder-icon">⚠️</span>
                      <span className="viewfinder-hint">Caméra indisponible</span>
                      <button className="cam-retry-btn" onClick={startCamera}>Réessayer</button>
                    </>
                  )}
                  {(camStatus === 'idle') && (
                    <>
                      <span className="viewfinder-icon">📷</span>
                      <span className="viewfinder-hint">Démarrage de la caméra…</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Shutter row */}
            <div className="shutter-row">
              {/* Galerie — gauche */}
              <button className="cam-side-btn" onClick={() => fileInputRef.current?.click()}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleMediaImport} />

              {/* Shutter — centre */}
              <div
                className={`shutter-btn${camStatus !== 'active' ? ' disabled' : ''}`}
                onClick={handleCapture}
              >
                <div className="shutter-inner" />
              </div>

              {/* Flip caméra — droite */}
              <button
                className={`cam-side-btn${camStatus !== 'active' ? ' disabled' : ''}`}
                onClick={handleFlipCamera}
                disabled={camStatus !== 'active'}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
              </button>
            </div>

            <div className="tip-card">
              <span className="tip-icon">💡</span>
              <span className="tip-text">
                <strong>Conseil :</strong> Assure-toi que la leçon est bien éclairée et lisible pour une meilleure analyse.
              </span>
            </div>
          </>
        ) : (
          <>
            <textarea
              className="scan-textarea"
              value={lessonText}
              onChange={e => setLessonText(e.target.value)}
              placeholder="Colle le texte de ta leçon..."
              autoFocus
            />
            <button
              className="analyse-btn"
              disabled={!lessonText.trim()}
              onClick={handleAnalyse}
            >
              🤖 Analyser
            </button>
          </>
        )}
      </div>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
