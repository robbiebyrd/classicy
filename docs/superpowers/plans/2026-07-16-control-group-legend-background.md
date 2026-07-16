# ClassicyControlGroup Legend Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the ClassicyControlGroup legend a background color (default `var(--color-system-03)`, overridable via a new `backgroundColor` prop) so the fieldset's groove border no longer shows through under the label text.

**Architecture:** The legend is absolutely positioned over the fieldset border (deliberate — avoids engine-specific native legend layout). Painting its background the same color as the surface behind it masks the border. The color comes from a new `backgroundColor?: string` prop applied as an inline style, defaulting to the standard window content color; SCSS adds horizontal padding so the swatch extends past the text, with the `left` offset reduced to keep text alignment unchanged.

**Tech Stack:** React 18 + TypeScript, SCSS (co-located), Vitest + Testing Library, Storybook.

**Spec:** `docs/superpowers/specs/2026-07-16-control-group-legend-background-design.md`

## Global Constraints

- Default background must be exactly `var(--color-system-03)`.
- No changes to fieldset border rendering or the legend's absolute-positioning strategy.
- All styling in the co-located SCSS file except the color itself, which is the prop's inline style.
- Run tests from the repo root with `pnpm test` (Vitest).

---

### Task 1: `backgroundColor` prop with theme default

**Files:**
- Modify: `src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.tsx`
- Modify: `src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.scss:30-44`
- Test: `src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.test.tsx`

**Interfaces:**
- Consumes: existing `ClassicyControlGroupProps` (`label`, `columns`, `layout`, `children`).
- Produces: `ClassicyControlGroupProps.backgroundColor?: string` (any CSS color value; default `"var(--color-system-03)"`). Task 2's story uses this prop name.

- [ ] **Step 1: Write the failing tests**

Append to the `describe("ClassicyControlGroup")` block in `src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.test.tsx`:

```tsx
	it("gives the legend the default theme background color", () => {
		render(
			<ClassicyControlGroup label="Settings">{null}</ClassicyControlGroup>,
		);
		const legend = screen.getByText("Settings") as HTMLElement;
		expect(legend.style.backgroundColor).toBe("var(--color-system-03)");
	});

	it("gives the legend a custom background color when the prop is provided", () => {
		render(
			<ClassicyControlGroup label="Settings" backgroundColor="#ffffff">
				{null}
			</ClassicyControlGroup>,
		);
		const legend = screen.getByText("Settings") as HTMLElement;
		expect(legend.style.backgroundColor).toBe("rgb(255, 255, 255)");
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.test.tsx`
Expected: the two new tests FAIL (legend has no inline background), the existing seven PASS. If the custom-color assertion fails only on the serialized value (jsdom may report `#ffffff` unnormalized), adjust the expected string to what jsdom reports — the assertion's purpose is "the prop value lands on the legend".

- [ ] **Step 3: Implement the prop**

Replace the contents of `src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.tsx` with:

```tsx
import "./ClassicyControlGroup.scss";
import classNames from "classnames";
import type { FC as FunctionalComponent, ReactNode } from "react";

type ClassicyControlGroupProps = {
	label: string;
	columns?: boolean;
	layout?: "default" | "form";
	backgroundColor?: string;
	children: ReactNode;
};

export const ClassicyControlGroup: FunctionalComponent<
	ClassicyControlGroupProps
> = ({
	label = "",
	columns = false,
	layout = "default",
	backgroundColor = "var(--color-system-03)",
	children,
}) => {
	const contentClass = classNames(
		columns && "classicyControlGroupContentColumns",
		layout === "form" && "classicyControlGroupFormContent",
	);
	return (
		<fieldset
			className={classNames(
				"classicyControlGroupFieldset",
				label !== "" && "classicyControlGroupFieldsetLabeled",
				columns && "classicyControlGroupFieldsetColumns",
			)}
		>
			{label !== "" && (
				<legend
					className={"classicyControlGroupLegend"}
					style={{ backgroundColor }}
				>
					{label}
				</legend>
			)}
			<div className={contentClass || undefined}>{children}</div>
		</fieldset>
	);
};
```

- [ ] **Step 4: Add the masking padding in SCSS**

In `src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.scss`, update `.classicyControlGroupLegend`: change `padding: 0;` to horizontal padding and reduce `left` by the same amount so the text keeps its current alignment. The block becomes:

```scss
.classicyControlGroupLegend {
  font-family: var(--ui-font);
  font-size: calc(var(--ui-font-size) * 0.75);
  line-height: 1.4;
  margin: 0;
  // Horizontal padding extends the painted background slightly past the
  // text so it masks the groove border on both sides.
  padding: 0 calc(var(--window-padding-size) / 2);

  // Absolutely positioned so the browser does not treat this as a "rendered
  // legend" and never takes the engine-specific legend layout path.
  position: absolute;
  top: calc(var(--window-border-size) * -1); // center of the border
  left: calc(var(--window-padding-size) * 1.5); // padding keeps text aligned with the fieldset's horizontal padding
  transform: translateY(-50%);
  white-space: nowrap;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test -- src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.test.tsx`
Expected: all 9 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.tsx src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.scss src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.test.tsx
git commit -m "feat: legend backgroundColor prop on ClassicyControlGroup"
```

---

### Task 2: Storybook variant for custom background

**Files:**
- Modify: `src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.stories.tsx`

**Interfaces:**
- Consumes: `backgroundColor?: string` prop from Task 1.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the story**

Append to `src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.stories.tsx`:

```tsx
export const CustomBackground: Story = {
	args: {
		label: "On a White Surface",
		backgroundColor: "#ffffff",
		children: (
			<ClassicyCheckbox id="cg-custom" checked={true} label="Enabled" />
		),
	},
	decorators: [
		(Story) => (
			<div style={{ background: "#ffffff", padding: "16px" }}>
				<Story />
			</div>
		),
	],
};
```

Note: the inline style on the decorator `<div>` is story scaffolding (simulating a non-standard surface), not component styling — the no-inline-styles rule applies to components, and existing stories use decorators this way.

- [ ] **Step 2: Verify the stories compile and render**

Run: `pnpm build:source`
Expected: TypeScript build succeeds with no errors (confirms the story's args type-check against the new prop). Optionally run `pnpm storybook` and check Controls/ControlGroup → CustomBackground renders the legend with a white swatch over the border.

- [ ] **Step 3: Commit**

```bash
git add src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.stories.tsx
git commit -m "docs: storybook variant for ClassicyControlGroup custom legend background"
```

---

## Verification

After both tasks: `pnpm test` (full suite) and `pnpm lint` from the repo root should pass. Visually confirm in Storybook (`pnpm storybook`) that the Default story's legend no longer shows the groove border under the text in a few different themes.
