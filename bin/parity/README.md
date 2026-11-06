# Visual parity tools

Pixel-parity checks for refactors and Appearance Packages: shoot every
Storybook story (and four example-app screens) before a change, shoot them
again after it, and compare the two sets pixel for pixel. A refactor that is
meant to change nothing must come back at **AE 0** everywhere.

Everything runs through one entry point:

```bash
node bin/parity/parity.ts <command> [options]   # or: pnpm parity <command> ...
node bin/parity/parity.ts help                  # the full option list
```

## Requirements

- **Node 24** (the repo's `mise.toml`); the scripts are erasable TypeScript
  that Node runs directly.
- **Playwright 1.57.0**, a pinned devDependency of the workspace root, so
  `pnpm install` brings it. It drives Chromium 143.0.7499.4 (the
  `chromium_headless_shell-1200` build). If the browser is not in
  `~/.cache/ms-playwright`, run `pnpm exec playwright install chromium`. Keep
  the pin: a different Chromium rasterizes differently, so a baseline and its
  after set must come from the same version. `$PARITY_PLAYWRIGHT` points the
  tools at another Playwright package directory.
- **ImageMagick**, for `compare`: `compare` (ImageMagick 6, or 7
  with its legacy names) or `magick compare`. Install it with
  `apt-get install imagemagick` or `brew install imagemagick`; the tool stops
  with that hint when neither is on `PATH`.

## Commands

| Command | What it does | Package script |
|---|---|---|
| `stories` | List the server's story ids (`index.json`, `type: "story"`, sorted) to stdout or `--out <file>` | `pnpm parity:stories` |
| `shoot` | One 1024x768 PNG per story, `<out>/<id>.png`, plus the `stories.txt` it shot; with `--mid`, also `<out>/<id>@mid.png` for the animated stories (below) | `pnpm parity:shoot` |
| `app` | The four example-app shots: `app-about`, `app-finder-preferences`, `app-hypercard`, `app-drive-setup` | `pnpm parity:app` |
| `compare` | `<beforeDir> <afterDir>`, by AE (PNGs, `@mid` shots included; `--kind ae` is the only kind) | `pnpm parity:compare` |

Shared options: `--port`, `--base-url`, `--filter <regex>` (story ids, shot
names or file names), `--stories <file>` (a fixed id list instead of the
server's index), `--workers <n>` (default 4), `--summary <file>` (compare
writes its full report there).

Exit codes: 0 when the run is clean, 1 when anything differs or a shot failed,
2 on a usage or environment error (no server, no Playwright, no ImageMagick).

## Starting the servers

Use a port nobody else is using; several worktrees can run at once.

**Shoot the static build.** It is the prescribed serving mode, and a baseline
and its after set must come from the same one. `storybook dev` and the static
build now draw the same pixels (`desktop-window--default` shot from each is
AE 0), because both configs hand `VitePluginImageTools` the same `excludes`
(`CLASSICY_IMAGE_TOOLS_EXCLUDES`, `bin/classicyImageTools.ts`) and package art
reaches the browser as authored. Before story 0146-doe the static build ran
svgo over every emitted SVG, `resizer.svg` (the window grow-box grip) included,
and drew it AE 69 in a 10x10 box differently from dev; a baseline shot before
that fix (`platinum-split/before`) carries the old grip, so compare only sets
shot from builds on the same side of it. `pnpm build:storybook` ends with
`bin/check-storybook-art.mjs`, which fails if any emitted package art differs
from its source.

```bash
# Storybook: the STATIC build of the checkout under test, never `storybook dev`
pnpm build:storybook
(cd storybook/storybook-static && exec python3 -m http.server 6091 --bind 127.0.0.1 \
  > ../../.playwright-mcp/parity/sb.log 2>&1) &
echo $! > .playwright-mcp/parity/sb.pid
until curl -sf -o /dev/null http://127.0.0.1:6091/index.json; do sleep 1; done

# The example app (live source too), for `app`
cd example
node node_modules/vite/bin/vite.js --port 5391 --strictPort --host 127.0.0.1 \
  > ../.playwright-mcp/parity/example.log 2>&1 &
echo $! > ../.playwright-mcp/parity/example.pid
```

Without `--port`, Storybook commands use `$SB_PORT`, else 6006, on
`http://localhost`, so pass `--base-url http://127.0.0.1:<port>` for the
server above (it binds IPv4 only); `app` uses `$EXAMPLE_PORT`, else 5173, on
`http://127.0.0.1` (the example binds IPv4 only with `--host 127.0.0.1`).

Stop them by the PIDs you saved, after checking each one is the process you
started (`ps -o pid,args -p <pid>`). Never `pkill` or
`killall`: other agents' servers look the same.

## Baseline, after set, compare

Data goes under `.playwright-mcp/parity/<name>/`, which is gitignored. Never
commit screenshots or dumps.

```bash
P=.playwright-mcp/parity/my-change

# 1. Baseline, on the commit before the change.
pnpm parity:shoot --base-url http://127.0.0.1:6091 --out $P/before
pnpm parity:app   --port 5391 --out $P/before

# 2. Prove the setup is deterministic: shoot again and compare. Expect AE 0.
pnpm parity:shoot --base-url http://127.0.0.1:6091 --out $P/rerun
pnpm parity:compare $P/before $P/rerun --summary $P/ae-before-vs-rerun.txt

# 3. Make the change (Storybook and the example reload), then the after set.
pnpm parity:shoot --base-url http://127.0.0.1:6091 --out $P/after
pnpm parity:app   --port 5391 --out $P/after
pnpm parity:compare $P/before $P/after --summary $P/ae-before-vs-after.txt
```

`compare` prints only the shots that are not AE 0, then the summary line; the
`--summary` file lists every shot:

```text
758 controls-kbd--keycaps
SUMMARY total 32 zero 31 nonzero 1 missing 0 errors 0
```

For a subset, pass the same `--filter` to `shoot` and `compare` (or a fixed
`--stories` list to `shoot`). A story set that changed between the two
commits shows up as `MISSING-IN-BEFORE` or `MISSING-IN-AFTER`.

### What AE 0 means

`compare -metric AE` counts the pixels that differ between two images, with no
fuzz: AE 0 means the two PNGs are pixel-identical, and any other number is the
count of pixels that changed. It does not say how much they changed, so a 1 px
shift of a long edge can give hundreds. Two images of different sizes are
reported as `ERROR ... size differs`: ImageMagick 6 would answer AE 0 for them
(it runs a subimage search instead), so the tool checks the PNG dimensions
first.

### Determinism

Every shot is taken the same way, so the only differences are the code's:

- **Chromium flags** `--disable-gpu --disable-lcd-text --disable-partial-raster`.
  Without them about 7% of fresh contexts render some rows 1 px differently at
  half-pixel offsets: GPU compositing, subpixel (LCD) text antialiasing and
  partial (tiled) raster each make a frame depend on timing.
- A fresh browser context per story (empty localStorage), 1024x768 at DPR 1.
- The clock pinned with Playwright's fake clock (stories at
  2026-01-01T09:41; the app at 12:00:30 after the startup screen, with the
  clock's blink switched off).
- A readiness wait: no Storybook preparing overlay, a rendered
  `#storybook-root`, fonts loaded, the element count stable for 500 ms.
- CSS transitions finished and other animations paused at t=0, then 500 ms,
  then again; shots use Playwright's `animations: "disabled"`. (The `@mid`
  shots pause them part-way instead: see "Mid-time shots".)
