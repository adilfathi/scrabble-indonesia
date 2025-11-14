# Scrabble Bahasa Indonesia

Aplikasi web permainan Scrabble dengan dukungan bahasa Indonesia, fitur bermain melawan AI, dan multiplayer real-time menggunakan WebSocket.

## 📋 Deskripsi

Scrabble Bahasa Indonesia adalah implementasi web-based dari permainan Scrabble klasik yang dirancang khusus untuk bahasa Indonesia. Aplikasi ini menawarkan pengalaman bermain yang modern dengan antarmuka yang intuitif, dukungan multi-bahasa, dan fitur multiplayer real-time.

## 🎮 Fitur Utama

- **VS AI Mode** - Bermain melawan komputer dengan 6 tingkat kesulitan yang dapat disesuaikan
- **Multiplayer Mode** - Bermain dengan teman secara online menggunakan sistem room dengan kode unik
- **Bahasa Indonesia** - Distribusi huruf dan poin yang disesuaikan untuk bahasa Indonesia
- **Shuffle Letters** - Fitur untuk mengacak urutan huruf di tangan pemain
- **Modern UI/UX** - Design system yang modern dengan warna pastel solid
- **Responsive Design** - Dapat diakses dari berbagai perangkat

## 🛠️ Tech Stack

### Frontend
- **HTML5** - Struktur halaman web
- **CSS3** - Styling dengan design system shadcn-like, menggunakan CSS Variables untuk theming
- **Vanilla JavaScript** - Logic game dan interaksi user tanpa framework
- **Socket.io Client** - Real-time communication untuk multiplayer

### Backend
- **Node.js** - Runtime environment untuk server
- **Express.js** - Web framework untuk HTTP server
- **Socket.io** - WebSocket library untuk real-time bidirectional communication

### Data & Configuration
- **JSON** - Konfigurasi distribusi huruf dan poin per bahasa
- **Text Files** - Dictionary/kamus kata untuk validasi kata

## 📁 Struktur Project

Project ini menggunakan struktur folder yang profesional dengan pemisahan concerns yang jelas:

```
scrabble/
├── public/                 # Static files (client-side)
│   ├── css/               # Stylesheets
│   │   └── styles.css     # Main stylesheet
│   ├── js/                # Client-side JavaScript
│   │   ├── game.js        # Core game logic
│   │   └── translation.js # Internationalization
│   ├── pages/             # HTML pages
│   │   ├── index.html     # Home page
│   │   ├── game-ai.html   # VS AI game
│   │   └── game-multiplayer.html # Multiplayer game
│   └── assets/            # Static assets (images, flags)
│
├── src/                    # Server-side source code
│   ├── routes/            # Express routes
│   │   └── index.js       # Main routing
│   ├── controllers/       # Business logic
│   │   └── gameController.js
│   ├── models/            # Data models
│   │   ├── Game.js        # Game model
│   │   └── Room.js        # Room model
│   └── utils/             # Utility functions
│       └── gameUtils.js
│
├── config/                 # Configuration files
│   ├── indonesian.jsonp   # Indonesian config
│   ├── english.jsonp      # English config
│   └── german.jsonp       # German config
│
├── dict/                   # Dictionary files
│   ├── indonesian.txt     # Indonesian dictionary
│   ├── english.txt        # English dictionary
│   └── german.txt         # German dictionary
│
├── server.js               # Main server file
├── package.json            # Dependencies
└── README.md               # Documentation
```

**Lihat [STRUCTURE.md](STRUCTURE.md) untuk dokumentasi lengkap tentang struktur project.**

### Routing System

Aplikasi menggunakan Express routing untuk navigasi:

- `GET /` → Home page
- `GET /game/ai` → VS AI game
- `GET /game/multiplayer` → Multiplayer game

Static files di-serve dari:
- `/css/*` → `public/css/`
- `/js/*` → `public/js/`
- `/config/*` → `config/`
- `/dict/*` → `dict/`
- `/assets/*` → `public/assets/`

## 🚀 Cara Penggunaan

### Prerequisites

- **Node.js** (v14 atau lebih baru)
- **npm** (Node Package Manager)
- Web browser modern (Chrome, Firefox, Safari, Edge)

### Instalasi

1. **Clone atau download project**
```bash
cd scrabble
```

2. **Install dependencies**
```bash
npm install
```

Ini akan menginstall:
- `express` - Web server framework
- `socket.io` - Real-time communication library

### Menjalankan Aplikasi

#### Mode Single Player (VS AI)

