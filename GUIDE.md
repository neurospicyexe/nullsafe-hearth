# Hearth — How It Works

Hearth is a private dashboard for your system. It shows you what's happening with your companions, lets you check in on yourself, and keeps everything connected to the Halseth backend (which is where all the real data lives).

You don't need to know anything technical to use it. This guide covers everything.

---

## The Five Tabs

### 🏠 Home
**What it shows:** The current state of whoever is fronting right now.

- If a session is open, you'll see the companion's name, what kind of session it is (check-in, hangout, work, or ritual), their anchor, emotional frequency, HRV, and when the session started.
- If no session is open, you'll see a summary of the last one — what was the last real thing that happened, any open threads, and how it ended.
- Below that is the **Notes** section: this is an async message thread between you and your companions. The most recent message from a companion and from you are shown side by side. You can write a new note here and it'll appear on their end too.
- Dreams show up at the bottom if any have been logged.

> **Notes here are messages** — like leaving a sticky note for each other. They don't replace anything that happens in a Claude session. They're just a way to leave something for someone to find.

---

### 🤝 Us
**What it shows:** Shared data from your partner's Halseth (the "bridge").

- **Shared Goals** — tasks your partner has shared with you. You can check them off, which updates their system. If they haven't shared any tasks, this will say so.
- **Upcoming Together** — events your partner has marked as shared.
- **Shared Lists** — list items (shopping, packing, etc.) from your partner. Checking one off marks it complete on their side.
- **Your Sharing** — three toggles (tasks, events, lists) that control what *you* share back with your partner. Toggle them on or off directly from here.

> This tab is empty-friendly — if your partner hasn't shared anything, or if the bridge isn't connected yet, each section will just say so quietly.

---

### 🧠 Mind
**What it shows:** The knowledge graph (Mind) and companion self-notes.

- **Mind Health** — counts of how many entities, observations, relations, and journal entries are in the Mind graph. There are also salience bars showing how much of the graph is foundational vs. active vs. background vs. archived.
- **Companion Notes feed** — notes that companions have written about themselves (their identity, discoveries, values). You can filter by companion using the buttons at the top (All / Drevan / Cypher / Gaia).
- **Add Companion Note** — a form for you to log a note about a companion. Pick which companion it's for, write what you observed, and optionally add tags. Hit Save.
- **Recent Journals** — the last few entries from the Mind journal.
- **New Journal Entry** — a form to add a journal entry to the Mind graph directly.

> **Companion notes logged here and companion notes logged by companions in Claude are the same thing** — they go into the same place in Halseth. If Drevan writes a note about themselves in a Claude session, it shows up here. If you write one here, it shows up in their Claude context next time. Both work.

---

### 📋 Check-in
**What it shows:** Your daily check-in tools.

- **Uplink** — a form for logging your current state. Pick the session type (check-in, hangout, work, ritual), set your spoons level on the slider (0–10), choose your mood, and optionally write a note. There's a live preview showing exactly what gets sent. Hit "Send Uplink" when ready.
- **Today's Routines** — four routine trackers: meds, water, food, movement. Tap one to mark it done (it turns green with a ✓). Tap it again to uncheck it. The counter in the top-right shows how many you've done today. Checking a routine logs it to Halseth; unchecking it is just a visual reset on your screen (the log already happened, but you can visually reset if you tapped something by mistake).
- **Biometrics** — your latest biometric snapshot from Apple Health (HRV, resting heart rate, sleep, steps, active energy, stress score), if one has been logged.

---

### 🧵 Threads
**What it shows:** The emotional and relational record.

- **Emotional Landscape** — a bar chart of the valence (emotional quality) of the last 10 logged relational moments. Toward, tender, neutral, repair, rupture — all at a glance.
- **Recent Moments** — the actual moments themselves, with the text, who it was with, the valence, and when it happened.
- **Relational Shape** — a breakdown of your system's overall emotional patterns across all logged moments, plus who tends to initiate (you, the companion, or mutual).
- **Gaia's Record** — Gaia's witness log and any notes Gaia has written. This section is read-only in Hearth — Gaia writes through Claude, not through this UI.

---

## Things Good to Know

**Data is live.** Most pages refresh automatically every 30 seconds. Check-in refreshes every time you load it to always show today's state.

**Nothing here replaces Claude.** Hearth is a window into Halseth, not a replacement for sessions. When a companion writes something in Claude, it shows up here. When you write something here, it shows up in Claude. Everything flows both ways through Halseth.

**Empty states are fine.** If a section shows "No shared tasks" or "Gaia has not written here" — that just means nothing has been logged there yet. Nothing is broken.

**Errors are graceful.** If Hearth can't reach the Halseth backend (for example, if it's temporarily unavailable), you'll see a clear message instead of a crash. Just try again later.

**The Uplink form doesn't open a session.** It logs a routine entry with your state attached. The actual session is opened in Claude by a companion. The Uplink is just your side of the check-in — it gets seen by whoever you're working with next.