- Shots repeated until two consecutive frames are byte-identical (at most
  eight; a story that never settles is listed as unstable, the app shot
  fails).

A single small AE that disappears when that story is shot again
(`--filter '^<id>$'`) is raster noise; a repeatable one is real. Run captures
one at a time: parallel runs on a loaded machine raise the noise rate.

## Mid-time shots

The t=0 set parks every animation on its first frame, so a change that only
shows mid-animation (a keyframe, an easing, the menu-item flash, a screen
saver's path, a window's zoom) shoots AE 0. `shoot --mid` adds a second shot of
each animated story, paused part-way through:

```bash
pnpm parity:shoot --base-url http://127.0.0.1:6091 --out $P/before --mid           # t=0 set + @mid set
pnpm parity:shoot --base-url http://127.0.0.1:6091 --out $P/mid --mid-only --at 400ms
pnpm parity:compare $P/before $P/after                        # compares both sets
pnpm parity:compare $P/before $P/after --filter '@mid$'       # the @mid set only
```

- **Selection.** A story gets a mid shot when `document.getAnimations()` is
  not empty once it is ready (CSS animations and transitions, `::before` and
  `::after` included, fill-forwards animations that have already ended too),
  or when its id is in the `--mid-stories <file>` list (one id per line, like
  `--stories`). The ids shot go to `<out>/mid-stories.txt`. Under Platinum
  about a hundred stories qualify, most of them for the menu-bar clock's
  blinking separator.
