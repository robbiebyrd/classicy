# ClassicyProgressBar `labelAlign` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `labelAlign` prop (`'left' | 'center' | 'right'`, default `'left'`) to `ClassicyProgressBar` that aligns the label over the bar, and use it to center the label on the startup screen.

**Architecture:** The alignment vocabulary (type, class-name helper, SCSS rules) lives in the shared `ClassicyControlLabel` module, mirroring the existing `labelPositionClass` pattern. `ClassicyProgressBar` composes the alignment class onto its existing label wrapper. `ClassicyStartupScreen` adopts `labelAlign="center"`.

**Tech Stack:** React 19 + TypeScript, SCSS co-located with components, Vitest + Testing Library, Storybook.

**Spec:** `docs/superpowers/specs/2026-07-15-progressbar-label-align-design.md`

## Global Constraints

- Default `labelAlign` is `'left'` and MUST NOT change existing rendering: the `left` class emits no CSS rule (flex-start is the flexbox default).
- Alignment uses `justify-content` on `.classicyControlLabelHolder` (never `text-align`), so icon + text move as one unit.
- No inline styles — all presentation in the co-located SCSS files.
- Never edit `index.ts` barrel files by hand (barrelsby regenerates them; the helper is exported from `ClassicyControlLabel.tsx`, which is already barreled).
- Run tests with `pnpm test` (vitest run) from the repo root; scope with a file path.
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Shared `labelAlignClass` helper and SCSS rules in ClassicyControlLabel

