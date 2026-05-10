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

// Serve config and dict
app.use('/config', express.static(path.join(__dirname, 'config')));
app.use('/dict', express.static(path.join(__dirname, 'dict')));

// Serve React client build
const clientBuildPath = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientBuildPath));

// Legacy static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', routes);

// SPA fallback - serve React index.html for all non-API routes
app.get('*', (req, res) => {
  const indexPath = path.join(clientBuildPath, 'index.html');
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // Fallback to legacy pages if React build doesn't exist
    res.sendFile(path.join(__dirname, 'public', 'pages', 'index.html'));
  }
});

// Store rooms and games
const rooms = new Map();
const games = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  
  // Create new room
  socket.on('createRoom', (data) => {
    try {
      const { playerName, gameMode = '10_giliran', language = 'indonesian' } = data;
      
      if (!playerName || playerName.trim().length === 0) {
        socket.emit('error', { message: 'Nama tidak boleh kosong' });
        return;
      }
      
      const room = new Room(socket.id, playerName.trim(), gameMode, language);
      rooms.set(room.code, room);
      Room.existingCodes.add(room.code);
      socket.join(room.code);
      
      socket.emit('roomCreated', {
        roomCode: room.code,
        players: room.players,
        gameMode: room.gameMode
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
      
      // Check if player is rejoining
      const isRejoining = room.players.some(p => p.name === playerName.trim());

      if (!isRejoining && room.isFull()) {
        socket.emit('roomError', { message: 'Room sudah penuh!' });
        return;
      }
      
      room.addPlayer(socket.id, playerName.trim());
      socket.join(room.code);
      
      // Notify all players in room
      io.to(room.code).emit('playerJoined', {
        roomCode: room.code,
        players: room.players,
        gameMode: room.gameMode
      });
      
      socket.emit('roomJoined', {
        roomCode: room.code,
        players: room.players,
        gameMode: room.gameMode
      });
      
      // If game already exists, send state to rejoining player
      if (room.game) {
        const game = room.game;
        const gameState = game.getGameStateForPlayer(socket.id);
        socket.emit('gameStarted', {
          gameId: game.id,
          opponent: gameState.opponent,
          yourLetters: gameState.yourLetters,
          isYourTurn: gameState.isYourTurn
        });
        
        // Also send current board state immediately
        socket.emit('moveAccepted', {
          boardLetters: game.boardLetters,
          yourLetters: gameState.yourLetters,
          yourScore: gameState.yourScore,
          isYourTurn: gameState.isYourTurn
        });
      } else if (room.isFull()) {
        // Start game if 2 players and not already started
        setTimeout(() => {
          try {
            const game = room.startGame();
            games.set(game.id, game);
            
            // Notify both players
            room.players.forEach(player => {
              const playerSocket = Array.from(io.sockets.sockets.values())
                .find(s => s.id === player.id);
              if (playerSocket) {
                const gameState = game.getGameStateForPlayer(player.id);
                playerSocket.emit('gameStarted', {
                  gameId: game.id,
                  opponent: gameState.opponent,
                  yourLetters: gameState.yourLetters,
                  isYourTurn: gameState.isYourTurn
                });
              }
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
        isYourTurn: false,
        playerTurns: gameState.playerTurns,
        aiTurns: gameState.aiTurns
      });
      
      const opponentSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.id === opponentId);
      
      if (opponentSocket) {
        opponentSocket.emit('opponentMove', {
          boardLetters: game.boardLetters,
          opponentScore: gameState.yourScore,
          isYourTurn: true,
          letterStash: game.letterStash.length,
          playerTurns: opponentState.playerTurns,
          aiTurns: opponentState.aiTurns
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
          isYourTurn: false,
          playerTurns: gameState.playerTurns,
          aiTurns: gameState.aiTurns
        });
        
        const opponentSocket = Array.from(io.sockets.sockets.values())
          .find(s => s.id === opponentId);
        
        if (opponentSocket) {
          const opponentState = game.getGameStateForPlayer(opponentId);
          opponentSocket.emit('opponentPassed', {
            isYourTurn: true,
            playerTurns: opponentState.playerTurns,
            aiTurns: opponentState.aiTurns
          });
        }
      }
    } catch (error) {
      console.error('Error passing turn:', error);
      socket.emit('error', { message: error.message || 'Gagal melewatkan giliran' });
    }
  });

  // Toggle Pause
  socket.on('togglePause', (data) => {
    try {
      const { roomCode } = data;
      const room = rooms.get(roomCode);
      if (room) {
        room.isPaused = !room.isPaused;
        room.updateActivity();
        io.to(room.code).emit('pauseToggled', {
          isPaused: room.isPaused,
          message: room.isPaused ? 'Permainan dihentikan sejenak' : 'Permainan dilanjutkan'
        });
      }
    } catch (error) {
      console.error('Error toggling pause:', error);
    }
  });
  
  // Disconnect handler
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    // Mark player offline in all rooms they are in
    for (const [roomCode, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.markPlayerOffline(socket.id);
        
        // Notify remaining online players
        room.players.forEach(p => {
          if (p.isOnline && p.id !== socket.id) {
            const opponentSocket = Array.from(io.sockets.sockets.values()).find(s => s.id === p.id);
            if (opponentSocket) {
              opponentSocket.emit('opponentDisconnected', {
                message: 'Lawan Anda terputus (offline). Room akan disimpan selama 20 menit.'
              });
            }
          }
        });
        // We don't delete the room here anymore. Cleanup handles it after 20 mins.
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
