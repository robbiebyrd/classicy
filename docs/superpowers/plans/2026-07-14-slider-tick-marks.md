# ClassicySlider Tick Marks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional, off-by-default tick marks below the ClassicySlider track, with a density-clamped interval API and opt-in snapping.

**Architecture:** A pure exported helper `computeSliderTicks` converts `tickInterval`/`min`/`max` into percentage positions plus a snap step. The component wraps its `<input type="range">` in a column stack and renders an `aria-hidden` tick rail beneath it, inset by half the thumb width so percentage positions align with the thumb's travel. Tick positions flow to CSS through a custom property (`--classicy-tick-left`) — never raw inline styles, per this codebase's no-inline-styles rule.

**Tech Stack:** React 18 + TypeScript (tabs, biome), SCSS with theme CSS variables, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-14-slider-tick-marks-design.md`

## Global Constraints

- No CSS properties in inline `style` attributes — components may set only CSS custom properties inline; SCSS consumes them (project convention).
- All tick geometry/colors via theme variables: `--window-border-size`, `--window-padding-size`, `--color-black`.
- Density clamp: effective interval = `max(tickInterval, (max − min) / 50)` — at most one tick per 2% of range; endpoints included (0–100 clamped ⇒ 51 ticks).
- `tickInterval` undefined ⇒ DOM identical to the current component (no wrapper, no rail).
- Library source uses tab indentation; run `pnpm exec biome check <files>` (full `pnpm lint` fails on unrelated pre-existing errors).
- Tests run with `pnpm vitest run src/SystemFolder/SystemResources/Slider/ClassicySlider.test.tsx`.

---

### Task 1: `computeSliderTicks` helper

**Files:**
- Modify: `src/SystemFolder/SystemResources/Slider/ClassicySlider.tsx` (add exported helper above the component)
- Test: `src/SystemFolder/SystemResources/Slider/ClassicySlider.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `computeSliderTicks(tickInterval: number | "center" | undefined, min: number, max: number): ClassicySliderTicks` where `ClassicySliderTicks = { positions: number[]; snapStep?: number }`. `positions` are percentages 0–100; `snapStep` is the density-clamped interval in value units, present only for valid numeric `tickInterval`. Tasks 2 and 3 rely on these exact names.

- [ ] **Step 1: Write the failing tests**

Append to `ClassicySlider.test.tsx` (add `computeSliderTicks` to the existing import from the component module):

```tsx
import {
	ClassicySlider,
	computeSliderTicks,
} from "@/SystemFolder/SystemResources/Slider/ClassicySlider";
```

```tsx
describe("computeSliderTicks", () => {
	it("returns no positions when tickInterval is undefined", () => {
		expect(computeSliderTicks(undefined, 0, 100).positions).toEqual([]);
	});

	it("returns a single 50% position for 'center'", () => {
		const ticks = computeSliderTicks("center", 0, 100);
		expect(ticks.positions).toEqual([50]);
		expect(ticks.snapStep).toBeUndefined();
	});

	it("places ticks every interval including on-grid endpoints", () => {
		const ticks = computeSliderTicks(25, 0, 100);
		expect(ticks.positions).toEqual([0, 25, 50, 75, 100]);
		expect(ticks.snapStep).toBe(25);
	});

	it("omits max when it is off-grid", () => {
		expect(computeSliderTicks(30, 0, 100).positions).toEqual([0, 30, 60, 90]);
	});

	it("respects a non-zero min", () => {
		expect(computeSliderTicks(30, 10, 70).positions).toEqual([0, 50, 100]);
	});

	it("clamps density to one tick per 2% of range", () => {
		const ticks = computeSliderTicks(0.5, 0, 100);
		expect(ticks.positions).toHaveLength(51);
		expect(ticks.snapStep).toBe(2);
	});

	it("returns no positions for zero, negative, or NaN intervals", () => {
		expect(computeSliderTicks(0, 0, 100).positions).toEqual([]);
		expect(computeSliderTicks(-5, 0, 100).positions).toEqual([]);
		expect(computeSliderTicks(Number.NaN, 0, 100).positions).toEqual([]);
	});

	it("returns no positions when max <= min", () => {
		expect(computeSliderTicks(10, 100, 100).positions).toEqual([]);
		expect(computeSliderTicks("center", 5, 1).positions).toEqual([]);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Slider/ClassicySlider.test.tsx`
Expected: FAIL — `computeSliderTicks` is not exported.

- [ ] **Step 3: Implement the helper**

In `ClassicySlider.tsx`, after the imports and before `ClassicySliderProps`:

