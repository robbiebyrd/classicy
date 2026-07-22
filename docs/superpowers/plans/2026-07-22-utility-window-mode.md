# Utility (Tool-Palette) Window Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the existing `windowType="utility"` feature so a utility window renders as a compact Mac OS 8 tool palette: an 11px half-height title bar with no title text and no icon.

**Architecture:** Two changes on top of already-wired scaffolding. (1) In `ClassicyWindow.tsx`, force the empty crosshatch title-bar variant for `windowType="utility"` so `title`/`icon`/`hideIcon` props never paint text or an icon. (2) Add a themeable `--hig-titlebar-height-utility` (11px) var and consume it in the `.classicyWindowUtility` SCSS block to halve the bar and shrink the control boxes.

**Tech Stack:** React + TypeScript, SCSS, Vitest + React Testing Library, Storybook, Biome.

## Global Constraints

- Test runner: `pnpm test` (`vitest run`); single file: `pnpm test <path>`.
- Lint: Biome. Repo-wide `biome check .` reformats ~70 untouched files — **run Biome scoped to touched files only** (`pnpm exec biome check <path>`), never the whole repo.
- The `title` prop remains accepted on utility windows and still feeds the accessible name / analytics; it is only never *painted* in the bar.
- Utility title bar height is exactly **11px** (Mac OS 8 windoid), via `--hig-titlebar-height-utility`.
- Default theme measurements (for sizing math): `controlSize: 12`, `borderSize: 1`, `paddingSize: 6`.
- Preserve all existing utility behavior: never dims when unfocused; drag / collapse / zoom still work. The 3 existing tests in `ClassicyWindow.utility.test.tsx` must stay green.

---

## File Structure

- `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` — title-bar JSX: gate the text/icon branch on `windowType`.
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.utility.test.tsx` — add no-title/no-icon coverage.
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts` — add the `--hig-titlebar-height-utility` var.
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts` — assert the new var.
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss` — `.classicyWindowUtility` block: half-height bar + shrunk controls + shorter crosshatch center.
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.stories.tsx` — update the existing `Utility` story to a compact icon-grid palette.

---

## Task 1: Enforce no-title / no-icon in utility mode (component)

**Files:**
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx:985-1001`
- Test: `src/SystemFolder/SystemResources/Window/ClassicyWindow.utility.test.tsx`

**Interfaces:**
- Consumes: existing `ClassicyWindow` props `windowType`, `title`, `icon`, `hideIcon`; existing `renderWindow(props)` helper in the test file (spreads props onto `<ClassicyWindow>`, default `title="Test"`).
- Produces: guarantee that a `windowType="utility"` window renders `.classicyWindowTitleCenter` and never `.classicyWindowTitleText` / `.classicyWindowIcon`, regardless of props.

- [ ] **Step 1: Write the failing tests**

Append these cases inside the existing `describe(...)` block in `src/SystemFolder/SystemResources/Window/ClassicyWindow.utility.test.tsx` (the file already imports `render`, `describe`, `it`, `expect` and defines `renderWindow`):

```tsx
describe("ClassicyWindow utility windows have no title text and no icon", () => {
	// A windoid's title bar is pure crosshatch + controls: even when the
	// consumer passes a title, it is never painted in the bar.
	it("renders no title text even when a title prop is provided", () => {
		const { container } = renderWindow({
			windowType: "utility",
			title: "Tools",
		});
		expect(
			container.querySelector(".classicyWindowTitleText"),
		).toBeNull();
	});

	// No document icon in a utility title bar, even with hideIcon defaulted off.
	it("renders no icon even when hideIcon is false", () => {
		const { container } = renderWindow({
			windowType: "utility",
			title: "Tools",
			hideIcon: false,
		});
		expect(container.querySelector(".classicyWindowIcon")).toBeNull();
	});

	// The empty crosshatch center is what the utility bar shows instead.
	it("renders the empty crosshatch center region", () => {
		const { container } = renderWindow({
			windowType: "utility",
			title: "Tools",
		});
		expect(
			container.querySelector(".classicyWindowTitleCenter"),
		).not.toBeNull();
	});

	// Regression: a document window with a title still paints the title text.
	it("still renders title text for a document window with a title", () => {
		const { container } = renderWindow({
			windowType: "document",
			title: "Tools",
		});
		expect(
			container.querySelector(".classicyWindowTitleText"),
		).not.toBeNull();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/SystemFolder/SystemResources/Window/ClassicyWindow.utility.test.tsx`
Expected: the three utility cases FAIL (title text / icon are still rendered because `title="Tools"` is non-empty); the document regression case PASSES.

- [ ] **Step 3: Gate the text/icon branch on windowType**

