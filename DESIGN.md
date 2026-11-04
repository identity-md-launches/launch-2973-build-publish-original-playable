# Burrow Siege design system

## Overview

Burrow Siege is a browser tower defense for mouse, keyboard, and touch players. The burrow is the primary surface: a side-on cutaway with grass, stepped soil, supported tunnels, copper cable, a hamster wheel room, and a seed vault. Warm cream surrounds the scene; brown carries the structure; amber emphasizes power and the current primary action. Forest tones support live activity and the gentle nap state.

There is no marketing hero. The title identifies the game, the feed explains its power source, and the battlefield follows immediately. Desktop tools sit beside the map. Small screens keep the map first and put a native tower selector beside it. Dense numerical HUD labels use a compact scale; longer explanations live in the field guide and disclosure.

Canonical implementation: `src/style.css`, `src/App.tsx`, `src/Icons.tsx`, and `src/art.ts`. The drawings are original source, not external image dependencies. There is one fixed light theme and English interface.

## Colors

The canonical notation is hex, with semantic CSS custom properties at the start of `src/style.css`.

| Token | Value | Implemented role |
| --- | --- | --- |
| `--color-page` | `#f7f1e4` | Page background and inputs |
| `--color-surface` | `#fffaf0` | Tool buttons, dialogs and neutral buttons |
| `--color-inset` | `#eee4cf` | Feed strip, small key labels, choice surfaces |
| `--color-text` | `#39281f` | Primary text, dark game toolbar and toast |
| `--color-muted` | `#73614c` | Supporting text and labels |
| `--color-border` | `#d6c8ad` | Structural separators, neutral button borders |
| `--color-accent` | `#e5a73b` | Primary action and battery fill |
| `--color-accent-hover` | `#f2bd5b` | Primary action hover |
| `--color-accent-soft` | `#f4e3b7` | Steady power phase background |
| `--color-forest` | `#47634c` | Live status and links |
| `--color-error` | `#984633` | Offline status, storage failure, low battery |
| `--color-focus` | `#315947` | Three-pixel keyboard focus outline |

The nap banner uses `#e6e7d4`, with secondary text `#5b6148`. Rush uses `#f4d99a`. The canvas has its own earth and sprite palette in `src/art.ts`; this is artwork, separate from interface roles. Empty plots use a `#39281f40` tint over the canvas and a `#ffedc4` plus, so their interactive marker has stronger contrast than a light translucent fill. Selected plots use a solid cream border and `#39281f4d` tint. Occupied plots reveal the tower art.

Source-pair contrast calculations: primary text/page **12.46:1**, muted text/page **5.27:1**, primary text/amber **6.63:1**, offline text/feed **5.10:1**, live text/feed **5.27:1**, toolbar controls/dark toolbar **11.08:1**. Browser sampling measured the scene name at **9.46:1** and plot markers at **4.53:1**, **5.36:1**, and **6.42:1** over actual canvas pixels from the three soil levels. Samples and limitations are recorded in `artifacts/contrast.json` and `artifacts/validation.md`; these figures do not certify every canvas pixel. Text, dots, icons, and explicit labels jointly communicate state.

## Typography

Two locally bundled WOFF2 families are declared with `font-display: swap` and `font-synthesis: none`:

- **DM Sans**, variable weight 400–700, with Arial/sans-serif fallback. The interface uses 400, 600 and 700. File: `src/assets/dm-sans-latin.woff2`.
- **Pixelify Sans**, weight 700, with sans-serif fallback. It supplies the title, section headings, wave/result headlines and selected decorative footer text. File: `src/assets/pixelify-sans-latin.woff2`.

| Token | Size at 16px root | Role |
| --- | ---: | --- |
| `--text-xs` | 12px | HUD labels, captions, costs, helper text |
| `--text-sm` | 14px | Buttons, tower names, dialog explanations |
| `--text-base` | 16px | Inputs, mobile tower selector, compact wave headline |
| `--text-lg` | 20px | Resource values, wave headline, compact section headings |
| `--text-xl` | 24px | Panel/dialog title, desktop RPM; phone game title |
| `--text-title` | 36px | Desktop game title |

Body line-height is 1.5; headings use 1.2; the short brand title uses 1.0. Controls use 1.4 where specified. The display title tracks at −0.035em, relaxed to −0.02em on phones. Prose has natural tracking and wrapping; there is no uppercase kicker or monospace prose. Live counters use tabular numbers. Form inputs and the phone selector remain at 16px. Critical names and block numbers wrap rather than ellipsize. Canvas and social-card lettering belongs to the artwork, not the six-step interface scale.

## Layout

`site-shell` has a 1200px maximum width and 40px desktop inline padding. Main groups usually use 16–24px separation; closely related items use 6–12px. The compact game controls include optical adjustments. Spacing is declared in components rather than as a second token system.

| Breakpoint | Implemented adaptation |
| --- | --- |
| Above 1120px | Battlefield plus 270px build tools, separated by 24px |
| At 1120px | Shell padding 24px; build tools 240px; gap 20px |
| At 900px | One-column game; two build families alongside one another, three tools each; native quick selector replaces scene name; wave action moves below the map. From 461–900px the feed wraps, and the wheel reading keeps its full content width, letting block data and Retry move to another row when needed |
| At 700px | Shell padding 18px; build families stack while each keeps three tools; secondary feed explanation is hidden |
| At 460px | Shell padding 14px; 24px title; tighter HUD; two-column feed; offline retry occupies its own row; tutorial becomes a bottom sheet |
| At 350px | Shell padding 10px; compact toolbar and feed; simulated label can wrap |