```tsx
export interface ClassicySliderTicks {
	/** Tick positions as percentages (0–100) along the thumb-travel axis. */
	positions: number[];
	/** Density-clamped interval in value units; only set for numeric tickInterval. */
	snapStep?: number;
}

// At most one tick per 2% of the value range (≤ 51 marks, endpoints included).
const MAX_TICKS_PER_RANGE = 50;

export const computeSliderTicks = (
	tickInterval: number | "center" | undefined,
	min: number,
	max: number,
): ClassicySliderTicks => {
	const range = max - min;
	if (tickInterval === undefined || range <= 0) return { positions: [] };
	if (tickInterval === "center") return { positions: [50] };
	if (!Number.isFinite(tickInterval) || tickInterval <= 0) {
		return { positions: [] };
	}

	const interval = Math.max(tickInterval, range / MAX_TICKS_PER_RANGE);
	// Index-based loop avoids float drift from repeated addition; the epsilon
	// admits endpoints that land on the grid within rounding error.
	const count = Math.floor(range / interval + 1e-6) + 1;
	const positions = Array.from({ length: count }, (_, k) =>
		Math.min(100, ((k * interval) / range) * 100),
	);
	return { positions, snapStep: interval };
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Slider/ClassicySlider.test.tsx`
Expected: PASS (all existing tests plus the 8 new ones).

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/Slider/ClassicySlider.tsx src/SystemFolder/SystemResources/Slider/ClassicySlider.test.tsx
git commit -m "feat(slider): computeSliderTicks helper with density clamp"
```

---

### Task 2: Tick rail rendering + SCSS

**Files:**
- Modify: `src/SystemFolder/SystemResources/Slider/ClassicySlider.tsx` (props + render)
- Modify: `src/SystemFolder/SystemResources/Slider/ClassicySlider.scss` (append tick styles)
- Test: `src/SystemFolder/SystemResources/Slider/ClassicySlider.test.tsx`

**Interfaces:**
- Consumes: `computeSliderTicks` from Task 1.
- Produces: `tickInterval?: number | "center"` prop; DOM classes `.classicySliderStack`, `.classicySliderTicks`, `.classicySliderTicksTrack`, `.classicySliderTick`, `.classicySliderTicksDisabled`; per-tick CSS variable `--classicy-tick-left`.

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe("ClassicySlider", ...)` block:

```tsx
	it("renders no tick rail when tickInterval is not set", () => {
		const { container } = render(<ClassicySlider id="test" value={5} />);
		expect(container.querySelector(".classicySliderTicks")).toBeNull();
		expect(container.querySelector(".classicySliderStack")).toBeNull();
	});

	it("renders a single centered tick for tickInterval='center'", () => {
		const { container } = render(
			<ClassicySlider id="test" value={5} tickInterval="center" />,
		);
		const ticks = container.querySelectorAll(".classicySliderTick");
		expect(ticks).toHaveLength(1);
		expect(
			(ticks[0] as HTMLElement).style.getPropertyValue("--classicy-tick-left"),
		).toBe("50%");
	});

	it("renders one tick per interval position", () => {
		const { container } = render(
			<ClassicySlider id="test" value={50} min={0} max={100} tickInterval={25} />,
		);
		const ticks = [...container.querySelectorAll(".classicySliderTick")];
		expect(ticks).toHaveLength(5);
		expect(
			ticks.map((t) =>
				(t as HTMLElement).style.getPropertyValue("--classicy-tick-left"),
			),
		).toEqual(["0%", "25%", "50%", "75%", "100%"]);
	});

	it("hides the tick rail from assistive technology", () => {
		const { container } = render(
			<ClassicySlider id="test" value={5} tickInterval={25} />,
		);
		expect(
			container.querySelector(".classicySliderTicks"),
		).toHaveAttribute("aria-hidden", "true");
	});

	it("dims the tick rail when disabled", () => {
		const { container } = render(
			<ClassicySlider id="test" value={5} tickInterval={25} disabled={true} />,
		);
		expect(container.querySelector(".classicySliderTicks")).toHaveClass(
			"classicySliderTicksDisabled",
		);
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Slider/ClassicySlider.test.tsx`
Expected: FAIL — unknown prop renders nothing; `.classicySliderTick` not found.

- [ ] **Step 3: Implement the rendering**

In `ClassicySlider.tsx`:

1. Add `CSSProperties` to the react type import:

```tsx
import type {
	ChangeEventHandler,
	CSSProperties,
	FC as FunctionalComponent,
	SyntheticEvent,
} from "react";
```

2. Add the prop to `ClassicySliderProps` (after `onCommitFunc`):