In `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx`, the title region currently is:

```tsx
{title !== "" ? (
	<>
		<div className={"classicyWindowTitleLeft"}></div>
		{!hideIcon && (
			<div className={"classicyWindowIcon"}>
				<img src={icon} alt={title} />
			</div>
		)}
		<div className={"classicyWindowTitleText"}>
			<p>{title}</p>
		</div>
		<div className={"classicyWindowTitleRight"}></div>
	</>
) : (
	<div className={"classicyWindowTitleCenter"}></div>
)}
```

Change only the condition so utility windows always take the empty-center branch:

```tsx
{title !== "" && windowType !== "utility" ? (
	<>
		<div className={"classicyWindowTitleLeft"}></div>
		{!hideIcon && (
			<div className={"classicyWindowIcon"}>
				<img src={icon} alt={title} />
			</div>
		)}
		<div className={"classicyWindowTitleText"}>
			<p>{title}</p>
		</div>
		<div className={"classicyWindowTitleRight"}></div>
	</>
) : (
	<div className={"classicyWindowTitleCenter"}></div>
)}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/SystemFolder/SystemResources/Window/ClassicyWindow.utility.test.tsx`
Expected: PASS — all new cases plus the 3 pre-existing dimming tests.

- [ ] **Step 5: Lint the touched files**

Run: `pnpm exec biome check src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx src/SystemFolder/SystemResources/Window/ClassicyWindow.utility.test.tsx`
Expected: no errors on these files.

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx \
        src/SystemFolder/SystemResources/Window/ClassicyWindow.utility.test.tsx
git commit -m "feat(window): utility windows never paint title text or icon"
```

---

## Task 2: Half-height utility title bar (theme var + SCSS + story)

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts:193`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss:486-513`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.stories.tsx:75-91`

**Interfaces:**
- Consumes: existing `getTheme(id)` and `getThemeVars(theme)` from `ClassicyAppearance.ts` (returns a `Record<string, string>` of CSS var name → value); existing `.classicyWindowUtility` SCSS class emitted by Task 1's component; the `--hig-titlebar-height`, `--window-control-size`, `--window-border-size`, `--window-padding-size` CSS vars.
- Produces: a new CSS var `--hig-titlebar-height-utility` = `"11px"`, consumed by the utility SCSS block.

- [ ] **Step 1: Write the failing test for the theme var**

Add to the `describe("getThemeVars", ...)` block in `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts` (file already imports `getTheme`, `getThemeVars`, `describe`, `it`, `expect`):

```ts
it("contains --hig-titlebar-height-utility set to 11px", () => {
	const theme = getTheme("default");
	const vars = getThemeVars(theme);
	expect(vars["--hig-titlebar-height-utility"]).toBe("11px");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts`
Expected: FAIL — `vars["--hig-titlebar-height-utility"]` is `undefined`, not `"11px"`.

- [ ] **Step 3: Add the theme var**

In `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts`, the line is:

```ts
		"--hig-titlebar-height": intToPx(19), // document window title bar
```

Add the utility var immediately after it:

```ts
		"--hig-titlebar-height": intToPx(19), // document window title bar
		"--hig-titlebar-height-utility": intToPx(11), // utility (tool-palette) title bar
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts`
Expected: PASS.

- [ ] **Step 5: Halve the utility title bar and shrink its controls in SCSS**

In `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss`, the `.classicyWindowUtility` block currently reads:

```scss
.classicyWindowUtility {
  .classicyWindowTitleBar {
    min-height: var(--hig-titlebar-height);
    background-image: repeating-linear-gradient(
      0deg,
      var(--color-system-04) 0,
      var(--color-system-04) var(--window-border-size),
      transparent var(--window-border-size),
      transparent calc(var(--window-border-size) * 2)
    );

    .classicyWindowTitleText {
      background: var(--color-window-frame);
      padding: 0 calc(var(--window-padding-size) / 2);
    }

    .classicyWindowTitleLeft,
    .classicyWindowTitleRight,
    .classicyWindowTitleCenter {
      background: none !important;

      &:before,
      &:after {
        content: none !important;
      }
    }
  }
}
```

Replace that whole block with:

