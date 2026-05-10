export interface Player {
  id: string;
  name: string;
  isReady?: boolean;
}

export interface GameState {
  boardLetters: string[];
  yourLetters: string[];
  opponentScore: number;
  yourScore: number;
  isYourTurn: boolean;
  letterStash: number;
  lastWords?: string[];
  remainingTurns?: number;
  playerTurns?: number;
  aiTurns?: number;
  isFinished?: boolean;
}

export interface RoomState {
  roomCode: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  gameMode?: string;
}

export type ThemeType = 'dark' | 'light' | 'sand' | 'pink';

export interface AILevel {
  value: number;
  label: string;
  description: string;
}

export interface ScoreValidationResult {
  words: string[];
  points: number;
}
