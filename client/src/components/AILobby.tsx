import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GAME_MODE_30,
  GAME_MODE_20,
  GAME_MODE_10,
  GAME_MODE_3,
  AI_LEVELS,
} from '../utils/constants';
import { sounds } from '../utils/SoundManager';

export default function AILobby() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(GAME_MODE_10);
  const [difficulty, setDifficulty] = useState(0.2);
  const [hoveredLevel, setHoveredLevel] = useState<any>(null);

  const startAI = () => {
    sounds.playClick();
    navigate(`/play?mode=${mode}&difficulty=${difficulty}`);
  };

  return (
    <div className="home-root">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="home-container">
        <div className="home-header">
          <h1 className="logo-text">LAWAN AI</h1>
          <button className="btn-back mt-2" onClick={() => { sounds.playClick(); navigate('/'); }}>Kembali</button>
        </div>

        <div className="home-card glass">
          <section className="option-section">
            <h2 className="option-title">Mode Permainan</h2>
            <div className="mode-toggle">
              <button
                className={`mode-btn ${mode === GAME_MODE_3 ? 'active' : ''}`}
                onClick={() => { sounds.playClick(); setMode(GAME_MODE_3); }}
              >
                <span className="mode-icon-small">🚀</span>
                <span className="mode-label">3× Giliran</span>
                <span className="mode-desc">Sangat Cepat</span>
              </button>
              <button
                className={`mode-btn ${mode === GAME_MODE_10 ? 'active' : ''}`}
                onClick={() => { sounds.playClick(); setMode(GAME_MODE_10); }}
              >
                <span className="mode-icon-small">⚡</span>
                <span className="mode-label">10× Giliran</span>
                <span className="mode-desc">Cepat</span>
              </button>
              <button
                className={`mode-btn ${mode === GAME_MODE_20 ? 'active' : ''}`}
                onClick={() => { sounds.playClick(); setMode(GAME_MODE_20); }}
              >
                <span className="mode-icon-small">🎯</span>
                <span className="mode-label">20× Giliran</span>
                <span className="mode-desc">Standar</span>
              </button>
              <button
                className={`mode-btn ${mode === GAME_MODE_30 ? 'active' : ''}`}
                onClick={() => { sounds.playClick(); setMode(GAME_MODE_30); }}
              >
                <span className="mode-icon-small">🧠</span>
                <span className="mode-label">30× Giliran</span>
                <span className="mode-desc">Taktis</span>
              </button>
            </div>
          </section>

          <section className="option-section">
            <h2 className="option-title">Tingkat Kesulitan AI</h2>
            <div className="difficulty-grid">
              {AI_LEVELS.map((lvl) => (
                <button
                  key={lvl.value}
                  className={`diff-btn ${difficulty === lvl.value ? 'active' : ''}`}
                  onClick={() => { sounds.playClick(); setDifficulty(lvl.value); }}
                  onMouseEnter={() => setHoveredLevel(lvl)}
                  onMouseLeave={() => setHoveredLevel(null)}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
            <p className="diff-hint">
              {(hoveredLevel || AI_LEVELS.find(l => l.value === difficulty))?.description}
            </p>
          </section>

          <div className="action-buttons mt-4">
            <button className="start-btn" onClick={startAI}>
              <span>Mulai Permainan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
