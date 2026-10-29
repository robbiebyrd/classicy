---
id: 0081-ww6
title: 'J 6.1: One Storybook story per tab, parity outside the panel, docs'
purpose: Add a Storybook story per Appearance Manager tab, prove every surface outside the panel is pixel-identical, document the new actions and the schema form, and run the final verification that closes the plan.
type: chor
status: pending
priority: "2"
effort: S
created: "2026-10-28T20:44:05.904Z"
updated: "2026-10-29T20:22:00.352Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.stories.tsx
      - docs/AGENT-REFERENCE.md
      - CLAUDE.md
      - docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
      - .playwright-mcp/parity/part-J/after
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0080-xy4", "depends"]
  plans:
    - ["0012-pt9", "included", ["6.1", "7"]]
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
  "4":
    status: pending
  "5":
    status: pending
  "6":
    status: pending
  "7":
    status: pending
---

# J 6.1: One Storybook story per tab, parity outside the panel, docs

## Problem Statement

The plan (0012-pt9 §6.1 and Phase 7) requires one Storybook story per tab (brief item 6), a parity comparison of every J 0 screenshot except the Appearance panel's own (the only surface allowed to change), and documentation of `ClassicyDesktopChangeAppearanceOption`, the `ClassicyDesktopChangeMetric` family form, `ClassicySchemaForm` and the eight-tab panel.

This story adds `ClassicyAppearanceManager.stories.tsx` under `System/AppearanceManager` (a `Panel` story plus `Themes`, `Packages`, `Options`, `Desktop`, `Colors`, `Fonts`, `Metrics`, `Sound`, each a store-backed tab hook inside a `ClassicyWindow`), shoots the new stories for the record, compares the rest of the J 0 set with `compare -metric AE`, writes the AGENT-REFERENCE and CLAUDE.md entries and the plan 0000-aud (audit) 'Done' line, drives the panel end to end with the `verify` skill, and runs the Phase 7 final-verification checklist.

**Impact:** Without the stories there is no visual reference for the new tabs; without the parity comparison a Screen Saver panel or control regression from J 1.1 could ship; without the docs the new actions and the shared form are undiscoverable.

## Steps

### 1: Write the stories

`ClassicyAppearanceManager.stories.tsx`: `title: 'System/AppearanceManager'`, `parameters: { classicy: { desktop: true } }` (decorator `withClassicy`, `storybook/.storybook/ClassicyDecorators.tsx:52-75`); story `Panel` renders `<ClassicyAppearanceManager />` (the app registers its window on mount); one story per tab — `Themes`, `Packages`, `Options`, `Desktop`, `Colors`, `Fonts`, `Metrics`, `Sound` — each a component that calls the matching `use<Name>Tab` with store-backed props (reading `useAppManager` and dispatching for real) and renders `<ClassicyWindow id="story_<tab>" appId="AppearanceManager.app" title="Appearance: <Tab>" initialSize={[480, 0]}>{tab.children}</ClassicyWindow>` inside `<ClassicyApp id="AppearanceManager.app" …>`; `Packages` registers a second package (`test-pack`, as in J 3.1) at module scope so the list shows two rows. `pnpm storybook` → every `system-appearancemanager--*` story renders without console errors (check the browser console via Playwright `page.on('console')`).

### 2: Shoot the new stories for the record

`.playwright-mcp/parity/part-J/after/system-appearancemanager--<tab>.png` for each; no comparison (new surfaces).

### 3: Parity outside the panel

Re-shoot the J 0 set into `after/`, then `for f in .playwright-mcp/parity/part-J/before/*.png; do case "$f" in *app-appearance-*) continue;; esac; printf '%s ' "$(compare -metric AE "$f" ".playwright-mcp/parity/part-J/after/$(basename "$f")" null: 2>&1)"; echo "$f"; done` — Expected: `0` on every line (Screen Saver panel, Tabs, Spinner, PopUpMenu, Checkbox, Input, ControlGroup, RadioInput, Slider, Window). Any non-zero: fix the code, never the screenshot.

### 4: Write the docs

AGENT-REFERENCE gains `ClassicyDesktopChangeAppearanceOption { path, value }` (path rules), the `ClassicyDesktopChangeMetric` family form, a `ClassicySchemaForm` entry, and an 'Appearance Manager tabs' list; CLAUDE.md Balloon-Help-style paragraph: 'Schema-driven forms: `ClassicySchemaForm` (`SystemResources/SchemaForm/`) renders a nested zod object; the Screen Saver options and the Appearance Manager's Options tab both use it. The Appearance Manager has eight tabs (Themes, Packages, Options, Desktop, Colors, Fonts, Metrics, Sound); measurements write through `ClassicyDesktopChangeMetric` (`metricKey` or `{ family, key }`), everything else through `ClassicyDesktopChangeAppearanceOption { path, value }`.'; plan 0000-aud (the audit) §9 Phase 8 gets a 'Done <date>' line. American English check on the added lines: `grep -n 'colour\|behaviour\|centre'` → none.

### 5: verify skill: drive the panel end-to-end

Example app: Packages tab shows Platinum checked; Options tab shows the Platinum knob groups (Part H families) and changing Control Strip → Cell height to 30 visibly grows the strip; Metrics tab changing Buttons → Gap to 20 widens dialog button spacing and the theme pop-up switches to Custom; Sound tab lists Platinum; Load Theme… with a file whose `package` is `irix` shows the stop alert. No console errors.

### 6: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` then `git add src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.stories.tsx docs CLAUDE.md && git commit -m "docs(appearance): stories per tab, actions and schema form reference"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

### 7: Final verification (plan Phase 7)

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` → all PASS; `pnpm build:source` → PASS. `grep -rn 'ClassicySounds\|ClassicyWallpapers\b\|const ClassicyFonts' src/SystemFolder/ControlPanels/AppearanceManager` → 0 hits. Every `before/` screenshot except `app-appearance-*` compares AE 0 with `after/`. Stop background dev servers started by this plan.

## Acceptance Criteria

- [ ] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test && pnpm build:storybook
- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/SystemResources/SchemaForm
- [ ] VERIFY: grep -rn 'ClassicySounds\|ClassicyWallpapers\b\|const ClassicyFonts' src/SystemFolder/ControlPanels/AppearanceManager | wc -l  # expect 0

## Files

- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.stories.tsx` - create: Panel plus one story per tab under System/AppearanceManager
- `docs/AGENT-REFERENCE.md` - modify: actions, metric family form, ClassicySchemaForm, panel tabs
- `CLAUDE.md` - modify: schema-form and panel-tabs paragraph
- `docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md` (plan 0000-aud) - modify: Done line in §9 Phase 8
- `.playwright-mcp/parity/part-J/after` - create: after-set compared against before

## Work Log
### 2026-10-29T20:22:00.352Z - Moved 2 open [MANUAL] acceptance criteria to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.
