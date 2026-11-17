[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/binasalama12/makefun-best-game-01-w7-masquerade-manor/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/binasalama12/makefun-best-game-01-w7-masquerade-manor/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# MASQUERADE MANOR — one guest is the Thorn: 7 rounds, 8 guests, 6 clue types, 8 tools, final case The Thorn Unmasked

**Follow the masked guests, gather true clues, pin the evidence on the case board — and spend your single accusation on the one guest the evidence names.**

A single-player social-deduction game on a 2D canvas — no libraries, no build step, no network. Open
`game/index.html` from any static server and play.

## The game

A masked ball in a gaslit manor. **8 AI guests** wander, mingle and slip away between eight rooms —
and one of them, drawn secretly by the seeded RNG, is **the Thorn**. You are the detective.

Each **round** (of **7 rounds per case**) you walk the manor, watch who avoids whom and who lingers
at the conservatory door, read the **incidents feed**, and gather glowing **clue tokens**. A
**conservatory linger tracker** on the suspicion panel counts how often each guest slips back to
the conservatory — the Thorn and its decoys drift there far more than anyone else, so a rising
tally is a real behavioural tell (a hint, never proof: only clues convict). There are
**6 clue types** — muddy footprint, torn silk, wax seal, perfume vial, scratched key, false alibi —
and every token reports a **true trait of the Thorn**. The deduction is genuinely solvable, by
construction: footprint, silk and seal are three independent traits, so those three clues together
always narrow the eight guests to exactly one (the case generator re-verifies this before a case
starts). Perfume, key and alibi are parity traits that confirm a suspect — or expose a guess.

Pin the evidence on the **case board**: a suspect grid with live suspicion meters, alibi claims,
evidence links and the shrinking list of candidates still standing. When you are sure, spend your
**single accusation**: right — the case is solved, with a bonus for every round spared; wrong — the
Thorn strikes and the case is lost. If the seventh round ends, the case goes cold.

Between cases, **draft 1-of-3 detective tools** from a pool of **8** — Seeker Lens, Alibi Ledger,
Ear Trumpet, Velvet Gloves, Candle Lantern, Pocket Notebook, Silver Mirror, Thorn Snare — each with
a real, wired-in effect. The campaign is **3 cases**: *The Sealed Invitation*, *The Conservatory
Door*, and the final case **The Thorn Unmasked**, where the culprit hides behind two decoy
accomplices who mimic the Thorn's habits. After the campaign: **endless cases**. Three difficulties
(Salon 50s rounds, Manor 40s, Thorn 30s). A full campaign run scores in the **tens of thousands**
through clue chains, incident bonuses, case bonuses and rounds-spared bonuses.

## Controls

- **WASD / arrow keys:** walk the detective. **Mouse:** click to walk, click a guest to approach / observe.
- **E:** observe the nearest guest (once per guest per round; reads their behaviour, and with the Silver Mirror, their tell).
- **C:** open / close the case board. **Esc:** back. **P:** pause.
- On the case board: click a suspect to select, then accuse — or accuse from the ballroom. One accusation per case.

## Screens

`screenshots/` holds four real renders of the game itself, in dossier order: the final-case
accusation moment at round 7 with the Thorn-sighting banner up and the full HUD live; the case
board with all six clues pinned; the dense title screen (how-to, the eight guests and their tells,
difficulties and the endless mode); and the victory end screen with the detective's letter rank,
ten run statistics and the tools recap.

## Layout

- `game/index.html` — the page and HUD strip.
- `game/src/config.js` — the manor rooms, the eight guests and their tells, the six clue types, the eight tools, cases, difficulties, scoring.
- `game/src/world.js` — trait assignment, case generation with a verified unique solution, clue scheduling, guest agents, the incidents feed.
- `game/src/render.js` — all canvas art and screens: textured manor rooms, guests, HUD panels, case board, draft, title / end.
- `game/src/main.js` — the game loop and state: rounds, clue chains, accusations, drafts, endless cases, win / lose.
- `game/src/hud.js`, `game/src/input.js`, `game/src/audio.js` — HUD strip, controls, WebAudio synth blips.
- `game/src/shots.js` — deterministic `?shot=` scenes used to render the screenshots.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` out and writes the dossier.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## Hand in

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
node serve.ts        # or any static server over game/, to play it
```

MIT licensed — see `LICENSE`.
