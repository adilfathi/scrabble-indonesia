import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { loadLanguageConfig, loadDictionary, validateAndScore } from '../utils/gameLogic';
import { TOTAL_CELLS, TURN_TIMER_SECONDS } from '../utils/constants';
import { RoomState, GameState } from '../types';
import { sounds } from '../utils/SoundManager';

interface MultiplayerContextType {
  socket: Socket | null;
  loading: boolean;
  room: RoomState | null;
  gameId: string | null;
  gameState: GameState | null;
  error: string | null;
  config: any;
  currentPoints: number | null;
  boardLetters: string[];
  placedIndexes: number[];
  localHand: string[];
  timer: number;
  isPaused: boolean;
  createRoom: (playerName: string, mode: string) => void;
  joinRoom: (playerName: string, roomCode: string) => void;
  startGame: () => void;
  leaveRoom: () => void;
  togglePause: () => void;
  placeTile: (boardIndex: number, letterIndex: number) => void;
  removeTile: (boardIndex: number) => void;
  recallTiles: () => void;
  makeMove: () => void;
  passTurn: () => void;
}

const SESSION_KEY = 'scrabble_mp_session_v1';
const MultiplayerContext = createContext<MultiplayerContextType | undefined>(undefined);

type ReconnectSession = {
  playerName: string;
  roomCode: string;
};