**Files:**
- Modify: `src/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.tsx` (after `labelPositionClass`, ~line 23)
- Modify: `src/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss` (append at end)
- Test: `src/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `export type ClassicyLabelAlign = 'left' | 'center' | 'right'` and `export function labelAlignClass(align: ClassicyLabelAlign): string` returning `'classicyLabelAlignLeft' | 'classicyLabelAlignCenter' | 'classicyLabelAlignRight'`. Task 2 imports both from `@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel`.

- [ ] **Step 1: Write the failing tests**

Add to the top-level `describe` block in `ClassicyControlLabel.test.tsx` (import `labelAlignClass` alongside `ClassicyControlLabel` in the existing import):

```tsx
import {
	ClassicyControlLabel,
	labelAlignClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
```

```tsx
describe("labelAlignClass", () => {
	it("maps left to classicyLabelAlignLeft", () => {
		expect(labelAlignClass("left")).toBe("classicyLabelAlignLeft");
	});

	it("maps center to classicyLabelAlignCenter", () => {
		expect(labelAlignClass("center")).toBe("classicyLabelAlignCenter");
	});

	it("maps right to classicyLabelAlignRight", () => {
		expect(labelAlignClass("right")).toBe("classicyLabelAlignRight");
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.test.tsx`
Expected: FAIL — `labelAlignClass` is not exported.

- [ ] **Step 3: Implement the helper**

In `ClassicyControlLabel.tsx`, directly below the `labelPositionClass` function (after line 23):

```tsx
export type ClassicyLabelAlign = "left" | "center" | "right";

export function labelAlignClass(align: ClassicyLabelAlign): string {
	const map: Record<ClassicyLabelAlign, string> = {
		left: "classicyLabelAlignLeft",
		center: "classicyLabelAlignCenter",
		right: "classicyLabelAlignRight",
	};
	return map[align];
}
```

- [ ] **Step 4: Add the SCSS rules**

Append to `ClassicyControlLabel.scss` before the `@media` block (note: no rule for `classicyLabelAlignLeft` — flex-start is the default):

```scss
.classicyLabelAlignCenter > .classicyControlLabelHolder {
  justify-content: center;
}

.classicyLabelAlignRight > .classicyControlLabelHolder {
  justify-content: flex-end;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test src/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.test.tsx`
Expected: PASS (all existing + 3 new).

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/SystemResources/ControlLabel/
git commit -m "feat: add shared labelAlignClass helper to ClassicyControlLabel

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `labelAlign` prop on ClassicyProgressBar + story

**Files:**
- Modify: `src/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.tsx`
- Modify: `src/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.stories.tsx`
- Test: `src/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.test.tsx`

**Interfaces:**
- Consumes: `ClassicyLabelAlign`, `labelAlignClass` from `@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel` (Task 1).
- Produces: `ClassicyProgressBar` accepts `labelAlign?: ClassicyLabelAlign` (default `'left'`). Task 3 relies on `<ClassicyProgressBar labelAlign="center" … />`.

- [ ] **Step 1: Write the failing tests**

Add to the `describe("ClassicyProgressBar")` block in `ClassicyProgressBar.test.tsx`:

```tsx
	it("applies classicyLabelAlignLeft on the label wrapper by default", () => {
		const { container } = render(
			<ClassicyProgressBar label="Loading" labelPosition="above" />,
		);
		const wrapper = container.firstChild as Element;
		expect(wrapper).toHaveClass("classicyLabelAbove");
		expect(wrapper).toHaveClass("classicyLabelAlignLeft");
	});

	it("applies classicyLabelAlignCenter when labelAlign=center", () => {
		const { container } = render(
			<ClassicyProgressBar label="Loading" labelAlign="center" />,
		);
		expect(container.firstChild as Element).toHaveClass(
			"classicyLabelAlignCenter",
		);
	});

	it("applies classicyLabelAlignRight when labelAlign=right", () => {
		const { container } = render(
			<ClassicyProgressBar label="Loading" labelAlign="right" />,
		);
		expect(container.firstChild as Element).toHaveClass(
			"classicyLabelAlignRight",
		);
	});

	it("renders no label wrapper when there is no label, even with labelAlign", () => {
		const { container } = render(<ClassicyProgressBar labelAlign="center" />);
		const wrapper = container.firstChild as Element;
		expect(wrapper).toHaveClass("classicyProgress");
		expect(wrapper).not.toHaveClass("classicyLabelAlignCenter");
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.test.tsx`
Expected: FAIL — the three alignment-class assertions fail (`labelAlign` prop does not exist / class missing). The no-label test may already pass; that is fine.

- [ ] **Step 3: Implement the prop**

In `ClassicyProgressBar.tsx`, extend the import from ControlLabel and the props interface, and compose the class on the wrapper. Full updated file:

```tsx
import "./ClassicyProgressBar.scss";
import classNames from "classnames";
import type { FC as FunctionalComponent } from "react";
import {
	type ClassicyLabelAlign,
	ClassicyControlLabel,
	type ClassicyLabelPosition,
	labelAlignClass,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";

interface ClassicyProgressProps {
	value?: number;
	max?: number;
	indeterminate?: boolean;
	label?: string;
	labelPosition?: ClassicyLabelPosition;
	labelAlign?: ClassicyLabelAlign;
}

export const ClassicyProgressBar: FunctionalComponent<
	ClassicyProgressProps
> = ({
	max = 100,
	value = 0,
	indeterminate,
	label,
	labelPosition = "above",
	labelAlign = "left",
}) => {
	const effectiveMax = indeterminate ? 100 : max;
	const effectiveValue = indeterminate ? 100 : value;

	const bar = (
		<div
			className={classNames(
				"classicyProgress",
				indeterminate
					? "classicyProgressIndeterminate"
					: "classicyProgressDeterminate",
			)}
		>
			<progress max={effectiveMax} value={effectiveValue} />
		</div>
	);

	if (!label) return bar;

	return (
		<div
			className={classNames(
				labelPositionClass(labelPosition),
				labelAlignClass(labelAlign),
			)}
		>
			<ClassicyControlLabel label={label} />
			{bar}
		</div>
	);
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.test.tsx`
Expected: PASS (all existing + 4 new).

- [ ] **Step 5: Add the story**

In `ClassicyProgressBar.stories.tsx`, add an `argTypes` entry on `meta` and a new story:

```tsx
const meta = {
	title: "Controls/ProgressBar",
	component: ClassicyProgressBar,
	argTypes: {
		labelAlign: {
			control: "select",
			options: ["left", "center", "right"],
		},
	},
} satisfies Meta<typeof ClassicyProgressBar>;
```

```tsx
export const CenteredLabel: Story = {
	args: { value: 33, label: "Copying files…", labelAlign: "center" },
};
```

- [ ] **Step 6: Run the full test suite**

Run: `pnpm test`
Expected: PASS, no regressions.

- [ ] **Step 7: Commit**

```bash
git add src/SystemFolder/SystemResources/ProgressBar/
git commit -m "feat: add labelAlign prop to ClassicyProgressBar

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Center the startup screen's progress label

**Files:**
- Modify: `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.tsx:60-65`
- Test: `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.test.tsx`

**Interfaces:**
- Consumes: `ClassicyProgressBar` `labelAlign` prop (Task 2).
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing test**

Add to the existing `describe` block in `ClassicyStartupScreen.test.tsx` — the file's existing `beforeEach` (sessionStorage.clear, fake timers) and module mocks already make a bare `render(<ClassicyStartupScreen />)` work:

```tsx
	it("centers the Starting Up label over the progress bar", () => {
		render(<ClassicyStartupScreen />);
		const label = screen.getByText("Starting Up…");
		expect(label.closest(".classicyLabelAlignCenter")).not.toBeNull();
	});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.test.tsx`
Expected: FAIL — `closest(".classicyLabelAlignCenter")` returns null.

- [ ] **Step 3: Pass labelAlign to the progress bar**

In `ClassicyStartupScreen.tsx`, update the `ClassicyProgressBar` usage:

```tsx
					<ClassicyProgressBar
						value={progress}
						max={100}
						label="Starting Up…"
						labelPosition="above"
						labelAlign="center"
					/>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the full test suite and lint**

Run: `pnpm test && pnpm lint`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.tsx src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.test.tsx
git commit -m "feat: center startup screen progress label via labelAlign

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
