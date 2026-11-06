---
id: 0049-cdo
title: 'I 4.1: Probe package and one AppearanceHooks story per wired component'
purpose: Give every wired component a Storybook story that renders under a probe package which decorates roots and logs events, and document the hook surface.
type: feat
status: complete
priority: "2"
effort: M
created: "2026-10-28T20:20:35.567Z"
updated: "2026-10-30T03:06:28.590Z"
started: "2026-10-30T01:52:29.710Z"
completed: "2026-10-30T03:06:28.590Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
    files:
      - storybook/.storybook/ClassicyAppearanceProbe.tsx
      - src/SystemFolder/SystemResources/Button/ClassicyButton.stories.tsx
      - src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.stories.tsx
      - src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.stories.tsx
      - src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.stories.tsx
      - src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.stories.tsx
      - src/SystemFolder/SystemResources/ComboBox/ClassicyComboBox.stories.tsx
      - src/SystemFolder/SystemResources/Input/ClassicyInput.stories.tsx
      - src/SystemFolder/SystemResources/ListBox/ClassicyListBox.stories.tsx
      - src/SystemFolder/SystemResources/Slider/ClassicySlider.stories.tsx
      - src/SystemFolder/SystemResources/Placard/ClassicyPlacard.stories.tsx
      - src/SystemFolder/SystemResources/Tabs/ClassicyTabs.stories.tsx
      - src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.stories.tsx
      - src/SystemFolder/SystemResources/Tree/ClassicyTree.stories.tsx
      - src/SystemFolder/SystemResources/Table/ClassicyTable.stories.tsx
      - src/SystemFolder/SystemResources/Link/ClassicyLink.stories.tsx
      - src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.stories.tsx
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.stories.tsx
      - src/SystemFolder/SystemResources/Alert/ClassicyAlert.stories.tsx
      - src/SystemFolder/SystemResources/Menu/ClassicyMenu.stories.tsx
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.stories.tsx
      - src/SystemFolder/SystemResources/Icon/ClassicyIcon.stories.tsx
      - src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.stories.tsx
      - src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.stories.tsx
      - docs/AGENT-REFERENCE.md
      - CLAUDE.md
      - src/Appearance/ClassicyAppearanceProbe.story.test.tsx
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0048-fpx", "depends"]
  plans:
    - ["0006-dy6", "included", ["4.1"]]
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
---

# I 4.1: Probe package and one AppearanceHooks story per wired component

## Problem Statement

Audit §9 Phase 7 item 3 (umbrella 0002-ldj): a Storybook story per component showing the package hook surface. `storybook/.storybook/ClassicyAppearanceProbe.tsx` registers a `storybook-probe` package at module scope whose `decorate` outlines every root (`.sbProbe`, magenta; `.sbProbePressed`, green, returned by `press` and cleared by `release`) and whose `on` table logs `<Component>.<event>` through `storybook/actions`; the exported `<ClassicyAppearanceProbe>` wrapper activates the package on mount and restores "platinum" on unmount. Because the Storybook frame writes `data-classicy-appearance` from the store (part B 2.1), the probe also turns Platinum CSS off — the structure-only render of audit §8.2 becomes visible. Each of the 23 story files gains an `AppearanceHooks` story; AGENT-REFERENCE.md and CLAUDE.md document the hook, the 16 events, the decoration precedence, D23 semantics, the sound bridge and the Platinum hooks table.

**Impact:** Without the stories the hook surface has no visual proof and no way for a package author to see decorations and events; without the docs the hook is undiscoverable.

## Steps

### 1: Write the failing probe test

src/Appearance/ClassicyAppearanceProbe.story.test.tsx (the root vitest config has no `@sb` alias, so the test imports the module by relative path `../../storybook/.storybook/ClassicyAppearanceProbe`): `registers the probe package` (getClassicyAppearancePackage("storybook-probe") defined, css starts with "@layer classicy.package"); `activates on mount and restores platinum on unmount` (render <ClassicyAppearanceProbe><span/></ClassicyAppearanceProbe> → store packageId "storybook-probe"; unmount → "platinum"); `decorates and logs` (render a ClassicyButton inside → button has class sbProbe and data-sb-state; mouseDown → class sbProbePressed; mouseUp → gone).

### 2: Run it to verify it fails

`pnpm exec vitest run src/Appearance/ClassicyAppearanceProbe.story.test.tsx` — Expected: FAIL — module not found. (If `storybook/actions` cannot resolve under vitest from the root workspace, mock it with vi.mock("storybook/actions", () => ({ action: () => () => {} })).)

### 3: Create the probe module and add the 23 AppearanceHooks stories

