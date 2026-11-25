---
id: 0223-ck1
title: 'Windows 98 Appearance Package'
purpose: 'A third Appearance Package, @classicy/appearance-windows98: Windows 95 and 98 on Classicy''s structure, built on the package contract of plans 0014-ahm, 0015-kxa and 0018-dbd with no assets of its own.'
type: feat
status: complete
priority: "2"
effort: L
created: "2026-11-24T16:29:20.000Z"
updated: "2026-11-25T01:50:00.000Z"
started: "2026-11-24T16:29:20.000Z"
completed: "2026-11-25T01:50:00.000Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  plans:
    - ["0018-dbd", "related"]
progress:
  "1":
    status: complete
  "2":
    status: complete
  "3":
    status: complete
  "4":
    status: complete
  "5":
    status: complete
  "6":
    status: complete
  "7":
    status: complete
---

# Windows 98 Appearance Package

## Problem Statement

Classicy ships Platinum and System 7. A Windows 95/98 look, as 98.css, os-gui,
React95 and windows98-ui re-create it, is the first package that is a
stylesheet, themes and a sound pack alone: it registers no fonts (MS Sans
Serif is Microsoft's: the themes name a font stack), no art, icons, cursors or
wallpapers (those resolve to the default package's) and no screen savers, so
every glyph it draws (the title-bar buttons' marks, scroll arrows, the check
and the radio dot, the menu and pop-up arrows, the slider's thumb) is pixel
art from theme tokens. Eighteen themes: Windows Standard (the defaults),
Windows 95 (flat title bars) and the sixteen classic schemes of the Display
control panel, each from the `[Control Panel\Colors]` block of its Windows
theme file, with the title-bar, selected-text, ToolTip and desktop-label
colors as package color families and the chrome's sizes as knobs.

An earlier attempt on the branch predates the package split (it patched the
core's stylesheet and `themes.json`); it is replaced by this package, which
mirrors System 7's layout: `packages/appearance/windows98`, its own Vite and
vitest configs, `bin/verify-dist.mjs`, tests, README and license.

**Impact:** A third look for hosts, the worked example of a package with no
assets, and the first package to add color families and knobs of its own
without registering art.

## Steps

### 1: Scaffold and wiring

`packages/appearance/windows98` (package.json, vite, vitest, tsconfigs,
verify-dist, LICENSE, README); root wiring: a fourth vitest project, tsconfig
paths, `build:source`, `build:audio`, the watch scripts, the example app,
Storybook (package toolbar, theme toolbar, `storybook/.storybook/windows98.ts`,
stories), `bin/check-host-types.ts`, the release workflow's version sync and
publish, the trusted-publishing bootstrap, the multiplier allowlist, and the
repo tests that enumerate packages.

### 2: Themes, color families and knobs

`src/windows98.json`: eighteen presets, `colorFamilies` (`titleBar`,
`selection`, `tooltip`, `desktop`), knob families (`pixel`, `titleBar`,
`pushButton`, `checkbox`, `radio`, `popUp`, `field`, `tabControl`,
`progressBar`, `tooltip`, `menuFrame`, `menuItem`, `slider`, `growBox`,
`utilityTitleBar`), `knobs` for `titleBar` and `progressBar`, the layout
(grow box bottom right, menu bar on the screen, icons from the top left).

### 3: Sound pack

`src/assets/sounds/windows98`: a beep and four alert tones (Chimes, Chord,
Ding, Exclamation) synthesized for the package, built by
`bin/make_audio_sprites.sh` into ogg and m4a, registered before the package.

### 4: The stylesheet

`src/styles/windows98.scss`: one package-layer block of 25 component partials
(`components/_<Name>.scss`) over `_bevels.scss` (the four-ring bevels as inset
box-shadows of the system tokens) and `_pixel.scss` (`px()`, `pixel-art()`,
`runs()` on the `--pixel-unit` grid), under every gate: no pixel literal, no
color literal, no multiplier outside the allowlist, no `!important`, every
variable read emitted, every `--package-color-*` read with a core fallback.

### 5: Storybook, example and docs

Windows 98 stories; the example imports the package; README, CLAUDE.md,
`docs/AGENT-REFERENCE.md` §8 "Windows 98", `docs/RELEASE-NOTES-3.8.md`.

### 6: Gates and visual check

`pnpm lint`, `tsc --noEmit`, `storybook:typecheck`, `pnpm test`,
`pnpm build:source` (each package's verify-dist, host types), the example
build; screenshots of the example under the Windows 98 schemes.

### 7: Pull request

Command: `git commit -m "feat(appearance): Windows 98 Appearance Package"`

## Acceptance Criteria

- [ ] VERIFY: `pnpm lint`, `pnpm exec tsc --noEmit -p .`, `pnpm storybook:typecheck`, `pnpm test` and `pnpm build:source && pnpm --filter classicy-example build` pass with the package present.
- [ ] VERIFY: The package's own tests pass (`pnpm --filter @classicy/appearance-windows98 exec vitest run`): registration, schema, eighteen themes, the sound pack, exports, build config, source imports, the bundle-test build, the compiled sheet.
- [ ] VERIFY: Platinum and System 7 draw as before (their tests and verify-dist unchanged).
- [ ] VERIFY: The example under Windows Standard, Windows 95 and a classic scheme shows the gradient title bar with Minimize, Maximize and Close at the right, bevelled controls, checkered scroll bars and the teal desktop.

## Files

- `packages/appearance/windows98` - create
- `package.json`, `vitest.config.ts`, `tsconfig.json`, `pnpm-lock.yaml` - modify
- `storybook/.storybook/{main.ts,StorybookPackages.ts,windows98.ts,Windows98StoryHelpers.test.tsx,PreviewThemeToolbar.test.ts}`, `storybook/tsconfig.json` - modify
- `example/{package.json,vite.config.ts,src/app.tsx}` - modify
- `bin/{check-host-types.ts,checkHostTypes.test.ts,classicyReleaseWorkflow.test.ts,makeAudioSprites.test.ts,multiplier-allowlist.json,npm-bootstrap-trusted-publishing.sh,npmBootstrapTrustedPublishing.test.ts,classicyDeflateAsset.test.ts}` - modify
- `.github/workflows/push.yml` - modify
- `src/Appearance/{ClassicyPackageExports.test.ts,ClassicyPlatinumDeepImports.repo.test.ts,ClassicyBrowserFloor.repo.test.ts}`, `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.varCoverage.test.ts` - modify
- `README.md`, `CLAUDE.md`, `docs/AGENT-REFERENCE.md`, `docs/RELEASE-NOTES-3.8.md` - modify

## Work Log

- 2026-11-24: The branch was restarted from `main` (the earlier attempt
  predates the package split). Steps 1, 2, 3 and 5 done; step 4 in progress
  (the window and menu partials first); the library build, the example build
  and Biome pass with the package in place.

### 2026-11-25T01:50:00.000Z - Completed: PR #346

The package, its wiring and docs (steps 1 to 5), the gates and the visual
pass under Windows 98, Windows 95 and Brick (step 6), and the pull request
(step 7). The Windows Interface Guidelines audit
(`docs/plans/windows-guidelines-audit.md`) ran against the package before
the review: 30 package-scope fixes, six additive core hooks, and story
0225-m4q for the core behaviors and layout flags it deferred. Owner action
before the release: story 0224-b3v.