```scss
.classicyWindowUtility {
  .classicyWindowTitleBar {
    // Windoid: half-height title bar (11px vs the 19px document bar). Override
    // both height and min-height — the base .classicyWindowTitleBar sets
    // height: calc(var(--window-control-size) * 1.5) (~18px), which would
    // otherwise win over min-height alone.
    height: var(--hig-titlebar-height-utility);
    min-height: var(--hig-titlebar-height-utility);
    align-items: center;
    padding-bottom: 0;
    background-image: repeating-linear-gradient(
      0deg,
      var(--color-system-04) 0,
      var(--color-system-04) var(--window-border-size),
      transparent var(--window-border-size),
      transparent calc(var(--window-border-size) * 2)
    );

    // Shrink the close/zoom/collapse boxes to fit the shorter bar while
    // keeping the Platinum bevel (inherited from the base rules).
    .classicyWindowControlBox {
      width: calc(
        var(--hig-titlebar-height-utility) - var(--window-border-size) * 2
      ) !important;
      height: calc(
        var(--hig-titlebar-height-utility) - var(--window-border-size) * 2
      ) !important;
    }

    .classicyWindowTitleText {
      background: var(--color-window-frame);
      padding: 0 calc(var(--window-padding-size) / 2);
    }

    .classicyWindowTitleLeft,
    .classicyWindowTitleRight,
    .classicyWindowTitleCenter {
      background: none !important;

      &:before,
      &:after {
        content: none !important;
      }
    }

    // The crosshatch center is the drag region; shrink it to the shorter bar.
    .classicyWindowTitleCenter {
      height: calc(
        var(--hig-titlebar-height-utility) - var(--window-border-size) * 2
      );
      margin: 0 var(--window-padding-size);
    }
  }
}
```

- [ ] **Step 6: Update the Utility Storybook story to a compact palette**

In `src/SystemFolder/SystemResources/Window/ClassicyWindow.stories.tsx`, the existing `Utility` story is:

```tsx
export const Utility: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="utility"
				appId="storybook.app"
				title="Tools"
				windowType="utility"
				zoomable={false}
				initialSize={[180, 220]}
				initialPosition={[140, 90]}
			>
				<p style={{ padding: "1em" }}>Drag me by any edge of the frame.</p>
			</ClassicyWindow>
		</StoryApp>
	),
};
```

Replace its `render` body with a 2-column icon-button grid echoing `tool-1.png` (the `title="Tools"` prop stays to exercise the no-paint rule):

```tsx
export const Utility: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="utility"
				appId="storybook.app"
				title="Tools"
				windowType="utility"
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
					{["◱", "◇", "✋", "🖌", "🪣", "✏", "▬", "A"].map((glyph) => (
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

- [ ] **Step 7: Run the full window + appearance test suites**

Run: `pnpm test src/SystemFolder/SystemResources/Window/ src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts`
Expected: PASS — no regressions in any `ClassicyWindow*` test or the appearance test.

- [ ] **Step 8: Lint the touched files**

Run: `pnpm exec biome check src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts src/SystemFolder/SystemResources/Window/ClassicyWindow.stories.tsx`
Expected: no errors on these files. (SCSS is not covered by Biome.)

- [ ] **Step 9: Visually verify the compact bar**

Run: `pnpm build:source` (confirm the SCSS compiles with no errors), then `pnpm storybook` and open **Desktop → Window → Utility**.
Expected: the title bar is roughly half the height of the Default story's bar (~11px), shows the crosshatch drag region with small close/collapse control boxes and **no** title text or icon, and the window does not dim when you click elsewhere.

- [ ] **Step 10: Commit**

```bash
git add src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts \
        src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts \
        src/SystemFolder/SystemResources/Window/ClassicyWindow.scss \
        src/SystemFolder/SystemResources/Window/ClassicyWindow.stories.tsx
git commit -m "feat(window): 11px half-height title bar for utility windows"
```

---

## Self-Review

**Spec coverage:**
- R1 (half-height, 11px) → Task 2 Steps 3, 5.
- R2 (no title text / no icon regardless of props) → Task 1 Steps 3 + tests.
- R3 (control boxes shrink, keep bevel) → Task 2 Step 5 (`.classicyWindowControlBox` sizing; bevel inherited).
- R4 (preserve never-dim + drag/collapse/zoom) → existing 3 utility tests kept green (Task 1 Step 4); condition change touches only paint, not handlers; verified in Task 2 Step 9.
- Spec §1 theme var → Task 2 Steps 1–4.
- Spec §4 tests → Task 1 Step 1, Task 2 Step 1.
- Spec §5 Storybook → Task 2 Step 6.
- Acceptance criteria (title still feeds accessible name) → unchanged: `title` prop still passed to analytics/`aria`; only the painted branch is gated.

**Placeholder scan:** none — every code step shows full code and exact commands.

**Type consistency:** `windowType` compared against the literal `"utility"` (matches the `"document" | "utility"` union). `getThemeVars` returns a string map; test reads `vars["--hig-titlebar-height-utility"]` as a string (`"11px"`), matching `intToPx(11)`. CSS var name is spelled `--hig-titlebar-height-utility` identically in the TS definition, the test, and all three SCSS usages.
