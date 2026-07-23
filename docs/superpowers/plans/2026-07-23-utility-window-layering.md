# Utility Window App-Focus-Aware Layering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a utility (tool-palette) window float above its own app's windows but drop behind whichever app is currently focused, so Finder windows (and any focused app's windows) cover a background app's palettes.

**Architecture:** Z-order is decided by static CSS bands keyed off focus state, assigned as class names in `ClassicyWindow.tsx`. Add one computed modifier class for utility windows — `classicyWindowFloating` when the owning app is focused, `classicyWindowBackgrounded` when it is not — and two CSS rules that override the incidental `z-index: 300` a utility window gets today. No persisted-state, reducer, or `ClassicyWindowOpen` changes.

**Tech Stack:** React + TypeScript, `classnames`, SCSS, Vitest + Testing Library.

## Global Constraints

- Layering is pure render logic — do **not** add fields to `ClassicyStoreSystemAppWindow`, touch the window event reducer, or change `ClassicyWindowOpen`.
- Utility windows must keep their never-dim active chrome (existing behavior): only the z-index band may change with app focus.
- Document (non-utility) windows must be completely unaffected.
- Follow existing conventions: classes assigned via `classNames(...)` in `ClassicyWindow.tsx`; z-index bands live in `ClassicyWindow.scss` as single-class `!important` rules.
- Spec: `docs/superpowers/specs/2026-07-23-utility-window-layering-design.md`.

---

## File Structure

- `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` — add one computed token to the existing `classNames(...)` list (~line 927).
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss` — add two z-index band classes after `.classicyWindowActive` (~line 126).
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.utility.test.tsx` — make the app-focus value in the store mock mutable, add a new `describe` for layering-class assignment.

This is one cohesive, independently reviewable change, so it is a single task with a TDD cycle.

---

### Task 1: App-focus-aware utility layering classes

**Files:**
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` (~line 927, inside the `classNames(...)` call)
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss` (after the `.classicyWindowActive { … }` block, ~line 126)
- Test: `src/SystemFolder/SystemResources/Window/ClassicyWindow.utility.test.tsx`

**Interfaces:**
- Consumes: `currentApp` from `useAppManager(state => state.System.Manager.Applications.apps[appId])` (already in scope in `ClassicyWindow.tsx:200-202`); the `windowType` prop (`"document" | "utility"`).
- Produces: two CSS class names on the `.classicyWindow` root element — `classicyWindowFloating` (utility + owning app focused) and `classicyWindowBackgrounded` (utility + owning app not focused). Neither appears on document windows.

- [ ] **Step 1: Make the store mock's app-focus value mutable**

In `ClassicyWindow.utility.test.tsx`, add a hoisted mutable holder near the other `vi.hoisted` mocks (after line 8):

```tsx
// Lets individual tests flip the owning app's focus state, which drives the
// utility window's z-index band (floating vs backgrounded).
const mockAppFocused = vi.hoisted(() => ({ value: false }));
```

Then change the hardcoded app-level `focused: false` (line 21) to read from it:

```tsx
					TestApp: {
						id: "TestApp",
						focused: mockAppFocused.value,
```

Leave the window-level `focused: false` (line 28) unchanged — the palette is never the focused window; only its app's focus varies.

- [ ] **Step 2: Write the failing tests**

Append a new `describe` block at the end of `ClassicyWindow.utility.test.tsx`:

```tsx
describe("ClassicyWindow utility windows layer relative to app focus", () => {
	beforeEach(() => {
		mockAppFocused.value = false;
	});

	// When the palette's own app is focused, it floats above that app's
	// document windows.
	it("adds classicyWindowFloating when the owning app is focused", () => {
		mockAppFocused.value = true;
		const { container } = renderWindow({ windowType: "utility" });
		const win = container.querySelector(".classicyWindowUtility");
		expect(win?.classList.contains("classicyWindowFloating")).toBe(true);
		expect(win?.classList.contains("classicyWindowBackgrounded")).toBe(false);
	});

	// When the palette's own app is backgrounded, it drops behind the focused
	// app's windows (e.g. a Finder browser window).
	it("adds classicyWindowBackgrounded when the owning app is not focused", () => {
		mockAppFocused.value = false;
		const { container } = renderWindow({ windowType: "utility" });
		const win = container.querySelector(".classicyWindowUtility");
		expect(win?.classList.contains("classicyWindowBackgrounded")).toBe(true);
		expect(win?.classList.contains("classicyWindowFloating")).toBe(false);
	});

	// Document windows never get either layering class.
	it("adds neither layering class to a document window", () => {
		mockAppFocused.value = true;
		const { container } = renderWindow({ windowType: "document" });
		const win = container.querySelector(".classicyWindowDocument");
		expect(win?.classList.contains("classicyWindowFloating")).toBe(false);
		expect(win?.classList.contains("classicyWindowBackgrounded")).toBe(false);
	});
});
```

