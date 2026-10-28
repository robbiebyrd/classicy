---
id: 0003-7x7
title: 'Part A: Vocabulary and cascade hygiene'
type: impl
status: in_progress
priority: "2"
effort: XL
created: "2026-10-28T18:44:10.907Z"
updated: "2026-10-28T23:40:53.021Z"
links:
  repo:
    local: ~/classicy
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  plans:
    - ["0002-ldj", "parent"]
    - ["0000-aud", "included"]
progress:
  "0":
    status: complete
  "1":
    status: complete
  "1.1":
    status: complete
  "2":
    status: complete
  "2.1":
    status: complete
  "2.2":
    status: complete
  "3":
    status: in_progress
  "3.1":
    status: in_progress
  "4":
    status: pending
  "4.1":
    status: pending
  "4.2":
    status: pending
  "5":
    status: pending
  "5.1":
    status: pending
  "6":
    status: pending
---

# Part A: Vocabulary and cascade hygiene

## Summary

**Goal:** One generated vocabulary (root/part class names, bare shared state classes, part attributes) that JS and SCSS share, applied to every component, with Classicy's CSS compiled into the `classicy.base` cascade layer and zero `!important` left in src/**/*.scss, while Platinum renders pixel-identical.

**Problem:** Audit §2.8: ~88 component-specific state classes, three `data-state` users (BevelButton, Placard, ImageWell — the audit names ControlStrip, but the strip only styles BevelButton's `data-state`), one `[aria-expanded]` selector (ControlStrip.scss:226), BEM strays (`driveSetupList__row--selected`, `classicyColorPickerSlider--red/--green/--blue`, `select--disabled`) and the doubled `.classicyDesktopMenuAppleMenu` (declared twice, MenuBar.scss:6 and :58). §2.6: 158 `!important` (ClassicyWindow.scss 62) because every window state rule precedes the base `.classicyWindow` rule at :222, and `platinumWindowControlBox` (appearance.scss:120-121) forces `!important` sizes on callers. §2.9: no `@layer`, so a package can only win by escalating. §5: `ClassicyButton` drops a consumer `className` (ClassicyButton.tsx:166-171 spreads `rest` before `className=`), and ~30 components accept neither `className` nor `style`. §2.1 / Phase 1 item 6: phantom tokens `--color-theme-1`, `--box-border-size` (DriveSetupList.scss:17,79), `--color-theme-hover` (Placard.scss:109), `--color-theme-selection` (ImageWell.scss:41,48); empty `.classicyWindowZoomed` (Window.scss:9) and the undefined `block` class (ClassicyWindow.tsx:1784).

**Approach:** Generate `ClassicyVocabulary.ts` and `_vocabulary.scss` from one JSON with a Node 24 type-stripped script wired before barrelsby; migrate state expression component by component to bare shared classes (legacy classes that map 1:1 are deleted, the rest stay as parts); reorder ClassicyWindow.scss so state follows base and strip every `!important`; add part attributes; wrap compiled component CSS in `@layer classicy.base` through a shared Vite plugin and declare the layer order in the injector.

---

# Part 2 — Implementation

**Architecture:** Implements umbrella plan 0002-ldj (Shared Contract: directories and exports; vocabulary names) and docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md §9 Phase 1 (items 1–6), against §2.6, §2.8, §2.9, §5 and §8.6. Nothing here introduces package machinery (part B) or touches colors/numbers (part G); file sets are disjoint from C, D and G except `bin/classicyStyleInjector.ts` and `vite.config.ts`, which only A edits. For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task; steps use checkbox syntax.

**Tech Stack:** TypeScript 5 (Node 24 native type stripping for bin scripts: erasable syntax only, `import type`), React 19, classnames, SCSS (sass 1.101, `@use`), Vite 7 plugin API (`transform` on compiled .scss ids), vitest 5 + jsdom + @testing-library, Biome, Storybook 9 (react-vite) + Playwright + ImageMagick `compare`.

## Constraints

- Platinum renders pixel-identical: every parity story compares AE 0 before vs after (Phase 8). The only DOM changes are added classes/attributes; no rule changes its computed values.
- Before each commit: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`. Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Library code uses `classicyLog`, never `console.*`; the generator (a build script, not library code) may `process.stderr.write` and `process.exit(1)`.
- Barrels are generated: after adding a module under src/, run `pnpm exec barrelsby -c .ts-barrel.json`; never hand-edit `src/index.ts`. Generated vocabulary files carry `// generated — do not edit` and are committed.
- Contract names are verbatim: `src/Appearance/vocabulary/{ClassicyVocabulary.json,ClassicyVocabulary.ts,_vocabulary.scss}`, `bin/generate-vocabulary.ts`, `CLASSICY_STATE`, `ClassicyState`, `classicyStateClasses`, `CLASSICY_COMPONENT`, `ClassicyComponentName`, `$classicy-states`, `classicy-state()`, `data-classicy-control`, `data-classicy-role`, `data-classicy-part`, `@layer classicy.base, classicy.package, classicy.user;`. Only `bin/classicyCssLayerPlugin.ts` and the per-file test names are local inventions.
- State classes are bare and sit beside the root (D20): `.classicyButton.pressed`. A legacy class is deleted only when the mapping table in 2.1/2.2 says so; `aria-*` keeps being emitted unchanged.
- `data-state` is removed from BevelButton, Placard and ImageWell (the tests that assert it move to class assertions); `aria-expanded` stays on the Control Strip tab (ClassicyControlStrip.test.tsx:196 keeps passing).
- Spelling: American English (color, behavior, gray, center, normalize).
- Review focus: (1) a state rule that lost `!important` but still precedes a base rule of equal specificity now loses — 4.1 compiled-CSS order test and parity; (2) the layer wrapper must not wrap `fonts.scss` or the `@layer` statement itself, and must run in Storybook too — 5.1 test + Phase 8 parity; (3) a state class deleted from TSX but still read by a test or by another component's SCSS — 2.1/2.2 `grep -rn` zero-hit validations; (4) `className`/`style` passthrough must merge, never replace, the root class — 3.1 tests; (5) the generator must reject a state colliding with a root/part class — 1.1 test.

## Files

| File | Change | Responsibility |
|---|---|---|
| `src/Appearance/vocabulary/ClassicyVocabulary.json` | create | Hand-edited source: `components` (PascalCase → part list), `states` (15 names), `attributes` (`data-classicy-control`, `data-classicy-role`, `data-classicy-part` with their allowed values). |
| `bin/generate-vocabulary.ts` | create | Reads the JSON, validates (state ∉ roots ∪ parts, kebab/PascalCase shape), writes `ClassicyVocabulary.ts` and `_vocabulary.scss`; `--check` mode exits 1 when outputs are stale (CI). |
| `bin/generate-vocabulary.test.ts` | create | Generator unit tests (collision rejection, output shape, idempotence). |
| `src/Appearance/vocabulary/ClassicyVocabulary.ts` | create | Generated: `CLASSICY_STATE`, `ClassicyState`, `classicyStateClasses`, `CLASSICY_COMPONENT`, `ClassicyComponentName`, `CLASSICY_PART_ATTRIBUTE`. |
| `src/Appearance/vocabulary/_vocabulary.scss` | create | Generated: `$classicy-states`, `@function classicy-state($name)`. |
| `src/Appearance/vocabulary/ClassicyVocabulary.test.ts` | create | Pins the generated TS API values. |
| `package.json` | modify | `generate-barrels` runs `node bin/generate-vocabulary.ts` before barrelsby; `./scss/*` export re-pointed to `./src/Appearance/vocabulary/*`; `files` gains `src/Appearance/vocabulary`. |
| `bin/classicyStyleInjector.ts` | modify | Exports `CLASSICY_LAYER_ORDER`; the injector prepends it to the injected CSS. |
| `bin/classicyCssLayerPlugin.ts` | create | Vite plugin wrapping each compiled component stylesheet in `@layer classicy.base { … }` (dev, build, Storybook). |
| `vite.config.ts` | modify | Registers `classicyCssLayerPlugin()`. |
| `storybook/.storybook/main.ts` | modify | Registers `classicyCssLayerPlugin()` in `viteFinal`. |
| `src/SystemFolder/SystemResources/Button/ClassicyButton.tsx` | modify | Merge consumer `className`; `pressed`/`default` state classes. |
| `src/SystemFolder/SystemResources/**/*.tsx (state emitters listed in 2.1/2.2)` | modify | Emit bare state classes via `classicyStateClasses`; drop legacy 1:1 classes and `data-state`. |
| `src/SystemFolder/SystemResources/**/*.scss, src/SystemFolder/ControlPanels/**/*.scss` | modify | Selectors read `.<root>.<state>`; `!important` removed; BEM strays renamed. |
| `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss` | modify | Base rule first, state rules after; 62 → 0 `!important`; dead `.classicyWindowZoomed` removed. |
| `src/SystemFolder/ControlPanels/AppearanceManager/styles/appearance.scss` | modify | `platinumWindowControlBox` sizes lose `!important`; `theme-halftone` background-image loses `!important`; `.hidden` deleted. |
| `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` | modify | Shared window states, `data-classicy-control`, drop `classicyWindowZoomed`/`block`. |
| `src/SystemFolder/SystemResources/Alert/ClassicyAlert.tsx` | modify | `data-classicy-role` on alert buttons. |
| `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx` | modify | `data-classicy-part` on clusters; `classicyDesktopMenuAppleMenu` → `classicyDesktopMenuApple`. |
| `docs/AGENT-REFERENCE.md` | modify | §4 vocabulary section: state classes, part attributes, `className`/`style` passthrough, `@layer`. |
| `CLAUDE.md` | modify | Short 'Vocabulary and cascade' subsection after Theming. |

## Phase 0: Parity baseline

- [ ] Start Storybook (`pnpm storybook`, background; note the port it prints).
- [ ] `curl -s http://localhost:<port>/index.json | python3 -I -c 'import json,sys; d=json.load(sys.stdin)["entries"]; [print(k) for k,v in d.items() if v["type"]=="story" and v["title"].split("/")[0] in ("Controls","Desktop","Dialogs")]' > .playwright-mcp/parity/part-A/stories.txt` (every Controls/*, Desktop/* and Dialogs/* story — this part touches every component).
- [ ] Playwright: for each id open `http://localhost:<port>/iframe.html?id=<id>&viewMode=story` at 1024×768, wait for networkidle + 500 ms, save `.playwright-mcp/parity/part-A/before/<id>.png`.
- [ ] Verify `ls .playwright-mcp/parity/part-A/before | wc -l` equals `wc -l < stories.txt`. Record the count in the PR description. No commit.

**Validation:** `ls .playwright-mcp/parity/part-A/before/*.png | wc -l  # equals the stories.txt line count`

## Phase 1: Generated vocabulary

### 1.1: ClassicyVocabulary.json, generator, outputs, script wiring

**Files:**
- Create: `src/Appearance/vocabulary/ClassicyVocabulary.json`
- Create: `bin/generate-vocabulary.ts`
- Create: `src/Appearance/vocabulary/ClassicyVocabulary.ts`
- Create: `src/Appearance/vocabulary/_vocabulary.scss`
- Modify: `package.json`
- Modify: `tsconfig.json (only if `bin/` is outside `include`; the existing `bin/classicyStyleInjector.test.ts` shows bin is already type-checked)`
- Test: `bin/generate-vocabulary.test.ts`
- Test: `src/Appearance/vocabulary/ClassicyVocabulary.test.ts`

**Depends on:** 0

**Interfaces:**
- Consumes: Nothing in src. Node 24 (`mise.toml`, CI `node-version: '24.x'`) runs `.ts` with native type stripping, so the generator uses erasable syntax only (no enums, no parameter properties, `import type`).
- Produces: JSON shape `{ components: Record<PascalCase, string[]>, states: string[], attributes: Record<'data-classicy-control'|'data-classicy-role'|'data-classicy-part', string[]> }`. `components` lists every `classicy<Component>` root in src (the 73 exported `Classicy*` components found by `grep -rhoE 'className=\{?\"classicy[A-Z][A-Za-z]+' src --include=*.tsx` deduplicated to roots, e.g. Button: ["Default"? no — parts only: `Button: []`, `Window: ["TitleBar","Title","TitleText","TitleLeft","TitleCenter","TitleRight","ControlBox","CloseBox","ZoomBox","CollapseBox","Header","Contents","ContentsInner","Resizer","PlacardBar","ModalScrim"]`, …); `states` = ["active","inactive","disabled","selected","pressed","focused","hover","collapsed","open","dragging","error","default","checked","mixed","expanded"]; attributes: control ["close","zoom","collapse"], role ["default","cancel","other"], part ["apple","app","help","switcher","extensions","clock"]. Generator `bin/generate-vocabulary.ts`: `export function generateVocabulary(input: VocabularyInput): { ts: string; scss: string }` (pure), `export function validateVocabulary(input: VocabularyInput): string[]` (error list; a state equal to any root `classicy<C>` or part `classicy<C><P>` name, case-insensitively compared against the bare state, or equal to another state, or not matching `/^[a-z][a-z0-9-]*$/`, is an error), and a CLI main guarded by `if (process.argv[1]?.endsWith('generate-vocabulary.ts'))` that reads the JSON, writes both outputs, and with `--check` exits 1 when either file on disk differs. Generated TS: `export const CLASSICY_STATE = { active: "active", … } as const; export type ClassicyState = keyof typeof CLASSICY_STATE; export const classicyStateClasses = (states: Partial<Record<ClassicyState, boolean>>): string => (Object.keys(CLASSICY_STATE) as ClassicyState[]).filter((s) => states[s]).join(" "); export const CLASSICY_COMPONENT = { Button: "Button", … } as const; export type ClassicyComponentName = keyof typeof CLASSICY_COMPONENT; export const CLASSICY_PART_ATTRIBUTE = { control: "data-classicy-control", role: "data-classicy-role", part: "data-classicy-part" } as const;`. Generated SCSS: `$classicy-states: (active, inactive, …);` and `@function classicy-state($name) { @if not list.index($classicy-states, $name) { @error "classicy-state: unknown state #{$name}"; } @return ".#{$name}"; }` (with `@use "sass:list"`). Both files start with `// generated — do not edit (bin/generate-vocabulary.ts)`. package.json: `"generate-barrels": "node bin/generate-vocabulary.ts && barrelsby -c .ts-barrel.json"`; `"exports"["./scss/*"] = "./src/Appearance/vocabulary/*"` (the old path `./src/SystemFolder/ControlPanels/AppearanceManager/styles/*` is still reachable by relative `@use` from the example app until part B; update `example/src/Applications/{BlueBox,Browser}/*.scss:1` to `@use '../../../../src/SystemFolder/ControlPanels/AppearanceManager/styles/appearance'` is NOT done here — leave the example on the old export by adding a second export key `"./scss-platinum/*": "./src/SystemFolder/ControlPanels/AppearanceManager/styles/*"` and switching those two lines to `@use 'classicy/scss-platinum/appearance'`; part B deletes it); `files` gains `"src/Appearance/vocabulary"`.

- [ ] **Step 1: Write the failing generator tests** — `bin/generate-vocabulary.test.ts`:
```ts
describe("generateVocabulary", () => {
  it("emits CLASSICY_STATE with every state as key and value", () => {
    const { ts } = generateVocabulary({ components: { Button: [] }, states: ["pressed", "disabled"], attributes: { "data-classicy-control": [], "data-classicy-role": [], "data-classicy-part": [] } });
    expect(ts).toContain("pressed: \"pressed\"");
    expect(ts).toContain("export type ClassicyState = keyof typeof CLASSICY_STATE");
    expect(ts).toContain("Button: \"Button\"");
    expect(ts.startsWith("// generated — do not edit")).toBe(true);
  });
  it("emits $classicy-states and classicy-state()", () => {
    const { scss } = generateVocabulary(sameInput);
    expect(scss).toContain("$classicy-states: (pressed, disabled);");
    expect(scss).toContain("@function classicy-state($name)");
  });
  it("rejects a state that equals a root or part class", () => {
    expect(validateVocabulary({ components: { Button: ["Pressed"] }, states: ["classicybuttonpressed"], … })).toEqual(["state \"classicybuttonpressed\" collides with part class classicyButtonPressed"]);
    expect(validateVocabulary({ components: { Pressed: [] }, states: ["classicypressed"], … })).toEqual(["state \"classicypressed\" collides with root class classicyPressed"]);
  });
  it("rejects duplicate and malformed state names", () => {
    expect(validateVocabulary({ …, states: ["open", "open"] })).toEqual(["duplicate state \"open\""]);
    expect(validateVocabulary({ …, states: ["Open"] })).toEqual(["state \"Open\" must match /^[a-z][a-z0-9-]*$/"]);
  });
  it("is deterministic", () => { expect(generateVocabulary(x)).toEqual(generateVocabulary(x)); });
});
```
And `src/Appearance/vocabulary/ClassicyVocabulary.test.ts`:
```ts
it("CLASSICY_STATE has the 15 contract states", () => expect(Object.keys(CLASSICY_STATE)).toEqual(["active","inactive","disabled","selected","pressed","focused","hover","collapsed","open","dragging","error","default","checked","mixed","expanded"]));
it("CLASSICY_STATE.pressed === 'pressed'", …);
it("classicyStateClasses joins truthy states in vocabulary order", () => expect(classicyStateClasses({ pressed: true, disabled: false, active: true })).toBe("active pressed"));
it("classicyStateClasses returns '' for no states", …);
it("CLASSICY_COMPONENT contains Window, Button, Alert, DesktopMenuBar", …);
it("the committed outputs are fresh", () => expect(generateVocabulary(json).ts).toBe(readFileSync(tsPath, "utf8")) and same for scss);
```
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — `Cannot find module './generate-vocabulary'` / `@/Appearance/vocabulary/ClassicyVocabulary`. — `pnpm exec vitest run bin/generate-vocabulary.test.ts src/Appearance/vocabulary/ClassicyVocabulary.test.ts`
- [ ] **Step 3: Write ClassicyVocabulary.json and implement bin/generate-vocabulary.ts** — Build the `components` map from `grep -rhoE '"classicy[A-Z][A-Za-z]+' src --include=*.tsx | sort -u` by hand-grouping each name under its component (root = the exported component's own class; parts = the rest). Implement `validateVocabulary`, `generateVocabulary` and the CLI per Interfaces. Output formatting must satisfy Biome (tabs, double quotes) so `pnpm lint` passes on the generated files — run `pnpm exec biome format --write src/Appearance/vocabulary` inside the generator is NOT allowed; emit Biome-clean text directly.
- [ ] **Step 4: Wire the script and regenerate** — Edit package.json per Interfaces. Expected: the two generated files appear, `src/index.ts` gains `export * from "./Appearance/vocabulary/ClassicyVocabulary";`. Running the command twice produces no further diff (idempotent). — `node bin/generate-vocabulary.ts && pnpm exec barrelsby -c .ts-barrel.json && git status --short`
- [ ] **Step 5: Run tests to verify they pass** — Expected: PASS (both files). — `pnpm exec vitest run bin src/Appearance`
- [ ] **Step 6: Add the staleness gate to CI** — In `.github/workflows/ci.yml` add a step after install: `node bin/generate-vocabulary.ts --check` (fails when the committed outputs differ from the JSON). Verify locally: edit the JSON (add a state), run `--check` → exit 1; revert.
- [ ] **Step 7: Lint, type-check, commit** — git add src/Appearance bin/generate-vocabulary.ts bin/generate-vocabulary.test.ts package.json .github/workflows/ci.yml src/index.ts example && git commit -m "feat(vocabulary): generate ClassicyVocabulary.ts and _vocabulary.scss from one JSON" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `node bin/generate-vocabulary.ts --check && pnpm exec vitest run bin src/Appearance`

## Phase 2: Shared state classes

### 2.1: Controls, lists, menus and BEM strays

**Files:**
- Modify: `src/SystemFolder/SystemResources/Button/ClassicyButton.tsx (:173,176,177) + .scss (:31,55,62,66)`
- Modify: `src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.tsx (:123-124) + .scss`
- Modify: `src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.tsx (:144-145,154-155) + .scss`
- Modify: `src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx (:375,377) + .scss; BevelButton/ClassicyBevelButtonPopup.tsx:30; BevelButton/ClassicyBevelButton.tsx:70`
- Modify: `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx (:489 `select--disabled`, :490, :505) + .scss (:63)`
- Modify: `src/SystemFolder/SystemResources/ListBox/ClassicyListBox.tsx (:188,211,212) + .scss`
- Modify: `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.tsx (:333) + .scss (3 rules)`
- Modify: `src/SystemFolder/SystemResources/Tree/ClassicyTree.tsx (:251,252,286,304,305) + .scss`
- Modify: `src/SystemFolder/SystemResources/Table/ClassicyTable.tsx (:477,538) + .scss; File/ClassicyFileBrowserViewTable.tsx (:466) + .scss`
- Modify: `src/SystemFolder/SystemResources/{Link,Output,ControlLabel,ComboBox,PopUpSlider,Slider}/*.tsx + .scss (Disabled → disabled; Slider :283-284,309,320)`
- Modify: `src/SystemFolder/SystemResources/ColorPicker/{ClassicyColorPicker.tsx:95,ClassicyColorPickerCrayon.tsx:102,ClassicyColorPickerDialog.tsx:192,ClassicyColorPickerRGB.tsx:37,49,61} + ClassicyColorPicker.scss (:257-259)`
- Modify: `src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.tsx (:183) + .scss`
- Modify: `src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.tsx (:129) + .scss`
- Modify: `src/SystemFolder/ControlPanels/DriveSetup/DriveSetupList.tsx (:37-38) + DriveSetupList.scss (:75-81)`
- Test: `src/Appearance/vocabulary/ClassicyStateClasses.controls.test.tsx (new)`
- Test: `the existing component tests that assert legacy names (11 files: `grep -rln 'classicyListBoxOptionSelected\|classicyMenuItemDisabled\|classicyTabButtonActive\|classicyTreeNodeSelected\|classicyTableRowSelected\|classicyButtonDepressed\|classicyCheckboxMixed\|classicyRadioInputWrapperChecked\|classicySliderDisabled\|classicyPopUpMenuOpen\|classicyFileInputError\|classicyDisclosureInnerOpen' src --include=*.test.tsx`)`

**Depends on:** 1.1

**Interfaces:**
- Consumes: `classicyStateClasses`, `CLASSICY_STATE` (1.1); `classicy-state()` in SCSS.
- Produces: Mapping table (legacy → shared; DELETE = legacy class and rule removed, KEEP = stays as a part): Button Default→default DELETE, Depressed→pressed DELETE, KeyActive→pressed + KEEP `classicyButtonKeyActive` (the `.classicyButtonDefault.classicyButtonKeyActive` rule becomes `.classicyButton.default.classicyButtonKeyActive`); Checkbox Default→default DELETE, Mixed→mixed DELETE, plus `checked` from the input's checked prop and `disabled` from `disabled`; RadioInput WrapperChecked→checked DELETE, WrapperDisabled→disabled DELETE, LabelDisabled→disabled DELETE, Default→default DELETE, Mixed→mixed DELETE; Menu ItemDisabled→disabled DELETE, ItemOpen→open DELETE; PopUpMenu Open→open DELETE, ButtonDisabled→disabled DELETE, `select--disabled`→disabled DELETE; ListBox Disabled→disabled DELETE, OptionSelected→selected DELETE, OptionDisabled→disabled DELETE; Tabs TabButtonActive→selected DELETE (tabs are selected, `active` is reserved for focus); Tree NodeSelected→selected, NodeDisabled→disabled DELETE; Table RowSelected→selected, ColumnHeaderSelected→selected DELETE; FileBrowserViewTable RowSelected→selected DELETE; Link/Output/ControlLabel/ComboBox/PopUpSlider Disabled→disabled DELETE; Slider Disabled→disabled DELETE, TicksDisabled→disabled (on the ticks element) DELETE, Highlighted KEEP, GhostHidden KEEP; ColorPicker SwatchDisabled→disabled, CrayonSelected→selected, ModeListItemSelected→selected DELETE; `classicyColorPickerSlider--red/--green/--blue` → `classicyColorPickerSliderRed/Green/Blue` (parts, not states; SCSS `&--red` → `.classicyColorPickerSliderRed`); FileInput Error→error DELETE; Disclosure InnerOpen→open DELETE; DriveSetup `driveSetupList__row`→`classicyDriveSetupListRow`, `__row--selected`→`.classicyDriveSetupListRow.selected`, `__tableContainer`→`classicyDriveSetupListTable` (the DriveSetup root class is unprefixed app CSS; prefix all of it). Emission pattern everywhere: `classNames("classicyX", classicyStateClasses({ disabled, selected }), …)`. SCSS pattern: `.classicyX { &#{classicy-state(disabled)} { … } }` or the literal `.classicyX.disabled` — both allowed; the function is for packages, the literal is fine in base CSS.

- [ ] **Step 1: Write the failing DOM tests** — `ClassicyStateClasses.controls.test.tsx`, one `it` per component rendering it through the existing story helpers / providers and asserting `classList`:
```ts
it("ClassicyButton: isDefault → default, depressed → pressed", () => { render(<ClassicyButton isDefault depressed>x</ClassicyButton>); const b = screen.getByRole("button"); expect(b).toHaveClass("classicyButton", "default", "pressed"); expect(b).not.toHaveClass("classicyButtonDefault", "classicyButtonDepressed"); });
it("ClassicyCheckbox: mixed/checked/disabled", …toHaveClass("mixed") and not "classicyCheckboxMixed");
it("ClassicyMenu: disabled item carries disabled, open item carries open", …);
it("ClassicyPopUpMenu: disabled → disabled, no select--disabled", …);
it("ClassicyListBox: selected option → selected; disabled option → disabled", …);
it("ClassicyTabs: the selected tab button carries selected, not classicyTabButtonActive", …);
it("ClassicyTree / ClassicyTable / FileBrowserViewTable rows: selected", …);
it("ClassicyColorPickerRGB sliders: classicyColorPickerSliderRed/Green/Blue", …);
it("DriveSetupList: classicyDriveSetupListRow.selected", …);
```
Plus a compiled-CSS test in the same file (sass.compile each touched .scss, `style: "expanded"`) asserting `css` contains `.classicyButton.pressed {` and does not contain `.classicyButtonDepressed`, `.select--disabled`, `&--red`/`.classicyColorPickerSlider--red`, `driveSetupList__row--selected`.
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL on every `toHaveClass(<state>)`. — `pnpm exec vitest run src/Appearance/vocabulary/ClassicyStateClasses.controls.test.tsx`
- [ ] **Step 3: Convert the TSX emitters per the mapping table** — One component at a time, in the file list order. Import `classicyStateClasses` from `@/Appearance/vocabulary/ClassicyVocabulary`. Delete the DELETE classes from the `classNames(...)` call; keep KEEP ones.
- [ ] **Step 4: Convert the SCSS selectors** — For each DELETE class, replace the selector with `.<root>.<state>` at the same nesting depth (specificity is unchanged: one class replaced by one class), so no rule order changes. Rename the BEM strays. Then update the 11 legacy-name test files to the new classes (search-and-replace of the class strings only).
- [ ] **Step 5: Verify nothing still reads a deleted class** — Expected: 0. — `grep -rnE 'classicy(ButtonDefault|ButtonDepressed|CheckboxDefault|CheckboxMixed|RadioInputWrapperChecked|RadioInputWrapperDisabled|RadioInputLabelDisabled|RadioInputDefault|RadioInputMixed|MenuItemDisabled|MenuItemOpen|PopUpMenuOpen|PopUpMenuButtonDisabled|ListBoxDisabled|ListBoxOptionSelected|ListBoxOptionDisabled|TabButtonActive|TreeNodeSelected|TreeNodeDisabled|TableRowSelected|TableColumnHeaderSelected|FileBrowserViewTableRowSelected|LinkDisabled|OutputDisabled|ControlLabelDisabled|ComboBoxDisabled|PopUpSliderDisabled|SliderDisabled|SliderTicksDisabled|ColorPickerSwatchDisabled|ColorPickerCrayonSelected|ColorPickerModeListItemSelected|FileInputError|DisclosureInnerOpen)\b|select--disabled|Slider--(red|green|blue)|driveSetupList__' src example storybook/.storybook | wc -l`
- [ ] **Step 6: Run tests to verify they pass** — Expected: PASS. — `pnpm exec vitest run src/Appearance src/SystemFolder/SystemResources src/SystemFolder/ControlPanels/DriveSetup`
- [ ] **Step 7: Lint, type-check, commit** — git add -A src && git commit -m "refactor(vocabulary): bare shared state classes on controls, lists and menus" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/Appearance/vocabulary/ClassicyStateClasses.controls.test.tsx`

### 2.2: data-state users, windows, icons, Control Strip, menu-bar typo

**Files:**
- Modify: `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx (:53-60 type, :196-206 computeState, :381, :446) + .scss (:63-65,73-74,79,88-89,104)`
- Modify: `src/SystemFolder/SystemResources/Placard/ClassicyPlacard.tsx (:86,100-105) + .scss (:44,52)`
- Modify: `src/SystemFolder/SystemResources/ImageWell/ClassicyImageWell.tsx (:74-79) + .scss (:39,53)`
- Modify: `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.tsx (:509,511) + .scss (:224-226)`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx (:1632-1643,1651,1784) + .scss (:9-15,49,85,155,159,163,178)`
- Modify: `src/SystemFolder/SystemResources/Icon/ClassicyIcon.tsx (:276-277) + .scss; Desktop/ClassicyDesktopIcon.tsx (:396-404,444) + .scss; File/ClassicyFileBrowser.tsx (:182,195)`
- Modify: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx (:283) + .scss (:6-16 and :58-100 merged)`
- Test: `src/Appearance/vocabulary/ClassicyStateClasses.surfaces.test.tsx (new)`
- Test: `BevelButton/ClassicyBevelButton.test.tsx (7 data-state asserts), BevelButton/ClassicyBevelButton.popup.test.tsx (1), Placard/ClassicyPlacard.test.tsx (2), ImageWell/ClassicyImageWell.test.tsx (3), Window/ClassicyWindow.utility.test.tsx (:111-130), Window/ClassicyWindow.collapse.test.tsx (:138,171,186,210), ControlStrip/ClassicyControlStrip.test.tsx`

**Depends on:** 2.1

**Interfaces:**
- Consumes: `classicyStateClasses` (1.1).
- Produces: BevelButton: `ClassicyBevelButtonState` type and `computeState` are replaced by `bevelButtonStates(disabled, mixed, pressed, on): Partial<Record<ClassicyState, boolean>>` = `{ disabled, mixed: mixed && !disabled, pressed: pressed && !disabled && !mixed, checked: on, open: popupOpen }`; the root emits `classicyStateClasses(...)` and no `data-state`. SCSS: `[data-state="on"]`→`.checked`, `pressed-off|pressed-on`→`.pressed`, `mixed`→`.mixed`, `disabled-off|disabled-on`→`.disabled`, `disabled-on`→`.disabled.checked`. Placard: `state` string → `{ disabled, pressed: pressed || open }`; `classicyPlacardDisabled` DELETE; SCSS `[data-state="pressed"]`→`&.pressed`, `[data-state="disabled"]`→`&.disabled`. ImageWell: `{ disabled: !enabled, selected }`; `classicyImageWellDisabled/Selected` DELETE; `data-state` removed; `classicyImageWellDragOver` KEEP. ControlStrip: Collapsed→collapsed DELETE, Moving→dragging DELETE; ControlStrip.scss:224-226 becomes `&.pressed, &.open` (BevelButton emits `open` while its popup is open — it already set `aria-expanded`, which stays). Window: Active→active DELETE, Inactive→inactive DELETE, Collapsed→collapsed DELETE, Dragging→dragging DELETE, Zoomed→DELETE with no replacement (empty rule, Window.scss:9-11; `ws.zoomed` stops emitting a class), Resizing KEEP, Invisible KEEP (NOT dead: ClassicyWindow.tsx:704-712 and :790 render closed windows hidden — correct the audit's §9 item 6 claim in docs), ActiveApp/Floating/Backgrounded/ModalFront/Red/NoScroll/ScrollBarsHidden/*Dimmed/ContentsNotDimmed/ModalScrimError KEEP; contents element: `ws.collapsed ? "hidden" : "block"` → `classicyStateClasses({ collapsed: ws.collapsed })`, and the rule `.hidden { visibility: hidden }` (appearance.scss:245) moves to `.classicyWindowContents.collapsed, .classicyWindowContentsModal.collapsed { visibility: hidden; }` then `.hidden` is deleted (grep confirms no other user). Icon/DesktopIcon: Active→selected DELETE, Open→open DELETE, ActiveAndOpen→`selected open` DELETE (SCSS `.classicyIconActiveAndOpen` → `.classicyIcon.selected.open`, specificity rises from (0,1,0) to (0,3,0) — verify in the compiled-CSS test that the `.selected.open` block comes after `.selected` and `.open` so the result is identical), Dragging→dragging DELETE, Invisible KEEP (it is the invisible-file look, not a state). MenuBar: `classicyDesktopMenuAppleMenu` → `classicyDesktopMenuApple` (the doubled "Menu" is the audit's typo); the two rule blocks (MenuBar.scss:6-16 and :58-100) merge into one.

- [ ] **Step 1: Rewrite the data-state assertions in the four existing test files first** — BevelButton.test.tsx: each `toHaveAttribute("data-state", "pressed-on")` → `toHaveClass("pressed", "checked")`; `"disabled-off"` → `toHaveClass("disabled")` and `not.toHaveClass("checked")`; `"mixed"` → `toHaveClass("mixed")`; `"on"` → `toHaveClass("checked")` and `not.toHaveClass("pressed")`; `"off"` → neither. popup.test.tsx: `toHaveClass("open")`. Placard.test.tsx: `toHaveClass("pressed")` / `"disabled"`. ImageWell.test.tsx: `toHaveClass("selected")` / `"disabled"` / `not.toHaveClass("disabled")`. Window.utility.test.tsx:111-130: `active`/`inactive`. Window.collapse.test.tsx:138,171,186,210: `collapsed`. Add `ClassicyStateClasses.surfaces.test.tsx` with: `it("ClassicyWindow contents carry collapsed while collapsed and never 'block'")`, `it("DesktopIcon selected+launched → selected open")`, `it("ControlStrip collapsed → collapsed; dragging the tab → dragging")`, `it("menu bar Apple menu item carries classicyDesktopMenuApple")`, and a compiled-CSS test asserting ClassicyBevelButton.scss has no `data-state`, ControlStrip.scss has no `aria-expanded`, MenuBar.scss has exactly one `.classicyDesktopMenuApple {` top-level block and no `classicyDesktopMenuAppleMenu`.
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL on the rewritten assertions. — `pnpm exec vitest run src/SystemFolder/SystemResources/BevelButton src/SystemFolder/SystemResources/Placard src/SystemFolder/SystemResources/ImageWell src/SystemFolder/SystemResources/Window src/Appearance`
- [ ] **Step 3: Implement bevelButtonStates and the BevelButton/Placard/ImageWell conversions** — Per Interfaces. Remove `ClassicyBevelButtonState` from the public type exports (D16) — check `docs/AGENT-REFERENCE.md` for a mention (`grep -n data-state docs`), update in Phase 8.
- [ ] **Step 4: Convert Window, Icon, DesktopIcon, FileBrowser, ControlStrip, MenuBar** — Window.tsx:1632-1643 and :1784 per Interfaces (keep the biome-ignore comments intact). Window.scss: rename the state rules only (do not reorder yet — 4.1 does that). Icon/DesktopIcon SCSS: `.classicyIconActive`→`.classicyIcon.selected`, etc. MenuBar: rename and merge the two blocks, keeping every declaration.
- [ ] **Step 5: Verify nothing still reads the deleted names** — Expected: 0 (note `classicyWindowActiveApp` is KEEP and excluded by the final grep). — `grep -rnE 'data-state|classicy(WindowActive|WindowInactive|WindowCollapsed|WindowDragging|WindowZoomed|IconActive|IconOpen|IconActiveAndOpen|IconDragging|DesktopIconActive|DesktopIconOpen|DesktopIconActiveAndOpen|DesktopIconDragging|ControlStripCollapsed|ControlStripMoving|PlacardDisabled|ImageWellDisabled|ImageWellSelected|DesktopMenuAppleMenu)\b|\.hidden \{|"block"' src example storybook/.storybook docs/AGENT-REFERENCE.md | grep -v 'ClassicyWindowActiveApp' | wc -l`
- [ ] **Step 6: Run tests to verify they pass** — Expected: PASS. — `pnpm test`
- [ ] **Step 7: Lint, type-check, commit** — git add -A src && git commit -m "refactor(vocabulary): shared state classes on windows, icons, bevel buttons, placards and the Control Strip" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/Appearance/vocabulary/ClassicyStateClasses.surfaces.test.tsx src/SystemFolder/SystemResources/BevelButton src/SystemFolder/SystemResources/Window`

## Phase 3: className and style passthrough

### 3.1: Passthrough on every public component; ClassicyButton spread order

**Files:**
- Modify: `src/SystemFolder/SystemResources/Button/ClassicyButton.tsx (:165-171)`
- Modify: `Components with neither prop today (from `grep -L 'className?:' …` over the exported components): Alert, Assistant, Checkbox, ColorPicker (+Dialog, Crayon, HSV, HLS, CMYK, RGB, Wheel), ComboBox, ControlLabel, DatePicker, Desktop, DesktopIcon, DesktopMenuBar, Disclosure, FileBrowser, FileDialog/FileOpenDialog/FileSaveDialog, FileInput, Icon, ImageWell, Input, InputDialog, KeyboardEquivalentDialog, KeyboardEquivalentField, ListBox, Meter, Output, Pager, Placard, ProgressBar, RadioInput, RichTextEditor, Slider, Spinner, Tabs, TextEditor, TimePicker, Tree, Window, AboutWindow (41 files; list them in the commit body)`
- Modify: `Components with `className` but no `style` (BalloonHelp, ButtonToolbar, ContextualMenuTarget, ControlGroup, ControlStrip, Form, HelpButton, Kbd, LittleArrows, Menu, PixelArt, PopUpMenu, PopUpSlider, Separator, SplitView, Table, Triangle, WindowFrame): add `style``
- Test: `src/Appearance/vocabulary/ClassicyPassthrough.test.tsx (new, table-driven)`
- Test: `src/SystemFolder/SystemResources/Button/ClassicyButton.test.tsx (add one case)`

**Depends on:** 2.2

**Interfaces:**
- Consumes: Nothing new.
- Produces: Every exported component's props gain `className?: string` and `style?: CSSProperties` (where the root is a DOM element; `ClassicyApp`, providers and the dialogs that render a `ClassicyWindow` forward both to that window). Rule: `className` is merged LAST into the root's `classNames(...)`; `style` is spread AFTER the component's own inline style (`style={{ ...ownStyle, ...style }}`) so a consumer can override position/size but never remove the root class. `ClassicyButton`: destructure `className` out of `rest` and append it: `classNames("classicyButton", …, className)`; `rest` keeps `style`. `ClassicyWindow`: `className` joins the root `classNames(...)` after the state classes; `style` is merged after `windowStyle` (position/size must remain overridable only via props — document that `style.width/height` are ignored while `ws` has a size: merge `style` first, then `windowStyle`; this is the one exception and the test pins it).

- [ ] **Step 1: Write the failing table-driven test** — `ClassicyPassthrough.test.tsx`:
```ts
const cases: Array<[name: string, render: () => ReactElement, root: (c: HTMLElement) => HTMLElement]> = [
  ["ClassicyButton", () => <ClassicyButton className="host" style={{ marginTop: 7 }}>x</ClassicyButton>, (c) => c.querySelector(".classicyButton")!],
  ["ClassicyCheckbox", …], … one row per component in the file list …
];
it.each(cases)("%s merges className and style onto its root", (_, make, root) => {
  const { container } = render(make(), { wrapper: Providers });
  const el = root(container);
  expect(el.className.split(" ")).toContain("host");
  expect(el.className).toMatch(/^classicy[A-Z]/);
  expect(el.style.marginTop).toBe("7px");
});
it("ClassicyButton keeps its own class when className is passed (spread-order bug)", …expect(b).toHaveClass("classicyButton", "host"));
it("ClassicyWindow: style cannot override the stored size", () => { render window with initialSize [300,200] and style={{ width: 999 }} → root.style.width === "300px" });
```
- [ ] **Step 2: Run it to verify it fails** — Expected: FAIL for every row except the ~18 components that already merge `className` (those fail only on `style`). — `pnpm exec vitest run src/Appearance/vocabulary/ClassicyPassthrough.test.tsx`
- [ ] **Step 3: Fix ClassicyButton.tsx:165-171** — `const { className, …rest }` in the destructure; `className={classNames("classicyButton", …, className)}` after the spread.
- [ ] **Step 4: Add the props to the remaining components** — Mechanical: add `className?: string; style?: CSSProperties;` to each props type, destructure, merge per the rule in Interfaces. Where the component forwards `…rest` to a DOM element, destructure `className`/`style` before the spread so they cannot clobber the merge.
- [ ] **Step 5: Run tests to verify they pass** — Expected: PASS. — `pnpm exec vitest run src/Appearance src/SystemFolder/SystemResources`
- [ ] **Step 6: Lint, type-check, commit** — git add -A src && git commit -m "feat(components): className and style passthrough on every component; fix ClassicyButton dropping className" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/Appearance/vocabulary/ClassicyPassthrough.test.tsx`

## Phase 4: Cascade hygiene, order instead of !important, part attributes

### 4.1: ClassicyWindow.scss reorder (sixty-two to zero), mixin, phantom tokens

**Files:**
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/styles/appearance.scss (:120-121)`
- Modify: `src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss (:88)`
- Modify: `src/SystemFolder/ControlPanels/DriveSetup/DriveSetupList.scss (:17,79)`
- Modify: `src/SystemFolder/SystemResources/Placard/ClassicyPlacard.scss (:109)`
- Modify: `src/SystemFolder/SystemResources/ImageWell/ClassicyImageWell.scss (:41,48)`
- Test: `src/SystemFolder/SystemResources/Window/ClassicyWindow.cascade.test.ts (new, compiled CSS)`
- Test: `src/SystemFolder/SystemResources/Window/ClassicyWindow.resizer.test.ts (existing; must keep passing)`

**Depends on:** 2.2

**Interfaces:**
- Consumes: The renamed window state classes (2.2).
- Produces: ClassicyWindow.scss layout: (1) `@use`s; (2) `.classicyWindow { … }` base block (today :222-475) first; (3) part rules (`.classicyWindowHeader`, `Contents*`, `FrameEdge*`, `PlacardBar`, `ModalScrim`); (4) variant rules (`.classicyWindowUtility`, `.classicyWindowModal`, `.classicyWindowDocument`); (5) state rules last, in this order: `.classicyWindow.inactive`, `.classicyWindow.active`, `.classicyWindowActiveApp`, `.classicyWindowFloating`, `.classicyWindowBackgrounded`, `.classicyWindowModalFront`, `.classicyWindowRed`, `.classicyWindow.collapsed`, `.classicyWindowUtility.collapsed`, `.classicyWindow.dragging`, `.classicyWindowResizing`, `.classicyWindowInvisible`, `.classicyWindowNoScroll`, `*Dimmed`. Every `!important` in the file is removed; where a removed `!important` was beating a rule of HIGHER specificity (not just later order), the selector is raised by repeating the root class once (`.classicyWindow.classicyWindow.collapsed`) rather than re-adding `!important` — list each such site in the commit body. `platinumWindowControlBox` (appearance.scss:120-121): `width/height: var(--window-control-size);` without `!important`; the two caller sites that then lose (Window.scss:330-331 `width/height: calc(var(--window-control-size) + var(--window-border-size))` — now win by order inside `.classicyWindow .classicyWindowTitleBar .classicyWindowControlBox`, verify). Phantom tokens: DriveSetupList.scss:17 `var(--box-border-size, 2px)` → `var(--control-frame-width)`; :79 `var(--color-theme-1, #000)` → `var(--color-theme-05)`? NO — the selected row background today resolves to the fallback `#000`, which is `--color-black`: use `var(--color-black)` (pixel-identical); Placard.scss:109 `var(--color-theme-hover, var(--color-system-05))` → `var(--color-system-05)`; ImageWell.scss:41,48 `var(--color-theme-selection, var(--color-outline))` → `var(--color-outline)`. `.classicyWindowZoomed` already deleted in 2.2.

- [ ] **Step 1: Write the failing compiled-CSS cascade test** — `ClassicyWindow.cascade.test.ts` (sass.compile the file, `style: "expanded"`):
```ts
it("contains no !important", () => expect(css).not.toContain("!important"));
const at = (sel: string) => { const i = css.indexOf(`\n${sel} {`); if (i < 0) throw new Error(sel); return i; };
it("base rule precedes every state rule", () => { const base = at(".classicyWindow"); for (const s of [".classicyWindow.inactive", ".classicyWindow.active", ".classicyWindow.collapsed", ".classicyWindowUtility.collapsed", ".classicyWindow.dragging", ".classicyWindowResizing", ".classicyWindowRed", ".classicyWindowInvisible"]) expect(at(s)).toBeGreaterThan(base); });
it("utility collapsed height follows document collapsed height", () => expect(at(".classicyWindowUtility.collapsed")).toBeGreaterThan(at(".classicyWindow.collapsed")));
it("collapsed height is still control × 1.25 / × .5", () => { expect(rule(".classicyWindow.collapsed").height).toBe("calc(var(--window-control-size) * 1.25)"); expect(rule(".classicyWindowUtility.collapsed").height).toBe("calc(var(--window-control-size) * .5)"); });
it("z-index bands are intact", () => { expect(rule(".classicyWindow.active")["z-index"]).toBe("300"); expect(rule(".classicyWindowFloating")["z-index"]).toBe("350"); expect(rule(".classicyWindowModalFront")["z-index"]).toBe("370"); expect(rule(".classicyWindowRed")["z-index"]).toBe("99999"); expect(rule(".classicyWindowActiveApp")["z-index"]).toBe("150"); });
it("no phantom tokens anywhere", () => for each of DriveSetupList.scss, Placard.scss, ImageWell.scss compiled: expect(css).not.toMatch(/--color-theme-1\b|--box-border-size|--color-theme-hover|--color-theme-selection/));
it("platinumWindowControlBox sizes are not !important", () => compile a one-line scss that `@include`s the mixin and expect no `!important`);
```
(`rule()` helper copied from ClassicyColorPickerDialog.styles.test.ts.)
- [ ] **Step 2: Run it to verify it fails** — Expected: FAIL — `!important` present; base rule at :222 follows the state rules. — `pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.cascade.test.ts`
- [ ] **Step 3: Reorder ClassicyWindow.scss and strip !important** — Move blocks per the Interfaces layout (cut/paste whole blocks; do not edit declarations while moving). Then delete every ` !important` (62). For each deletion, confirm the winning rule by the compiled order; raise specificity by root-class repetition only where a higher-specificity rule would otherwise win (expected: the `.classicyWindow .classicyWindowTitleBar .classicyWindowControlBox` chain vs mixin sizes, and `.classicyWindowUtility .classicyWindowTitleBar` vs the document title bar).
- [ ] **Step 4: Un-!important the mixin and fix the phantom tokens** — appearance.scss:120-121 → `width: var(--window-control-size); height: var(--window-control-size);`. Apply the four phantom-token replacements per Interfaces. Alert.scss:88 keeps its color literal (part G replaces it) but loses `!important`.
- [ ] **Step 5: Run tests to verify they pass** — Expected: PASS, including the pre-existing ClassicyWindow.resizer.test.ts. — `pnpm exec vitest run src/SystemFolder/SystemResources/Window src/SystemFolder/SystemResources/Placard src/SystemFolder/SystemResources/ImageWell src/SystemFolder/ControlPanels/DriveSetup`
- [ ] **Step 6: Spot-check parity on the window stories now (early signal)** — Re-shoot only `desktop-window--*`, `dialogs-alert--*` and `desktop-desktop--default` into `.playwright-mcp/parity/part-A/mid/` and `compare -metric AE` against `before/`. Expected 0 for each; fix any drift in the SCSS before continuing.
- [ ] **Step 7: Lint, type-check, commit** — git add -A src && git commit -m "refactor(window): state rules after the base rule; remove every !important from ClassicyWindow.scss" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `grep -c '!important' src/SystemFolder/SystemResources/Window/ClassicyWindow.scss  # expect 0`

### 4.2: Repo-wide !important removal and part attributes

**Files:**
- Modify: `The 27 other SCSS files with `!important` (`grep -rc '!important' src --include=*.scss | grep -v ':0$'`): DesktopIcon 14, scrollbars 13, Icon 11, DesktopMenuBar 7, Menu 6, Spinner 4, RadioInput 4, PopUpMenu 4, Button 4, appearance 3 (2 done in 4.1; :234 theme-halftone), TimePicker 2, QuickTimeMovieEmbed 2, ProgressBar 2, MenuWidgetTime 2, MenuWidgetSound 2, Desktop 2, DatePicker 2, CrashScreen 2, Checkbox 2, TextEditor 1, Table 1, RichTextEditor 1, FileBrowserViewTable 1, BevelButton 1, BalloonHelp 1, Alert 1, ScreenSaver 1`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx (:1690,1732,1746)`
- Modify: `src/SystemFolder/SystemResources/Alert/ClassicyAlert.tsx (:289-308)`
- Modify: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx (:176,240,283,352-366)`
- Modify: `src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.tsx (:196)`
- Modify: `src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx (where `ClassicyMenuItem.className` is applied — the Apple/App/Help/switcher items need `data-classicy-part` forwarded: add an optional `partAttr?: string` field to `ClassicyMenuItem` rendered as `data-classicy-part`)`
- Test: `src/Appearance/vocabulary/ClassicyCascade.repo.test.ts (new)`
- Test: `src/Appearance/vocabulary/ClassicyPartAttributes.test.tsx (new)`

**Depends on:** 4.1

**Interfaces:**
- Consumes: `CLASSICY_PART_ATTRIBUTE` (1.1).
- Produces: Zero `!important` under src/**/*.scss. Known hard cases and their resolutions: DesktopIcon.scss:53,65,141-143 and Icon.scss:55,67 `mask-size/mask-mode/mask-repeat !important` — the base rule drops `!important` and the alias-badge override wins by order (move `.classicyDesktopIconAliasBadge .classicyDesktopIconMask` after the base `.classicyDesktopIconMask`); scrollbars.scss:243-279 (`scrollbars-hidden`/`-inactive` mixins) — callers include them after the base scrollbar mixin, so plain order wins; DesktopMenuBar.scss:34,62,73-75,97 (`display: none` on `:after`, hover backgrounds) — beat `.classicyMenuItem:after` by nesting under `.classicyDesktopMenu` (one extra class); Menu.scss:234-236 `.classicyMenuItemKeyboardShortcut` — nest under `.classicyMenuItem`; CrashScreen/ScreenSaver overlays — keep specificity via their existing ids. Part attributes: ClassicyWindow.tsx — each `<div className="classicyWindowControlBox">` gains `data-classicy-control="close" | "zoom" | "collapse"`; ClassicyAlert.tsx — each `ClassicyButton` gains `data-classicy-role` = `"default"` when `button.id === defaultButton?.id`, `"cancel"` when `button.role === "cancel"`, else `"other"` (the help button gets `"other"`); ClassicyDesktopMenuBar — Apple item `partAttr: "apple"`, each app menu item `"app"`, Help `"help"`, App Switcher `"switcher"`, the Extensions `<ul>` `data-classicy-part="extensions"`, the Time widget root `"clock"`. `ClassicyMenu` renders `data-classicy-part={item.partAttr}` on the item's `<li>`.

- [ ] **Step 1: Write the failing tests** — `ClassicyCascade.repo.test.ts`:
```ts
it("no SCSS under src uses !important", () => { const files = globSync("src/**/*.scss"); const hits = files.flatMap((f) => readFileSync(f, "utf8").split("\n").map((l, i) => l.includes("!important") ? `${f}:${i + 1}` : null).filter(Boolean)); expect(hits).toEqual([]); });
```
`ClassicyPartAttributes.test.tsx`:
```ts
it("window control boxes carry data-classicy-control", () => { render a closable+zoomable+collapsable window; expect(container.querySelector('[data-classicy-control="close"] .classicyWindowCloseBox')).not.toBeNull(); same for zoom/collapse; expect(container.querySelectorAll("[data-classicy-control]")).toHaveLength(3); });
it("alert buttons carry data-classicy-role", () => { render <ClassicyAlert buttons={[{ id: "cancel", label: "Cancel", role: "cancel" }, { id: "other", label: "Later", role: "normal" }, { id: "ok", label: "OK", role: "default" }]}/>; expect(getByRole("button", { name: "Cancel" })).toHaveAttribute("data-classicy-role", "cancel"); Later → other; OK → default; });
it("menu bar clusters carry data-classicy-part", () => { render the desktop menu bar via its story helper; for (const p of ["apple","help","switcher","extensions","clock"]) expect(container.querySelector(`[data-classicy-part="${p}"]`)).not.toBeNull(); });
```
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — ~96 `!important` hits listed; attribute selectors return null. — `pnpm exec vitest run src/Appearance/vocabulary/ClassicyCascade.repo.test.ts src/Appearance/vocabulary/ClassicyPartAttributes.test.tsx`
- [ ] **Step 3: Remove !important file by file, largest first** — For each file: delete the flag, run that component's existing tests and compile the file with sass to confirm the intended rule still wins by order or specificity (resolutions in Interfaces). Commit after every 3–4 files: `refactor(scss): remove !important from <files>`.
- [ ] **Step 4: Add the part attributes** — Per Interfaces (Window, Alert, MenuBar, Time widget, Menu `partAttr`).
- [ ] **Step 5: Run tests to verify they pass** — Expected: PASS. — `pnpm test`
- [ ] **Step 6: Lint, type-check, commit** — git add -A src && git commit -m "feat(vocabulary): data-classicy-control/role/part attributes; no !important left in src" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `grep -rn '!important' src --include=*.scss | wc -l  # expect 0`

## Phase 5: Cascade layers

### 5.1: @layer declaration in the injector; classicy.base wrapping plugin

**Files:**
- Create: `bin/classicyCssLayerPlugin.ts`
- Create: `bin/classicyCssLayerPlugin.test.ts`
- Modify: `bin/classicyStyleInjector.ts`
- Modify: `bin/classicyStyleInjector.test.ts`
- Modify: `vite.config.ts (plugins; and `injectCssPlugin` unchanged)`
- Modify: `storybook/.storybook/main.ts (viteFinal plugins)`
- Modify: `bin/check-dist-imports.mjs (assert the bundle's injected CSS starts with the layer statement)`
- Test: `bin/classicyStyleInjector.test.ts`
- Test: `bin/classicyCssLayerPlugin.test.ts`

**Depends on:** 4.2

**Interfaces:**
- Consumes: Vite's `vite:css` plugin compiles `.scss` ids to CSS before user plugins in the normal phase run `transform`; `vite:css-post` (post phase) then collects them. Storybook dev and the example (`pnpm preview`, which consumes dist) both pass through the same hook.
- Produces: `bin/classicyStyleInjector.ts`: `export const CLASSICY_LAYER_ORDER = "@layer classicy.base, classicy.package, classicy.user;";` and `classicyStyleInjector(css, elementId)` injects `${CLASSICY_LAYER_ORDER}\n${css}` for the default element id only (fonts get no layer statement). `bin/classicyCssLayerPlugin.ts`: `export function classicyCssLayerPlugin(layer = "classicy.base"): Plugin` — `name: "classicy-css-layer"`, no `enforce` (normal phase, after vite:css), `transform(code, id)` returns `{ code: `@layer ${layer} {\n${code}\n}`, map: null }` when `id` matches `/\.scss(\?|$)/`, is under `src/`, is not `styles/fonts.scss`, and `code` does not already start with `@layer ${layer}`; everything else returns `null`. Also exported: `export const wrapInClassicyLayer = (css: string, layer?: string): string` (the pure function the plugin and the test share). `dist/classicy.css` therefore reads `@layer classicy.base { … }` blocks (one per source file) and the injected `<style>` starts with the order statement. `src/index.css` (empty today) is left alone.

- [ ] **Step 1: Write the failing tests** — `bin/classicyStyleInjector.test.ts` (add):
```ts
it("declares the cascade layer order before any rule", () => { run(".a{color:red}"); expect(document.getElementById(CLASSICY_STYLE_ELEMENT_ID)?.textContent).toBe("@layer classicy.base, classicy.package, classicy.user;\n.a{color:red}"); });
it("does not prepend the layer order to the fonts stylesheet", () => { new Function(classicyStyleInjector("@font-face{font-family:x}", CLASSICY_FONTS_STYLE_ELEMENT_ID))(); expect(document.getElementById(CLASSICY_FONTS_STYLE_ELEMENT_ID)?.textContent).toBe("@font-face{font-family:x}"); });
```
`bin/classicyCssLayerPlugin.test.ts`:
```ts
it("wraps compiled component scss in @layer classicy.base", () => expect(wrapInClassicyLayer(".classicyButton{display:flex}")).toBe("@layer classicy.base {\n.classicyButton{display:flex}\n}"));
it("transform wraps src scss ids and ignores fonts.scss, css and node_modules", async () => { const p = classicyCssLayerPlugin(); const t = p.transform as Function; expect((await t.call({}, ".a{}", "/repo/src/X/X.scss")).code).toMatch(/^@layer classicy.base \{/); expect(await t.call({}, ".a{}", "/repo/src/SystemFolder/ControlPanels/AppearanceManager/styles/fonts.scss")).toBeNull(); expect(await t.call({}, ".a{}", "/repo/src/index.css")).toBeNull(); expect(await t.call({}, ".a{}", "/repo/node_modules/x/y.scss")).toBeNull(); });
it("is idempotent", () => expect(wrapInClassicyLayer(wrapInClassicyLayer(".a{}"))).toBe(wrapInClassicyLayer(".a{}")));
```
Update the existing injector test `inserts the stylesheet once` expectation to the prefixed text.
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — `CLASSICY_LAYER_ORDER` undefined; module not found. — `pnpm exec vitest run bin`
- [ ] **Step 3: Implement CLASSICY_LAYER_ORDER, the injector change and bin/classicyCssLayerPlugin.ts** — Per Interfaces. Register the plugin in `vite.config.ts` `plugins` before `react()` is fine (normal phase ordering only matters relative to vite:css, which is a core plugin) and in `storybook/.storybook/main.ts` `viteFinal` `plugins`.
- [ ] **Step 4: Run tests to verify they pass** — Expected: PASS. — `pnpm exec vitest run bin`
- [ ] **Step 5: Build and verify the bundle** — Expected: dist/classicy.css begins with `@layer classicy.base {`, the count is ≥ 90 (one per source stylesheet), the ES bundle embeds the order statement. Extend `bin/check-dist-imports.mjs` with that last assertion so `verify:dist` guards it. — `pnpm build:source && head -c 120 dist/classicy.css && grep -c '@layer classicy.base {' dist/classicy.css && node -e "const s=require('fs').readFileSync('dist/classicy.es.js','utf8'); if(!s.includes('@layer classicy.base, classicy.package, classicy.user;')) process.exit(1)"`
- [ ] **Step 6: Verify Storybook still styles components (layered rules lose to unlayered host rules only)** — With Storybook running, open `iframe.html?id=controls-button--default&viewMode=story`; in the console `[...document.styleSheets].some(s => [...s.cssRules].some(r => r instanceof CSSLayerBlockRule && r.name === 'classicy.base'))` → `true`. The ClassicyDesktop wrapper's inline theme vars are inline styles (unaffected by layers).
- [ ] **Step 7: Lint, type-check, commit** — git add bin vite.config.ts storybook/.storybook/main.ts && git commit -m "feat(css): declare classicy.base/package/user layers and compile component CSS into classicy.base" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run bin && pnpm build:source`

## Phase 6: Parity, docs, final verification

- [ ] Re-shoot every id in `.playwright-mcp/parity/part-A/stories.txt` into `.playwright-mcp/parity/part-A/after/` (same procedure as Phase 0; Storybook restarted after 5.1 so the layer plugin is active).
- [ ] `for f in .playwright-mcp/parity/part-A/before/*.png; do n=$(compare -metric AE "$f" ".playwright-mcp/parity/part-A/after/$(basename "$f")" null: 2>&1); echo "$n $(basename "$f")"; done | sort -n | tail` → every line starts with `0`. Any non-zero: open both images, find the rule whose cascade changed (4.1/4.2 removed `!important`; 5.1 layered it under a host rule), fix the SCSS — never the screenshot — and re-run.
- [ ] docs/AGENT-REFERENCE.md: new subsection under §4 'Vocabulary' (after 4.0): the 15 state classes with the `.classicyButton.pressed` idiom, `CLASSICY_STATE`/`classicyStateClasses`, `classicy-state()`, the three part attributes with their values, the `className`/`style` rule, and the `@layer` order (host CSS wins unlayered; a package targets `classicy.package`). Replace any `data-state` mention (`grep -n data-state docs/AGENT-REFERENCE.md`). Correct §9 item 6 of docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md: `classicyWindowInvisible` is live (closed-but-mounted windows), only `classicyWindowZoomed` and `block` were dead.
- [ ] CLAUDE.md after the Theming section: 'Vocabulary: shared state classes are bare and beside the root (`.classicyButton.pressed`), generated from `src/Appearance/vocabulary/ClassicyVocabulary.json` by `node bin/generate-vocabulary.ts` (run by `generate-barrels`; CI checks freshness). Part attributes `data-classicy-control|role|part`. Component CSS compiles into `@layer classicy.base`; no `!important` in src SCSS (test-enforced).'
- [ ] `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test && pnpm build:source` → all PASS; `grep -rn '!important' src --include=*.scss | wc -l` → 0; `node bin/generate-vocabulary.ts --check` → exit 0.
- [ ] `verify` skill: run the example app; open a window, collapse it, open an error alert, open the Apple menu; no console errors; `document.querySelector('.classicyWindow.active')` exists; `document.querySelector('[data-classicy-control="close"]')` exists.
- [ ] Commit docs: `docs(vocabulary): document state classes, part attributes, passthrough and cascade layers` (with the trailer). Stop background dev servers.

**Validation:** `compare loop over .playwright-mcp/parity/part-A → AE 0 for every story`

## Acceptance Criteria

- [ ] `src/Appearance/vocabulary/ClassicyVocabulary.{json,ts}` and `_vocabulary.scss` exist; `CLASSICY_STATE.pressed === "pressed"`; `classicyStateClasses({ pressed: true, active: true }) === "active pressed"`; `classicy-state(bogus)` errors at compile time; the generator rejects a state colliding with a root/part class; `node bin/generate-vocabulary.ts --check` passes in CI.
- [ ] Every component in the 2.1/2.2 mapping emits bare shared state classes; `grep -rn 'data-state' src` returns nothing outside git history; the BEM strays and `classicyDesktopMenuAppleMenu` are gone.
- [ ] Every exported component merges `className` and `style` onto its root; `ClassicyButton` keeps `classicyButton` when `className` is passed.
- [ ] `grep -rn '!important' src --include=*.scss | wc -l` is 0 and a vitest test enforces it; `platinumWindowControlBox` sets plain sizes.
- [ ] Window control boxes carry `data-classicy-control`, alert buttons `data-classicy-role`, menu-bar clusters `data-classicy-part`.
- [ ] The injected stylesheet starts with `@layer classicy.base, classicy.package, classicy.user;` and every component rule sits in `@layer classicy.base` (dist and Storybook).
- [ ] Phantom tokens `--color-theme-1`, `--box-border-size`, `--color-theme-hover`, `--color-theme-selection` and the empty `.classicyWindowZoomed` / undefined `block` are gone.
- [ ] All Controls/*, Desktop/*, Dialogs/* parity stories compare AE 0 before vs after; `pnpm lint`, `tsc --noEmit`, `pnpm test`, `pnpm build:source` pass.

## Self-Review

| Requirement | Delivered by |
|---|---|
| §9 Phase 1 item 1 — generated vocabulary, TS + SCSS, wired before barrels; generator rejects state/root collisions | 1.1, Steps 1–6 |
| §9 Phase 1 item 2 — shared state classes on every stateful component; data-state users and the [aria-*] selector converted; BEM strays and the AppleMenu typo fixed | 2.1 Steps 3–5; 2.2 Steps 3–5 |
| §9 Phase 1 item 3 — className/style passthrough on ~30 components; ClassicyButton spread-order bug | 3.1, Steps 3–4 |
| §9 Phase 1 item 4 — ClassicyWindow.scss reorder, 62 → 0; mixin un-!important; the other ~95 sites | 4.1 Steps 3–4; 4.2 Step 3 |
| §9 Phase 1 item 5 / contract part attributes — data-classicy-control, -role, -part | 4.2, Step 4 |
| Contract cascade layers — declared once by the injector; component SCSS compiles into classicy.base | 5.1, Steps 3–5 |
| §9 Phase 1 item 6 — dead selectors and phantom tokens | 2.2 (Zoomed, block) and 4.1 Step 4 (tokens) |
| Contract `./scss/*` export → vocabulary directory | 1.1, Step 4 (with the temporary `./scss-platinum/*` bridge for the example app, deleted by part B) |
| Platinum pixel-identical | Phase 0, 4.1 Step 6, Phase 6 |

**Placeholder scan:** No TBDs. Every step names its file, signature, selector mapping or command; the mapping tables in 2.1/2.2 decide every legacy class; the !important resolutions for the known hard files are stated in 4.2.
**Residual risk:** (1) `@layer` demotes Classicy's rules below any unlayered host CSS; a host that today loses on specificity could start winning. Mitigated: Classicy imports no third-party CSS (grep confirmed only `src/index.css`, empty), and the parity set runs inside Storybook's own harness; documented for hosts in AGENT-REFERENCE. (2) Removing `!important` relies on source order within one file, but Vite concatenates files in import order — a cross-file override (Alert → Window title bar, ControlStrip → BevelButton) could flip if import order changes. Mitigated by the per-file cascade tests and the parity gate; part B's package layer is the long-term home for those overrides. (3) The `components` map in the JSON is hand-curated from a grep and may miss a root; harmless until a state name collides, which the generator then reports.

## Next Steps

1. Part B (package core) consumes `CLASSICY_COMPONENT`, `classicy-state()`, the layer order and the `./scss/*` export; it deletes the temporary `./scss-platinum/*` export.
2. Part G needs only `src/Appearance/vocabulary/` to exist (for `_color.scss`); it can start as soon as 1.1 is merged.
3. Contract gap to raise on 0002-ldj: the `ClassicyMenuItem.partAttr` field (how a menu item carries `data-classicy-part`) and `CLASSICY_PART_ATTRIBUTE` are not pinned; the `[aria-expanded]` → `open` mapping for BevelButton's popup state and the `tabs → selected` (not `active`) decision should be recorded in the contract's vocabulary section.
