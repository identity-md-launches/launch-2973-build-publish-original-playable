# Burrow Siege

A playable, single-page tower defense where Squeektoshi’s real hamster wheel powers the burrow. Protect a seed vault through 20 waves, or choose endless mode. The artwork, terrain, hamster, towers, and predators are original CSS, SVG, and canvas pixel art.

The complete static site is in **[`dist/`](dist/)**. It uses relative asset URLs and is ready for the assignment platform’s IPFS publication step. This local delivery does not claim an assigned CID or gateway URL.

## Install, run, and rebuild

Use Node.js 22.12 or newer and npm. Node 24 was used for validation.

```sh
npm ci
npm run dev
```

Open the URL Vite prints. For the production export:

```sh
npm run build
npm run preview
```

`build` runs TypeScript checking and Vite, replacing `dist/`. `vite.config.ts` sets `base: './'`. Serve or upload the **whole** export, including `assets/`, `favicon.svg`, `share.png`, and licenses. There is one page, no server routing, and no private configuration. Fonts and artwork are bundled locally. A cold visit requires the static assets to load; loss of the wheel API then activates Practice mode. This is not a service-worker offline installer.

Keep `dist/` in the submission alongside `src/`, `package.json`, and `package-lock.json`. Dependencies and caches are excluded; no npm registry mirror or dependency archive is required. The explicit path and byte budget is in [`artifacts/path-budget.md`](artifacts/path-budget.md).

## Play

Choose a tower and select a marked **+** plot. On a phone, the selector beside the battlefield lets you change tools without scrolling; the full build tools below show costs and details. Start the wave when ready. Between waves, spend earned seeds and send the next wave yourself.

| Tool | Hotkey | Base seeds | Watts per shot | Available |
| --- | --- | ---: | ---: | --- |
| Spark Coil | 1 | 70 | 9 | Start |
| Zap Lamp | 2 | 110 | 16 | Wave 3 |
| Static Fence | 3 | 135 | 20 | Wave 7 |
| Seed Catapult | 4 | 55 | 0 | Start |
| Sticky Honey Trap | 5 | 40 | 0 | Start |
| Sawdust Blower | 6 | 90 | 0 | Wave 5 |

Locked towers can also be unlocked early by a Block Crate. Select a placed tower to upgrade it to level 3 or sell it for **70% of its actual seed investment**, including upgrades. Fractional costs round up; refunds round down. The run starts with 210 seeds, 20 vault hearts, and 100 stored Watts in a 500-Watt battery.

- **Power:** while the wheel is ACTIVE, RPM × 2 Watts enter the battery per game second. Electric towers spend Watts to shoot and stop when they cannot afford a shot. Mechanical towers always work.
- **Nap:** IDLE halves predator movement and spawning, and reduces building and upgrade costs by 30%. The moon and “Squeektoshi is napping, build now” appear for a live nap. Rest gives a building opportunity.
- **Rush:** ACTIVE above 40 RPM speeds waves by 1.3× and adds 50% electric damage through Overcharge.
- **Predators:** beetles, snakes from wave 2, owls diving down the far shaft from wave 4, and a weasel boss every fifth wave.
- **Blocks:** after the initial live height establishes a baseline, every height increment gives one three-choice Block Crate. Multiple increments queue separate crates. A notification and the choice dialog show the real block number. Choices change range, fire rate, battery capacity, or unlock a tower.
- **Modes:** win after wave 20 or select Endless before starting. A classic victory also offers Continue endless.
- **Controls:** pause/resume, 1×/2× speed, optional sound, and a restart confirmation. Space pauses when focus is outside a button or text control; native buttons retain Space activation. Hotkeys do not intercept typing. Plot buttons also support Tab and Enter. Escape closes help, scores, and restart; crates require a choice.

The battery and combat freeze while paused or a dialog is open. Building is possible while explicitly paused. Live polling continues. Wheel illustration speed uses wall time and measured RPM, independently of 2× game speed. Reduced motion and pause stop decorative wheel motion.

## Live data and honest fallback