- [ ] **Step 3: Run the new tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.utility.test.tsx -t "layer relative to app focus"`
Expected: FAIL — the "floating" and "backgrounded" assertions fail because neither class is emitted yet (both `contains(...)` return `false`).

- [ ] **Step 4: Add the computed class token in `ClassicyWindow.tsx`**

In the `classNames(...)` call (~line 927), immediately after the
`currentApp?.focused && !isActive() ? "classicyWindowActiveApp" : "",` line, add:

```tsx
				windowType === "utility"
					? currentApp?.focused
						? "classicyWindowFloating"
						: "classicyWindowBackgrounded"
					: "",
```

Leave the existing `modal || isActive() ? "classicyWindowActive" : "classicyWindowInactive"` line unchanged — utility windows keep `.classicyWindowActive` for their never-dim chrome; the new class only overrides z-index.

- [ ] **Step 5: Add the two z-index bands in `ClassicyWindow.scss`**

Immediately **after** the closing brace of the `.classicyWindowActive { … }` block (~line 126, before `.classicyWindowInvisible`), add:

```scss
// #234: a utility palette floats above its own app's active document (300)
// while that app is focused…
.classicyWindowFloating {
  z-index: 350 !important;
}

// …and drops behind the focused app's windows (150 / 300) when its own app is
// backgrounded, so Finder file-browser windows cover a background app's palette.
.classicyWindowBackgrounded {
  z-index: 20 !important;
}
```

These are placed after `.classicyWindowActive` so that, at equal single-class specificity, source order resolves the `!important` cascade deterministically.

- [ ] **Step 6: Run the new tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.utility.test.tsx -t "layer relative to app focus"`
Expected: PASS (3 passed).

- [ ] **Step 7: Run the full utility test file to check for regressions**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.utility.test.tsx`
Expected: PASS — all prior tests (dimming, title/icon, aria-label) still green plus the 3 new ones. The dimming tests are unaffected because `mockAppFocused` resets to `false` and a utility window keeps `.classicyWindowActive`.

- [ ] **Step 8: Run lint**

Run: `pnpm lint`
Expected: no new errors in `ClassicyWindow.tsx`, `ClassicyWindow.scss`, or the test file. (If Biome reports repo-wide drift in untouched files, ignore it — scope any fix to the three touched files only.)

- [ ] **Step 9: Commit**

```bash
git add src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx \
        src/SystemFolder/SystemResources/Window/ClassicyWindow.scss \
        src/SystemFolder/SystemResources/Window/ClassicyWindow.utility.test.tsx
git commit -m "fix(window): layer utility palettes behind the focused app (#234)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 10: In-browser verification (verify skill)**

Build the library and drive the example app (or Storybook) in a browser:

1. Open HyperCard → its tool palette floats above the HyperCard card window.
2. Open a Finder file-browser window and click it → the Finder window now covers the HyperCard palette (before this change the palette stayed on top).
3. Click back into HyperCard → the palette returns above the card window and never dims throughout.

Expected: all three observations hold. This validates the actual DOM stacking that the unit tests (which stub the SCSS) cannot.

---

## Self-Review

**1. Spec coverage:**
- R1 (palette above own app's docs when focused) → `classicyWindowFloating` at `z-index: 350`, Steps 4–5; asserted Step 2 test 1; browser Step 10.1.
- R2 (palette behind focused app when backgrounded) → `classicyWindowBackgrounded` at `z-index: 20`, Steps 4–5; asserted Step 2 test 2; browser Step 10.2.
- R3 (chrome unchanged / never dims) → `.classicyWindowActive` line left intact (Step 4); regression covered by existing dimming tests re-run in Step 7; browser Step 10.3.
- R4 (document windows unaffected) → token guarded by `windowType === "utility"`; asserted Step 2 test 3.
- R5 (no state/reducer/open changes) → Global Constraints; only three presentational files touched.

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to" — every code and command step is concrete.

**3. Type consistency:** Class names `classicyWindowFloating` / `classicyWindowBackgrounded` are used identically in the TSX token (Step 4), the SCSS rules (Step 5), and all three tests (Step 2). `mockAppFocused.value` (boolean holder) is defined in Step 1 and used in Steps 1 and 2. `windowType` values (`"utility"` / `"document"`) match the prop type.
