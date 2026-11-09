# ⚡ JARVIS AI — Advanced Holographic Personal Intelligence Platform
### Autonomous Multi-Modal Assistant, Windows Desktop Controller & Native Android Companion

[![Version](https://img.shields.io/badge/version-2.2.0-cyan.svg)](package.json)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android_8.6-119EFF.svg)](https://capacitorjs.com/)
[![Gemini](https://img.shields.io/badge/AI_Engine-Gemini_3.8_Flash-8E75B2.svg)](https://ai.google.dev/)
[![Android APK](https://img.shields.io/badge/Android_APK-Ready-emerald.svg)](releases/jarvis-v2.0.0.apk)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

Inspired by Tony Stark's Mark-85 HUD and FatihMakes' Mark-LVI systems engineering, JARVIS is a full-stack personal AI assistant that can **hear, see, speak, and command your computer**. It features a 3D WebGL Fibonacci particle core, real-time visual perception (screen & camera), dual-engine speech recognition, "Raise, Don't Duplicate" Windows automation, custom voice macro chaining, and native Android pairing.

---

## 📑 Table of Contents
1. [🎮 How to Launch & Run JARVIS (3 Methods)](#-how-to-launch--run-jarvis)
2. [🎙️ How to Use Voice & Speech Control](#-how-to-use-voice--speech-control)
3. [👁️ How to Use Visual Awareness (Screen & Webcam)](#-how-to-use-visual-awareness-screen--webcam)
4. [💻 How to Control Windows Apps & System](#-how-to-control-windows-apps--system)
5. [⚡ How to Create Custom Macros (Routine Builder)](#-how-to-create-custom-macros-routine-builder)
6. [📱 How to Use JARVIS on Mobile & Tablets](#-how-to-use-jarvis-on-mobile--tablets)
7. [📧 How to Use Direct Email Dispatch](#-how-to-use-direct-email-dispatch)
8. [⚙️ Prerequisites & Environment Setup](#-prerequisites--environment-setup)
9. [🔧 Troubleshooting Common Issues](#-troubleshooting-common-issues)

---

## 🎮 How to Launch & Run JARVIS

JARVIS features a **unified synchronous bootloader**. You never have to manually run separate frontend and backend terminals.

### Method 1: 1-Click Desktop Launcher *(Easiest)*
1. Open the project folder in Windows Explorer: `c:\Users\devra\Downloads\jarvis`
2. Double-click **`Launch-JARVIS.bat`**.
3. **What happens automatically:**
   * The backend server starts on port `3001` and verifies `ONLINE` status.
   * The frontend Vite server starts on port `5173`.
   * Your default web browser opens directly to `http://localhost:5173`.

---

### Method 2: Command Line Unified Runner
In your terminal or PowerShell inside the project directory:
```bash
npm run dev
```
*(Or simply `npm start`). This executes `scripts/start-jarvis.js`, which starts the backend server, verifies its health, boots the Vite frontend, and tunnels all traffic through Vite's internal proxy.*

---

### Method 3: 24/7 Silent Windows Background Service
If you want JARVIS to always be online in the background without keeping a terminal open:
1. Double-click **`setup-autostart.bat`**.
2. This installs a silent Windows VBScript runner into your Windows Startup folder (`shell:startup`).
3. **Behavior:** Every time you boot up your computer, JARVIS runs silently in the background on `http://localhost:3001` (serving both the backend API and the frontend HUD together).

---

## 🎙️ How to Use Voice & Speech Control

JARVIS features an **Acoustic Sensor Stream** with real-time spectrum analysis, subtractive EchoGuard, and dual-engine fallback.

```
  ┌─────────────────────────────────────────────────────────────┐
  │                 ACOUSTIC SENSOR STREAM                      │
  ├─────────────────────────────────────────────────────────────┤
  │  MIC INPUT LEVEL: 64% AMPLITUDE      [VOICE DETECTED]       │
  │  ▃ ▄ ▅ █ █ ▅ ▄ ▃ ▄ ▅ █ █ ▅ ▄ ▃                              │
  │  [Hardware & Gain]  Active Mic: USB Headset   Boost: 1.5x   │
  │  Engine: Web Speech API (Browser) / Gemini Neural STT       │
  └─────────────────────────────────────────────────────────────┘
```

### 1. Activating Voice Listening
* Click the **Cyan Microphone button** in the bottom chat bar, or click the mic button on the top HUD header.
* Hold **Space** or click the mic to initiate listening.

### 2. Live Audio Metering & Voice Activity Detection (VAD)
* The visualizer measures true RMS + Peak acoustic power. Normal conversational speech produces **35% – 85% Amplitude**.
* When speech is detected, a green **`[VOICE DETECTED]`** badge appears.
* **Auto-Commit on Silence:** When you finish speaking and pause for 1.8 seconds, JARVIS automatically commits your directive without needing manual clicks.

### 3. Adjusting Microphone Hardware & Sensitivity
If your microphone is quiet or you have multiple audio inputs:
1. Click the **"Hardware & Gain"** toggle inside the mic modal.
2. **Active Microphone:** Switch between your laptop microphone, USB headset, or external webcam.
3. **Sensitivity Multiplier:** Select **1.0x**, **1.5x**, or **2.5x** to amplify quiet voices.

### 4. Dual-Engine STT Switching
* **Engine A (Web Speech API):** Client-side browser recognition for instantaneous zero-latency transcription.
* **Engine B (Gemini Neural Audio STT):** Cloud-based multimodal audio transcription. If Web Speech encounters network hiccups, JARVIS seamlessly routes the audio chunk to Gemini. You can also toggle engines manually via the **"Switch"** pill in the modal header.

---

## 👁️ How to Use Visual Awareness (Screen & Webcam)

JARVIS implements Mark-LVI's `screen_processor`, allowing it to visually analyze what's on your computer monitor or camera.

### 1. Analyzing Your Screen
1. In the chat bar, click the **Monitor icon** (`Screen`).
2. Your browser will prompt you to select a screen, window, or Chrome tab.
3. Once selected, an amber **`SCREEN SENSOR ACTIVE`** badge lights up in the HUD header, and a live screenshot preview chip attaches to your input bar.
4. Type or speak your question, for example:
   * *"Look at my screen and tell me what is causing this terminal error."*
   * *"Review this React component on my screen and find bugs."*
   * *"Summarize the article currently visible on my monitor."*

### 2. Analyzing Your Webcam
1. Click the **Camera icon** (`Camera`) in the chat bar.
2. A cyan **`CAMERA SENSOR ACTIVE`** badge appears in the header.
3. Hold up an object, document, or sketch to the camera and ask:
   * *"What am I holding in front of the camera?"*
   * *"Read the serial number on this hardware board."*

### 3. Privacy Controls & Lightbox
* **1-Click Sensor Kill Switch:** Click the **`EyeOff`** button on the top header badge at any time to instantly cut all screen and camera media streams.
* **Inspect Captured Frames:** Click any image thumbnail in the chat history to expand it into a high-resolution full-screen lightbox modal.

---

## 💻 How to Control Windows Apps & System

JARVIS uses a verified process supervisor with **"Raise, Don't Duplicate"** logic and three-state outcome tracking.

### 1. Launching & Focusing Applications
When you ask JARVIS to open an application:
* *"Open Visual Studio Code"*
* *"Open Notepad"*
* *"Launch Spotify"*
* *"Open Terminal"*

**Raise, Don't Duplicate Behavior:**
* If the app is **already open**, JARVIS brings its existing window into the foreground (`AppActivate`) rather than launching multiple cluttering copies.
* If the app is **not running**, it spawns a fresh process with safe error boundaries.

### 2. Opening Websites & Web Apps
Saying commands like:
* *"Open YouTube"*
* *"Open GitHub"*
* *"Go to Gmail"*
* *"Open ChatGPT"*
* *"Navigate to https://news.ycombinator.com"*

JARVIS recognizes web destinations and opens them in your default browser safely without attempting to spawn invalid `.exe` binaries.

### 3. Three-State Outcome Cards & 1-Click Undo
Every executed OS action renders a holographic interactive card on your console:
* **`done` (Green Badge):** Confirmed in the Windows process table with verified PID.
* **`unverified` (Amber Badge):** Signal dispatched, but PID could not be confirmed.
* **`failed` (Red Badge):** OS permission or execution error.
* **Undo Button:** Click **"Undo Action"** on any spawned app card to instantly close the process via its registered PID.

---

## ⚡ How to Create Custom Macros (Routine Builder)

Automate repetitive multi-step actions and bind them to custom voice triggers:

1. Click the **Routines tab** in the navigation bar.
2. Click **"+ New Routine"**.
3. Define your trigger and action sequence:
   * **Voice Trigger:** e.g., *"Activate Coding Mode"* or *"Good Morning"*
   * **Routine Name:** e.g., *Dev Setup*
   * **Action Steps:**
     * Step 1: Launch App ➔ `Visual Studio Code`
     * Step 2: Open URL ➔ `https://github.com`
     * Step 3: Open URL ➔ `https://open.spotify.com`
     * Step 4: System Control ➔ `Brightness: 80%`, `Volume: 40%`
4. Click **Save Routine**.
5. **To execute:** Simply say your trigger phrase into the microphone: *"JARVIS, activate coding mode"*. JARVIS intercepts the trigger, executes all actions sequentially, and speaks confirmation.

---

## 📱 How to Use JARVIS on Mobile & Tablets

### Option A: Install Native Android APK
1. Download [`releases/jarvis-v2.0.0.apk`](releases/jarvis-v2.0.0.apk) directly onto your Android device.
2. Tap the APK file to install (allow "Install unknown apps" if prompted).
3. Open JARVIS on your phone for a full-screen, native mobile experience.

### Option B: 1-Scan Local Wi-Fi Pairing
1. On your PC, click the **Mobile QR button** (`QrCode`) in the HUD header.
2. A pairing modal generates a QR code encoded with your PC's LAN IP (e.g. `http://192.168.1.50:5173`).
3. Scan the QR code with your phone's camera to immediately open and operate JARVIS from your phone over your local network.

### Option C: 24/7 Mobile Access from Anywhere (Cloudflare Tunnel)
To talk to JARVIS from your phone over 5G/cellular anywhere in the world:
1. In your PC terminal, run:
   ```bash
   npx cloudflared tunnel --url http://localhost:3001
   ```
2. Cloudflare will output an HTTPS URL (e.g., `https://random-subdomain.trycloudflare.com`).
3. Open that URL on your phone browser. Microphone and voice streaming work with valid SSL without opening any ports on your home router.

---

## 📧 How to Use Direct Email Dispatch

JARVIS has a human-in-the-loop email composition engine:
1. **Command:** Say or type *"Draft an email to john@example.com about project update"*.
2. **Interactive Approval Card:** JARVIS drafts the email and presents a card with editable recipient, subject, and body fields.
3. **Execution:**
   * Click **"Approve & Send Direct"**: `server.ts` transmits the email directly via Nodemailer and displays the SMTP message ID.
   * Click **"Reject"**: Cancels and revokes the directive.

---

## ⚙️ Prerequisites & Environment Setup

### 1. System Requirements
* **Operating System:** Windows 10/11 (fully supported with desktop control), macOS, or Linux.
* **Node.js:** v18, v20, or v22+.
* **Git:** Latest version.

### 2. Clone and Install
```bash
git clone https://github.com/lagtastic-legends/jarvis.git
cd jarvis
npm install
```

### 3. Environment Variables (`.env`)
Create a `.env` file in the project root:
```env
# Mandatory: Google Gemini API Key (Get free key at https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
GEMINI_FALLBACK_MODEL=gemini-3.5-flash-lite

# Optional: Supabase (For persistent memories and routine sync)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Optional: Direct Gmail Dispatch
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_16_char_google_app_password
```

---

## 🔧 Troubleshooting Common Issues

### 1. "Intelligence server unreachable at http://localhost:3001"
* **Solution:** Run **`npm run dev`** or double-click **`Launch-JARVIS.bat`**. This uses the unified bootloader in `scripts/start-jarvis.js`, which starts the backend server first and verifies it is online before opening the frontend.
* **Never type `https://localhost:3001`:** Port 3001 is an HTTP API. The frontend proxies all requests through `http://localhost:5173/api` to prevent SSL protocol errors.

### 2. Microphone Input Level Shows 0% Amplitude
* Click the **"Hardware & Gain"** button inside the microphone modal.
* Make sure the correct microphone is selected from the dropdown list.
* Set the **Sensitivity Multiplier** to **`1.5x`** or **`2.5x`**.
* Click "Allow" in your browser's address bar microphone permission prompt.

### 3. Port 3001 or 5173 Already in Use
* If an old instance is stuck, run in PowerShell:
  ```powershell
  # Free port 3001
  Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -Force
  # Free port 5173
  Stop-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess -Force
  ```
  Then re-launch via `npm run dev`.

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
