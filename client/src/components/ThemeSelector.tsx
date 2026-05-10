import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { ThemeType } from '../types';
import { sounds } from '../utils/SoundManager';

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [soundEnabled, setSoundEnabled] = React.useState(sounds.isEnabled());

  const themes: { id: ThemeType; label: string; icon: string }[] = [
    { id: 'dark', label: 'Dark', icon: '🌙' },
    { id: 'light', label: 'Light', icon: '☀️' },
    { id: 'sand', label: 'Sand', icon: '🏜️' },
    { id: 'pink', label: 'Pink', icon: '🌸' },
  ];

  return (
    <div className="theme-selector">
      {themes.map(t => (
        <button
          key={t.id}
          className={`theme-btn ${theme === t.id ? 'active' : ''}`}
          onClick={() => setTheme(t.id)}
          title={t.label}
        >
          {t.icon}
        </button>
      ))}
      <div className="theme-divider" />
      <button
        className={`theme-btn ${soundEnabled ? 'active' : ''}`}
        onClick={() => {
          const newState = !soundEnabled;
          sounds.setEnabled(newState);
          setSoundEnabled(newState);
          if (newState) sounds.playClick();
        }}
        title="Toggle Suara"
      >
        {soundEnabled ? '🔊' : '🔇'}
      </button>
    </div>
  );
}
