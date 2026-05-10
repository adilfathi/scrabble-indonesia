import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import useGameEngine from '../hooks/useGameEngine';
import GameBoard from './GameBoard';
import PlayerHand from './PlayerHand';
import ScorePanel from './ScorePanel';
import Timer from './Timer';
import LetterPicker from './LetterPicker';
import GameOverModal from './GameOverModal';
import { GAME_MODE_10 } from '../utils/constants';
import { sounds } from '../utils/SoundManager';

export default function GameAI() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get('mode') || GAME_MODE_10;
  const difficulty = parseFloat(searchParams.get('difficulty') || '0.2');

  const engine = useGameEngine();
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(sounds.isEnabled());

  useEffect(() => {
    engine.initGame(mode, difficulty);
  }, []);

  const handleCellClick = useCallback((idx: number) => {
    if (engine.isAiThinking || engine.isGameOver || !engine.isPlayerTurn) return;

    const letter = engine.boardLetters[idx];

    if (engine.placedIndexes.includes(idx)) {
      engine.removeTile(idx);
      return;
    }

    if (letter !== '') return;

    if (selectedTile !== null) {
      sounds.playPlaceTile();
      engine.placeTile(idx, selectedTile);
      setSelectedTile(null);
      return;
    }

    if (engine.playerHand.length > 0) {
      setPickerTarget(idx);
      setShowPicker(true);
    }
  }, [engine, selectedTile]);

  const handlePickLetter = useCallback((letterIndex: number) => {
    if (pickerTarget !== null) {
      sounds.playPlaceTile();
      engine.placeTile(pickerTarget, letterIndex);
    }
    setShowPicker(false);
    setPickerTarget(null);
  }, [engine, pickerTarget]);

  if (engine.loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Memuat permainan...</p>
      </div>
    );
  }

  return (
    <div className="game-root">
      <div className="game-topbar">
        <div className="topbar-left">
          <button className="btn-back" onClick={() => { sounds.playClick(); navigate('/'); }}>
            Kembali
          </button>
          <button 
            className="btn-icon ml-2" 
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
        <div className="topbar-center">
          {engine.isAiThinking ? (
            <div className="turn-badge thinking">
              <div className="thinking-dots">
                <span /><span /><span />
              </div>
              AI berpikir...
            </div>
          ) : engine.isPlayerTurn ? (
            <div className="turn-badge your-turn">Giliran Kamu</div>
          ) : null}
        </div>
        <Timer seconds={engine.timer} />
      </div>

      <div className="game-layout">
        <div className="game-main">
          <GameBoard
            boardLetters={engine.boardLetters}
            placedIndexes={engine.placedIndexes}
            aiPlacedIndexes={engine.aiPlacedIndexes}
            onCellClick={handleCellClick}
            disabled={engine.isAiThinking || engine.isGameOver || !engine.isPlayerTurn}
          />
        </div>

        <div className="game-sidebar">
          <ScorePanel
            playerScore={engine.playerScore}
            aiScore={engine.aiScore}
            stashCount={engine.stash.length}
            gameMode={engine.gameMode}
            playerTurns={engine.playerTurns}
            aiTurns={engine.aiTurns}
            lastWords={engine.lastWords}
          />

          <div className="hand-section">
            <div className="hand-header">
              <span className="hand-label">Huruf Kamu</span>
              <button className="btn-icon" onClick={() => { sounds.playClick(); engine.shuffleHand(); }} title="Acak huruf">🔀</button>
            </div>
            <PlayerHand
              letters={engine.playerHand}
              selectedIndex={selectedTile}
              onSelect={(i) => setSelectedTile(prev => prev === i ? null : i)}
              config={engine.config}
              disabled={engine.isAiThinking || engine.isGameOver || !engine.isPlayerTurn}
            />
          </div>

          <div className="action-buttons">
            <button
              className="btn-primary"
              onClick={() => { sounds.playClick(); engine.handlePlay(); }}
              disabled={engine.currentPoints === null || engine.isAiThinking || !engine.isPlayerTurn}
            >
              {engine.currentPoints !== null
                ? `Mainkan (+${engine.currentPoints})`
                : 'Mainkan'}
            </button>
            <div className="action-row">
              <button
                className="btn-secondary"
                onClick={() => { sounds.playClick(); engine.recallTiles(); }}
                disabled={engine.placedIndexes.length === 0 || engine.isAiThinking}
              >
                Tarik
              </button>
              <button
                className="btn-outline"
                onClick={() => { sounds.playClick(); engine.handlePass(); }}
                disabled={engine.isAiThinking || engine.isGameOver || !engine.isPlayerTurn}
              >
                Lewati
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPicker && (
        <LetterPicker
          letters={engine.playerHand}
          onPick={handlePickLetter}
          onClose={() => { setShowPicker(false); setPickerTarget(null); }}
          config={engine.config}
        />
      )}

      {engine.isGameOver && (
        <GameOverModal
          playerScore={engine.playerScore}
          aiScore={engine.aiScore}
          onPlayAgain={() => { sounds.playClick(); engine.initGame(mode, difficulty); }}
          onHome={() => { sounds.playClick(); navigate('/'); }}
        />
      )}
    </div>
  );
}
