import React from 'react';

interface GameOverModalProps {
  playerScore: number;
  aiScore: number;
  onPlayAgain: () => void;
  onHome: () => void;
}

export default function GameOverModal({
  playerScore,
  aiScore,
  onPlayAgain,
  onHome,
}: GameOverModalProps) {
  const isWin = playerScore > aiScore;
  const isDraw = playerScore === aiScore;

  return (
    <div className="modal-overlay">
      <div className="modal-card glass">
        <div className={`modal-icon ${isWin ? 'win' : isDraw ? 'draw' : 'lose'}`}>
          {isWin ? '🏆' : isDraw ? '🤝' : '😔'}
        </div>
        <h2 className="modal-title">
          {isWin ? 'Kamu Menang!' : isDraw ? 'Seri!' : 'Kamu Kalah!'}
        </h2>
        <div className="modal-scores">
          <div className="modal-score-block">
            <span className="modal-score-label">Kamu</span>
            <span className={`modal-score-num ${isWin ? 'highlight' : ''}`}>{playerScore}</span>
          </div>
          <span className="modal-vs">—</span>
          <div className="modal-score-block">
            <span className="modal-score-label">Lawan</span>
            <span className={`modal-score-num ${!isWin && !isDraw ? 'highlight' : ''}`}>{aiScore}</span>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-primary" onClick={onPlayAgain}>Main Lagi</button>
          <button className="btn-secondary" onClick={onHome}>Kembali</button>
        </div>
      </div>
    </div>
  );
}
