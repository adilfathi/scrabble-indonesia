import React from 'react';
import { GAME_MODE_30, GAME_MODE_20, GAME_MODE_10, GAME_MODE_3, MAX_TURNS_MODE_30, MAX_TURNS_MODE_20, MAX_TURNS_MODE_10, MAX_TURNS_MODE_3 } from '../utils/constants';

interface ScorePanelProps {
  playerScore: number;
  aiScore: number;
  stashCount: number;
  gameMode: string;
  playerTurns: number;
  aiTurns: number;
  lastWords: string[];
  players?: Array<{ id: string; name: string; score?: number; turns?: number }>;
}

export default function ScorePanel({
  playerScore,
  aiScore,
  stashCount,
  gameMode,
  playerTurns,
  aiTurns,
  lastWords,
  players,
}: ScorePanelProps) {
  
  let turnsRemaining = null;
  if (gameMode === GAME_MODE_30) turnsRemaining = MAX_TURNS_MODE_30 - playerTurns;
  if (gameMode === GAME_MODE_20) turnsRemaining = MAX_TURNS_MODE_20 - playerTurns;
  if (gameMode === GAME_MODE_10) turnsRemaining = MAX_TURNS_MODE_10 - playerTurns;
  if (gameMode === GAME_MODE_3) turnsRemaining = MAX_TURNS_MODE_3 - playerTurns;

  return (
    <div className="score-panel glass">
      <div className="score-row">
        <div className="score-block score-player">
          <span className="score-label">Kamu</span>
          <span className="score-value">{playerScore}</span>
        </div>
        <div className="score-divider">vs</div>
        <div className="score-block score-ai">
          <span className="score-label">Lawan</span>
          <span className="score-value">{aiScore}</span>
        </div>
      </div>

      <div className="score-info-row">
        <div className="info-chip">
          <span className="info-icon">🎴</span>
          <span>{stashCount} huruf tersisa</span>
        </div>
        {turnsRemaining !== null && (
          <div className="info-chip">
            <span className="info-icon">🔄</span>
            <span>{turnsRemaining} giliran lagi</span>
          </div>
        )}
      </div>

      {players && players.length > 0 && (
        <div className="last-words">
          <span className="last-words-label">Skor pemain:</span>
          {players.map((p) => (
            <span key={p.id} className="word-chip">{p.name}: {p.score || 0}</span>
          ))}
        </div>
      )}

      {lastWords.length > 0 && (
        <div className="last-words">
          <span className="last-words-label">Kata terakhir:</span>
          {lastWords.map((w, i) => (
            <span key={i} className="word-chip">{w}</span>
          ))}
        </div>
      )}
    </div>
  );
}
