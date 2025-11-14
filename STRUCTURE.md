# Struktur Project

Dokumen ini menjelaskan struktur folder dan organisasi file dalam project Scrabble Bahasa Indonesia.

## Struktur Folder

```
scrabble/
├── public/                 # Public static files
│   ├── css/               # Stylesheets
│   │   └── styles.css     # Main stylesheet
│   ├── js/                # Client-side JavaScript
│   │   ├── game.js        # Core game logic
│   │   └── translation.js # Internationalization
│   ├── pages/             # HTML pages
│   │   ├── index.html     # Home page
│   │   ├── game-ai.html   # VS AI game page
│   │   └── game-multiplayer.html # Multiplayer game page
│   └── assets/            # Static assets (images, flags, etc.)
│       └── flags/         # Country flags
│
├── src/                    # Server-side source code
│   ├── routes/            # Express routes
│   │   └── index.js       # Main routing
│   ├── controllers/       # Business logic controllers
│   │   └── gameController.js # Game logic controllers
│   ├── models/            # Data models
│   │   ├── Game.js        # Game model
│   │   └── Room.js        # Room model
│   └── utils/             # Utility functions
│       └── gameUtils.js   # Game utility functions
│
├── config/                 # Configuration files
│   ├── indonesian.jsonp   # Indonesian language config
│   ├── english.jsonp      # English language config
│   └── german.jsonp       # German language config
│
├── dict/                   # Dictionary files
│   ├── indonesian.txt     # Indonesian dictionary
│   ├── english.txt        # English dictionary
│   └── german.txt         # German dictionary
│
├── server.js               # Main server file
├── package.json            # Node.js dependencies
├── package-lock.json       # Locked dependencies
├── README.md               # Project documentation
└── STRUCTURE.md            # This file
```

## Penjelasan Folder

### `/public`
Folder untuk semua file static yang dapat diakses oleh client (browser). Semua file di sini di-serve langsung oleh Express.

- **`css/`**: Stylesheets untuk styling aplikasi
- **`js/`**: Client-side JavaScript files
- **`pages/`**: HTML pages untuk aplikasi
- **`assets/`**: Static assets seperti images, flags, dll.

### `/src`
Folder untuk server-side source code dengan arsitektur MVC-like.

- **`routes/`**: Express route handlers. Setiap route file menangani routing untuk section tertentu.
- **`controllers/`**: Business logic controllers. Berisi fungsi-fungsi untuk handle business logic.
- **`models/`**: Data models. Class/fungsi untuk representasi data (Game, Room, dll).
- **`utils/`**: Utility functions. Helper functions yang dapat digunakan di berbagai tempat.

### `/config`
Konfigurasi bahasa untuk Scrabble. Setiap file JSON berisi:
- Distribusi huruf (LETTER_STASH)
- Poin per huruf (POINTS_PER_LETTER)
- URL dictionary (DICTIONARY_URL)

### `/dict`
File dictionary/kamus kata untuk validasi kata. Setiap bahasa memiliki file .txt sendiri.

## Routing System

### Client-side Routes
Aplikasi menggunakan server-side routing dengan Express:

- `GET /` → Home page (`public/pages/index.html`)
- `GET /game/ai` → VS AI game (`public/pages/game-ai.html`)
- `GET /game/multiplayer` → Multiplayer game (`public/pages/game-multiplayer.html`)

### Static Files
Express serve static files dari:

- `/css/*` → `public/css/`
- `/js/*` → `public/js/`
- `/config/*` → `config/`
- `/dict/*` → `dict/`
- `/assets/*` → `public/assets/`

### WebSocket Routes
Socket.io events untuk multiplayer:

**Client → Server:**
- `createRoom` - Buat room baru
- `joinRoom` - Bergabung ke room
- `leaveRoom` - Keluar dari room
- `getGameState` - Ambil state game
- `makeMove` - Lakukan langkah
- `passTurn` - Lewati giliran

**Server → Client:**
- `roomCreated` - Room berhasil dibuat
- `roomJoined` - Berhasil bergabung
- `playerJoined` - Player lain bergabung
- `gameStarted` - Game dimulai
- `gameState` - State game
- `opponentMove` - Lawan melakukan langkah
- `moveAccepted` - Langkah diterima
- `gameEnded` - Game selesai

## File Organization Principles

1. **Separation of Concerns**: Client-side code (`public/`) terpisah dari server-side code (`src/`)
2. **MVC-like Architecture**: Routes, Controllers, Models terpisah untuk maintainability
3. **Static Assets**: Semua static files di `public/` untuk easy serving
4. **Configuration**: Config files terpisah untuk easy maintenance
5. **Modular Design**: Code dibagi menjadi modules yang dapat digunakan kembali

## Best Practices

1. **Path References**: Gunakan absolute paths (`/css/`, `/js/`) untuk consistency
2. **Error Handling**: Semua async operations harus handle errors
3. **Code Reusability**: Gunakan utility functions untuk code yang digunakan berulang
4. **Documentation**: Comment complex logic untuk clarity
5. **Consistent Naming**: Gunakan camelCase untuk JavaScript, kebab-case untuk files

