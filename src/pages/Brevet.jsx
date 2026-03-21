import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { loadLessons } from '../services/historyService';
import { BREVET_PROGRAM, TOTAL_THEMES } from '../utils/brevetProgram';
import { subjectEmoji } from '../utils/subjects';
import {
  getCheckedThemes,
  getAutoDetected,
  toggleTheme,
} from '../services/brevetService';
import './Brevet.css';

export default function Brevet() {
  const navigate = useNavigate();
  const lessons  = loadLessons();

  // tick → force re-render après toggle
  const [tick, setTick] = useState(0);

  const checked  = getCheckedThemes();           // Set<id> cochés manuellement
  const autoMap  = getAutoDetected(lessons);      // Map<id, lessonTitle>

  function isCovered(id)     { return checked.has(id) || autoMap.has(id); }
  function isAutoOnly(id)    { return !checked.has(id) && autoMap.has(id); }

  function handleToggle(id) {
    toggleTheme(id);
    setTick(t => t + 1);
  }

  // Nombre total de thèmes couverts (union manuel + auto)
  const coveredIds = new Set([...checked, ...autoMap.keys()]);
  const coveredCount = coveredIds.size;
  const globalPct = Math.round(coveredCount / TOTAL_THEMES * 100);

  return (
    <div className="app">
      {/* Header */}
      <div className="brevet-header">
        <button className="brevet-back" onClick={() => navigate(-1)}>←</button>
        <span className="brevet-header-title">Préparation Brevet</span>
        <span />
      </div>

      <div className="brevet-content">

        {/* Progress global */}
        <div className="brevet-global-card">
          <div className="brevet-global-top">
            <span className="brevet-global-label">Programme couvert</span>
            <span className="brevet-global-count">{coveredCount} / {TOTAL_THEMES} thèmes</span>
          </div>
          <div className="brevet-global-bar">
            <div className="brevet-global-fill" style={{ width: globalPct + '%' }} />
          </div>
          <span className="brevet-global-pct">{globalPct}%</span>
        </div>

        {/* Légende */}
        <div className="brevet-legend">
          <span className="brevet-legend-item brevet-legend--done">✓ Couvert</span>
          <span className="brevet-legend-item brevet-legend--auto">◎ Détecté auto</span>
          <span className="brevet-legend-item brevet-legend--none">○ Non révisé</span>
        </div>

        {/* Par matière */}
        {BREVET_PROGRAM.map(cat => {
          const doneCat = cat.themes.filter(t => isCovered(t.id)).length;
          const catPct  = Math.round(doneCat / cat.themes.length * 100);
          const emoji   = subjectEmoji(cat.subject);

          return (
            <div key={cat.subject} className="brevet-subject-card">
              <div className="brevet-subject-header">
                <div className="brevet-subject-title">
                  <span className="brevet-subject-emoji">{emoji}</span>
                  <span className="brevet-subject-name">{cat.label}</span>
                </div>
                <div className="brevet-subject-progress">
                  <div className="brevet-subject-bar">
                    <div className="brevet-subject-fill" style={{ width: catPct + '%' }} />
                  </div>
                  <span className="brevet-subject-count">{doneCat}/{cat.themes.length}</span>
                </div>
              </div>

              <div className="brevet-themes">
                {cat.themes.map(theme => {
                  const covered  = isCovered(theme.id);
                  const autoOnly = isAutoOnly(theme.id);
                  const manual   = checked.has(theme.id);
                  const source   = autoMap.get(theme.id);

                  return (
                    <button
                      key={theme.id}
                      className={[
                        'brevet-theme-row',
                        covered  ? (autoOnly ? 'brevet-theme--auto' : 'brevet-theme--done') : 'brevet-theme--none',
                      ].join(' ')}
                      onClick={() => handleToggle(theme.id)}
                    >
                      <span className="brevet-theme-icon">
                        {covered ? (autoOnly ? '◎' : '✓') : '○'}
                      </span>
                      <div className="brevet-theme-info">
                        <span className="brevet-theme-label">{theme.label}</span>
                        {autoOnly && source && (
                          <span className="brevet-theme-source">Détecté · {source}</span>
                        )}
                        {manual && source && (
                          <span className="brevet-theme-source">Manuel + {source}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

      </div>

      <BottomNav active="progres" />
    </div>
  );
}
