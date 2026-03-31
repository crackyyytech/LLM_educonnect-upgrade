# LLM EduConnect

A full-stack educational video learning platform for the Tamil Nadu Samacheer Kalvi curriculum (Classes 1–12). Students watch YouTube-based lessons, track progress, and get AI-powered tutoring. Teachers monitor student progress. Admins manage users and platform settings.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | MongoDB Atlas (JSON fallback) |
| Auth | JWT (7-day) + bcryptjs |
| AI Tutor | Google Gemini 2.0 Flash |
| Video | YouTube Data API v3 + IFrame API |

---

## Project Structure

```
LLM_educonnect/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── components/      # UI components
│   │   │   ├── AdminDashboard.jsx   # Admin panel (users, stats, settings)
│   │   │   ├── AdminUsers.jsx       # User management modal
│   │   │   ├── Header.jsx           # Nav bar, breadcrumbs, search
│   │   │   ├── LoginPage.jsx        # Auth (login + register)
│   │   │   ├── ManagePanel.jsx      # Subject/playlist management
│   │   │   ├── Modals.jsx           # Search, shortcuts, stats, history
│   │   │   ├── Sidebar.jsx          # Playlist, favorites, notes, queue
│   │   │   ├── TeacherPanel.jsx     # Teacher student-progress view
│   │   │   ├── Tutor.jsx            # AI chatbot (Gemini)
│   │   │   └── VideoPlayer.jsx      # YouTube embed + controls
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # Auth state provider
│   │   │   └── useAuth.js           # Auth context hook
│   │   ├── data/
│   │   │   └── playlists.json       # 12 classes × 50+ subjects with YouTube IDs
│   │   ├── hooks/
│   │   │   ├── useLocalStorage.js   # Persistent state hook
│   │   │   └── useToast.js          # Toast notification hook
│   │   ├── App.jsx                  # Main app orchestrator
│   │   ├── Root.jsx                 # Auth gate (Login vs App)
│   │   └── main.jsx                 # React entry point
│   ├── index.html
│   ├── vite.config.js               # Vite + proxy to :5000
│   └── package.json
│
└── server/                  # Express backend
    ├── data/
    │   └── users.json               # Local JSON DB fallback
    ├── middleware/
    │   └── auth.js                  # JWT protect + requireRole
    ├── models/
    │   └── User.js                  # Mongoose user schema
    ├── routes/
    │   └── auth.js                  # All /api/auth/* routes
    ├── localDb.js                   # JSON file DB shim (Mongoose-compatible API)
    ├── index.js                     # Express app + YouTube/Gemini routes
    ├── .env.example                 # Environment variable template
    └── package.json
```

---

## Features

### Student
- Watch YouTube lessons by class and subject
- Sequential video unlock (complete previous to unlock next)
- Mark videos watched, add to favorites, build a queue
- Per-video notes with export
- Learning streak tracker (consecutive days)
- Subject completion progress
- AI Tutor (Gemini) with Tamil/English support
- Playback controls: speed (0.5×–2×), repeat modes, shuffle, sleep timer, focus mode
- Recently watched history
- Dark / light theme

### Teacher
- View assigned students and their progress
- Monitor watched videos, completed subjects, streak days
- Manage subject playlists (add / edit / delete)

### Admin
- Full user management: create, edit, delete, bulk operations
- Statistics dashboard (total users, active, by role)
- Post platform announcements
- Configure platform settings
- Export user data as CSV
- Enable / disable accounts, change roles

---

## API Reference

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | — | Register new user |
| POST | `/login` | — | Login, returns JWT |
| GET | `/me` | JWT | Get current user |
| PATCH | `/progress` | JWT | Sync watched/streak/completed |
| GET | `/my-students` | Teacher | List assigned students |
| GET | `/stats` | Admin | Platform statistics |
| GET | `/users` | Admin | List all users |
| GET | `/users/export` | Admin | CSV export |
| POST | `/users` | Admin | Create user |
| PATCH | `/users/:id` | Admin | Update user |
| DELETE | `/users/:id` | Admin | Delete user |
| POST | `/users/bulk-delete` | Admin | Bulk delete |
| POST | `/users/bulk-update` | Admin | Bulk update |

### Content

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/playlist/:id` | YouTube playlist (paginated, cached 30 min) |
| GET | `/api/channel/:id/playlists` | Channel playlists |
| GET | `/api/video/:id` | Video metadata |
| GET | `/api/cache/stats` | Cache statistics |
| POST | `/api/tutor` | AI tutor (Gemini streaming) |

---

## Data Models

### User
```json
{
  "_id": "string",
  "name": "string",
  "email": "string",
  "password": "bcrypt hash",
  "role": "admin | teacher | student",
  "subject": "string (teacher)",
  "classNum": "number (student)",
  "isActive": "boolean",
  "watchedIds": ["videoId"],
  "completedSubjects": ["subjectName"],
  "streakDays": ["YYYY-MM-DD"],
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

### Playlist Entry (playlists.json)
```json
{
  "class": 10,
  "label": "பத்தாம் வகுப்பு",
  "subjects": [
    { "name": "Mathematics", "icon": "📐", "id": "PLxxxxxx" }
  ]
}
```

---

## Setup & Running

### Prerequisites
- Node.js 18+
- MongoDB Atlas URI (or use the built-in JSON fallback)
- YouTube Data API v3 key
- Google Gemini API key (optional, for AI tutor)

### 1. Clone
```bash
git clone https://github.com/crackyyytech/LLM_educonnect.git
cd LLM_educonnect
```

### 2. Server
```bash
cd server
cp .env.example .env
# Fill in your keys in .env
npm install
npm run dev
```

### 3. Client
```bash
cd client
npm install
npm run dev
```

Client runs on `http://localhost:3000`, proxies `/api` to `http://localhost:5000`.

### Default Accounts (JSON fallback mode)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@kalvi.com | admin123 |
| Teacher | teacher@kalvi.com | teach123 |
| Student | student@kalvi.com | study123 |

---

## Environment Variables

```env
# server/.env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/kalvi-app
JWT_SECRET=your-long-random-secret
YOUTUBE_API_KEY=your_youtube_api_key
GEMINI_API_KEY=your_gemini_api_key
```

---

## Architecture

```
Browser
  └── React (Vite :3000)
        ├── AuthContext  ──── JWT stored in localStorage
        ├── App.jsx      ──── All learning state + YouTube API calls
        └── Sidebar/Tutor ── Gemini AI chat

        ↕ /api proxy

Express (:5000)
  ├── /api/auth/*   ── JWT auth, user CRUD
  ├── /api/playlist ── YouTube Data API (30-min cache)
  └── /api/tutor    ── Gemini streaming

  ↕

MongoDB Atlas  (or  server/data/users.json fallback)
```

---

## License

MIT