- **Files.** `<id>@mid.png`, beside `<id>.png`; no story id holds `@`. Each
  mid shot is taken in a fresh context of its own, so the t=0 shots are the
  same bytes with or without `--mid`. `compare` matches names, so a set shot
  without `--mid` against one shot with it reports every `@mid` shot as
  `MISSING-IN-BEFORE`: shoot both sides the same way.
- **The time, `--at`.** A percentage (default `50%`) is taken of each
  animation's own iteration, so a 150 ms flash and a 26 s fish both land
  mid-cycle and a looping animation never lands on an iteration boundary
  (where it meets its t=0 frame); a fractional iteration count takes the share
  of its shorter active interval. A positive delay is skipped, so a late
  starter is still caught; a negative delay is a phase offset and is kept, so
  staggered elements stay staggered. A time (`400ms`, `1.5s`) is used as is
  for every animation: the frame that long after the story became ready,
  delays included, so a short animation may already be on its last frame.
  50% is the point farthest from both ends; it misses an animation whose
  middle looks like its start (the Fish saver's fish are off-screen at both
  0% and 50%), so pass another `--at` for those.
- **The clock's colon is not paused but held.** `.textBlinker` (the menu-bar
  clock's separator, `steps(1, end)` with a keyframe at exactly 50%) is set to
  `animation: none` for the mid shot (`PARITY_MID_STILL_SELECTORS`), so the
  colon is always drawn. Paused at the step it came out on either side of it
  in about 1 shot in 100 under load (AE 12 in a 3x8 box). A story whose only
  animation is the blink therefore still gets an `@mid` shot, equal to its t=0
  shot apart from the clock.
- **How it freezes.** Every animation is paused with the Web Animations API
  (`a.pause(); a.currentTime = T`) from `effect.getComputedTiming()`, twice a
  frame apart; a capture-phase `animationstart`/`transitionrun` listener
  freezes animations that start later, and again 500 ms on. The shot skips
  Playwright's `animations: "disabled"`, which would finish or cancel the
  paused animations, and is repeated until two frames match, as for t=0. Two
  matching frames are not enough here (a stepped blink holds still for a
  second while it runs), so the shot is also retaken, up to three rounds,
  unless every animation is still paused at its time afterwards and none was
  caught starting during it; a story that never gets there is listed as
  unstable.
- **The JS clock.** Stories run under Playwright's fixed Date
  (`page.clock.setFixedTime`): timers keep running but `Date.now()` stands
  still, so Classicy's Date-driven state (the startup progress and extension
  parade, the virtual clock, the screen saver's idle timer) is frozen at t=0.
  For the mid shot the fixed Date moves on by `--mid-clock <ms>` (default: the
  `--at` time, or 2000 ms for a percentage, half the 4 s startup) and the
  timers pick it up on their next tick. Such state has no CSS animation, so
  its stories are selected only through `--mid-stories` (the startup screen
  stories, say).

Limits: the Web Animations API covers CSS animations and transitions and
`element.animate()`. It does not reach anything drawn per frame from
`requestAnimationFrame` or `performance.now()` (the fixed clock fakes only
`Date`), nor canvas or video content; Classicy's screen savers are CSS, so
none of them is affected. Nor does it list animations on user-agent shadow
pseudo-elements such as `::-webkit-progress-value`: the indeterminate progress
bar's barber pole is one, and in Chromium 143 it does not move on screen
either, so it has no mid shot.

## Files

| File | Role |
|---|---|
| `parity.ts` | CLI entry: usage, dispatch, exit codes |
| `parityArgs.ts` | Option parsing and defaults |
| `parityBrowser.ts` | Playwright loading, the Chromium flags, readiness wait, settle, stable shot |
| `parityStories.ts` | Story ids from `index.json` or a list file |
| `parityShoot.ts`, `parityApp.ts` | The shots |
| `parityMidTime.ts` | The mid-time shot's `--at` parsing, pause time, selection, file name and page script |
| `parityCompare.ts` | The AE compare |

The computed-style dump, forced-state dump and render probe that once sat
beside these (`probe`, `dump`, `forced`, `compare --kind computed|forced`) were
removed after the Appearance Packages extraction; a compare of anything but
screenshots is no longer offered.
