import { BOARD_SIZE, CENTER_INDEX } from './constants';

// Bonus types
export enum BONUS {
  NONE = 'none',
  DL = 'dl',   // Double Letter
  TL = 'tl',   // Triple Letter
  DW = 'dw',   // Double Word
  TW = 'tw',   // Triple Word
  START = 'start',
}

// Standard Scrabble board layout
const BONUS_MAP: Record<number, BONUS> = {};

// Triple Word scores
const twPositions = [
  [0,0],[0,7],[0,14],
  [7,0],[7,14],
  [14,0],[14,7],[14,14],
];
twPositions.forEach(([r,c]) => { BONUS_MAP[r * BOARD_SIZE + c] = BONUS.TW; });

// Double Word scores
const dwPositions = [
  [1,1],[2,2],[3,3],[4,4],
  [1,13],[2,12],[3,11],[4,10],
  [13,1],[12,2],[11,3],[10,4],
  [13,13],[12,12],[11,11],[10,10],
];
dwPositions.forEach(([r,c]) => { BONUS_MAP[r * BOARD_SIZE + c] = BONUS.DW; });

// Triple Letter scores
const tlPositions = [
  [1,5],[1,9],
  [5,1],[5,5],[5,9],[5,13],
  [9,1],[9,5],[9,9],[9,13],
  [13,5],[13,9],
];
tlPositions.forEach(([r,c]) => { BONUS_MAP[r * BOARD_SIZE + c] = BONUS.TL; });

// Double Letter scores
const dlPositions = [
  [0,3],[0,11],
  [2,6],[2,8],
  [3,0],[3,7],[3,14],
  [6,2],[6,6],[6,8],[6,12],
  [7,3],[7,11],
  [8,2],[8,6],[8,8],[8,12],
  [11,0],[11,7],[11,14],
  [12,6],[12,8],
  [14,3],[14,11],
];
dlPositions.forEach(([r,c]) => { BONUS_MAP[r * BOARD_SIZE + c] = BONUS.DL; });

// Center / Start
BONUS_MAP[CENTER_INDEX] = BONUS.START;

export function getBonusType(index: number): BONUS {
  return BONUS_MAP[index] || BONUS.NONE;
}

export function getBonusLabel(bonus: BONUS): string {
  switch (bonus) {
    case BONUS.TW: return '3×W';
    case BONUS.DW: return '2×W';
    case BONUS.TL: return '3×L';
    case BONUS.DL: return '2×L';
    case BONUS.START: return '★';
    default: return '';
  }
}
