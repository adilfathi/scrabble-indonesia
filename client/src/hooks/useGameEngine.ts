import { useState, useCallback, useRef, useEffect } from 'react';
import {
  loadLanguageConfig,
  loadDictionary,
  createLetterStash,
  drawTiles,
  shuffleArray,
  validateAndScore,
  computeAIMove,
} from '../utils/gameLogic';
import {
  TOTAL_CELLS,
  HAND_SIZE,
  GAME_MODE_30,
  GAME_MODE_20,
  GAME_MODE_10,
  GAME_MODE_3,
  MAX_TURNS_MODE_30,
  MAX_TURNS_MODE_20,
  MAX_TURNS_MODE_10,
  MAX_TURNS_MODE_3,
  TURN_TIMER_SECONDS,
} from '../utils/constants';
import { sounds } from '../utils/SoundManager';

export default function useGameEngine() {
  const [loading, setLoading] = useState(true);
  const [boardLetters, setBoardLetters] = useState<string[]>(() => Array(TOTAL_CELLS).fill(''));
  const [placedIndexes, setPlacedIndexes] = useState<number[]>([]);
  const [aiPlacedIndexes, setAiPlacedIndexes] = useState<number[]>([]);
  const [playerHand, setPlayerHand] = useState<string[]>([]);
  const [aiHand, setAiHand] = useState<string[]>([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [stash, setStash] = useState<string[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<number | null>(null);
  const [gameMode, setGameMode] = useState<string>(GAME_MODE_10);
  const [aiLevel, setAiLevel] = useState(0.2);
  const [playerTurns, setPlayerTurns] = useState(0);
  const [aiTurns, setAiTurns] = useState(0);
  const [passCount, setPassCount] = useState(0);
  const [timer, setTimer] = useState(TURN_TIMER_SECONDS);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [lastWords, setLastWords] = useState<string[]>([]);

  const configRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const handlePassRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (gameStarted && !isGameOver && isPlayerTurn && !isAiThinking) {
      sounds.playTurnStart();
    }
  }, [isPlayerTurn, gameStarted, isGameOver, isAiThinking]);

  useEffect(() => {
    if (timer <= 10 && timer > 0 && isPlayerTurn && !isGameOver && !isAiThinking) {
      sounds.playTimerWarning();
    }
  }, [timer, isPlayerTurn, isGameOver, isAiThinking]);

  // Timer effect
  useEffect(() => {
    if (!gameStarted || isGameOver || isAiThinking || !isPlayerTurn) {
      return;
    }

    setTimer(TURN_TIMER_SECONDS);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setTimeout(() => handlePassRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [gameStarted, isGameOver, isAiThinking, isPlayerTurn, playerTurns]);

  const initGame = useCallback(async (mode = GAME_MODE_10, difficulty = 0.2) => {
    setLoading(true);
    setGameMode(mode);
    setAiLevel(difficulty);

    const config = await loadLanguageConfig('/config/indonesian.jsonp');
    await loadDictionary('/dict/indonesian.txt');
    configRef.current = config;

    const letterStash = createLetterStash(config);
    const p1 = drawTiles([], letterStash, HAND_SIZE);
    const p2 = drawTiles([], p1.stash, HAND_SIZE);

    setBoardLetters(Array(TOTAL_CELLS).fill(''));
    setPlacedIndexes([]);
    setAiPlacedIndexes([]);
    setPlayerHand(p1.hand);
    setAiHand(p2.hand);
    setStash(p2.stash);
    setPlayerScore(0);
    setAiScore(0);
    setIsGameOver(false);
    setIsAiThinking(false);
    setCurrentPoints(null);
    setPlayerTurns(0);
    setAiTurns(0);
    setPassCount(0);
    setIsPlayerTurn(true);
    setGameStarted(true);
    setLastWords([]);
    setTimer(TURN_TIMER_SECONDS);
    setLoading(false);
  }, []);

  const placeTile = useCallback((boardIndex: number, letterIndex: number) => {
    if (!isPlayerTurn || isGameOver || isAiThinking) return;

    setPlayerHand(prev => {
      const next = [...prev];
      next.splice(letterIndex, 1);
      return next;
    });
    setBoardLetters(prev => {
      const next = [...prev];
      next[boardIndex] = playerHand[letterIndex];
      return next;
    });
    setPlacedIndexes(prev => [...prev, boardIndex]);
  }, [isPlayerTurn, isGameOver, isAiThinking, playerHand]);

  const removeTile = useCallback((boardIndex: number) => {
    if (!isPlayerTurn || isGameOver || isAiThinking) return;
    const letter = boardLetters[boardIndex];
    if (!placedIndexes.includes(boardIndex)) return;

    setPlayerHand(prev => [...prev, letter]);
    setBoardLetters(prev => {
      const next = [...prev];
      next[boardIndex] = '';
      return next;
    });
    setPlacedIndexes(prev => prev.filter(i => i !== boardIndex));
  }, [isPlayerTurn, isGameOver, isAiThinking, boardLetters, placedIndexes]);

  const recallTiles = useCallback(() => {
    if (!isPlayerTurn) return;
    const letters = placedIndexes.map(i => boardLetters[i]);
    setBoardLetters(prev => {
      const next = [...prev];
      placedIndexes.forEach(i => { next[i] = ''; });
      return next;
    });
    setPlayerHand(prev => [...prev, ...letters]);
    setPlacedIndexes([]);
    setCurrentPoints(null);
  }, [isPlayerTurn, boardLetters, placedIndexes]);

  useEffect(() => {
    if (placedIndexes.length === 0 || !configRef.current) {
      setCurrentPoints(null);
      return;
    }
    const result = validateAndScore(boardLetters, placedIndexes, configRef.current.POINTS_PER_LETTER);
    setCurrentPoints(result ? result.points : null);
  }, [boardLetters, placedIndexes]);

  const checkTurnLimitEnd = (pTurns: number, aTurns: number) => {
    if (gameMode === GAME_MODE_30 && pTurns >= MAX_TURNS_MODE_30 && aTurns >= MAX_TURNS_MODE_30) return true;
    if (gameMode === GAME_MODE_20 && pTurns >= MAX_TURNS_MODE_20 && aTurns >= MAX_TURNS_MODE_20) return true;
    if (gameMode === GAME_MODE_10 && pTurns >= MAX_TURNS_MODE_10 && aTurns >= MAX_TURNS_MODE_10) return true;
    if (gameMode === GAME_MODE_3 && pTurns >= MAX_TURNS_MODE_3 && aTurns >= MAX_TURNS_MODE_3) return true;
    return false;
  };

  const handlePlay = useCallback(() => {
    if (!isPlayerTurn || isGameOver || !configRef.current) return;

    const result = validateAndScore(boardLetters, placedIndexes, configRef.current.POINTS_PER_LETTER);
    if (!result) {
      sounds.playError();
      return;
    }

    sounds.playSuccess();
    clearInterval(timerRef.current);

    setPlayerScore(prev => prev + result.points);
    setLastWords(result.words);
    setPassCount(0);
    setPlacedIndexes([]);
    setAiPlacedIndexes([]);
    setPlayerTurns(prev => prev + 1);

    const drawn = drawTiles(playerHand, stash, HAND_SIZE);
    setPlayerHand(drawn.hand);
    setStash(drawn.stash);

    const newPlayerTurns = playerTurns + 1;
    if (drawn.hand.length === 0 || checkTurnLimitEnd(newPlayerTurns, aiTurns)) {
      endGame(playerScore + result.points, aiScore, drawn.hand, aiHand);
      return;
    }

    setIsPlayerTurn(false);
    setIsAiThinking(true);
    setTimeout(() => doAiTurn(drawn.stash, drawn.hand, newPlayerTurns), 200);
  }, [isPlayerTurn, isGameOver, boardLetters, placedIndexes, playerHand, stash, playerScore, aiScore, aiHand, playerTurns, aiTurns, gameMode]);

  const handlePass = useCallback(() => {
    if (isGameOver) return;

    clearInterval(timerRef.current);

    const newPassCount = passCount + 1;
    setPassCount(newPassCount);
    setPlacedIndexes([]);
    setAiPlacedIndexes([]);
    setPlayerTurns(prev => prev + 1);
    setLastWords([]);

    const letters = placedIndexes.map(i => boardLetters[i]);
    if (letters.length > 0) {
      setBoardLetters(prev => {
        const next = [...prev];
        placedIndexes.forEach(i => { next[i] = ''; });
        return next;
      });
      setPlayerHand(prev => [...prev, ...letters]);
    }

    const newPlayerTurns = playerTurns + 1;
    if (newPassCount >= 4 || checkTurnLimitEnd(newPlayerTurns, aiTurns)) {
      endGame(playerScore, aiScore, playerHand, aiHand);
      return;
    }

    setIsPlayerTurn(false);
    setIsAiThinking(true);
    setTimeout(() => doAiTurn(stash, playerHand, newPlayerTurns), 200);
  }, [isGameOver, passCount, placedIndexes, boardLetters, playerHand, stash, playerScore, aiScore, aiHand, playerTurns, aiTurns, gameMode]);

  useEffect(() => {
    handlePassRef.current = handlePass;
  }, [handlePass]);

  const doAiTurn = useCallback((currentStash: string[], currentPlayerHand: string[], currentPlayerTurns: number) => {
    setBoardLetters(prevBoard => {
      setAiHand(prevAiHand => {
        const { points, result } = computeAIMove(prevBoard, prevAiHand, configRef.current.POINTS_PER_LETTER, aiLevel);

        const newBoard = [...prevBoard];
        const newAiPlaced: number[] = [];
        let newAiHand = [...prevAiHand];

        if (points > 0) {
          for (const idx in result) {
            const i = parseInt(idx);
            newBoard[i] = result[idx];
            newAiPlaced.push(i);
            const letterPos = newAiHand.indexOf(result[idx]);
            if (letterPos !== -1) newAiHand.splice(letterPos, 1);
          }
          setAiScore(prev => prev + points);
          setPassCount(0);
        } else {
          setPassCount(prev => {
            const newCount = prev + 1;
            if (newCount >= 4) {
              setTimeout(() => endGame(playerScore, aiScore, currentPlayerHand, newAiHand), 0);
            }
            return newCount;
          });
        }

        setAiPlacedIndexes(newAiPlaced);
        setAiTurns(prev => {
          const newTurns = prev + 1;
          if (checkTurnLimitEnd(currentPlayerTurns, newTurns)) {
            setTimeout(() => endGame(playerScore, aiScore + points, currentPlayerHand, newAiHand), 0);
          }
          return newTurns;
        });

        const drawn = drawTiles(newAiHand, currentStash, HAND_SIZE);
        setStash(drawn.stash);

        if (drawn.hand.length === 0 && newAiHand.length === 0) {
          setTimeout(() => endGame(playerScore, aiScore + points, currentPlayerHand, []), 0);
        }

        setTimeout(() => {
          setBoardLetters(newBoard);
          setIsAiThinking(false);
          setIsPlayerTurn(true);
        }, 300);

        return drawn.hand;
      });
      return prevBoard;
    });
  }, [aiLevel, playerScore, aiScore, gameMode]);

  const endGame = useCallback((pScore: number, aScore: number, pHand: string[], aHand: string[]) => {
    let pPenalty = 0;
    let aPenalty = 0;
    if (configRef.current) {
      pHand.forEach(l => { pPenalty += configRef.current.POINTS_PER_LETTER[l] || 0; });
      aHand.forEach(l => { aPenalty += configRef.current.POINTS_PER_LETTER[l] || 0; });
    }
    const finalPScore = pScore - pPenalty;
    const finalAScore = aScore - aPenalty;
    setPlayerScore(finalPScore);
    setAiScore(finalAScore);
    setIsGameOver(true);
    setIsAiThinking(false);
    setGameStarted(false);
    clearInterval(timerRef.current);

    if (finalPScore > finalAScore) {
      sounds.playWin();
    } else if (finalAScore > finalPScore) {
      sounds.playLose();
    }
  }, []);

  const shuffleHand = useCallback(() => {
    setPlayerHand(prev => shuffleArray(prev));
  }, []);

  return {
    loading,
    boardLetters,
    placedIndexes,
    aiPlacedIndexes,
    playerHand,
    playerScore,
    aiScore,
    stash,
    isGameOver,
    isAiThinking,
    currentPoints,
    timer,
    isPlayerTurn,
    gameStarted,
    playerTurns,
    aiTurns,
    gameMode,
    lastWords,
    config: configRef.current,
    initGame,
    placeTile,
    removeTile,
    recallTiles,
    handlePlay,
    handlePass,
    shuffleHand,
  };
}