The only data endpoint is [`https://api.squeekchain.com/v1/status`](https://api.squeekchain.com/v1/status), fetched immediately and every **5 seconds**. [`artifacts/api-observation.json`](artifacts/api-observation.json) records a real public observation on November 4, 2026, including its CORS header.

| Game data | Verified response field |
| --- | --- |
| Wheel state | `measurement.coreStatus`: ACTIVE, IDLE, COUNTER_FAULT |
| RPM | `measurement.rpmMilli / 1000` |
| Freshness | `measurement.freshness`, plus `observedAt` and `staleAfterSeconds` |
| Distance | `measurement.distanceMm`, shown in feed details |
| Block | `builder.projected.blockHeight` and `blockProgress`; fall back together to `builder.anchor` |

Block progress is in billionths of a block. The observed response satisfies `cumulativeBlockUnits = blockHeight × 1,000,000,000 + blockProgress`. Heights use decimal strings and BigInt, preserving precision. A projected rollback never grants duplicate crates because the hook keeps the highest rewarded live height.

A request timeout, failed/malformed response, COUNTER_FAULT, non-online freshness, expired observation, or lack of a recent successful response switches to **“Wheel feed offline”** and explicitly labelled **Practice mode**. Requests time out after 4.5 seconds; a successful response must remain within 15 seconds and within the observation’s freshness deadline, capped at 120 seconds. Retry and automatic polling can restore the live feed.

Practice uses a clearly simulated 75-game-second cycle: 28 RPM for 25 seconds, 48 RPM for 23 seconds, then a 27-second nap. Its phase wording also says Practice. Every second completed practice wave gives a **Practice Crate**, with no invented block number. The HUD identifies cached block data as “Last real block.” A run that uses any practice simulation stays marked Practice in its score, even after reconnecting.

## Local high scores

The best ten runs are stored only in this browser’s `localStorage`, under `burrow-siege-scores-v1`. Names are limited to 20 characters and rendered as React text, never HTML. A score stores wave reached, defeated predators, mode, practice/live provenance, and the real live block available when the run ended. If the feed is offline at the finish, the end block is `null` and shown as unavailable; a cached height is never asserted to be current. Blocked/full storage produces a recoverable inline message and does not stop play. Clearing site storage clears local scores and first-visit tutorial state.

There are no tokens, wallets, contracts, transactions, betting, prizes, or shared online leaderboard.

## Validation

```sh
npm run typecheck
npm test
npm run check:export
```

For browser checks, install Playwright’s Chromium once, then run the bounded script. It owns and closes its preview server and browser, serving the actual export under `/preview/`.

```sh
npx playwright install chromium
npm run test:browser
```

The browser script supports `--executable=/path/to/chromium-headless-shell` for an existing installation. Optional WebKit checking uses `--with-webkit` after installing WebKit and its system libraries. These checks use explicit, intercepted API fixtures for repeatable state transitions; the application export always requests the real public endpoint.

Actual results for this delivery: production build and typecheck passed; **20 tests passed**, including a complete affordable mixed-defense simulation with 540 defeated predators and 20/20 hearts; Chromium interaction checks passed. Mobile, desktop, offline/retry, real-height crate sequencing, score escaping/persistence, focus return, and reduced motion were checked. The pinned taste probe passed **15/16** checks; its sole remaining warning is intentional native-dialog occlusion, documented with screenshots. WebKit could not launch because required system libraries are absent. Native 200% browser zoom, physical-device behavior, and a screen-reader session remain unverified.

See [`artifacts/validation.md`](artifacts/validation.md) for exact coverage, fixes, evidence, and limitations; [`DESIGN.md`](DESIGN.md) describes the final source’s design system. These are worker checks, not independent certification.

## Source map

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Game UI, native dialogs, frame loop, keyboard and touch interactions |
| `src/engine.ts` | Pure game rules, combat, paths, wave state, upgrades and crates |
| `src/art.ts` | Cached terrain and original pixel sprites, effects, wheel and vault |
| `src/feed.ts`, `src/useWheel.ts` | Response validation, polling, freshness and practice cycle |
| `src/storage.ts` | Validated local scores and first-visit persistence |
| `src/Icons.tsx`, `src/style.css` | Original SVG icons, components and responsive tokens |
| `tests/` | Game rules, full combat simulation and storage failure tests |
| `scripts/` | Browser validation, export/budget check, social-card generation |

The 1200×630 social card is already included. To regenerate it after changing the artwork, use `npm run generate:share` with an installed Chromium browser, then rebuild. It reuses the real drawing code and local fonts; it does not fetch artwork. Credits and licenses are in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

Unofficial fan game for Squeekchain. Data read live from the public API on Sepolia testnet.
