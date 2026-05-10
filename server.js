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
const gameTimeouts = new Map();

function getRoomPayload(room) {
  return {
    roomCode: room.code,
    players: room.players,
    gameMode: room.gameMode,
    creatorId: room.creatorId,
    maxPlayers: room.maxPlayers,
    status: room.game ? (room.game.isFinished ? 'finished' : 'playing') : 'waiting',
  };
}

function findSocketById(socketId) {
  return Array.from(io.sockets.sockets.values()).find((s) => s.id === socketId);
}

function emitRoomUpdate(room, eventName = 'roomUpdated') {
  io.to(room.code).emit(eventName, getRoomPayload(room));
}

function emitGameStateToAll(game) {
  game.players.forEach((playerId) => {
    const playerSocket = findSocketById(playerId);
    if (!playerSocket) return;
    const state = game.getGameStateForPlayer(playerId);
    playerSocket.emit('gameStateUpdated', state);
  });
}

function emitGameEnded(game) {
  const existingTimeout = gameTimeouts.get(game.id);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
    gameTimeouts.delete(game.id);
  }
  const winnerId = game.getWinner();
  game.players.forEach((playerId) => {
    const playerSocket = findSocketById(playerId);
    if (!playerSocket) return;
    const finalState = game.getGameStateForPlayer(playerId);
    playerSocket.emit('gameEnded', {
      winner: winnerId === playerId,
      winnerName: game.playerNames[winnerId],
      yourScore: finalState.yourScore,
      opponentScore: finalState.opponentScore,
      players: finalState.players,
    });
  });
}

function scheduleGameTurnTimeout(game) {
  const existingTimeout = gameTimeouts.get(game.id);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  const delay = Math.max(100, game.getRemainingMs() + 50);
  const timeout = setTimeout(() => {
    const activeGame = games.get(game.id);
    if (!activeGame || activeGame.isFinished) {
      gameTimeouts.delete(game.id);
      return;
    }

    // Turn may have changed meanwhile; re-schedule if this is not yet expired.
    if (activeGame.getRemainingMs() > 0) {
      scheduleGameTurnTimeout(activeGame);
      return;
    }

    try {
      const timedOutPlayer = activeGame.currentPlayer;
      activeGame.passTurn(timedOutPlayer);
      if (activeGame.isFinished) {
        emitGameEnded(activeGame);
      } else {
        emitGameStateToAll(activeGame);
        scheduleGameTurnTimeout(activeGame);
      }
    } catch (error) {
      console.error('Error processing turn timeout:', error);
    }
  }, delay);

  gameTimeouts.set(game.id, timeout);
}