function saveSession(session: ReconnectSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function loadSession(): ReconnectSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export const MultiplayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);

  const [placedIndexes, setPlacedIndexes] = useState<number[]>([]);
  const [boardLetters, setBoardLetters] = useState<string[]>(Array(TOTAL_CELLS).fill(''));
  const [localHand, setLocalHand] = useState<string[]>([]);
  const [timer, setTimer] = useState(TURN_TIMER_SECONDS);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<number | null>(null);

  const timerRef = useRef<any>(null);
  const sessionRef = useRef<ReconnectSession | null>(loadSession());
  const socketRef = useRef<Socket | null>(null);

  const applyGameState = (data: any) => {
    setGameState((prev) => ({
      ...(prev || {}),
      ...data,
    }));
    if (Array.isArray(data.boardLetters)) setBoardLetters(data.boardLetters);
    if (Array.isArray(data.yourLetters)) setLocalHand(data.yourLetters);
    setPlacedIndexes([]);
    if (typeof data.turnEndsAt === 'number') {
      const secs = Math.max(0, Math.ceil((data.turnEndsAt - Date.now()) / 1000));
      setTimer(secs);
    }
  };

  useEffect(() => {
    const init = async () => {
      const c = await loadLanguageConfig('/config/indonesian.jsonp');
      await loadDictionary('/dict/indonesian.txt');
      setConfig(c);

      const newSocket = io({ reconnection: true, reconnectionAttempts: Infinity });
      socketRef.current = newSocket;
      setSocket(newSocket);
      setLoading(false);

      newSocket.on('connect', () => {
        const saved = sessionRef.current || loadSession();
        if (saved && saved.roomCode) {
          newSocket.emit('joinRoom', {
            playerName: saved.playerName,
            roomCode: saved.roomCode,
          });
        }
      });

      newSocket.on('roomCreated', (data) => {
        setRoom({
          roomCode: data.roomCode,
          players: data.players,
          status: data.status || 'waiting',
          gameMode: data.gameMode,
          creatorId: data.creatorId,
          maxPlayers: data.maxPlayers,
        });
        setError(null);
      });

      newSocket.on('roomJoined', (data) => {
        setRoom({
          roomCode: data.roomCode,
          players: data.players,
          status: data.status || 'waiting',
          gameMode: data.gameMode,
          creatorId: data.creatorId,
          maxPlayers: data.maxPlayers,
        });
        setError(null);
      });

      newSocket.on('playerJoined', (data) => {
        setRoom((prev) => prev
          ? {
            ...prev,
            players: data.players,
            gameMode: data.gameMode,
            creatorId: data.creatorId ?? prev.creatorId,
            maxPlayers: data.maxPlayers ?? prev.maxPlayers,
            status: data.status ?? prev.status,
          }
          : null);
      });

      newSocket.on('playerLeft', (data) => {
        setRoom((prev) => prev
          ? {
            ...prev,
            players: data.players || prev.players,
            status: data.status || prev.status,
          }
          : null);
      });

      newSocket.on('roomUpdated', (data) => {
        setRoom((prev) => prev
          ? {
            ...prev,
            players: data.players,
            gameMode: data.gameMode,
            creatorId: data.creatorId ?? prev.creatorId,
            maxPlayers: data.maxPlayers ?? prev.maxPlayers,
            status: data.status ?? prev.status,
          }
          : null);
      });

      newSocket.on('roomError', (data) => {
        setError(data.message);
        if (typeof data?.message === 'string' && data.message.includes('Room tidak ditemukan')) {
          clearSession();
          sessionRef.current = null;
        }
      });

      newSocket.on('gameStarted', (data) => {
        setGameId(data.gameId);
        setRoom((prev) => (prev ? { ...prev, status: 'playing' } : null));
        setIsPaused(false);
        applyGameState(data);
      });

      newSocket.on('gameStateUpdated', (data) => {
        applyGameState(data);
      });

      // Keep compatibility if server emits legacy events.
      newSocket.on('moveAccepted', (data) => applyGameState(data));
      newSocket.on('opponentMove', (data) => applyGameState(data));
      newSocket.on('opponentPassed', (data) => applyGameState(data));

      newSocket.on('pauseToggled', (data) => {
        setIsPaused(data.isPaused);
      });

      newSocket.on('gameEnded', (data) => {
        setRoom((prev) => (prev ? { ...prev, status: 'finished' } : null));
        setGameState((prev) => prev ? {
          ...prev,
          yourScore: data.yourScore,
          opponentScore: data.opponentScore,
          isFinished: true,
          players: data.players || prev.players,
        } : null);
        stopTimer();

        if (data.winner === true) sounds.playWin();
        else sounds.playLose();
      });

      newSocket.on('opponentDisconnected', () => {
        setError('Koneksi pemain lain terputus. Menunggu reconnect...');
      });
    };

    init();
    return () => {
      stopTimer();
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (placedIndexes.length === 0 || !config) {
      setCurrentPoints(null);
      return;
    }
    const result = validateAndScore(boardLetters, placedIndexes, config.POINTS_PER_LETTER);
    setCurrentPoints(result ? result.points : null);
  }, [boardLetters, placedIndexes, config]);

  useEffect(() => {
    if (isPaused || room?.status !== 'playing' || gameState?.isFinished || !gameState?.turnEndsAt) {
      stopTimer();
      return;
    }

    const tick = () => {
      const secs = Math.max(0, Math.ceil((gameState.turnEndsAt! - Date.now()) / 1000));
      setTimer(secs);
    };

    tick();
    clearInterval(timerRef.current);
    timerRef.current = setInterval(tick, 250);
    return () => clearInterval(timerRef.current);
  }, [isPaused, room?.status, gameState?.turnEndsAt, gameState?.isFinished]);

  const stopTimer = () => clearInterval(timerRef.current);

  const createRoom = (playerName: string, mode: string) => {
    const trimmed = playerName.trim();
    socket?.emit('createRoom', { playerName: trimmed, gameMode: mode });
    // roomCode will be filled after roomCreated.
    sessionRef.current = { playerName: trimmed, roomCode: '' };
  };

  const joinRoom = (playerName: string, roomCode: string) => {
    const session = {
      playerName: playerName.trim(),
      roomCode: roomCode.trim().toUpperCase(),
    };
    sessionRef.current = session;
    saveSession(session);
    socket?.emit('joinRoom', session);
  };

  const startGame = () => {
    if (room) socket?.emit('startGame', { roomCode: room.roomCode });
  };

  useEffect(() => {
    if (!room?.roomCode || !sessionRef.current?.playerName) return;
    const completed = {
      playerName: sessionRef.current.playerName,
      roomCode: room.roomCode,
    };
    sessionRef.current = completed;
    saveSession(completed);
  }, [room?.roomCode]);

  useEffect(() => {
    if (gameState?.isYourTurn && room?.status === 'playing' && !gameState?.isFinished) {
      sounds.playTurnStart();
    }
  }, [gameState?.isYourTurn, room?.status, gameState?.isFinished]);

  useEffect(() => {
    if (timer <= 10 && timer > 0 && gameState?.isYourTurn && room?.status === 'playing' && !gameState?.isFinished && !isPaused) {
      sounds.playTimerWarning();
    }
  }, [timer, gameState?.isYourTurn, room?.status, gameState?.isFinished, isPaused]);

  const leaveRoom = () => {
    if (room) socket?.emit('leaveRoom', { roomCode: room.roomCode });
    clearSession();
    sessionRef.current = null;
    setRoom(null);
    setGameId(null);
    setGameState(null);
    setPlacedIndexes([]);
    setBoardLetters(Array(TOTAL_CELLS).fill(''));
    setLocalHand([]);
    setIsPaused(false);
    setCurrentPoints(null);
    stopTimer();
  };

  const togglePause = () => {
    if (room) socket?.emit('togglePause', { roomCode: room.roomCode });
  };

  const placeTile = (boardIndex: number, letterIndex: number) => {
    if (!gameState?.isYourTurn) return;
    setLocalHand((prev) => {
      const next = [...prev];
      next.splice(letterIndex, 1);
      return next;
    });
    setBoardLetters((prev) => {
      const next = [...prev];
      next[boardIndex] = localHand[letterIndex];
      return next;
    });
    setPlacedIndexes((prev) => [...prev, boardIndex]);
  };

  const removeTile = (boardIndex: number) => {
    if (!gameState?.isYourTurn) return;
    const letter = boardLetters[boardIndex];
    if (!placedIndexes.includes(boardIndex)) return;
    setLocalHand((prev) => [...prev, letter]);
    setBoardLetters((prev) => {
      const next = [...prev];
      next[boardIndex] = '';
      return next;
    });
    setPlacedIndexes((prev) => prev.filter((i) => i !== boardIndex));
  };

  const recallTiles = () => {
    if (!gameState?.isYourTurn) return;
    const letters = placedIndexes.map((i) => boardLetters[i]);
    setBoardLetters((prev) => {
      const next = [...prev];
      placedIndexes.forEach((i) => { next[i] = ''; });
      return next;
    });
    setLocalHand((prev) => [...prev, ...letters]);
    setPlacedIndexes([]);
  };

  const makeMove = () => {
    if (!gameState?.isYourTurn || !config) return;
    const result = validateAndScore(boardLetters, placedIndexes, config.POINTS_PER_LETTER);
    if (!result) {
      sounds.playError();
      return;
    }
    sounds.playSuccess();
    socket?.emit('makeMove', {
      gameId,
      boardLetters,
      words: result.words,
      points: result.points,
      remainingLetters: localHand,
    });
  };

  const passTurn = () => {
    if (!gameState?.isYourTurn) return;
    recallTiles();
    socket?.emit('passTurn', { gameId });
  };

  return (
    <MultiplayerContext.Provider value={{
      socket,
      loading,
      room,
      gameId,
      gameState,
      error,
      config,
      currentPoints,
      boardLetters,
      placedIndexes,
      localHand,
      timer,
      isPaused,
      createRoom,
      joinRoom,
      startGame,
      leaveRoom,
      togglePause,
      placeTile,
      removeTile,
      recallTiles,
      makeMove,
      passTurn,
    }}
    >
      {children}
    </MultiplayerContext.Provider>
  );
};

export const useMultiplayer = () => {
  const context = useContext(MultiplayerContext);
  if (context === undefined) {
    throw new Error('useMultiplayer must be used within a MultiplayerProvider');
  }
  return context;
};
