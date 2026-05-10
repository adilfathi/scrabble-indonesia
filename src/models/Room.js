const Game = require('./Game');
const { generateRoomCode } = require('../controllers/gameController');

/**
 * Room Model
 * Represents a game room for multiplayer
 */
class Room {
  constructor(creatorId, creatorName, gameMode = '100_huruf', language = 'indonesian') {
    this.code = this.generateUniqueCode();
    this.players = [{ id: creatorId, name: creatorName, isOnline: true }];
    this.gameMode = gameMode;
    this.gameId = null;
    this.game = null;
    this.language = language;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
    this.isPaused = false;
  }

  updateActivity() {
    this.lastActivity = Date.now();
  }
  
  /**
   * Generate unique room code
   */
  generateUniqueCode() {
    let code;
    do {
      code = generateRoomCode();
    } while (Room.existingCodes && Room.existingCodes.has(code));
    return code;
  }
  
  /**
   * Add player to room
   */
  addPlayer(playerId, playerName) {
    // Check if player is rejoining (same name)
    const existingPlayer = this.players.find(p => p.name === playerName);
    if (existingPlayer) {
      existingPlayer.id = playerId;
      existingPlayer.isOnline = true;
      this.updateActivity();
      return;
    }

    if (this.players.length >= 2) {
      throw new Error('Room is full');
    }
    
    if (this.players.some(p => p.id === playerId)) {
      throw new Error('Player already in room');
    }

    this.players.push({ id: playerId, name: playerName, isOnline: true });
    this.updateActivity();
  }
  
  /**
   * Remove player from room
   */
  removePlayer(playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
    this.updateActivity();
    return this.players.length === 0; // Returns true if room is now empty
  }

  /**
   * Mark player offline
   */
  markPlayerOffline(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.isOnline = false;
      this.updateActivity();
    }
  }
  
  /**
   * Check if room is full
   */
  isFull() {
    return this.players.length === 2;
  }
  
  /**
   * Start game if 2 players are ready
   */
  startGame() {
    if (!this.isFull()) {
      throw new Error('Not enough players');
    }
    
    this.game = new Game(
      this.players[0].id,
      this.players[0].name,
      this.players[1].id,
      this.players[1].name,
      this.gameMode,
      this.language
    );
    
    this.gameId = this.game.id;
    return this.game;
  }
  
  /**
   * Get room state
   */
  getState() {
    return {
      code: this.code,
      players: this.players,
      gameId: this.gameId,
      isFull: this.isFull(),
      createdAt: this.createdAt
    };
  }
}

// Static map to track existing room codes
Room.existingCodes = new Set();

module.exports = Room;

