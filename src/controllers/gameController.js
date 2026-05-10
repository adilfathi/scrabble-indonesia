const path = require('path');
const fs = require('fs');

/**
 * Load language configuration
 */
function loadLanguageConfig(language = 'indonesian') {
  try {
    const configPath = path.join(__dirname, '../../config', `${language}.jsonp`);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config;
  } catch (error) {
    console.error(`Error loading language config for ${language}:`, error);
    // Fallback to Indonesian
    const defaultPath = path.join(__dirname, '../../config', 'indonesian.jsonp');
    return JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
  }
}

/**
 * Generate random room code (6 uppercase letters)
 */
function generateRoomCode() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += letters[Math.floor(Math.random() * letters.length)];
  }
  return code;
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

module.exports = {
  loadLanguageConfig,
  generateRoomCode,
  shuffleArray
};

