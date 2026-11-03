# JARVIS AI — Advanced Holographic Personal Intelligence Platform

An advanced, production-grade AI personal command center inspired by Tony Stark's JARVIS from Marvel's Iron Man. Features a 3D Three.js Fibonacci particle core, real-time procedural Web Audio API synthesis, Web Speech API British voice persona, dynamic telemetry streaming, and a Zero-Secret backend architecture.

---

## 🏛️ System Architecture

- **Frontend Console:** React 18, TypeScript, Tailwind CSS, Three.js WebGL (2,800-particle Fibonacci core), Framer Motion, and Lucide icons.
- **Audio Synthesizer:** Real-time Web Audio API procedural synthesis with zero external audio assets (`playChirp`, `playStateSound`, `playTacticalSweep`, `playTransmit`, `playAlert`).
- **Voice Engine:** Web Speech API prioritizing British English male personas (Daniel, Oliver, George) with configurable pitch and cadence.
- **Zero-Secret Backend:** Node.js/Express (`server.ts`) mediating all AI orchestration, WebRTC ephemeral tokens, and database operations. API keys (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) never leak to client bundles.
- **Database Schema:** Supabase PostgreSQL with strict Row Level Security (`auth.uid() = user_id`) across 6 tables (`profiles`, `memories`, `action_queue`, `tasks`, `conversations`, `messages`).
- **Dual Visual Themes:**
  - **Holographic Cyan HUD:** Electric cyan, glassmorphic blur, lens flare bloom, scanlines, and 3D particle orbit.
  - **Obsidian High-Contrast:** Developer-grade minimalist zinc surfaces, soft violet primary (`#a78bfa`), and emerald indicators from `obsidian/DESIGN.md`.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy the template and configure your secrets:
```bash
cp .env.example .env
```
*(Default values allow full local development with offline heuristic AI and mock telemetry immediately without requiring external keys).*

### 3. Run the Development Servers
```bash
# Terminal 1: Zero-Secret Backend Engine
npm run server

# Terminal 2: Frontend Command Center
npm run dev
```

Navigate to:
- **Frontend Console:** `http://localhost:5173/`
- **Backend API & Health:** `http://localhost:3001/api/health`

---

## ⌨️ Console Hotkeys

- **Key `1`**: Initiate Perimeter Scan (LiDAR sweep)
- **Key `2`**: Daily Briefing Directive
- **Key `3`**: Compile Flight Dynamics (Mach 3.4 cruise range)
- **Key `4`**: Run System Diagnostic (Arc Reactor output)
- **Key `Escape`**: Halt voice synthesizer immediately
- **Center 3D Orb**: Click to toggle `LISTENING` / `IDLE` mode

---

## 🛡️ Database & RLS Enforcement

The database schema is locked and versioned under:
`supabase/migrations/20261102000000_jarvis_core.sql`

To apply with Supabase CLI:
```bash
supabase db reset
```

---

## 🧪 Verification & Auditing

Run strict TypeScript typechecking and the production Vite bundle:
```bash
npm run typecheck
npm run build
```
