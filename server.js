const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Import routes and models
const routes = require('./src/routes');
const Room = require('./src/models/Room');
const { cleanupOldRooms } = require('./src/utils/gameUtils');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use('/config', express.static(path.join(__dirname, 'config')));
app.use('/dict', express.static(path.join(__dirname, 'dict')));

// Routes
app.use('/', routes);

// Store rooms and games
const rooms = new Map();
const games = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  
  // Create new room
  socket.on('createRoom', (data) => {
    try {
      const { playerName, language = 'indonesian' } = data;
      
      if (!playerName || playerName.trim().length === 0) {
        socket.emit('error', { message: 'Nama tidak boleh kosong' });
        return;
      }
      
      const room = new Room(socket.id, playerName.trim(), language);
      rooms.set(room.code, room);
      Room.existingCodes.add(room.code);
      socket.join(room.code);
      
      socket.emit('roomCreated', {
        roomCode: room.code,
        players: room.players
      });
      
      console.log(`Room ${room.code} created by ${playerName}`);
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('error', { message: 'Gagal membuat room' });
    }
  });
  
  // Join existing room
  socket.on('joinRoom', (data) => {
    try {
      const { playerName, roomCode } = data;
      
      if (!playerName || playerName.trim().length === 0) {
        socket.emit('roomError', { message: 'Nama tidak boleh kosong' });
        return;
      }
      
      if (!roomCode || roomCode.trim().length === 0) {
        socket.emit('roomError', { message: 'Kode room tidak boleh kosong' });
        return;
      }
      
      const room = rooms.get(roomCode.toUpperCase());
      
      if (!room) {
        socket.emit('roomError', { message: 'Room tidak ditemukan!' });
        return;
      }
      
      if (room.isFull()) {
        socket.emit('roomError', { message: 'Room sudah penuh!' });
        return;
      }
      
      room.addPlayer(socket.id, playerName.trim());
      socket.join(room.code);
      
      // Notify all players in room
      io.to(room.code).emit('playerJoined', {
        roomCode: room.code,
        players: room.players
      });
      
      socket.emit('roomJoined', {
        roomCode: room.code,
        players: room.players
      });
      
      // Start game if 2 players
      if (room.isFull()) {
        setTimeout(() => {
          try {
            const game = room.startGame();
            games.set(game.id, game);
            
            // Notify both players
            room.players.forEach(player => {
              const gameState = game.getGameStateForPlayer(player.id);
              io.to(player.id).emit('gameStarted', {
                gameId: game.id,
                opponent: gameState.opponent,
                yourLetters: gameState.yourLetters,
                isYourTurn: gameState.isYourTurn
              });
            });
            
            console.log(`Game ${game.id} started in room ${room.code}`);
          } catch (error) {
            console.error('Error starting game:', error);
            io.to(room.code).emit('error', { message: 'Gagal memulai permainan' });
          }
        }, 1000);
      }
      
      console.log(`${playerName} joined room ${room.code}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('roomError', { message: error.message || 'Gagal bergabung ke room' });
    }
  });
  
  // Leave room
  socket.on('leaveRoom', (data) => {
    try {
      const { roomCode } = data;
      const room = rooms.get(roomCode);
      
      if (room) {
        const isEmpty = room.removePlayer(socket.id);
        
        if (isEmpty) {
          rooms.delete(room.code);
          Room.existingCodes.delete(room.code);
          if (room.gameId) {
            games.delete(room.gameId);
          }
        } else {
          // Notify remaining player
          io.to(room.code).emit('playerLeft', {
            message: 'Seorang pemain meninggalkan room'
          });
        }
      }
      
      socket.leave(roomCode);
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  });
  
  // Get game state
  socket.on('getGameState', (data) => {
    try {
      const { gameId } = data;
      const game = games.get(gameId);
      
      if (!game || !game.players.includes(socket.id)) {
        socket.emit('error', { message: 'Permainan tidak ditemukan' });
        return;
      }
      
      const gameState = game.getGameStateForPlayer(socket.id);
      socket.emit('gameState', gameState);
    } catch (error) {
      console.error('Error getting game state:', error);
      socket.emit('error', { message: 'Gagal mendapatkan state permainan' });
    }
  });
  
  // Make a move
  socket.on('makeMove', (data) => {
    try {
      const { gameId, boardLetters, words, points, remainingLetters } = data;
      const game = games.get(gameId);
      
      if (!game || game.isFinished) {
        socket.emit('error', { message: 'Permainan sudah selesai' });
        return;
      }
      
      if (game.currentPlayer !== socket.id) {
        socket.emit('error', { message: 'Bukan giliran Anda' });
        return;
      }
      
      game.makeMove(socket.id, boardLetters, points, remainingLetters);
      
      // Notify both players
      const opponentId = game.currentPlayer;
      const gameState = game.getGameStateForPlayer(socket.id);
      const opponentState = game.getGameStateForPlayer(opponentId);
      
      socket.emit('moveAccepted', {
        boardLetters: game.boardLetters,
        yourLetters: gameState.yourLetters,
        yourScore: gameState.yourScore,
        isYourTurn: false
      });
      
      const opponentSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.id === opponentId);
      
      if (opponentSocket) {
        opponentSocket.emit('opponentMove', {
          boardLetters: game.boardLetters,
          opponentScore: gameState.yourScore,
          isYourTurn: true,
          letterStash: game.letterStash.length
        });
      }
    } catch (error) {
      console.error('Error making move:', error);
      socket.emit('error', { message: error.message || 'Gagal melakukan langkah' });
    }
  });
  
  // Pass turn
  socket.on('passTurn', (data) => {
    try {
      const { gameId } = data;
      const game = games.get(gameId);
      
      if (!game || game.isFinished) {
        socket.emit('error', { message: 'Permainan sudah selesai' });
        return;
      }
      
      if (game.currentPlayer !== socket.id) {
        socket.emit('error', { message: 'Bukan giliran Anda' });
        return;
      }
      
      game.passTurn(socket.id);
      
      if (game.isFinished) {
        // Game ended
        const winner = game.getWinner();
        game.players.forEach(playerId => {
          const playerSocket = Array.from(io.sockets.sockets.values())
            .find(s => s.id === playerId);
          if (playerSocket) {
            const gameState = game.getGameStateForPlayer(playerId);
            playerSocket.emit('gameEnded', {
              winner: winner === playerId,
              yourScore: gameState.yourScore,
              opponentScore: gameState.opponentScore
            });
          }
        });
      } else {
        // Continue game
        const opponentId = game.currentPlayer;
        const gameState = game.getGameStateForPlayer(socket.id);
        
        socket.emit('moveAccepted', {
          boardLetters: game.boardLetters,
          yourLetters: gameState.yourLetters,
          yourScore: gameState.yourScore,
          isYourTurn: false
        });
        
        const opponentSocket = Array.from(io.sockets.sockets.values())
          .find(s => s.id === opponentId);
        
        if (opponentSocket) {
          opponentSocket.emit('opponentPassed', {
            isYourTurn: true
          });
        }
      }
    } catch (error) {
      console.error('Error passing turn:', error);
      socket.emit('error', { message: error.message || 'Gagal melewatkan giliran' });
    }
  });
  
  // Disconnect handler
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    // Remove from all rooms
    for (const [roomCode, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const isEmpty = room.removePlayer(socket.id);
        
        if (isEmpty) {
          rooms.delete(roomCode);
          Room.existingCodes.delete(roomCode);
          if (room.gameId) {
            games.delete(room.gameId);
          }
        } else {
          // Notify remaining player
          const opponentSocket = Array.from(io.sockets.sockets.values())
            .find(s => s.id === room.players[0].id);
          if (opponentSocket) {
            opponentSocket.emit('opponentDisconnected', {
              message: 'Lawan Anda telah meninggalkan permainan'
            });
          }
        }
        break;
      }
    }
  });
});

// Cleanup old rooms periodically (every minute)
setInterval(() => {
  cleanupOldRooms(rooms, Room);
}, 60000);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Scrabble Server running on port ${PORT}`);
  console.log(`📱 Access the game at http://localhost:${PORT}`);
  console.log(`🎮 Home: http://localhost:${PORT}/`);
  console.log(`🤖 VS AI: http://localhost:${PORT}/game/ai`);
  console.log(`👥 Multiplayer: http://localhost:${PORT}/game/multiplayer`);
});
