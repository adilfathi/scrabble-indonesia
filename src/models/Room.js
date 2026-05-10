const Game = require('./Game');
const { generateRoomCode } = require('../controllers/gameController');

/**
 * Room Model
 * Represents a game room for multiplayer
 */
class Room {
  constructor(creatorId, creatorName, gameMode = '10_giliran', language = 'indonesian') {
    this.code = this.generateUniqueCode();
    this.players = [{ id: creatorId, name: creatorName, isOnline: true }];
    this.creatorId = creatorId;
    this.maxPlayers = 4;
    this.minPlayersToStart = 2;
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
      const previousId = existingPlayer.id;
      existingPlayer.id = playerId;
      existingPlayer.isOnline = true;
      if (this.creatorId === previousId) {
        this.creatorId = playerId;
      }
      this.updateActivity();
      return { rejoined: true, previousId };
    }

    if (this.players.length >= this.maxPlayers) {
      throw new Error('Room is full');
    }
    
    if (this.players.some(p => p.id === playerId)) {
      throw new Error('Player already in room');
    }

    this.players.push({ id: playerId, name: playerName, isOnline: true });
    this.updateActivity();
    return { rejoined: false };
  }
  
  /**
   * Remove player from room
   */
  removePlayer(playerId) {
    const wasCreator = this.creatorId === playerId;
    this.players = this.players.filter(p => p.id !== playerId);
    if (wasCreator && this.players.length > 0) {
      this.creatorId = this.players[0].id;
    }
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
    return this.players.length >= this.maxPlayers;
  }

  canStart() {
    return this.players.length >= this.minPlayersToStart;
  }
  
  /**
   * Start game if enough players are ready
   */
  startGame() {
    if (!this.canStart()) {
      throw new Error('Not enough players');
    }
    
    this.game = new Game(
      this.players.map(p => ({ id: p.id, name: p.name })),
      this.gameMode,
      this.language,
      this.creatorId
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
