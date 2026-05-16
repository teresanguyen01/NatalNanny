# NatalNanny

Post-natal rPPG analysis and maternal care platform.

**Stack:** React + Vite + TypeScript · FastAPI · Supabase (Auth + Postgres)

---

## Prerequisites

- Node 20+
- Python 3.11+
- A [Supabase](https://supabase.com) project (free tier works)

---

## Supabase setup

1. Create a new project at https://app.supabase.com.
2. In **Authentication → Providers**, ensure **Email** is enabled.
3. In **Project Settings → API**, copy:
   - Project URL → `VITE_SUPABASE_URL` / `SUPABASE_URL`
   - `anon` public key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`
4. In **Project Settings → API → JWT Settings**, copy the JWT secret → `SUPABASE_JWT_SECRET`.

---

## Environment variables

```bash
# Frontend
cp frontend/.env.example frontend/.env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Backend
cp backend/.env.example backend/.env
# Fill in SUPABASE_URL, SUPABASE_JWT_SECRET (and optionally SERVICE_ROLE_KEY)
```

See [`.env.example`](.env.example) at the repo root for a full reference of every variable.

---

## Running locally

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Both servers must be running for the full app to work in development.

---

## Route map

| Path | Auth required | Description |
|------|---------------|-------------|
| `/` | No | Landing page |
| `/login` | No (redirects if logged in) | Email/password login |
| `/dashboard` | Yes | Post-natal overview (placeholder) |
| `/messaging` | Yes | Messaging with care team (placeholder) |
| `/checkup` | Yes | rPPG checkup (placeholder) |

### Auth flow

```
Browser → /dashboard
  └─ ProtectedRoute checks session (AuthContext)
       ├─ loading → spinner
       ├─ no session → redirect /login
       └─ session → AppShell + page
```

API calls from the frontend include `Authorization: Bearer <supabase-session-token>`.  
The FastAPI `get_current_user` dependency verifies the JWT using `SUPABASE_JWT_SECRET`.

---

## API endpoints (scaffold)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Liveness check |
| GET | `/api/me` | Yes | Returns current user `{id, email}` |

Swagger UI is available at `http://localhost:8000/docs` when the backend is running.

---

## Project layout

```
NatalNanny/
├── frontend/          # Vite React SPA
│   └── src/
│       ├── lib/       # Supabase client
│       ├── contexts/  # AuthContext
│       ├── components/
│       │   ├── auth/  # ProtectedRoute
│       │   └── layout/# AppShell, Sidebar
│       └── pages/     # Landing, Login, Dashboard, Messaging, Checkup
├── backend/           # FastAPI monolith
│   └── app/
│       ├── routers/   # health, me
│       ├── config.py
│       ├── dependencies.py
│       └── main.py
└── supabase/          # Supabase CLI config + migrations
```

---

## What's coming

- rPPG camera capture and signal processing
- Real messaging and checkup APIs
- Database schema and RLS policies
- Sign-up, password reset, OAuth
- CI/CD, Docker, tests
