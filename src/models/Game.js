const { loadLanguageConfig, shuffleArray } = require('../controllers/gameController');
const TURN_DURATION_MS = 60 * 1000;

/**
 * Game Model
 * Supports 2-4 players multiplayer.
 */
class Game {
  constructor(players, gameMode = '10_giliran', language = 'indonesian', hostPlayerId = null) {
    this.id = `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.players = players.map((p) => p.id);
    this.playerNames = players.reduce((acc, p) => {
      acc[p.id] = p.name;
      return acc;
    }, {});
    const nonHostPlayers = hostPlayerId ? this.players.filter((id) => id !== hostPlayerId) : this.players;
    const starterPool = nonHostPlayers.length > 0 ? nonHostPlayers : this.players;
    const randomStarter = starterPool[Math.floor(Math.random() * starterPool.length)];
    this.currentPlayerIndex = this.players.indexOf(randomStarter);
    this.currentPlayer = this.players[this.currentPlayerIndex];
    this.turnEndsAt = Date.now() + TURN_DURATION_MS;
    this.boardLetters = Array(225).fill('');
    this.language = language;
    this.gameMode = gameMode;

    this.playerTurns = {};
    this.playerLetters = {};
    this.playerScores = {};
    this.players.forEach((playerId) => {
      this.playerTurns[playerId] = 0;
      this.playerLetters[playerId] = [];
      this.playerScores[playerId] = 0;
    });

    const config = loadLanguageConfig(language);
    this.letterStash = shuffleArray(config.LETTER_STASH);
    this.pointsPerLetter = config.pointsPerLetter || config.POINTS_PER_LETTER;

    // Draw 7 letters for each player.
    for (let i = 0; i < 7; i++) {
      for (const playerId of this.players) {
        if (this.letterStash.length > 0) {
          const index = Math.floor(Math.random() * this.letterStash.length);
          this.playerLetters[playerId].push(this.letterStash.splice(index, 1)[0]);
        }
      }
    }

    this.bothPlayerPassCount = 0;
    this.isFinished = false;
    this.createdAt = Date.now();
  }

  reconnectPlayer(oldPlayerId, newPlayerId, playerName) {
    if (!oldPlayerId || oldPlayerId === newPlayerId) return;
    const idx = this.players.indexOf(oldPlayerId);
    if (idx === -1) return;

    this.players[idx] = newPlayerId;
    if (this.currentPlayer === oldPlayerId) {
      this.currentPlayer = newPlayerId;
      this.currentPlayerIndex = idx;
    }

    this.playerNames[newPlayerId] = playerName || this.playerNames[oldPlayerId];
    this.playerTurns[newPlayerId] = this.playerTurns[oldPlayerId] || 0;
    this.playerLetters[newPlayerId] = this.playerLetters[oldPlayerId] || [];
    this.playerScores[newPlayerId] = this.playerScores[oldPlayerId] || 0;

    delete this.playerNames[oldPlayerId];
    delete this.playerTurns[oldPlayerId];
    delete this.playerLetters[oldPlayerId];
    delete this.playerScores[oldPlayerId];
  }

  getTurnLimit() {
    if (this.gameMode === '30_giliran') return 30;
    if (this.gameMode === '20_giliran') return 20;
    if (this.gameMode === '10_giliran') return 10;
    if (this.gameMode === '3_giliran') return 3;
    return null;
  }

  checkEndConditions() {
    const turnLimit = this.getTurnLimit();
    if (turnLimit !== null) {
      const allReachedLimit = this.players.every((p) => this.playerTurns[p] >= turnLimit);
      if (allReachedLimit) {
        this.isFinished = true;
      }
    }

    // Keep similar "all pass" feel across player counts.
    const passLimit = this.players.length * 2;
    if (this.bothPlayerPassCount >= passLimit) {
      this.isFinished = true;
    }

    if (this.letterStash.length === 0) {
      const hasEmptyHand = this.players.some((p) => (this.playerLetters[p] || []).length === 0);
      if (hasEmptyHand) this.isFinished = true;
    }
  }

  switchTurn() {
    if (this.players.length === 0) return;
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.currentPlayer = this.players[this.currentPlayerIndex];
    this.turnEndsAt = Date.now() + TURN_DURATION_MS;
  }

  getRemainingMs() {
    return Math.max(0, this.turnEndsAt - Date.now());
  }

  makeMove(playerId, boardLetters, points, remainingLetters) {
    if (this.currentPlayer !== playerId || this.isFinished) {
      throw new Error('Invalid move');
    }

    this.boardLetters = boardLetters;
    this.playerScores[playerId] += points;
    this.bothPlayerPassCount = 0;

    const currentLetters = this.playerLetters[playerId] || [];
    const lettersPlayed = currentLetters.length - remainingLetters.length;
    for (let i = 0; i < lettersPlayed && this.letterStash.length > 0; i++) {
      const index = Math.floor(Math.random() * this.letterStash.length);
      remainingLetters.push(this.letterStash.splice(index, 1)[0]);
    }

    this.playerLetters[playerId] = remainingLetters;
    this.playerTurns[playerId]++;
    this.checkEndConditions();
    if (!this.isFinished) this.switchTurn();
  }

  passTurn(playerId) {
    if (this.currentPlayer !== playerId || this.isFinished) {
      throw new Error('Invalid pass');
    }

    this.bothPlayerPassCount++;
    this.playerTurns[playerId]++;
    this.checkEndConditions();
    if (!this.isFinished) this.switchTurn();
  }

  getWinner() {
    let winnerId = this.players[0];
    let maxScore = this.playerScores[winnerId] || 0;
    for (const playerId of this.players.slice(1)) {
      const score = this.playerScores[playerId] || 0;
      if (score > maxScore) {
        maxScore = score;
        winnerId = playerId;
      }
    }
    return winnerId;
  }

  getGameStateForPlayer(playerId) {
    const others = this.players.filter((p) => p !== playerId);
    const opponentScores = others.map((p) => this.playerScores[p] || 0);
    const opponentTurns = others.map((p) => this.playerTurns[p] || 0);

    return {
      boardLetters: this.boardLetters,
      yourLetters: this.playerLetters[playerId] || [],
      yourScore: this.playerScores[playerId] || 0,
      // Keep compatibility for existing client spots that still read opponentScore.
      opponentScore: opponentScores.length ? Math.max(...opponentScores) : 0,
      currentPlayer: this.currentPlayer,
      currentPlayerName: this.playerNames[this.currentPlayer] || 'Pemain',
      turnEndsAt: this.turnEndsAt,
      turnRemainingMs: this.getRemainingMs(),
      letterStash: this.letterStash.length,
      isYourTurn: this.currentPlayer === playerId,
      isFinished: this.isFinished,
      playerTurns: this.playerTurns[playerId] || 0,
      aiTurns: opponentTurns.length ? Math.max(...opponentTurns) : 0,
      players: this.players.map((id) => ({
        id,
        name: this.playerNames[id] || 'Pemain',
        score: this.playerScores[id] || 0,
        turns: this.playerTurns[id] || 0,
      })),
    };
  }
}

module.exports = Game;
