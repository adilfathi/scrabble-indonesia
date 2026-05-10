import { BOARD_SIZE, TOTAL_CELLS, CENTER_INDEX, HAND_SIZE, BINGO_BONUS } from './constants';
import { getBonusType, BONUS } from './boardConfig';
import { ScoreValidationResult } from '../types';

/* ===== Dictionary ===== */
let DICTIONARY = '';

export async function loadDictionary(url = '/dict/indonesian.txt'): Promise<void> {
  const res = await fetch(url);
  DICTIONARY = (await res.text()).toUpperCase();
}

export function isWordInDictionary(word: string, intelligence: number = 1): boolean {
  if (Math.random() > intelligence) return false;
  return DICTIONARY.includes('\n' + word + '\n');
}

function isWordStartInDictionary(word: string): boolean {
  return DICTIONARY.includes('\n' + word);
}

/* ===== Language Config ===== */
let LANG_CONFIG: any = null;

export async function loadLanguageConfig(url = '/config/indonesian.jsonp'): Promise<any> {
  const res = await fetch(url);
  // Simple JSON parsing fallback if jsonp wrapping is complex
  const text = await res.text();
  const jsonStr = text.replace(/^.*?\(/, '').replace(/\);?$/, '');
  LANG_CONFIG = JSON.parse(jsonStr);
  return LANG_CONFIG;
}

export function getConfig() { return LANG_CONFIG; }

/* ===== Tile drawing ===== */
export function createLetterStash(config: any): string[] {
  return [...config.LETTER_STASH].sort(() => Math.random() - 0.5);
}

