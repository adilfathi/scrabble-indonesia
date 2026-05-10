import { AILevel } from '../types';

// Board dimensions
export const BOARD_SIZE = 15;
export const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE;
export const CENTER_INDEX = 112; // 7*15 + 7

// Game modes
export const GAME_MODE_30 = '30_giliran';
export const GAME_MODE_20 = '20_giliran';
export const GAME_MODE_10 = '10_giliran';
export const GAME_MODE_3 = '3_giliran';

export const MAX_TURNS_MODE_30 = 30; // per player
export const MAX_TURNS_MODE_20 = 20; // per player
export const MAX_TURNS_MODE_10 = 10; // per player
export const MAX_TURNS_MODE_3 = 3; // per player

// Timer
export const TURN_TIMER_SECONDS = 60;

// AI difficulty
export const AI_LEVELS: AILevel[] = [
  { value: 0.1, label: 'Mudah', description: 'Untuk pemula' },
  { value: 0.2, label: 'Normal', description: 'Tantangan seimbang' },
  { value: 0.3, label: 'Sulit', description: 'Lawan tangguh' },
  { value: 0.5, label: 'Sangat Sulit', description: 'Hampir mustahil' },
  { value: 0.7, label: 'Expert', description: 'Hanya untuk master' },
  { value: 1.0, label: 'Tak Terkalahkan', description: 'Sempurna' },
];

export const HAND_SIZE = 7;
export const BINGO_BONUS = 50; // bonus for using all 7 tiles
