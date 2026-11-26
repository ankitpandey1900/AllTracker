# Landing page design spec

## The idea

AllTracker's own line is "Outwork yesterday." The landing takes that literally:
the hero is a race between **today** and **yesterday**. A live timer ticks, and a
bar fills toward the mark where yesterday ended. Everything else on the page is
the logbook that makes that race honest: the daily ledger, the year of days, the
coach that reads the log, and the people studying right now.

The setting is the desk at night, the place the product is actually used. One
warm lamp light on violet-ink dark. No glass, no glow cards, no bento.

## Tokens

| Name    | Hex       | Role                                                |
|---------|-----------|-----------------------------------------------------|
| ink     | `#0E0D13` | page background (the app's black, a hair of violet) |
| ink-2   | `#17161E` | raised surfaces: chat, tabs, timer track            |
| paper   | `#F2F0F7` | primary text                                        |
| dust    | `#A4A0B5` | secondary text, rules                               |
| lamp    | `#F7A928` | hours: the clock, the heatmap, board totals, CTA    |
| violet  | `#A78BFA` | the record and the brand: yesterday, ranks, tabs    |
| live    | `#2AC7A0` | other people, live: studying now, online            |

Every accent is lifted from the app so the jump from landing to `/app` feels
like the same product: amber is the app's heatmap ramp, violet is the default
Obsidian Glass accent (`--accent-purple`), green is the app's `--success`.
Each colour has one job and they never swap. Violet also appears as a faint
second light, top right, opposite the amber desk lamp.

## Type

- **Big Shoulders Display** (700–900) for headlines and every number. Tall,
  condensed, scoreboard numerals. The clock is set in it at ~22vw.
- **Hanken Grotesk** (400–600) for body. Sentence case everywhere.
- Scale ~1.333 (perfect fourth): 15 / 17 / 22 / 30 / 40 / 54 / 72 / clamp hero.
- No monospace labels, no all-caps eyebrows, no middle-dot meta strings.

## Layout (single left edge, 12-col, content left aligned)

```
[mark AllTracker]            How it works  Maamu  Ranks  FAQ   [Open the app]

Outwork                                          (headline, huge, 2 lines)
yesterday.
Free study timer + logbook. sentence. sentence.     [Start the timer] Handbook

TODAY ────────────────────────────────▶|yesterday 3:41:07
01:12:03  (giant, amber, live)            ▮ pause  subject chips

Right now 7 people are focusing; 1,240 hours logged today.   (one sentence)

──────────────────────────────────────────────────────────────────────────
The log                                   | margin notes pointing at rows
Day  | DSA | Sys design | OS | total      |  ← "Editable until 4 AM"
today row (amber)                          |  ← "Sealed. Can't be edited."
rest day (frozen)                          |  ← "Freeze: 4 per 30 days"

The year  (52×7 grid full width, hover readout)

Maamu  (transcript, Beast mode switch)     | World Stage (ranked list, live)

Also in the app  (definition list, 2 cols: term / one line)

Questions (details/summary)

Your next hour starts when you press start.   [Open AllTracker]
footer
```

## Principles

1. One bold thing: the today-vs-yesterday clock. Everything else is quiet.
2. Structure carries meaning: ranks are numbered because they are ranks; the
   ledger has margin notes because the rules live on specific rows.
3. Real product content only. Rules (2h streak, 4 AM grace, midnight split,
   4 freezes per 30 days) are stated as the app enforces them.
4. One motion: the clock ticking. No scroll reveals, no hover-lift cards.
   Reduced motion stops the tick.

## Review against defaults

- First pass had a bento grid of feature cards with "FIG 01" labels. That is
  the SaaS-card kit; replaced by a ledger + definition list.
- First pass used JetBrains Mono for numbers. Mono data labels are a tell;
  numbers now use Big Shoulders tabular figures.
- Considered a cream "notebook paper" look. Cream + serif is a default and it
  breaks from the dark app the user lands in; kept the night desk instead.
