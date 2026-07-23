# Utility Window `alwaysOnTop` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in `alwaysOnTop` prop to `ClassicyWindow` so a `windowType="utility"` palette floats above every app's windows even when its own app is backgrounded.

**Architecture:** Pure component prop consumed only in the className computation. When `alwaysOnTop` is set on a utility window, it short-circuits to the existing `.classicyWindowFloating` (`z-index: 350`) band regardless of app focus, instead of dropping to `.classicyWindowBackgrounded` (`20`). No SCSS, store, schema, or reducer change.

**Tech Stack:** React (TypeScript), Vitest + Testing Library, Storybook, SCSS (unchanged), pnpm.

## Global Constraints

- Reuse the existing `.classicyWindowFloating` band (`z-index: 350 !important`) from #234 — **no SCSS change**.
- `alwaysOnTop` is a **component prop only** — no change to persisted state, `ClassicyWindowOpen`, or the window reducer.
- Default is `false`; a utility window without it keeps the exact #234 app-focus-aware behavior.
- `alwaysOnTop` is a **no-op on `windowType="document"`** windows (they emit neither layering class).
- Utility chrome is unchanged — the palette never dims; half-height crosshatch title bar stays.
- Test commands run from repo root with `pnpm`. Vitest does not type-check — run `pnpm build:source` before completion (project convention).
- Lint touched files only: `pnpm exec biome check <files>` (repo-wide biome has pre-existing drift).

---

### Task 1: Add `alwaysOnTop` prop and layering behavior

