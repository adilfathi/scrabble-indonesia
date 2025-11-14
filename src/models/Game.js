const { loadLanguageConfig, shuffleArray } = require('../controllers/gameController');

/**
 * Game Model
 * Represents a Scrabble game instance
 */
class Game {
  constructor(player1Id, player1Name, player2Id, player2Name, language = 'indonesian') {
    this.id = `game_${player1Id}_${player2Id}_${Date.now()}`;
    this.players = [player1Id, player2Id];
    this.playerNames = {
      [player1Id]: player1Name,
      [player2Id]: player2Name
    };
    this.currentPlayer = player1Id;
    this.boardLetters = Array(225).fill('');
    this.language = language;
    
    // Initialize letter stash and player letters
    const config = loadLanguageConfig(language);
    this.letterStash = shuffleArray(config.LETTER_STASH);
    this.pointsPerLetter = config.POINTS_PER_LETTER;
    
    // Draw 7 letters for each player
    this.playerLetters = {
      [player1Id]: [],
      [player2Id]: []
    };
    
    for (let i = 0; i < 7; i++) {
      if (this.letterStash.length > 0) {
        const index = Math.floor(Math.random() * this.letterStash.length);
        this.playerLetters[player1Id].push(this.letterStash.splice(index, 1)[0]);
      }
      if (this.letterStash.length > 0) {
        const index = Math.floor(Math.random() * this.letterStash.length);
        this.playerLetters[player2Id].push(this.letterStash.splice(index, 1)[0]);
      }
    }
    
    this.playerScores = {
      [player1Id]: 0,
      [player2Id]: 0
    };
    
    this.bothPlayerPassCount = 0;
    this.isFinished = false;
    this.createdAt = Date.now();
  }
  
  /**
   * Switch to next player's turn
   */
  switchTurn() {
    this.currentPlayer = this.players.find(p => p !== this.currentPlayer);
  }
  
  /**
   * Make a move and update game state
   */
  makeMove(playerId, boardLetters, points, remainingLetters) {
    if (this.currentPlayer !== playerId || this.isFinished) {
      throw new Error('Invalid move');
    }
    
    this.boardLetters = boardLetters;
    this.playerScores[playerId] += points;
    this.bothPlayerPassCount = 0;
    
    // Draw new letters
    const lettersPlayed = this.playerLetters[playerId].length - remainingLetters.length;
    for (let i = 0; i < lettersPlayed && this.letterStash.length > 0; i++) {
      const index = Math.floor(Math.random() * this.letterStash.length);
      remainingLetters.push(this.letterStash.splice(index, 1)[0]);
    }
    this.playerLetters[playerId] = remainingLetters;
    
    this.switchTurn();
  }
  
  /**
   * Pass turn
   */
  passTurn(playerId) {
    if (this.currentPlayer !== playerId || this.isFinished) {
      throw new Error('Invalid pass');
    }
    
    this.bothPlayerPassCount++;
    this.switchTurn();
    
    if (this.bothPlayerPassCount >= 4) {
      this.isFinished = true;
    }
  }
  
  /**
   * Get winner
   */
  getWinner() {
    return this.playerScores[this.players[0]] > this.playerScores[this.players[1]]
      ? this.players[0] : this.players[1];
  }
  
  /**
   * Get game state for a specific player
   */
  getGameStateForPlayer(playerId) {
    const opponentId = this.players.find(p => p !== playerId);
    return {
      boardLetters: this.boardLetters,
      yourLetters: this.playerLetters[playerId],
      yourScore: this.playerScores[playerId],
      opponentScore: this.playerScores[opponentId],
      currentPlayer: this.currentPlayer,
      letterStash: this.letterStash.length,
      isYourTurn: this.currentPlayer === playerId,
      isFinished: this.isFinished,
      opponent: this.playerNames[opponentId]
    };
  }
}

module.exports = Game;