function startRoomGame(room) {
  if (room.gameId) {
    games.delete(room.gameId);
    const oldTimeout = gameTimeouts.get(room.gameId);
    if (oldTimeout) {
      clearTimeout(oldTimeout);
      gameTimeouts.delete(room.gameId);
    }
  }
  const game = room.startGame();
  games.set(game.id, game);
  scheduleGameTurnTimeout(game);
  room.updateActivity();

  room.players.forEach((player) => {
    const playerSocket = findSocketById(player.id);
    if (!playerSocket) return;
    const state = game.getGameStateForPlayer(player.id);
    playerSocket.emit('gameStarted', {
      gameId: game.id,
      ...state,
    });
  });
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('createRoom', (data) => {
    try {
      const { playerName, gameMode = '10_giliran', language = 'indonesian' } = data;
      if (!playerName || playerName.trim().length === 0) {
        socket.emit('roomError', { message: 'Nama tidak boleh kosong' });
        return;
      }

      const room = new Room(socket.id, playerName.trim(), gameMode, language);
      rooms.set(room.code, room);
      Room.existingCodes.add(room.code);
      socket.join(room.code);

      socket.emit('roomCreated', getRoomPayload(room));
      emitRoomUpdate(room, 'playerJoined');
      console.log(`Room ${room.code} created by ${playerName}`);
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('roomError', { message: 'Gagal membuat room' });
    }
  });

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

      const isRejoining = room.players.some((p) => p.name === playerName.trim());
      if (room.game && !isRejoining) {
        socket.emit('roomError', { message: 'Game sedang berlangsung. Hanya pemain lama yang bisa reconnect.' });
        return;
      }
      if (!isRejoining && room.isFull()) {
        socket.emit('roomError', { message: 'Room sudah penuh (maksimal 4 pemain)!' });
        return;
      }

      const joinResult = room.addPlayer(socket.id, playerName.trim());
      socket.join(room.code);

      if (joinResult?.rejoined && room.game) {
        room.game.reconnectPlayer(joinResult.previousId, socket.id, playerName.trim());
      }

      emitRoomUpdate(room, 'playerJoined');
      socket.emit('roomJoined', getRoomPayload(room));

      if (room.game) {
        const state = room.game.getGameStateForPlayer(socket.id);
        socket.emit('gameStarted', { gameId: room.game.id, ...state });
        socket.emit('gameStateUpdated', state);
      }

      console.log(`${playerName} joined room ${room.code}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('roomError', { message: error.message || 'Gagal bergabung ke room' });
    }
  });

  socket.on('startGame', (data) => {
    try {
      const { roomCode } = data;
      const room = rooms.get((roomCode || '').toUpperCase());
      if (!room) {
        socket.emit('roomError', { message: 'Room tidak ditemukan!' });
        return;
      }
      if (room.creatorId !== socket.id) {
        socket.emit('roomError', { message: 'Hanya host yang bisa memulai game.' });
        return;
      }
      if (room.game && !room.game.isFinished) {
        socket.emit('roomError', { message: 'Game sudah dimulai.' });
        return;
      }
      if (!room.canStart()) {
        socket.emit('roomError', { message: 'Butuh minimal 2 pemain untuk mulai.' });
        return;
      }

      startRoomGame(room);
      emitRoomUpdate(room);
      console.log(`Game ${room.game.id} started in room ${room.code}`);
    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('roomError', { message: 'Gagal memulai permainan' });
    }
  });

  socket.on('leaveRoom', (data) => {
    try {
      const { roomCode } = data;
      const room = rooms.get(roomCode);
      if (!room) return;

      if (room.game && !room.game.isFinished) {
        room.markPlayerOffline(socket.id);
        socket.leave(roomCode);
        emitRoomUpdate(room);
        return;
      }

      const isEmpty = room.removePlayer(socket.id);
      if (isEmpty) {
        rooms.delete(room.code);
        Room.existingCodes.delete(room.code);
        if (room.gameId) games.delete(room.gameId);
        if (room.gameId) {
          const timeout = gameTimeouts.get(room.gameId);
          if (timeout) {
            clearTimeout(timeout);
            gameTimeouts.delete(room.gameId);
          }
        }
      } else {
        emitRoomUpdate(room, 'playerLeft');
      }
      socket.leave(roomCode);
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  });

  socket.on('getGameState', (data) => {
    try {
      const { gameId } = data;
      const game = games.get(gameId);
      if (!game || !game.players.includes(socket.id)) {
        socket.emit('error', { message: 'Permainan tidak ditemukan' });
        return;
      }
      socket.emit('gameStateUpdated', game.getGameStateForPlayer(socket.id));
    } catch (error) {
      console.error('Error getting game state:', error);
      socket.emit('error', { message: 'Gagal mendapatkan state permainan' });
    }
  });

  socket.on('makeMove', (data) => {
    try {
      const { gameId, boardLetters, points, remainingLetters } = data;
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
      if (game.isFinished) {
        emitGameEnded(game);
      } else {
        emitGameStateToAll(game);
        scheduleGameTurnTimeout(game);
      }
    } catch (error) {
      console.error('Error making move:', error);
      socket.emit('error', { message: error.message || 'Gagal melakukan langkah' });
    }
  });

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
        emitGameEnded(game);
      } else {
        emitGameStateToAll(game);
        scheduleGameTurnTimeout(game);
      }
    } catch (error) {
      console.error('Error passing turn:', error);
      socket.emit('error', { message: error.message || 'Gagal melewatkan giliran' });
    }
  });

  socket.on('togglePause', (data) => {
    try {
      const { roomCode } = data;
      const room = rooms.get(roomCode);
      if (room) {
        room.isPaused = !room.isPaused;
        room.updateActivity();
        io.to(room.code).emit('pauseToggled', {
          isPaused: room.isPaused,
          message: room.isPaused ? 'Permainan dihentikan sejenak' : 'Permainan dilanjutkan',
        });
      }
    } catch (error) {
      console.error('Error toggling pause:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);

    for (const [, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex((p) => p.id === socket.id);
      if (playerIndex === -1) continue;

      room.markPlayerOffline(socket.id);
      emitRoomUpdate(room);

      room.players.forEach((p) => {
        if (p.isOnline && p.id !== socket.id) {
          const onlineSocket = findSocketById(p.id);
          if (onlineSocket) {
            onlineSocket.emit('opponentDisconnected', {
              message: 'Koneksi salah satu pemain terputus. Menunggu reconnect...',
            });
          }
        }
      });
      break;
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
