/**
 * Game utility functions
 */

/**
 * Calculate index from row and column (0-indexed)
 */
function getIndex(row, col) {
  return row * 15 + col;
}

/**
 * Get row and column from index
 */
function getRowCol(index) {
  return {
    row: Math.floor(index / 15),
    col: index % 15
  };
}

/**
 * Check if index is center square
 */
function isCenterSquare(index) {
  return index === 112; // Row 8, Col 8 (0-indexed: 7*15 + 7 = 112)
}

/**
 * Validate room code format (4 uppercase letters)
 */
function isValidRoomCode(code) {
  return /^[A-Z]{4}$/.test(code);
}

/**
 * Cleanup old rooms (older than 20 minutes of inactivity)
 */
function cleanupOldRooms(roomsMap, Room) {
  const now = Date.now();
  const timeout = 20 * 60 * 1000; // 20 minutes
  
  for (const [code, room] of roomsMap.entries()) {
    // Check if room has been inactive for more than 20 mins
    if (room.lastActivity && (now - room.lastActivity > timeout)) {
      roomsMap.delete(code);
      if (Room && Room.existingCodes) {
        Room.existingCodes.delete(code);
      }
      console.log(`Cleaned up expired room: ${code}`);
    }
  }
}

module.exports = {
  getIndex,
  getRowCol,
  isCenterSquare,
  isValidRoomCode,
  cleanupOldRooms
};