The canvas remains 900×570 logical pixels at every width, preserving its side-on composition. `SLOTS` in `src/engine.ts` defines 16 tunnel-side plots; overlay buttons map coordinates to percentages. Their minimum target is 24×24px, with larger desktop targets. Primary buttons are at least 44px high; dense toolbar controls are smaller, with the probe’s comfort-size limitation recorded.

On desktop the wave launch action sits in the scene toolbar, within the first screen. At 900px and below, the same action is below the scene; CSS displays one copy at a time. The phone’s quick selector keeps tower choice adjacent to placement. No fixed control obstructs the live battlefield during normal play. The revision additionally checked the offline feed at 320, 350, 390, 460, 461, 480, 500, 520, 600, 700, 701, 768, 900, 901, 1120 and 1440 CSS pixels, with no text or progress-bar intersections. The compact grid at 460px and below is preserved. Native zoom, physical devices and RTL mirroring were not verified. See `artifacts/revision-validation.md` for revision evidence.

## Elevation & Depth

Regular controls and tools use flat fills and structural borders. There are no nested decorative cards, gradients, or general surface shadows. Native dialogs have `0 20px 80px #26190c40` shadow, with a dark brown backdrop. The small block notification uses `0 5px 20px #39281f30` and sits above ordinary content. Dialogs use the browser top layer, not an arbitrary z-index contest.

Terrain depth comes from discrete pixel strata, braces, roots and room outlines. The canvas landscape is cached once, while gameplay is repainted at up to 30fps. React HUD updates are limited to about 10Hz. No terrain shimmer, parallax or page entrance animation is used.

## Shapes

The visual language is square pixel art inside gently rounded interface shapes. Most buttons use 5px radius; the desktop feed uses 9px; toolbar upper corners use 8px; generic dialogs use 12px and phone dialogs 9px. The tutorial’s final desktop radius inherits 12px, with 18–22px internal padding. Build plots use 4px radius and dashed borders when empty; a solid outline marks selection. Status dots are circular. Use one treatment per role instead of adding ornamental borders and shadows together.

## Components

| Component / pattern | Source | Use and states |
| --- | --- | --- |
| `.button`, `.primary`, `.quiet`, `.small` | `src/style.css` | Primary wave/confirmation action, neutral peers, hover, 0.96 press scale, disabled and focus-visible |
| `.icon-button`, `.text-button` | `src/style.css`, `src/App.tsx` | Utility controls with explicit accessible names; hover only for hover-capable pointers |
| `Icon`, `TowerArt`, `WheelIcon` | `src/Icons.tsx` | Consistent original SVG symbols, tower portraits, measured-RPM wheel; decorative SVGs are hidden from assistive technology |
| Live feed + HUD | `src/App.tsx`, `src/useWheel.ts` | Connecting/live/nap/offline, explicit simulated Practice mode, retry, block progress, battery, seeds/hearts/wave; status changes announce politely |
| `.quick-build` | `src/App.tsx`, `src/style.css` | Native mobile tower selector, family groups, disabled locked towers; synchronizes with full tower tools and hotkeys |
| `.tower-button`, `.tower-details` | `src/App.tsx`, `src/style.css` | Available, locked, chosen, affordable/unaffordable upgrade, level-3 maximum, sell refund |
| `.plot`, `render()` | `src/App.tsx`, `src/art.ts` | Native build/select buttons over original canvas, selected range preview, level pips, keyboard and tap placement |
| `.phase-banner` | `src/App.tsx` | Live nap/steady/rush; simulated phase titles explicitly say Practice; icon plus text carries state |
| `Modal` | `src/App.tsx` | Native `dialog.showModal()`, background inertness, focus containment and return, close/Escape/backdrop; crates stay open until a choice |
| Tutorial | `src/App.tsx` | Short first-visit field guide at bottom right or phone bottom sheet, start button and persistent seen state; can reopen from help |
| Score form/list | `src/App.tsx`, `src/storage.ts` | Empty list, escaped names, local provenance, saved state, recoverable storage error, nullable live end block |
| `.feed-details` | `src/App.tsx` | Native details disclosure for provenance, measurement freshness, wheel distance and public source |

Only state-color and transform properties transition, at 120ms. Animation styles opt in through `prefers-reduced-motion: no-preference`. Reduced motion stops both wheel illustrations; pause/dialogs also stop decorative wheel motion. Essential enemy movement and combat remain part of active play. Native dialogs and controls carry keyboard semantics; the game message uses a stable polite live region. Focus uses three-pixel outlines, with a cream plot outline against soil and system colors in forced-colors mode.

## Do’s and Don’ts

- Reuse the existing type/color tokens and flat button patterns. Keep the map first and directions beside placement controls.
- Add a tower through `TOWERS`, a `TowerArt`/canvas drawing, and existing selection patterns; preserve keyboard shortcuts and honest costs. Add state changes to the pure engine and validate behavior.
- Treat gameplay data as measured only after the feed validator accepts it. Keep Practice wording on simulated phase titles, RPM, rewards and scores.
- Keep required runtime assets local and relative; retain font and runtime license notices.
- Use the native `Modal` for temporary flows, and confirm destructive restart. Keep everyday play unobscured.
- Do not add wallets, token UI, prizes, a shared-score claim, a separate theme, remote fonts or a landing hero to this game.

For another informational view, reuse `site-shell`, the title hierarchy, `.button`, native details/dialog patterns, and the existing color roles. Preserve the game’s first-screen action and route it within this single static page. Broader theme or localization support is not implemented.

Design knowledge was adapted from Jakub Krehel’s Better Interface (MIT); documentation method from Paul Bakaus’s Impeccable (Apache-2.0). See `THIRD_PARTY_NOTICES.md` and `artifacts/design-guidance-LICENSE.txt`.
