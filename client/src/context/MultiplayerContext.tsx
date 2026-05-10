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
  leaveRoom: () => void;
  togglePause: () => void;
  placeTile: (boardIndex: number, letterIndex: number) => void;
  removeTile: (boardIndex: number) => void;
  recallTiles: () => void;
  makeMove: () => void;
  passTurn: () => void;
}

const MultiplayerContext = createContext<MultiplayerContextType | undefined>(undefined);

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
  const passTurnRef = useRef<() => void>(() => {});

  useEffect(() => {
    const init = async () => {
      const c = await loadLanguageConfig('/config/indonesian.jsonp');
      await loadDictionary('/dict/indonesian.txt');
      setConfig(c);
      
      const newSocket = io();
      setSocket(newSocket);
      setLoading(false);

      newSocket.on('roomCreated', (data) => {
        setRoom({ roomCode: data.roomCode, players: data.players, status: 'waiting', gameMode: data.gameMode });
        setError(null);
      });

      newSocket.on('roomJoined', (data) => {
        setRoom({ roomCode: data.roomCode, players: data.players, status: 'waiting', gameMode: data.gameMode });
        setError(null);
      });

      newSocket.on('playerJoined', (data) => {
        setRoom(prev => prev ? { ...prev, players: data.players, gameMode: data.gameMode } : null);
      });

      newSocket.on('roomError', (data) => {
        setError(data.message);
      });

      newSocket.on('gameStarted', (data) => {
        setGameId(data.gameId);
        setRoom(prev => prev ? { ...prev, status: 'playing' } : null);
        setGameState({
          boardLetters: Array(TOTAL_CELLS).fill(''),
          yourLetters: data.yourLetters,
          opponentScore: 0,
          yourScore: 0,
          isYourTurn: data.isYourTurn,
          letterStash: 100
        });
        setBoardLetters(Array(TOTAL_CELLS).fill(''));
        setLocalHand(data.yourLetters);
        setPlacedIndexes([]);
        setIsPaused(false);
        if (data.isYourTurn) startTimer();
      });

      newSocket.on('moveAccepted', (data) => {
        setGameState(prev => prev ? {
          ...prev,
          boardLetters: data.boardLetters,
          yourLetters: data.yourLetters,
          yourScore: data.yourScore,
          isYourTurn: data.isYourTurn,
          playerTurns: data.playerTurns,
          aiTurns: data.aiTurns
        } : null);
        setBoardLetters(data.boardLetters);
        setLocalHand(data.yourLetters);
        setPlacedIndexes([]);
        if (data.isYourTurn) startTimer();
        else stopTimer();
      });

      newSocket.on('opponentMove', (data) => {
        setGameState(prev => prev ? {
          ...prev,
          boardLetters: data.boardLetters,
          opponentScore: data.opponentScore,
          isYourTurn: data.isYourTurn,
          letterStash: data.letterStash,
          playerTurns: data.playerTurns,
          aiTurns: data.aiTurns
        } : null);
        setBoardLetters(data.boardLetters);
        if (data.isYourTurn) startTimer();
      });

      newSocket.on('opponentPassed', (data) => {
        setGameState(prev => prev ? { 
          ...prev, 
          isYourTurn: data.isYourTurn,
          playerTurns: data.playerTurns,
          aiTurns: data.aiTurns
        } : null);
        if (data.isYourTurn) startTimer();
      });

      newSocket.on('pauseToggled', (data) => {
        setIsPaused(data.isPaused);
      });

      newSocket.on('gameEnded', (data) => {
        setRoom(prev => prev ? { ...prev, status: 'finished' } : null);
        setGameState(prev => prev ? {
          ...prev,
          yourScore: data.yourScore,
          opponentScore: data.opponentScore,
          isFinished: true
        } : null);
        stopTimer();
        
        if (data.yourScore > data.opponentScore) {
          sounds.playWin();
        } else if (data.opponentScore > data.yourScore) {
          sounds.playLose();
        }
      });
    };

    init();
    return () => {
      if (socket) socket.disconnect();
      stopTimer();
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
    if (isPaused) stopTimer();
    else if (gameState?.isYourTurn && room?.status === 'playing') startTimer();
  }, [isPaused, gameState?.isYourTurn, room?.status]);

  const startTimer = () => {
    if (isPaused) return;
    setTimer(TURN_TIMER_SECONDS);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          stopTimer();
          setTimeout(() => passTurnRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => clearInterval(timerRef.current);

  const createRoom = (playerName: string, mode: string) => socket?.emit('createRoom', { playerName, gameMode: mode });
  const joinRoom = (playerName: string, roomCode: string) => socket?.emit('joinRoom', { playerName, roomCode });
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
    setRoom(null);
    setGameId(null);
    setGameState(null);
    stopTimer();
  };

  const togglePause = () => {
    if (room) socket?.emit('togglePause', { roomCode: room.roomCode });
  };

  const placeTile = (boardIndex: number, letterIndex: number) => {
    if (!gameState?.isYourTurn) return;
    setLocalHand(prev => {
      const next = [...prev];
      next.splice(letterIndex, 1);
      return next;
    });
    setBoardLetters(prev => {
      const next = [...prev];
      next[boardIndex] = localHand[letterIndex];
      return next;
    });
    setPlacedIndexes(prev => [...prev, boardIndex]);
  };

  const removeTile = (boardIndex: number) => {
    if (!gameState?.isYourTurn) return;
    const letter = boardLetters[boardIndex];
    if (!placedIndexes.includes(boardIndex)) return;
    setLocalHand(prev => [...prev, letter]);
    setBoardLetters(prev => {
      const next = [...prev];
      next[boardIndex] = '';
      return next;
    });
    setPlacedIndexes(prev => prev.filter(i => i !== boardIndex));
  };

  const recallTiles = () => {
    if (!gameState?.isYourTurn) return;
    const letters = placedIndexes.map(i => boardLetters[i]);
    setBoardLetters(prev => {
      const next = [...prev];
      placedIndexes.forEach(i => { next[i] = ''; });
      return next;
    });
    setLocalHand(prev => [...prev, ...letters]);
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
      remainingLetters: localHand
    });
    stopTimer();
  };

  const passTurn = () => {
    if (!gameState?.isYourTurn) return;
    recallTiles();
    socket?.emit('passTurn', { gameId });
    stopTimer();
  };

  useEffect(() => {
    passTurnRef.current = passTurn;
  }, [gameState?.isYourTurn, gameId, placedIndexes]);

  return (
    <MultiplayerContext.Provider value={{
      socket, loading, room, gameId, gameState, error, config, currentPoints,
      boardLetters, placedIndexes, localHand, timer, isPaused,
      createRoom, joinRoom, leaveRoom, togglePause,
      placeTile, removeTile, recallTiles, makeMove, passTurn
    }}>
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
