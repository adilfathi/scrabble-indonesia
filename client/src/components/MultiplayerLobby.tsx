import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultiplayer } from '../context/MultiplayerContext';
import { GAME_MODE_30, GAME_MODE_10, GAME_MODE_3 } from '../utils/constants';
import { sounds } from '../utils/SoundManager';

export default function MultiplayerLobby() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState(GAME_MODE_10);
  const { createRoom, joinRoom, room, error } = useMultiplayer();

  if (room && room.status === 'waiting') {
    return (
      <div className="home-root">
        <div className="home-container">
          <div className="home-card glass text-center">
            <h2>Room: {room.roomCode}</h2>
            <p className="mt-4">Menunggu lawan...</p>
            <div className="players-list mt-4">
              {room.players.map(p => (
                <div key={p.id} className="player-badge">{p.name}</div>
              ))}
            </div>
            <p className="diff-hint mt-4">Berikan kode ini ke temanmu.</p>
          </div>
        </div>
      </div>
    );
  }

  if (room && room.status === 'playing') {
    navigate('/multiplayer/play');
  }

  return (
    <div className="home-root">
      <div className="home-container">
        <div className="home-header">
          <h1 className="logo-text">MULTIPLAYER</h1>
          <button className="btn-back mt-2" onClick={() => { sounds.playClick(); navigate('/'); }}>Kembali</button>
        </div>
        
        <div className="home-card glass">
          {error && <div className="error-alert mb-4">{error}</div>}
          
          <div className="mb-4">
            <label className="input-label">Nama Kamu</label>
            <input 
              className="text-input" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Masukkan nama..." 
              maxLength={15}
            />
          </div>

          <div className="option-section mt-4">
            <label className="input-label">Pilih Mode</label>
            <div className="mode-toggle">
              <button 
                className={`mode-btn ${mode === GAME_MODE_3 ? 'active' : ''}`}
                onClick={() => { sounds.playClick(); setMode(GAME_MODE_3); }}
              >
                3× Giliran
              </button>
              <button 
                className={`mode-btn ${mode === GAME_MODE_10 ? 'active' : ''}`}
                onClick={() => { sounds.playClick(); setMode(GAME_MODE_10); }}
              >
                10× Giliran
              </button>
              <button 
                className={`mode-btn ${mode === GAME_MODE_30 ? 'active' : ''}`}
                onClick={() => { sounds.playClick(); setMode(GAME_MODE_30); }}
              >
                30× Giliran
              </button>
            </div>
          </div>

          <div className="action-row mt-6">
            <button 
              className="btn-primary" 
              onClick={() => { sounds.playClick(); createRoom(name, mode); }}
              disabled={!name.trim()}
            >
              Buat Room
            </button>
          </div>

          <div className="divider my-6"><span>ATAU</span></div>

          <div className="mb-4">
            <label className="input-label">Kode Room</label>
            <input 
              className="text-input text-center uppercase" 
              value={roomCode} 
              onChange={e => setRoomCode(e.target.value.toUpperCase())} 
              placeholder="XXXXXX" 
              maxLength={6}
            />
          </div>

          <button 
            className="btn-secondary w-full" 
            onClick={() => { sounds.playClick(); joinRoom(name, roomCode); }}
            disabled={!name.trim() || roomCode.length < 4}
          >
            Gabung Room
          </button>
        </div>
      </div>
    </div>
  );
}
