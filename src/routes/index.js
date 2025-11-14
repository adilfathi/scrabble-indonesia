const express = require('express');
const path = require('path');
const router = express.Router();

// Home page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/pages/index.html'));
});

// Game pages
router.get('/game/ai', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/pages/game-ai.html'));
});

router.get('/game/multiplayer', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/pages/game-multiplayer.html'));
});

module.exports = router;

