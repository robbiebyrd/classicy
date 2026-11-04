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
  tools at another Playwright package directory (used for Firefox, below).
- **ImageMagick**, for `compare --kind ae`: `compare` (ImageMagick 6, or 7
  with its legacy names) or `magick compare`. Install it with
  `apt-get install imagemagick` or `brew install imagemagick`; the tool stops
  with that hint when neither is on `PATH`.

## Commands

| Command | What it does | Package script |
|---|---|---|
| `stories` | List the server's story ids (`index.json`, `type: "story"`, sorted) to stdout or `--out <file>` | `pnpm parity:stories` |
| `shoot` | One 1024x768 PNG per story, `<out>/<id>.png`, plus the `stories.txt` it shot | `pnpm parity:shoot` |
| `app` | The four example-app shots: `app-about`, `app-finder-preferences`, `app-hypercard`, `app-drive-setup` | `pnpm parity:app` |
| `probe` | Flag stories that end in Storybook's error display, an empty root or a crash screen | `pnpm parity:probe` |
| `dump` | Full computed style (pseudo-elements included) of every element, `<out>/<id>.json` | `pnpm parity:dump` |
| `forced` | Computed style in forced states (pressed, hover, focus, dragging, inactive, ...), `<out>/<story>__<state>.json`; `--browser firefox` for the `::-moz-range-*` and `scrollbar-width` reads | `pnpm parity:forced` |
| `compare` | `<beforeDir> <afterDir>`, by `--kind ae` (PNGs, default), `computed` or `forced` | `pnpm parity:compare` |

Shared options: `--port`, `--base-url`, `--filter <regex>` (story ids, shot
names, state names or file names), `--stories <file>` (a fixed id list instead
of the server's index), `--workers <n>` (default 4), `--summary <file>`
(compare and probe write their full report there), `--repo <dir>` (the
checkout the server serves; default the current directory).

Exit codes: 0 when the run is clean, 1 when anything differs or a shot failed,
2 on a usage or environment error (no server, no Playwright, no ImageMagick).

## Starting the servers

Use a port nobody else is using; several worktrees can run at once.

```bash
# Storybook, from the checkout under test (live source; no build needed)
cd storybook
pnpm exec storybook dev -p 6091 --no-open > ../.playwright-mcp/parity/sb.log 2>&1 &
echo $! > ../.playwright-mcp/parity/sb.pid
until curl -sf -o /dev/null http://localhost:6091/index.json; do sleep 3; done

# The example app (live source too), for `app`
cd ../example
node node_modules/vite/bin/vite.js --port 5391 --strictPort --host 127.0.0.1 \
  > ../.playwright-mcp/parity/example.log 2>&1 &
echo $! > ../.playwright-mcp/parity/example.pid
```

Without `--port`, Storybook commands use `$SB_PORT`, else 6006, on
`http://localhost`; `app` uses `$EXAMPLE_PORT`, else 5173, on
`http://127.0.0.1` (the example binds IPv4 only with `--host 127.0.0.1`).

Stop them by the PIDs you saved, after checking each one is the process you
started (`ps -o pid,args -p <pid>`). `pnpm exec storybook` leaves a child
process (Storybook's dispatcher) that must be stopped too. Never `pkill` or
`killall`: other agents' servers look the same.

## Baseline, after set, compare

Data goes under `.playwright-mcp/parity/<name>/`, which is gitignored. Never
commit screenshots or dumps.

```bash
P=.playwright-mcp/parity/my-change

# 1. Baseline, on the commit before the change.
pnpm parity:shoot --port 6091 --out $P/before
pnpm parity:probe --port 6091 --summary $P/probe.txt   # a broken story shoots AE 0 too
pnpm parity:app   --port 5391 --out $P/before

# 2. Prove the setup is deterministic: shoot again and compare. Expect AE 0.
pnpm parity:shoot --port 6091 --out $P/rerun
pnpm parity:compare $P/before $P/rerun --summary $P/ae-before-vs-rerun.txt

# 3. Make the change (Storybook and the example reload), then the after set.
pnpm parity:shoot --port 6091 --out $P/after
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
  then again; shots use Playwright's `animations: "disabled"`.
- Shots repeated until two consecutive frames are byte-identical (at most
  eight; a story that never settles is listed as unstable, the app shot
  fails).

A single small AE that disappears when that story is shot again
(`--filter '^<id>$'`) is raster noise; a repeatable one is real. Run captures
one at a time: parallel runs on a loaded machine raise the noise rate.

## Computed-style and forced-state dumps

Pixels can hide a change that has not shown yet (a hover color, a pressed
bevel). The dumps catch those:

```bash
pnpm parity:dump   --port 6091 --out $P/computed-before
pnpm parity:forced --port 6091 --out $P/forced-before
# ... change, then the same into *-after, and:
pnpm parity:compare $P/computed-before $P/computed-after --kind computed --summary $P/computed.txt
pnpm parity:compare $P/forced-before   $P/forced-after   --kind forced
```

The compare normalizes the dev server's origin and the checkout path out of
URLs (each dump records them in `__origin`), so a different port or worktree is
not a difference. Known noise it already handles:

- `margin-*` on `DIV.classicyDesktopIconImage` is layout-dependent and flips
  between runs; it is skipped.
- `__html` (the root's markup length) moves with any markup change; it is
  reported as a histogram of deltas, not as a difference.
- `__matchedPseudo` in forced dumps (the matched rules of the slider and
  scrollbar pseudo-elements, which Chromium's `getComputedStyle` cannot read)
  changes with any stylesheet text change; it is ignored.

The forced matrix (`parityForcedMatrix.ts`) names its stories; a story that was
renamed or removed fails its entries with a `FAIL` line.

**Firefox.** Firefox has no CDP, so no forced pseudo-classes, but it can read
`::-moz-range-*` and `scrollbar-width`. Playwright 1.57 wants `firefox-1497`
(`pnpm exec playwright install firefox`); to use another installed Playwright
and its Firefox instead:

```bash
PARITY_PLAYWRIGHT=/path/to/node_modules/playwright \
  pnpm parity:forced --port 6091 --browser firefox --out $P/forced-firefox-before
```

## Files

| File | Role |
|---|---|
| `parity.ts` | CLI entry: usage, dispatch, exit codes |
| `parityArgs.ts` | Option parsing and defaults |
| `parityBrowser.ts` | Playwright loading, the Chromium flags, readiness wait, settle, stable shot |
| `parityStories.ts` | Story ids from `index.json` or a list file |
| `parityShoot.ts`, `parityProbe.ts`, `parityApp.ts` | The shots and the render probe |
| `parityDump.ts`, `parityForced.ts`, `parityForcedMatrix.ts` | The dumps |
| `parityCompare.ts`, `parityDumpCompare.ts` | The compares |

The tools replace the uncommitted scripts under `.playwright-mcp/parity/`
(`post-b/scripts/capture.cjs`, `dumpstory.cjs`, `forced.cjs`,
`forced-firefox.cjs`, `compare-ae.sh`, `compare-computed.py`,
`compare-forced-strict.py`, and `part-H/scripts/shoot-app.cjs` and
`probe-render.cjs`). Shots from the old and new tools of the same tree compare
at AE 0, so the old baselines stay usable.