**Files:**
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` (interface ~line 133, destructure ~line 191, className computation ~line 930)
- Test: `src/SystemFolder/SystemResources/Window/ClassicyWindow.utility.test.tsx` (append a new `describe` block)

**Interfaces:**
- Consumes: existing `ClassicyWindowProps`, the `currentApp?.focused` value already in scope at the className computation, and the existing `.classicyWindowFloating` / `.classicyWindowBackgrounded` CSS classes.
- Produces: `alwaysOnTop?: boolean` prop on `ClassicyWindowProps` (default `false`).

- [ ] **Step 1: Write the failing tests**

Append this `describe` block to the end of `src/SystemFolder/SystemResources/Window/ClassicyWindow.utility.test.tsx` (it reuses the file's existing `renderWindow` helper and `mockAppFocused` control). The existing test `"adds classicyWindowBackgrounded when the owning app is not focused"` already guards the default (no-`alwaysOnTop`) behavior, so it is not duplicated here.

```tsx
describe("ClassicyWindow utility windows with alwaysOnTop float above all apps", () => {
	beforeEach(() => {
		mockAppFocused.value = false;
	});

	// The whole point of the feature: a backgrounded app's palette stays in the
	// floating band instead of dropping behind the focused app.
	it("stays classicyWindowFloating when the owning app is NOT focused", () => {
		mockAppFocused.value = false;
		const { container } = renderWindow({
			windowType: "utility",
			alwaysOnTop: true,
		});
		const win = container.querySelector(".classicyWindowUtility");
		expect(win?.classList.contains("classicyWindowFloating")).toBe(true);
		expect(win?.classList.contains("classicyWindowBackgrounded")).toBe(false);
	});

	// When the app IS focused it also floats (same band as the #234 default).
	it("is classicyWindowFloating when the owning app is focused", () => {
		mockAppFocused.value = true;
		const { container } = renderWindow({
			windowType: "utility",
			alwaysOnTop: true,
		});
		const win = container.querySelector(".classicyWindowUtility");
		expect(win?.classList.contains("classicyWindowFloating")).toBe(true);
		expect(win?.classList.contains("classicyWindowBackgrounded")).toBe(false);
	});

	// alwaysOnTop is a no-op on document windows — they never get a layering class.
	it("adds neither layering class to a document window even with alwaysOnTop", () => {
		mockAppFocused.value = false;
		const { container } = renderWindow({
			windowType: "document",
			alwaysOnTop: true,
		});
		const win = container.querySelector(".classicyWindowDocument");
		expect(win?.classList.contains("classicyWindowFloating")).toBe(false);
		expect(win?.classList.contains("classicyWindowBackgrounded")).toBe(false);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.utility.test.tsx`
Expected: FAIL — the first test fails with the window carrying `classicyWindowBackgrounded` (not `classicyWindowFloating`) because `alwaysOnTop` is not yet honored. (The third test may already pass since document windows get no class today; the first test is the true RED.)

- [ ] **Step 3: Add the prop to the interface**

In `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx`, add to `interface ClassicyWindowProps` immediately after the `windowType?: ...` member (~line 133):

```tsx
	/**
	 * Utility-only. When true, a `windowType="utility"` palette floats above
	 * every app's windows — even when its own app is backgrounded — instead of
	 * dropping behind the focused app (the default #234 behavior). Still sits
	 * below error modals. No-op on document windows.
	 */
	alwaysOnTop?: boolean;
```

- [ ] **Step 4: Destructure the prop with a default**

In the component parameter list (~line 191, alongside `windowType = "document",`), add:

```tsx
	alwaysOnTop = false,
```

- [ ] **Step 5: Honor the prop in the className computation**

In the `className={classNames(...)}` call (~line 930), replace the utility layering branch:

```tsx
				windowType === "utility"
					? currentApp?.focused
						? "classicyWindowFloating"
						: "classicyWindowBackgrounded"
					: "",
```

with:

```tsx
				windowType === "utility"
					? alwaysOnTop || currentApp?.focused
						? "classicyWindowFloating"
						: "classicyWindowBackgrounded"
					: "",
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.utility.test.tsx`
Expected: PASS — all utility tests green (existing dimming, title, aria, #234 layering, and the 3 new `alwaysOnTop` tests).

- [ ] **Step 7: Commit**

```bash
git add src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx \
        src/SystemFolder/SystemResources/Window/ClassicyWindow.utility.test.tsx
git commit -m "feat(window): alwaysOnTop keeps utility palettes above all apps (#234-followup)"
```

---

### Task 2: Storybook story + end-to-end verification

**Files:**
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.stories.tsx` (add a story after the existing `Utility` story, ~line 115)

**Interfaces:**
- Consumes: `alwaysOnTop` prop from Task 1; existing `StoryApp` / `ClassicyWindow` imports already in the file.
- Produces: an `UtilityAlwaysOnTop` Storybook story used as the browser-verification vehicle.

- [ ] **Step 1: Add the story**

In `src/SystemFolder/SystemResources/Window/ClassicyWindow.stories.tsx`, insert after the `Utility` story (after its closing `};` at ~line 115):

```tsx
/**
 * A utility palette with `alwaysOnTop`. Unlike the plain Utility story, this
 * palette stays in the floating band (z-index 350) even when its owning app is
 * backgrounded, so it floats above other apps' windows — but still below error
 * modals.
 */
export const UtilityAlwaysOnTop: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="utility-always-on-top"
				appId="storybook.app"
				title="Tools"
				windowType="utility"
				alwaysOnTop
				zoomable={false}
				initialSize={[120, 240]}
				initialPosition={[140, 90]}
			>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gap: 2,
						padding: 4,
					}}
				>
					{["▲", "●", "◆", "■", "✕", "＋", "▬", "A"].map((glyph) => (
						<div
							key={glyph}
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								height: 44,
								fontSize: 22,
								border: "1px solid var(--color-system-05)",
								background: "var(--color-system-02)",
							}}
						>
							{glyph}
						</div>
					))}
				</div>
			</ClassicyWindow>
		</StoryApp>
	),
};
```

- [ ] **Step 2: Type-check and lint touched files**

Run: `pnpm build:source`
Expected: builds clean (tsc passes — validates the new prop's types across the component and story).

Run: `pnpm exec biome check src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx src/SystemFolder/SystemResources/Window/ClassicyWindow.utility.test.tsx src/SystemFolder/SystemResources/Window/ClassicyWindow.stories.tsx`
Expected: no errors on the touched files (ignore any pre-existing unrelated drift).

- [ ] **Step 3: Run the full test suite (regression)**

Run: `pnpm vitest run`
Expected: all tests pass (previous baseline 1521 + 3 new = 1524), no failures.

- [ ] **Step 4: Browser verification (verify skill)**

Use the `verify` skill's Storybook path:

```bash
pnpm storybook
```

Then in the browser:
1. Open the **Utility Always On Top** story → the palette renders with active (never-dimmed) crosshatch chrome.
2. Confirm it carries `z-index: 350` (inspect the `.classicyWindowFloating` element) and that this exceeds a document window's active band (`300`).
3. (Optional cross-app check in the example app: temporarily set `alwaysOnTop` on HyperCard's palette, focus Finder, confirm the palette stays above the Finder window; revert the temporary change.)

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/Window/ClassicyWindow.stories.tsx
git commit -m "docs(window): Storybook story for alwaysOnTop utility palette"
```

---

## Self-Review

**Spec coverage:**
- R1 (floating band regardless of focus) → Task 1 Steps 4-5 + test 1.
- R2 (below error modals) → reuses `350` band, no code change; noted in Global Constraints and verified in Task 2 Step 2/4.
- R3 (default unchanged) → guarded by the file's existing `classicyWindowBackgrounded` test (noted in Task 1 Step 1) and Task 2 Step 3 full-suite run.
- R4 (no-op on document) → Task 1 test 3.
- R5 (chrome never dims) → unchanged `isActive()`/`classicyWindowActive` logic; existing dimming tests remain green (Task 2 Step 3).
- R6 (no store/reducer change) → Global Constraints; only the interface, destructure, and className branch change.

**Placeholder scan:** none — every step shows exact code and commands.

**Type consistency:** `alwaysOnTop?: boolean` defined in Task 1 Step 3, destructured in Step 4, consumed in Step 5, and used as `alwaysOnTop` in the story (Task 2). Consistent throughout.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-23-utility-window-always-on-top.md`.