```tsx
	/**
	 * Draws tick marks under the track. `"center"` renders a single tick at the
	 * midpoint. A number renders a tick every `tickInterval` value-units
	 * starting at `min`, capped at one tick per 2% of the range. Omit for no
	 * ticks (default).
	 */
	tickInterval?: number | "center";
```

3. Destructure `tickInterval` in the component parameters (after `onCommitFunc`).

4. Replace the `const slider = (...)` block with:

```tsx
	const ticks = computeSliderTicks(tickInterval, min, max);

	const rangeInput = (
		<input
			ref={inputRef}
			id={id}
			type="range"
			aria-label={ariaLabel}
			className={classNames(
				"classicySlider",
				highlighted && "classicySliderHighlighted",
				disabled && "classicySliderDisabled",
			)}
			defaultValue={value}
			min={min}
			max={max}
			step={step}
			disabled={disabled}
			onChange={onChangeFunc}
			onPointerUp={onCommitFunc ? handleCommit : undefined}
			onKeyUp={onCommitFunc ? handleCommit : undefined}
		/>
	);

	const slider = (
		<div className="classicySliderTrackGroup">
			{ticks.positions.length > 0 ? (
				<div className="classicySliderStack">
					{rangeInput}
					<div
						aria-hidden="true"
						className={classNames(
							"classicySliderTicks",
							disabled && "classicySliderTicksDisabled",
						)}
					>
						<div className="classicySliderTicksTrack">
							{ticks.positions.map((pos) => (
								<span
									key={pos}
									className="classicySliderTick"
									style={
										{ "--classicy-tick-left": `${pos}%` } as CSSProperties
									}
								/>
							))}
						</div>
					</div>
				</div>
			) : (
				rangeInput
			)}
			<span
				className={classNames("classicySliderValue", sizeClassMap[labelSize])}
			>
				{valueLabel !== undefined ? valueLabel : value}
			</span>
		</div>
	);
```

5. Append to `ClassicySlider.scss`:

```scss
// ─── Tick marks ───────────────────────────────────────────────────────────────

// Column wrapper so the tick rail sits directly under the input; takes the
// input's place in the track-group row.
.classicySliderStack {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

// The rail is inset by half the thumb width on each side: a native range
// thumb's center travels from thumb-width/2 to width − thumb-width/2, so
// percentage positions inside the inner track land exactly under the thumb's
// point.
.classicySliderTicks {
  padding: 0 calc(#{$thumb-w} / 2);
  height: calc(var(--window-padding-size) * 0.75 + var(--window-border-size));
}

.classicySliderTicksTrack {
  position: relative;
  height: 100%;
}

.classicySliderTick {
  position: absolute;
  left: var(--classicy-tick-left);
  top: var(--window-border-size);
  width: var(--window-border-size);
  height: calc(var(--window-padding-size) * 0.75);
  background: var(--color-black);
  transform: translateX(-50%);
}

.classicySliderTicksDisabled {
  filter: contrast(0.5);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Slider/ClassicySlider.test.tsx`
Expected: PASS.

- [ ] **Step 5: Lint the touched files**

