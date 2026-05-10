import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultiplayer } from '../context/MultiplayerContext';
import GameBoard from './GameBoard';
import PlayerHand from './PlayerHand';
import ScorePanel from './ScorePanel';
import Timer from './Timer';
import LetterPicker from './LetterPicker';
import GameOverModal from './GameOverModal';
import { sounds } from '../utils/SoundManager';

export default function GameMultiplayer() {
  const navigate = useNavigate();
  const engine = useMultiplayer();
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(sounds.isEnabled());

  if (!engine.gameState) {
    return (
      <div className="loading-screen">
        <p>Menghubungkan ke permainan...</p>
        <button className="btn-secondary mt-4" onClick={() => { sounds.playClick(); navigate('/multiplayer'); }}>Kembali ke Lobby</button>
      </div>
    );
  }

  const isMyTurn = engine.gameState.isYourTurn;
  const isGameOver = engine.room?.status === 'finished';
  const isPaused = engine.isPaused;

  const handleCellClick = useCallback((idx: number) => {
    if (!isMyTurn || isGameOver || isPaused) return;

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

    if (engine.localHand.length > 0) {
      setPickerTarget(idx);
      setShowPicker(true);
    }
  }, [engine, selectedTile, isMyTurn, isGameOver, isPaused]);

  const handlePickLetter = useCallback((letterIndex: number) => {
    if (pickerTarget !== null) {
      sounds.playPlaceTile();
      engine.placeTile(pickerTarget, letterIndex);
    }
    setShowPicker(false);
    setPickerTarget(null);
  }, [engine, pickerTarget]);

  return (
    <div className="game-root">
      <div className="game-topbar">
        <div className="topbar-left">
          <button className="btn-back" onClick={() => { sounds.playClick(); navigate('/multiplayer'); }}>Keluar</button>
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
          {!isGameOver && (
            <button className="btn-secondary ml-2" onClick={() => { sounds.playClick(); engine.togglePause(); }}>
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          )}
        </div>
        <div className="topbar-center">
          {isGameOver ? (
            <div className="turn-badge your-turn">Permainan Selesai</div>
          ) : isPaused ? (
            <div className="turn-badge thinking">Permainan Dipause</div>
          ) : isMyTurn ? (
            <div className="turn-badge your-turn">Giliran Kamu</div>
          ) : (
            <div className="turn-badge thinking">Menunggu Lawan...</div>
          )}
        </div>
        <Timer seconds={engine.timer} />
      </div>

      <div className="game-layout">
        <div className="game-main">
          <GameBoard
            boardLetters={engine.boardLetters}
            placedIndexes={engine.placedIndexes}
            aiPlacedIndexes={[]}
            onCellClick={handleCellClick}
            disabled={!isMyTurn || isGameOver || isPaused}
          />
        </div>

        <div className="game-sidebar">
          <ScorePanel
            playerScore={engine.gameState.yourScore}
            aiScore={engine.gameState.opponentScore}
            stashCount={engine.gameState.letterStash}
            gameMode={engine.room?.gameMode || 'Multiplayer'}
            playerTurns={engine.gameState.playerTurns || 0}
            aiTurns={engine.gameState.aiTurns || 0}
            lastWords={engine.gameState.lastWords || []}
          />

          <div className="hand-section">
            <div className="hand-header">
              <span className="hand-label">Huruf Kamu</span>
            </div>
            <PlayerHand
              letters={engine.localHand}
              selectedIndex={selectedTile}
              onSelect={(i) => setSelectedTile(prev => prev === i ? null : i)}
              config={engine.config}
              disabled={!isMyTurn || isGameOver || isPaused}
            />
          </div>

          <div className="action-buttons">
            <button
              className="btn-primary"
              onClick={() => { sounds.playClick(); engine.makeMove(); }}
              disabled={!isMyTurn || engine.placedIndexes.length === 0 || isPaused || engine.currentPoints === null}
            >
              Mainkan {engine.currentPoints !== null ? `(+${engine.currentPoints} Poin)` : ''}
            </button>
            <div className="action-row">
              <button
                className="btn-secondary"
                onClick={() => { sounds.playClick(); engine.recallTiles(); }}
                disabled={!isMyTurn || engine.placedIndexes.length === 0 || isPaused}
              >
                Tarik Kembali
              </button>
              <button
                className="btn-outline"
                onClick={() => { sounds.playClick(); engine.passTurn(); }}
                disabled={!isMyTurn || isPaused}
              >
                Lewati
              </button>
            </div>
          </div>
        </div>
      </div>

      {isPaused && (
        <div className="modal-overlay">
          <div className="modal-card glass text-center">
            <div className="modal-icon">⏸️</div>
            <h2 className="modal-title">Permainan Dipause</h2>
            <p className="mb-6 color-text-dim">Menunggu salah satu pemain melanjutkan permainan...</p>
            <button className="btn-primary w-full" onClick={() => { sounds.playClick(); engine.togglePause(); }}>Resume</button>
          </div>
        </div>
      )}

      {showPicker && (
        <LetterPicker
          letters={engine.localHand}
          onPick={handlePickLetter}
          onClose={() => { setShowPicker(false); setPickerTarget(null); }}
          config={engine.config}
        />
      )}

      {isGameOver && engine.gameState && (
        <GameOverModal
          playerScore={engine.gameState.yourScore}
          aiScore={engine.gameState.opponentScore}
          onPlayAgain={() => {
            sounds.playClick();
            engine.leaveRoom();
            navigate('/multiplayer');
          }}
          onHome={() => {
            sounds.playClick();
            engine.leaveRoom();
            navigate('/');
          }}
        />
      )}
    </div>
  );
}
