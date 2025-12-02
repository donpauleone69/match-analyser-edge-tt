# Clear localStorage to Fix Black Screen

## The Problem

After the terminology refactoring, the localStorage structure changed:
- `contacts` → `shots`
- `games` → `sets`
- `currentRallyContacts` → `currentRallyShots`

Your Chrome browser has **old data** that's incompatible with the new structure, causing the app to crash (black screen).

---

## Quick Fix (30 seconds)

### **Option 1: Chrome Console** (Fastest!)

1. Open http://localhost:5173/matches/new in Chrome
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Paste this command and press Enter:
   ```javascript
   localStorage.clear(); location.reload()
   ```
5. Done! The app will refresh with clean localStorage.

---

### **Option 2: Chrome DevTools Application Tab**

1. Press **F12** → Go to **Application** tab
2. In left sidebar: **Local Storage** → `http://localhost:5173`
3. Right-click on `tt-tagger-session` → **Delete**
4. Refresh page (**F5**)

---

## After Clearing

You'll see the setup form properly:
- ✅ Video upload field
- ✅ Player names (Player 1, Player 2)
- ✅ Match date, first server, tagging mode
- ✅ Match format dropdown
- ✅ "Mark First Serve" button
- ✅ "Start Tagging" button

---

## Why This Happened

This is a **breaking change** refactoring (as documented). The localStorage key is the same (`tt-tagger-session`), but the internal structure changed, causing Zustand to fail hydration and crash.

**This is expected and intentional** - you already exported your old match data to CSV/JSON before the refactoring.

