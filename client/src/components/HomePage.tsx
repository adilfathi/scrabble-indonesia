import React from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeSelector from './ThemeSelector';
import { sounds } from '../utils/SoundManager';

export default function HomePage() {
  const navigate = useNavigate();

  const startAI = () => {
    sounds.playClick();
    navigate('/ai');
  };

  const startMultiplayer = () => {
    sounds.playClick();
    navigate('/multiplayer');
  };

  return (
    <div className="home-root">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="theme-toggle-container">
        <ThemeSelector />
      </div>

      <div className="home-container">
        <header className="home-header">
          <div className="logo-tiles">
            {'SKRABBLE'.split('').map((ch, i) => (
              <span key={i} className="logo-tile" style={{ animationDelay: `${i * 0.07}s` }}>
                {ch}
              </span>
            ))}
          </div>
          <p className="home-tagline">Bahasa Indonesia</p>
        </header>

        <div className="home-card glass">
          <div className="action-buttons flex-col gap-4 mt-2 mb-2">
            <button className="start-btn w-full" onClick={startAI} style={{ height: '80px', fontSize: '1.5rem' }}>
              <span>Lawan AI (Offline)</span>
            </button>
            <button className="btn-secondary w-full" onClick={startMultiplayer} style={{ height: '80px', fontSize: '1.5rem' }}>
              <span>Multiplayer (Online)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
