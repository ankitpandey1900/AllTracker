# DEV LOG: UNDER THE HOOD OF ALLTRACKER 🛠️🧠

Look, AllTracker started as a massive monolith, but that became a nightmare to maintain. So, I split everything up into modular "Engines." If you're looking at this code for the first time, this is how you should think about it.

---

## 1. THE BRAIN & STRUCTURE (HOW IT BOOTS) 🧬

I’ve moved all the "Life Support" logic into the `src/core/` folder. It’s cleaner this way.

### The Entry Point (`src/main.ts`)
This is the mission commander. It doesn't do any heavy lifting; it just wakes up the other engines. If you want to change what happens when the app first loads, check `app-ignition.ts`.

### Core Folders
- **`src/core/`**: This is where the ignition, the command center (global events), and the background sync loop (Mission Pulse) live. 
- **`src/services/`**: These are the "Utility Guys." The **Data Bridge** is the most important one—it handles all the saving and loading.
- **`src/features/`**: Every big feature (Intelligence, Routines, Dashboard) gets its own folder here. Each one is a self-contained world.

---

## 2. THE MAAMU ENGINE (AI MENTOR) 🤡🔥

Maamu isn't just a basic chatbot. I built him to be a **Data-Driven Savage.** He has access to your *entire* history, so he knows if you've been slacking for months.

### How I split Maamu's logic:
- **`intelligence.service.ts`**: Handles the chat sessions and saving messages.
- **`intelligence.analytics.ts`**: The "Math Core." This is where I calculate things like momentum, sustainability, and trend scores. If the math feels off, fix it here.
- **`intelligence.prompts.ts`**: This is Maamu's "Vocabulary." I've coded the **Savage Grok Persona** here. It uses Hinglish, heavy emojis, and brutal roasts to get you moving.
- **`intelligence.local.ts`**: These are instant replies for things like "Hi" or "How am I doing?" so the user doesn't have to wait for the AI every time.

---

## 3. DATA FLOW: LOCAL-FIRST OR BUST ☁️🛡️

I hate slow apps. That's why everything in AllTracker is **Local-First.**

- When you save something, it hits your browser's `localStorage` instantly. 
- Then, the **Data Bridge** pushes it to the cloud in the background. 
- If you're debugging sync issues, look at `data.sync.ts` for the conflict logic and `data.storage.ts` for the encryption/storage stuff.

---

## 4. DESIGN VIBE: MISSION CONTROL 🎨✨

The design isn't just for show. I wanted it to feel like you're sitting in a spaceship cockpit.
- **Glassmorphism**: Use the blur and transparency tokens in `main.css`.
- **HUD Style**: Keep everything tight, techy, and high-contrast.
- **Animations**: Subtle glows and smooth transitions only. No "bouncy" animations—this is a serious tool.

---

## 5. MY CODING RULES (KEEP IT CLEAN) 🛠️👨‍💻

1.  **Don't Bloat Files**: If a file hits 400-500 lines, split it up. I’ve already done this for Intelligence and the Data Bridge—keep it that way.
2.  **No Placeholders**: If you add a button, make it work. I don't want to see "Coming Soon" anywhere.
3.  **Use the Services**: Don't touch the `appState` directly from a UI file. Use the bridge or a dedicated service. It keeps things predictable.

Stay focused. 🚀
