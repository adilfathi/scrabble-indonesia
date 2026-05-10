import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import GameAI from './components/GameAI';
import AILobby from './components/AILobby';
import MultiplayerLobby from './components/MultiplayerLobby';
import GameMultiplayer from './components/GameMultiplayer';
import { ThemeProvider } from './context/ThemeContext';
import { MultiplayerProvider } from './context/MultiplayerContext';

export default function App() {
  return (
    <ThemeProvider>
      <MultiplayerProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/ai" element={<AILobby />} />
            <Route path="/play" element={<GameAI />} />
            <Route path="/multiplayer" element={<MultiplayerLobby />} />
            <Route path="/multiplayer/play" element={<GameMultiplayer />} />
          </Routes>
        </BrowserRouter>
      </MultiplayerProvider>
    </ThemeProvider>
  );
}