export function drawTiles(hand: string[], stash: string[], count = HAND_SIZE): { hand: string[], stash: string[] } {
  const newHand = [...hand];
  const newStash = [...stash];
  while (newHand.length < count && newStash.length > 0) {
    const i = Math.floor(Math.random() * newStash.length);
    newHand.push(newStash.splice(i, 1)[0]);
  }
  return { hand: newHand, stash: newStash };
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ===== Board validation & scoring ===== */

export function isLetterPositionValid(boardLetters: string[], placedIndexes: number[]): boolean {
  if (placedIndexes.length === 0) return false;

  let start = TOTAL_CELLS;
  let end = 0;
  for (const idx of placedIndexes) {
    if (idx < start) start = idx;
    if (idx > end) end = idx;
  }

  const lineEnd = Math.abs(14 - (start % BOARD_SIZE)) + start;
  const isHorizontal = lineEnd >= end;
  const increment = isHorizontal ? 1 : BOARD_SIZE;

  // Check contiguous
  for (let i = start; i < end; i += increment) {
    if (boardLetters[i] === '') return false;
  }

  // Check connected to existing letters
  for (const idx of placedIndexes) {
    const left = idx - 1;
    if (left % BOARD_SIZE < 14 && left >= 0 && boardLetters[left] !== '' && !placedIndexes.includes(left)) return true;
    const right = idx + 1;
    if (right % BOARD_SIZE > 0 && right < TOTAL_CELLS && boardLetters[right] !== '' && !placedIndexes.includes(right)) return true;
    const top = idx - BOARD_SIZE;
    if (top >= 0 && boardLetters[top] !== '' && !placedIndexes.includes(top)) return true;
    const down = idx + BOARD_SIZE;
    if (down < TOTAL_CELLS && boardLetters[down] !== '' && !placedIndexes.includes(down)) return true;
  }

  // First move: must use center
  const boardEmpty = boardLetters.every((l, i) => l === '' || placedIndexes.includes(i));
  return boardEmpty && placedIndexes.includes(CENTER_INDEX);
}

export function findWordsAndPoints(boardLetters: string[], placedIndexes: number[], pointsPerLetter: Record<string, number>): { words: string[], points: number } {
  const words: string[] = [];
  let pointSum = 0;

  for (const cur of placedIndexes) {
    // Horizontal word
    let h = cur;
    while (h % BOARD_SIZE > 0 && boardLetters[h - 1] !== '') h--;
    let wordMul = 1;
    let word = '';
    let pts = 0;
    let pos = h;
    while (pos < TOTAL_CELLS && pos % BOARD_SIZE <= 14 && boardLetters[pos] !== '') {
      let lm = 1;
      if (placedIndexes.includes(pos)) {
        const bonus = getBonusType(pos);
        if (bonus === BONUS.DL) lm = 2;
        if (bonus === BONUS.TL) lm = 3;
        if (bonus === BONUS.DW || bonus === BONUS.START) wordMul *= 2;
        if (bonus === BONUS.TW) wordMul *= 3;
      }
      word += boardLetters[pos];
      pts += lm * (pointsPerLetter[boardLetters[pos]] || 0);
      pos++;
      if (pos % BOARD_SIZE === 0) break;
    }
    if (word.length > 1 && !words.includes(word)) {
      words.push(word);
      pointSum += pts * wordMul;
    }

    // Vertical word
    let v = cur;
    while (v - BOARD_SIZE >= 0 && boardLetters[v - BOARD_SIZE] !== '') v -= BOARD_SIZE;
    word = '';
    pts = 0;
    wordMul = 1;
    pos = v;
    while (pos < TOTAL_CELLS && boardLetters[pos] !== '') {
      let lm = 1;
      if (placedIndexes.includes(pos)) {
        const bonus = getBonusType(pos);
        if (bonus === BONUS.DL) lm = 2;
        if (bonus === BONUS.TL) lm = 3;
        if (bonus === BONUS.DW || bonus === BONUS.START) wordMul *= 2;
        if (bonus === BONUS.TW) wordMul *= 3;
      }
      word += boardLetters[pos];
      pts += lm * (pointsPerLetter[boardLetters[pos]] || 0);
      pos += BOARD_SIZE;
    }
    if (word.length > 1 && !words.includes(word)) {
      words.push(word);
      pointSum += pts * wordMul;
    }
  }
  return { words, points: pointSum };
}

export function validateAndScore(boardLetters: string[], placedIndexes: number[], pointsPerLetter: Record<string, number>): ScoreValidationResult | null {
  if (!isLetterPositionValid(boardLetters, placedIndexes)) return null;
  const { words, points } = findWordsAndPoints(boardLetters, placedIndexes, pointsPerLetter);
  if (words.length < 1) return null;
  for (const w of words) {
    if (!isWordInDictionary(w)) return null;
  }
  let total = points;
  if (placedIndexes.length === HAND_SIZE) total += BINGO_BONUS;
  return { words, points: total };
}

/* ===== AI Move ===== */

export function computeAIMove(boardLetters: string[], aiHand: string[], pointsPerLetter: Record<string, number>, intelligence: number): { points: number, result: Record<number, string> } {
  let maxPoints = 0;
  let maxResult: Record<number, string> = {};

  const tempBoard = [...boardLetters];
  const tempPlaced: number[] = [];

  function tryPositions(positions: number[], letters: string[], result: Record<number, string>) {
    const tryPos = positions.pop();
    if (tryPos === undefined) return;
    tempPlaced.push(tryPos);

    for (let k = 0; k < letters.length; k++) {
      const tempLetter = letters.splice(k, 1)[0];
      tempBoard[tryPos] = tempLetter;
      result[tryPos] = tempLetter;

      if (positions.length > 0) {
        let recurse = true;
        const { words } = findWordsAndPoints(tempBoard, tempPlaced, pointsPerLetter);
        for (const w of words) {
          if (!isWordStartInDictionary(w)) { recurse = false; break; }
        }
        if (recurse) tryPositions(positions, letters, result);
      } else {
        const res = validateAndScoreWithIntelligence(tempBoard, tempPlaced, pointsPerLetter, intelligence);
        if (res && res.points > maxPoints) {
          maxPoints = res.points;
          maxResult = { ...result };
        }
      }

      tempBoard[tryPos] = '';
      delete result[tryPos];
      letters.splice(k, 0, tempLetter);
    }

    positions.push(tryPos);
    tempPlaced.splice(tempPlaced.indexOf(tryPos), 1);
  }

  function validateAndScoreWithIntelligence(board: string[], placed: number[], ppl: Record<string, number>, intel: number) {
    if (!isLetterPositionValid(board, placed)) return null;
    const { words, points } = findWordsAndPoints(board, placed, ppl);
    if (words.length < 1) return null;
    for (const w of words) {
      if (Math.random() > intel) return null;
      if (!DICTIONARY.includes('\n' + w + '\n')) return null;
    }
    let total = points;
    if (placed.length === HAND_SIZE) total += BINGO_BONUS;
    return { words, points: total };
  }

  // Try rows
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let rowStart = 0; rowStart < BOARD_SIZE - 1; rowStart++) {
      const startPos = row * BOARD_SIZE + rowStart;
      if (rowStart !== 0 && boardLetters[startPos - 1] !== '') continue;

      for (let wordLen = 2; wordLen < BOARD_SIZE - rowStart; wordLen++) {
        const endPos = startPos + wordLen;
        if (endPos < TOTAL_CELLS && endPos % BOARD_SIZE !== 0 && boardLetters[endPos] !== '') continue;

        const freePositions: number[] = [];
        let setCount = 0;
        for (let i = startPos; i < endPos; i++) {
          if (boardLetters[i] === '') freePositions.push(i);
          else setCount++;
        }

        if (setCount === 0 || freePositions.length === 0 || freePositions.length > 3) continue;
        tryPositions([...freePositions], [...aiHand], {});
      }
    }
  }

  // Try columns
  for (let col = 0; col < BOARD_SIZE; col++) {
    for (let colStart = 0; colStart < BOARD_SIZE - 1; colStart++) {
      const startPos = col + BOARD_SIZE * colStart;
      if (startPos > BOARD_SIZE - 1 && boardLetters[startPos - BOARD_SIZE] !== '') continue;

      for (let wordLen = 2; wordLen < BOARD_SIZE - colStart; wordLen++) {
        const endPos = startPos + BOARD_SIZE * wordLen;
        if (endPos + BOARD_SIZE < TOTAL_CELLS && boardLetters[endPos + BOARD_SIZE] !== '') continue;

        const freePositions: number[] = [];
        let setCount = 0;
        for (let i = startPos; i < endPos; i += BOARD_SIZE) {
          if (boardLetters[i] === '') freePositions.push(i);
          else setCount++;
        }

        if (setCount === 0 || freePositions.length === 0 || freePositions.length > 3) continue;
        tryPositions([...freePositions], [...aiHand], {});
      }
    }
  }

  return { points: maxPoints, result: maxResult };
}