Tidak perlu server, cukup buka file HTML langsung:

```bash
# Buka index.html di browser
open index.html
# atau
# Klik ganda file index.html
```

Atau jika server sudah berjalan:
```
http://localhost:3000/index.html
```

#### Mode Multiplayer

1. **Jalankan server Node.js**
```bash
npm start
```

Server akan berjalan di port 3000 (default).

2. **Akses aplikasi di browser**
```
http://localhost:3000/index.html
```

3. **Cara bermain multiplayer:**
   - **Pemain 1:** 
     - Pilih "Multiplayer"
     - Masukkan nama
     - Klik "Buat Room Baru"
     - Salin kode room (4 huruf, contoh: ABCD)
   
   - **Pemain 2:**
     - Pilih "Multiplayer"
     - Masukkan nama
     - Klik "Gabung Room"
     - Masukkan kode room yang sama
   
   - Permainan akan dimulai otomatis setelah 2 pemain bergabung

### Development Mode

Untuk development dengan auto-reload (membutuhkan nodemon):

```bash
npm run dev
```

## 🎨 Design System

Aplikasi menggunakan design system yang terinspirasi dari shadcn/ui dengan karakteristik:

- **Warna Pastel Solid** - Tidak menggunakan gradien, semua warna solid
- **CSS Variables** - Theming yang konsisten dan mudah diubah
- **Component-based** - Button, Card, Input dengan styling yang konsisten
- **Responsive** - Mobile-friendly dengan breakpoints

### Color Palette

| Warna | Hex Code | Penggunaan |
|-------|----------|------------|
| Pink Pastel | `#ffb3ba` | Triple Word Bonus |
| Orange Pastel | `#ffdfba` | Double Word Bonus |
| Blue Pastel | `#bae1ff` | Triple Letter Bonus |
| Light Blue Pastel | `#c7e9ff` | Double Letter Bonus |
| Yellow Pastel | `#ffffba` | Start Square |
| Green Pastel | `#baffc9` | Player Tiles |
| Cream | `#fffef7` | Background Containers |

## 🔧 Konfigurasi

### Mengubah Port Server

Default port adalah 3000. Untuk mengubah:

```bash
PORT=8080 npm start
```

### Menambahkan Bahasa Baru

1. Buat file config di `config/[bahasa].jsonp` dengan format:
```json
{
  "LETTER_STASH": [...],
  "POINTS_PER_LETTER": {...},
  "DICTIONARY_URL": "dict/[bahasa].txt"
}
```

2. Buat file dictionary di `dict/[bahasa].txt` (satu kata per baris)

3. Update `translation.js` dengan terjemahan baru

## 📖 Cara Bermain

1. **Kata Pertama:** Letakkan kata minimal 2 huruf yang melewati kotak tengah (⭐)
2. **Kata Berikutnya:** Kata baru harus terhubung dengan kata yang sudah ada
3. **Kotak Bonus:**
   - Biru muda/Pink = 2x nilai
   - Biru tua/Merah tua = 3x nilai
4. **Bonus 50 Poin:** Dapatkan jika menggunakan semua 7 huruf sekaligus
5. **Shuffle:** Klik tombol "Acak" untuk mengacak urutan huruf
6. **Tukar Huruf:** Pilih huruf yang ingin ditukar, lalu klik "Tukar Huruf"

## 🌐 API & WebSocket Events

### Socket.io Events

**Client → Server:**
- `createRoom` - Membuat room baru
- `joinRoom` - Bergabung ke room yang ada
- `leaveRoom` - Meninggalkan room
- `getGameState` - Meminta state game saat ini
- `makeMove` - Melakukan langkah permainan
- `passTurn` - Melewatkan giliran

**Server → Client:**
- `roomCreated` - Room berhasil dibuat
- `roomJoined` - Berhasil bergabung ke room
- `playerJoined` - Pemain lain bergabung
- `gameStarted` - Permainan dimulai
- `gameState` - State game saat ini
- `opponentMove` - Lawan melakukan langkah
- `moveAccepted` - Langkah diterima
- `gameEnded` - Permainan selesai

## 📝 License

Lihat file [LICENSE](LICENSE) untuk detail.

## 🤝 Kontribusi

Project ini adalah implementasi open source dari permainan Scrabble. Kontribusi untuk perbaikan dan fitur baru sangat diterima.

## 📞 Support

Untuk pertanyaan atau masalah, silakan buat issue di repository ini.

---

**Dibuat dengan ❤️ untuk komunitas Scrabble Indonesia**