Run: `pnpm exec biome check src/SystemFolder/SystemResources/Slider/ClassicySlider.tsx src/SystemFolder/SystemResources/Slider/ClassicySlider.test.tsx`
Expected: no NEW errors (the repo has pre-existing unrelated diagnostics; compare against `main` if unsure).

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/SystemResources/Slider/
git commit -m "feat(slider): tickInterval prop renders tick rail under track"
```

---

### Task 3: `snapToTicks` prop

**Files:**
- Modify: `src/SystemFolder/SystemResources/Slider/ClassicySlider.tsx`
- Test: `src/SystemFolder/SystemResources/Slider/ClassicySlider.test.tsx`

**Interfaces:**
- Consumes: `ticks.snapStep` from `computeSliderTicks` (Task 1) and `rangeInput` structure (Task 2).
- Produces: `snapToTicks?: boolean` prop; when active, the input's `step` attribute equals the effective tick interval.

- [ ] **Step 1: Write the failing tests**

Append inside `describe("ClassicySlider", ...)`:

```tsx
	it("snaps step to the tick interval when snapToTicks is set", () => {
		const { container } = render(
			<ClassicySlider
				id="test"
				value={50}
				min={0}
				max={100}
				step={1}
				tickInterval={25}
				snapToTicks={true}
			/>,
		);
		const input = container.querySelector(
			'input[type="range"]',
		) as HTMLInputElement;
		expect(input).toHaveAttribute("step", "25");
	});

	it("snaps to the density-clamped interval, not the raw one", () => {
		const { container } = render(
			<ClassicySlider
				id="test"
				value={50}
				min={0}
				max={100}
				tickInterval={0.5}
				snapToTicks={true}
			/>,
		);
		const input = container.querySelector(
			'input[type="range"]',
		) as HTMLInputElement;
		expect(input).toHaveAttribute("step", "2");
	});

	it("ignores snapToTicks for 'center' and missing tickInterval", () => {
		const centered = render(
			<ClassicySlider
				id="t1"
				value={50}
				step={5}
				tickInterval="center"
				snapToTicks={true}
			/>,
		);
		expect(
			centered.container.querySelector('input[type="range"]'),
		).toHaveAttribute("step", "5");

		const none = render(
			<ClassicySlider id="t2" value={50} step={5} snapToTicks={true} />,
		);
		expect(
			none.container.querySelector('input[type="range"]'),
		).toHaveAttribute("step", "5");
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Slider/ClassicySlider.test.tsx`
Expected: FAIL — step stays "1"/"5".

- [ ] **Step 3: Implement snapping**

In `ClassicySlider.tsx`:

1. Add the prop to `ClassicySliderProps` (after `tickInterval`):

```tsx
	/**
	 * When true and `tickInterval` is a number, the thumb snaps to tick
	 * positions: the input's `step` becomes the effective tick interval,
	 * overriding `step`. Ignored when `tickInterval` is absent or `"center"`.
	 */
	snapToTicks?: boolean;
```

2. Destructure `snapToTicks = false` in the component parameters.

3. After the `const ticks = ...` line, add:

```tsx
	const effectiveStep =
		snapToTicks && ticks.snapStep !== undefined ? ticks.snapStep : step;
```

4. In `rangeInput`, change `step={step}` to `step={effectiveStep}`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Slider/ClassicySlider.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/Slider/
git commit -m "feat(slider): snapToTicks constrains step to tick interval"
```

---

### Task 4: Example-app demo + full verification

**Files:**
- Modify: `example/src/Applications/Demo/Demo.tsx` (Inputs tab, after the Checkboxes `ClassicyControlGroup` that ends near line 164; add `ClassicySlider` to the `classicy` import block at the top)

**Interfaces:**
- Consumes: `tickInterval` / `snapToTicks` props from Tasks 2–3.
- Produces: a visible demo used for browser verification; nothing downstream.

- [ ] **Step 1: Add the demo slider**

Add `ClassicySlider` to the import list from `"classicy"` at the top of `Demo.tsx`, then after the Checkboxes `ClassicyControlGroup` inside the Inputs tab add:

```tsx
					<ClassicyControlGroup label={"Slider with Tick Marks"}>
						<ClassicySlider
							id={"demo_tick_slider"}
							labelTitle={"Snappy"}
							value={50}
							min={0}
							max={100}
							tickInterval={10}
							snapToTicks={true}
						/>
						<ClassicySlider
							id={"demo_center_tick_slider"}
							labelTitle={"Centered"}
							value={50}
							min={0}
							max={100}
							tickInterval={"center"}
						/>
					</ClassicyControlGroup>
```

- [ ] **Step 2: Full test suite + build**

Run: `pnpm test` — Expected: all tests pass (899 pre-existing + 16 new). Known flake: `ClassicyAppManagerContext.test.tsx` "seeds the store" can time out under load; re-run in isolation if it does.
Run: `pnpm build:source` — Expected: `✓ built` with no errors.

- [ ] **Step 3: Browser verification**

```bash
cd example && pnpm dev   # background; note the port (5173/5174)
```

With Playwright against the dev server:
1. Open the Demo window's Inputs tab; screenshot the tick sliders.
2. Alignment check via `browser_evaluate`: the tick track's left edge must sit half a thumb-width right of the input's left edge —

```js
() => {
  const input = document.getElementById('demo_tick_slider');
  const track = input.closest('.classicySliderStack').querySelector('.classicySliderTicksTrack');
  const thumbW = 2 * parseFloat(getComputedStyle(document.getElementById('classicyDesktop')).getPropertyValue('--window-control-size'));
  return Math.abs(track.getBoundingClientRect().left - (input.getBoundingClientRect().left + thumbW / 2)) < 1;
}
```

Expected: `true`. Also verify 11 ticks on the snappy slider, 1 on the centered one, and that dragging the snappy slider lands only on multiples of 10 (read `input.value` after a drag).

- [ ] **Step 4: Commit**

```bash
git add example/src/Applications/Demo/Demo.tsx
git commit -m "feat(example): demo sliders with tick marks"
```
