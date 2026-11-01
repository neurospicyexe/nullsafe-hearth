# Hearth Design Fix Plan

Critique date: 2026-03-22
Brief: intimate/cozy + ritual/ceremonial

---

## Priority 1 — Palette (coldness is the root problem)

**File:** `app/globals.css` — `:root`

| Token | Current | Target |
|-------|---------|--------|
| `--hue-base` | `230` (blue) | `28` (warm amber) |
| `--bg-color` | `hsl(230, 20%, 4%)` | `hsl(28, 18%, 5%)` |
| `--surface-base` | `hsl(230, 22%, 10%)` | `hsl(28, 16%, 10%)` |
| `--card-bg` | `hsl(230, 22%, 10%)` | `hsl(28, 16%, 10%)` |
| `--input-bg` | `hsl(230, 22%, 6%)` | `hsl(28, 16%, 6%)` |
| `--surface-raised` | `hsl(230, 22%, 16%)` | `hsl(28, 16%, 16%)` |
| `--accent-hue` | `250` (violet) | `35` (amber-gold) |
| `--text-main` | `hsl(230, 12%, 88%)` | `hsl(28, 10%, 88%)` |
| `--text-muted` | `hsl(230, 12%, 52%)` | `hsl(28, 10%, 50%)` |
| `--border-subtle` | `hsla(230, 20%, 32%, 0.28)` | `hsla(28, 18%, 32%, 0.28)` |
| `--border-strong` | `hsla(230, 20%, 42%, 0.48)` | `hsla(28, 18%, 42%, 0.48)` |

Note: Companion identity colors stay as-is (they carry meaning).
Drevan's color becomes the secondary accent (violet is still in the system via companion identity, just not the primary UI accent).

---

## Priority 2 — Remove gradient text from titles

**File:** `app/globals.css` — `.page-title`

Remove:
```css
background: linear-gradient(135deg, ...);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

Replace with:
```css
color: var(--text-main);
```

Keep the wordmark gradient on `.nav-wordmark` (one allowed instance, it's the logo).

---

## Priority 3 — Cards: solid not glass

**File:** `app/globals.css` — `.card`

Remove:
```css
background: var(--surface-glass);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
```

Replace with:
```css
background: var(--card-bg);
```

Keep `backdrop-filter` ONLY on `.search-backdrop` and `.search-panel`.
Remove `--surface-glass` and `--surface-glass-hover` variables (or keep but don't use on cards).

---

## Priority 4 — Remove left-border accent card variant

**File:** `app/globals.css` — `.card-accent`

The left `border-left: 3px solid var(--accent)` + gradient background reads as an AI cliché.

Options:
- Remove entirely and let the Room card be a standard card with a distinct background shade
- Replace with a top-border or a more deliberate full border-color change

---

## Priority 5 — Fix global hover glow on links

**File:** `app/globals.css` — `a:hover`

Remove:
```css
text-shadow: 0 0 8px var(--accent-glow);
```

Keep `filter: brightness(1.2)` — that's fine. The glow is the problem.
Add glow back only on specific elements where it makes sense (e.g., companion identity links with their own color).

---

## Priority 6 — Differentiate hover behavior by element type

**File:** `app/globals.css` — `.card:hover`

Current: every card lifts with `translateY(-2px)` + shadow.

New rules:
- `.card:hover` (default): only `border-color` transition, no lift
- Cards that ARE navigation destinations: add `.card--link` class with lift behavior
- Companion cards: a companion-tinted edge (no glow). Glow only on rings, dots, hairlines and the room bloom; never on hover
- Presence card / live feed: no hover effect (ambient, not interactive)

---

## Priority 7 — Replace spring easing

**File:** `app/globals.css` — `:root`

```css
/* Remove */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Replace with */
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);  /* ease-out-quint */
```

Audit all uses of `--ease-spring` and replace.

---

## Priority 8 — Ceremonial weight for presence card

**File:** `app/globals.css` — `.presence-card`

The presence card (open session) should feel like the most significant element on the home page. Currently it's a glass card like everything else.

Direction:
- Slightly warmer background than standard cards
- More generous padding (2rem instead of 1.5rem)
- A quiet top or bottom border in the accent color (not left-side stripe)
- The "live" status dot is good — keep it

---

## Priority 9 — Body background simplification

**File:** `app/globals.css` — `body`

Current:
```css
background-image: radial-gradient(circle at 15% 10%, ...), radial-gradient(circle at 85% 90%, ...);
```

These ambient blobs are a generic dark-mode AI tell. Remove them — a solid warm dark background is more dignified and cozy. If you want ambient warmth, a very subtle texture (via SVG or CSS noise) would be more considered.

---

## Skill Command Map

| Issue | Skill |
|-------|-------|
| Palette shift (cold → warm) | `/colorize` |
| Remove decoration (gradients, glass, glow) | `/distill` |
| Ceremonial presence card + dream entries | `/delight` |
| Hover differentiation and motion | `/animate` |
| Typography cleanup | `/arrange` |

---

## What NOT to change

- Atkinson only (one readable typeface; Caveat and Quicksand retired in P8)
- Symbolic nav icons (◈ ⌂ ♥ ↹ ◌) — distinctively personal
- Companion identity colors (drevan/cypher/gaia/raziel) — meaningful system
- Home page information hierarchy — it's correct
- Presence card structure (session vs handover vs no-session) — solid
- The wounds link — honest and specific, don't polish it