ClassicyAppearanceProbe.tsx registers `{ id: "storybook-probe", name: "Storybook Probe", css: PROBE_CSS, defaults: { ...getTheme("default"), package: "storybook-probe" }, presets: [], layout: <Platinum layout>, hooks: { decorate: (c, s) => ({ className: "sbProbe", attrs: { "data-sb-state": classicyStateClasses(s) } }), on: <every CLASSICY_COMPONENT key × every event → (ctx) => { action(`${ctx.component}.${ctx.event}`)(ctx.detail ?? null); if (ctx.event === "press") return { className: "sbProbePressed" }; if (ctx.event === "release") return {}; }> } }` with `PROBE_CSS = '@layer classicy.package { .classicyDesktop[data-classicy-appearance="storybook-probe"] .sbProbe { outline: 1px dashed #ff00ff; outline-offset: 1px; } .classicyDesktop[data-classicy-appearance="storybook-probe"] .sbProbePressed { outline-color: #00aa00; } }'`; exports `ClassicyAppearanceProbe: FC<{ children }>` that sets packageId "storybook-probe" in a useLayoutEffect on mount and restores "platinum" on unmount, rendering children inside a note `<p>` reading `Rendered under the "storybook-probe" package: Platinum CSS is off (structure only — audit §8.2), every root is outlined by decorate(), and every emitted event is logged in the Actions panel.`. Each story file gains `export const AppearanceHooks: Story = { render: (args) => (<ClassicyAppearanceProbe><Component {...args} /></ClassicyAppearanceProbe>), parameters: { docs: { description: { story: "The package hook surface: decorations from decorate() (magenta outline; green while pressed) and the events the component emits (Actions panel)." } } } }` using that file's default-story args (desktop stories wrap their existing StoryApp/window render); story ids become `<title>--appearance-hooks`.

### 4: Run the probe test and build Storybook

`pnpm exec vitest run src/Appearance/ClassicyAppearanceProbe.story.test.tsx && pnpm build:storybook` — Expected: PASS and a clean build; open controls-button--appearance-hooks: the button renders unstyled with a magenta outline; pressing it turns the outline green and logs Button.press / Button.release / Button.click in Actions.

### 5: Document the hook

docs/AGENT-REFERENCE.md: under the Appearance Packages subsection add `useClassicyAppearance(component, state, ref)` with its return shape, the 16 events, the decoration precedence (state classes → decorate → last emitted), D23 semantics (void keeps, {} clears), `playClassicyAppearanceSound(sound, { interrupt })` for handlers, and the Platinum hooks table (component → event → sprite). CLAUDE.md `### Theming`: one paragraph: components call `useClassicyAppearance` on their root; feedback sounds and the menu flash are Platinum hooks (`src/Appearance/Platinum/hooks.ts`), never component code; error beeps stay in components.

### 6: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git commit -m "docs(appearance): AppearanceHooks stories under a probe package; document the hook"` with the trailer Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>.

## Acceptance Criteria

- [x] VERIFY: pnpm exec vitest run src/Appearance/ClassicyAppearanceProbe.story.test.tsx && pnpm build:storybook
- [x] Each of the 23 wired component story files exports an `AppearanceHooks` story rendering under the storybook-probe package, with the probe activated on mount and platinum restored on unmount.
- [x] AGENT-REFERENCE.md and CLAUDE.md document useClassicyAppearance, the 16 events, the decoration precedence and D23 semantics, playClassicyAppearanceSound and the Platinum hooks table.

## Files

- `storybook/.storybook/ClassicyAppearanceProbe.tsx` - create: probe package and wrapper
- `src/SystemFolder/SystemResources/Button/ClassicyButton.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/ComboBox/ClassicyComboBox.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/Input/ClassicyInput.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/ListBox/ClassicyListBox.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/Slider/ClassicySlider.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/Placard/ClassicyPlacard.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/Tree/ClassicyTree.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/Table/ClassicyTable.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/Link/ClassicyLink.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/Alert/ClassicyAlert.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/Icon/ClassicyIcon.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.stories.tsx` - AppearanceHooks story
- `src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.stories.tsx` - AppearanceHooks story
- `docs/AGENT-REFERENCE.md` - hook, events, D23, sound bridge, Platinum hooks table
- `CLAUDE.md` - Theming paragraph on the hook
- `src/Appearance/ClassicyAppearanceProbe.story.test.tsx` - create: probe tests

## Work Log
### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.

### 2026-10-30T02:59:46.897Z - I 4.1 implemented on feat/appearance-part-i-v2 (bbafc04f4 I 3.2 review minors; 333a5182e AppearanceHooks stories under a probe package, hook docs). Full gate green: 363 files / 4252 tests, build:source + verify:dist + build:storybook. All 302 baseline stories AE 0; 23 new stories shot for the record. Task review dispatched.

### 2026-10-30T03:06:25.644Z - Task review APPROVED (no Critical/Important). Hook tables verified against every emit call site; all 2.3 corrected docs rows landed; probe isolation sound. Minors (mock path resolution, docs 'unmapped' sentence and R10 collapse clause, I-R17 ledger wording) folded into I 5. R10 follow-up filed as 0088-sz9.
