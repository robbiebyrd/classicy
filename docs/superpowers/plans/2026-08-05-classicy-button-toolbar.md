# ClassicyButtonToolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Mac OS 8 control bar that packs bevel buttons flush together in separator-divided groups.

**Architecture:** Two compound components. `ClassicyButtonToolbar` is a flex row that interleaves a vertical `ClassicySeparator` between its children and publishes a context; `ClassicyButtonToolbarGroup` is a zero-gap flex run. `ClassicyBevelButton` reads the context to default icon-only children to square, with explicit props always winning.

**Tech Stack:** React 19, TypeScript, SCSS, Vitest + Testing Library, Storybook, Biome.

**Spec:** `docs/superpowers/specs/2026-08-05-classicy-button-toolbar-design.md`
**Issue:** #170

## Global Constraints

- Package manager is **pnpm**. Full suite: `pnpm test`. Single file: `pnpm vitest run <path>`.
- `pnpm test` (vitest) **does not type-check**. Run `pnpm build:source` before considering the work done.
- Lint with `biome check <specific paths>`. **Do not run `pnpm lint:fix` repo-wide** — it reformats ~70 untouched files.
- Tabs for indentation.
- **All styling is SCSS co-located with the component. No Tailwind, no inline styles for layout or presentation.** Use existing theme CSS variables; introduce no new palette entries.
- Do not edit `index.ts` barrel files — `pnpm build:source` regenerates them via barrelsby. A new component directory is picked up automatically.
- A `ClassicyBevelButton` used outside a toolbar must behave exactly as it does today.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbarContext.ts` | The context object alone, so the button can import it without pulling in the toolbar component (avoids a circular import) | Create |
| `src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.tsx` | Toolbar + Group components | Create |
| `src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.scss` | Layout | Create |
| `src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.test.tsx` | Tests | Create |
| `src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.stories.tsx` | Showcase | Create |
| `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx` | Square default | Modify (~:95 area, `:152`) |

**Why the context lives in its own file:** `ClassicyBevelButton` must import the context, and `ClassicyButtonToolbar.stories.tsx` imports `ClassicyBevelButton`. Putting the context in the component file would create an import cycle between the toolbar and the button.

---

### Task 1: Toolbar and group components with auto-interleaved separators

**Files:**
- Create: `src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbarContext.ts`
- Create: `src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.tsx`
- Create: `src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.scss`
- Create: `src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.test.tsx`

**Interfaces:**
- Produces: `ClassicyButtonToolbarContext: React.Context<boolean>` (default `false`) — Task 2 consumes it.
- Produces: `ClassicyButtonToolbar: FC<{ className?: string; children: ReactNode }>`.
- Produces: `ClassicyButtonToolbarGroup: FC<{ className?: string; children: ReactNode }>`.
- Consumes: `ClassicySeparator` with `orientation="vertical"`.

**Background the implementer needs:**

`ClassicySeparator` renders `<hr role="separator">` with `aria-orientation`, and `.classicySeparatorVertical` **already carries its own horizontal margins** (`margin: 0 calc(var(--window-padding-size) / 2)`) plus `align-self: stretch` and `min-height: var(--window-control-size)`. **Do not add separator spacing in the toolbar SCSS** — it is already handled, and doubling it will look wrong.

Interleave between *rendered children*, not by appending a divider inside each group. That is what makes "no leading divider, no trailing divider, none at all for a single group" fall out without special-casing.

`Children.toArray()` strips `null`/`undefined`/booleans and assigns stable keys, so a conditionally-rendered group (`{cond && <Group/>}`) does not produce a stray separator.

- [ ] **Step 1: Write the failing tests**

Create `src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render } from "@/__tests__/test-utils";
import {
	ClassicyButtonToolbar,
	ClassicyButtonToolbarGroup,
} from "@/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar";

const separators = (container: HTMLElement) =>
	container.querySelectorAll(".classicySeparatorVertical");

describe("ClassicyButtonToolbar", () => {
	it("renders no separator for a single group", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<button type="button">A</button>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(separators(container)).toHaveLength(0);
	});

	it("renders one separator between two groups", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<button type="button">A</button>
				</ClassicyButtonToolbarGroup>
				<ClassicyButtonToolbarGroup>
					<button type="button">B</button>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(separators(container)).toHaveLength(1);
	});

	it("renders N-1 separators for N groups", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<button type="button">A</button>
				</ClassicyButtonToolbarGroup>
				<ClassicyButtonToolbarGroup>
					<button type="button">B</button>
				</ClassicyButtonToolbarGroup>
				<ClassicyButtonToolbarGroup>
					<button type="button">C</button>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(separators(container)).toHaveLength(2);
	});

	it("renders nothing but the container when empty", () => {
		const { container } = render(<ClassicyButtonToolbar>{null}</ClassicyButtonToolbar>);
		expect(container.querySelector(".classicyButtonToolbar")).toBeInTheDocument();
		expect(separators(container)).toHaveLength(0);
	});

	it("ignores a falsy conditional group when counting separators", () => {
		const show = false;
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<button type="button">A</button>
				</ClassicyButtonToolbarGroup>
				{show && (
					<ClassicyButtonToolbarGroup>
						<button type="button">B</button>
					</ClassicyButtonToolbarGroup>
				)}
			</ClassicyButtonToolbar>,
		);
		expect(separators(container)).toHaveLength(0);
	});

	it("renders a non-button child inside a group without error", () => {
		const { getByText } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<span>label</span>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(getByText("label")).toBeInTheDocument();
	});

	it("merges an extra className onto the toolbar", () => {
		const { container } = render(
			<ClassicyButtonToolbar className="extraBar">
				<ClassicyButtonToolbarGroup>
					<button type="button">A</button>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(container.querySelector(".classicyButtonToolbar")).toHaveClass(
			"extraBar",
		);
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.test.tsx`

Expected: FAIL — the module does not exist yet.

- [ ] **Step 3: Create the context**

Create `src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbarContext.ts`:

```ts
import { createContext } from "react";

/**
 * True while rendering inside a {@link ClassicyButtonToolbar}. Controls read it
 * to pick toolbar-appropriate defaults — an icon-only `ClassicyBevelButton`
 * goes square — without the toolbar having to clone or inspect its children.
 *
 * It lives in its own module so `ClassicyBevelButton` can consume it without
 * importing the toolbar component, which would be a cycle.
 */
export const ClassicyButtonToolbarContext = createContext<boolean>(false);
```

- [ ] **Step 4: Create the components**

Create `src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.tsx`:

```tsx
import "./ClassicyButtonToolbar.scss";
import classNames from "classnames";
import {
	Children,
	type FC as FunctionalComponent,
	Fragment,
	type ReactNode,
} from "react";
import { ClassicyButtonToolbarContext } from "@/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbarContext";
import { ClassicySeparator } from "@/SystemFolder/SystemResources/Separator/ClassicySeparator";

export type ClassicyButtonToolbarProps = {
	/** Extra class names merged onto the toolbar element. */
	className?: string;
	children: ReactNode;
};

export type ClassicyButtonToolbarGroupProps = {
	/** Extra class names merged onto the group element. */
	className?: string;
	children: ReactNode;
};

/**
 * A run of controls packed flush against each other, with no gaps.
 *
 * Groups are the unit the toolbar counts when placing dividers; a group has no
 * behavior of its own.
 */
export const ClassicyButtonToolbarGroup: FunctionalComponent<
	ClassicyButtonToolbarGroupProps
> = ({ className, children }) => (
	<div className={classNames("classicyButtonToolbarGroup", className)}>
		{children}
	</div>
);

/**
 * A Mac OS 8 control bar: buttons flush together, arranged into groups
 * separated by a vertical engraved divider.
 *
 * Dividers are drawn automatically **between** children — never leading,
 * never trailing, and not at all for a single group — so consumers never place
 * a `ClassicySeparator` by hand.
 *
 * Children are normally `ClassicyButtonToolbarGroup`s, but any element works.
 * A control placed directly in the toolbar is treated as its own group, so it
 * gets dividers on both sides.
 *
 * Inside a toolbar, an icon-only `ClassicyBevelButton` defaults to a square
 * box; a button with text keeps its rectangular shape. Passing `square`
 * explicitly always wins.
 *
 * @example
 * <ClassicyButtonToolbar>
 *     <ClassicyButtonToolbarGroup>
 *         <ClassicyBevelButton icon={back} iconAlt="Back" />
 *         <ClassicyBevelButton icon={fwd} iconAlt="Forward" />
 *     </ClassicyButtonToolbarGroup>
 *     <ClassicyButtonToolbarGroup>
 *         <ClassicyBevelButton icon={zoom} iconAlt="Zoom" />
 *     </ClassicyButtonToolbarGroup>
 * </ClassicyButtonToolbar>
 */
export const ClassicyButtonToolbar: FunctionalComponent<
	ClassicyButtonToolbarProps
> = ({ className, children }) => {
	// toArray drops null/undefined/booleans and assigns stable keys, so a
	// conditionally-rendered group never leaves a stray divider behind.
	const items = Children.toArray(children);
	return (
		<ClassicyButtonToolbarContext.Provider value={true}>
			<div className={classNames("classicyButtonToolbar", className)}>
				{items.map((child, index) => (
					// Interleaving BETWEEN rendered children is what makes the
					// leading/trailing/single-group cases correct without
					// special-casing any of them.
					<Fragment key={`${index}`}>
						{index > 0 && <ClassicySeparator orientation="vertical" />}
						{child}
					</Fragment>
				))}
			</div>
		</ClassicyButtonToolbarContext.Provider>
	);
};
```

If Biome objects to the array-index key, keep it: `Children.toArray` guarantees positional stability here and there is no other identity to key on.

- [ ] **Step 5: Create the stylesheet**

Create `src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.scss`:

```scss
@use '../../ControlPanels/AppearanceManager/styles/appearance';

// A Platinum control bar. The toolbar is the divider-bearing row; each group
// is a flush run of controls. Separator spacing is NOT set here — the vertical
// ClassicySeparator already carries its own margins and stretch behavior.
.classicyButtonToolbar {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: nowrap;
}

.classicyButtonToolbarGroup {
  display: flex;
  flex-direction: row;
  align-items: center;
  // Buttons in a group butt directly against one another (#170).
  gap: 0;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.test.tsx`

Expected: PASS, all seven.

- [ ] **Step 7: Lint and commit**

```bash
pnpm biome check src/SystemFolder/SystemResources/ButtonToolbar/
git add src/SystemFolder/SystemResources/ButtonToolbar/
git commit -m "feat(toolbar): add ClassicyButtonToolbar and Group

A Platinum control bar: flush-packed controls in groups, with vertical
engraved dividers interleaved automatically between groups so consumers
never place separators by hand.

Refs #170"
```

---

### Task 2: Square-by-default for icon-only toolbar buttons

**Files:**
- Modify: `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx`
- Modify: `src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.test.tsx`

**Interfaces:**
- Consumes: `ClassicyButtonToolbarContext` from Task 1.
- Produces: no new exports; `ClassicyBevelButton`'s public props are unchanged.

**Background the implementer needs:**

`square` is destructured at `ClassicyBevelButton.tsx:95` **with no default**, so it stays `undefined` when unset. That is what makes `square ?? derived` able to tell "not specified" from an explicit `false` — do **not** add a default value to the destructuring.

`square` is used in exactly one place, `:152`:

```ts
				square && "classicyBevelButtonSquare",
```

The derivation belongs in the button, not the toolbar: only the button knows whether it has an `icon` and whether it has text children.

- [ ] **Step 1: Write the failing tests**

Append to `src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.test.tsx`. Add the import at the top of the file:

```tsx
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";
```

Then append:

```tsx
describe("ClassicyBevelButton square defaults inside a toolbar", () => {
	const squareButtons = (container: HTMLElement) =>
		container.querySelectorAll(".classicyBevelButtonSquare");

	it("makes an icon-only button square inside a toolbar", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<ClassicyBevelButton icon="/i.png" iconAlt="Back" />
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(squareButtons(container)).toHaveLength(1);
	});

	it("leaves a text button rectangular inside a toolbar", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<ClassicyBevelButton>Open</ClassicyBevelButton>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(squareButtons(container)).toHaveLength(0);
	});

	it("leaves an icon button WITH text rectangular inside a toolbar", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<ClassicyBevelButton icon="/i.png" iconAlt="Back">
						Back
					</ClassicyBevelButton>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(squareButtons(container)).toHaveLength(0);
	});

	it("honors an explicit square={false} on an icon-only toolbar button", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<ClassicyBevelButton icon="/i.png" iconAlt="Back" square={false} />
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(squareButtons(container)).toHaveLength(0);
	});

	it("honors an explicit square on a text toolbar button", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<ClassicyBevelButton square>Go</ClassicyBevelButton>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(squareButtons(container)).toHaveLength(1);
	});

	it("does not make an icon-only button square outside a toolbar", () => {
		const { container } = render(
			<ClassicyBevelButton icon="/i.png" iconAlt="Back" />,
		);
		expect(squareButtons(container)).toHaveLength(0);
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.test.tsx -t "square defaults"`

Expected: the first test FAILS (`expected length 1, got 0`). The others pass already, since nothing is square today.

- [ ] **Step 3: Consume the context in `ClassicyBevelButton`**

Add to the React import at the top of `ClassicyBevelButton.tsx` (it already imports `useEffect`, `useState`):

```ts
	useContext,
```

and add:

```ts
import { ClassicyButtonToolbarContext } from "@/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbarContext";
```

Then in the component body, alongside the other hooks (near `const player = useSoundDispatch();` at ~:105):

```ts
	const inToolbar = useContext(ClassicyButtonToolbarContext);
	// Inside a toolbar an icon-only control takes the square box by default;
	// a control with text keeps its rectangular shape. `square` is destructured
	// with no default, so an explicitly passed value — including false — always
	// wins over the toolbar's preference.
	const isSquare = square ?? (inToolbar && !!icon && !children);
```

- [ ] **Step 4: Use it in the class list**

At `:152`, replace:

```ts
				square && "classicyBevelButtonSquare",
```

with:

```ts
				isSquare && "classicyBevelButtonSquare",
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.test.tsx`

Expected: PASS, all thirteen.

- [ ] **Step 6: Run the full suite and type-check**

Run: `pnpm test && pnpm build:source`

Expected: PASS with no TypeScript errors. Existing `ClassicyBevelButton` tests must be unaffected — outside a toolbar the context default is `false`, so `isSquare` collapses to `square`.

- [ ] **Step 7: Lint and commit**

```bash
pnpm biome check src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx src/SystemFolder/SystemResources/ButtonToolbar/
git add src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx src/SystemFolder/SystemResources/ButtonToolbar/
git commit -m "feat(toolbar): square icon-only bevel buttons inside a toolbar

ClassicyBevelButton reads the toolbar context and derives square-ness
from its own content, so only the button decides — it is the only thing
that knows whether it has an icon and whether it has text. An explicit
square prop, including false, always wins.

Refs #170"
```

---

### Task 3: Storybook showcase and visual check

**Files:**
- Create: `src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.stories.tsx`

**Interfaces:**
- Consumes: both components from Task 1 and the square behavior from Task 2.

- [ ] **Step 1: Write the stories**

Create `src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";
import {
	ClassicyButtonToolbar,
	ClassicyButtonToolbarGroup,
} from "./ClassicyButtonToolbar";

const meta = {
	title: "Controls/ButtonToolbar",
	component: ClassicyButtonToolbar,
} satisfies Meta<typeof ClassicyButtonToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Storybook serves the repo's assets/ at /assets
// (storybook/.storybook/main.ts:17 → staticDirs).
const icon = "/assets/img/icons/system/info.png";

export const SingleGroup: Story = {
	render: () => (
		<ClassicyButtonToolbar>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton icon={icon} iconAlt="Back" />
				<ClassicyBevelButton icon={icon} iconAlt="Forward" />
				<ClassicyBevelButton icon={icon} iconAlt="Stop" />
			</ClassicyButtonToolbarGroup>
		</ClassicyButtonToolbar>
	),
};

export const MultipleGroups: Story = {
	render: () => (
		<ClassicyButtonToolbar>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton icon={icon} iconAlt="Back" />
				<ClassicyBevelButton icon={icon} iconAlt="Forward" />
			</ClassicyButtonToolbarGroup>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton icon={icon} iconAlt="Zoom in" />
				<ClassicyBevelButton icon={icon} iconAlt="Zoom out" />
			</ClassicyButtonToolbarGroup>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton icon={icon} iconAlt="Settings" />
			</ClassicyButtonToolbarGroup>
		</ClassicyButtonToolbar>
	),
};

export const MixedIconAndText: Story = {
	render: () => (
		<ClassicyButtonToolbar>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton icon={icon} iconAlt="New" />
				<ClassicyBevelButton icon={icon} iconAlt="Open" />
			</ClassicyButtonToolbarGroup>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton>Subscribe</ClassicyBevelButton>
				<ClassicyBevelButton>Unsubscribe</ClassicyBevelButton>
			</ClassicyButtonToolbarGroup>
		</ClassicyButtonToolbar>
	),
};

export const ToggleAndRadioGroups: Story = {
	render: () => (
		<ClassicyButtonToolbar>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton mode="toggle" icon={icon} iconAlt="Bold" />
				<ClassicyBevelButton mode="toggle" icon={icon} iconAlt="Italic" />
			</ClassicyButtonToolbarGroup>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton mode="radio" on icon={icon} iconAlt="Left" />
				<ClassicyBevelButton mode="radio" icon={icon} iconAlt="Center" />
				<ClassicyBevelButton mode="radio" icon={icon} iconAlt="Right" />
			</ClassicyButtonToolbarGroup>
		</ClassicyButtonToolbar>
	),
};
```

The icon path is verified: `assets/img/icons/system/info.png` exists, and `storybook/.storybook/main.ts:17` maps `../../assets` to `/assets`. Note that `ClassicyBevelButton.stories.tsx` uses no icons, so it is not a source for a working path.

- [ ] **Step 2: Run Storybook and check visually**

Run: `pnpm storybook`

Confirm in `Controls/ButtonToolbar`:
1. **SingleGroup** — three square icon buttons flush together, **no dividers**.
2. **MultipleGroups** — exactly two dividers, one between each adjacent pair. None at the far left or far right.
3. **MixedIconAndText** — icon buttons are square; "Subscribe"/"Unsubscribe" are rectangular and their labels are **not clipped** (`square` drops padding, so a clipped label means the derivation is wrong).
4. **ToggleAndRadioGroups** — toggles hold their on-state; the radio group behaves as a set.

- [ ] **Step 3: Commit**

```bash
pnpm biome check src/SystemFolder/SystemResources/ButtonToolbar/
git add src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.stories.tsx
git commit -m "docs(toolbar): add ClassicyButtonToolbar stories

Refs #170"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task |
|---|---|
| R1 — no spacing between buttons in a group | Task 1 Step 5 (`gap: 0`) |
| R2 — groups with a divider between them | Task 1 Steps 4–5 |
| R3 — divider only between groups | Task 1 (interleave) + three separator-count tests |
| R4 — icon-only defaults square, text does not | Task 2 (three tests) |
| R5 — explicit props always win | Task 2 (`square={false}` and `square` tests) |
| R6 — unchanged outside a toolbar | Task 2 (outside-toolbar test, context default `false`) |
| R7 — a group can hold non-button children | Task 1 (non-button child test) |

**Placeholder scan:** none — every step has runnable code or an exact command. The one conditional instruction (the Storybook icon path) names a concrete fallback source.

**Type consistency:** `ClassicyButtonToolbarContext` is `Context<boolean>` in Task 1 and consumed as a boolean in Task 2. `ClassicySeparator`'s `orientation="vertical"` matches `ClassicySeparatorOrientation`. `square` stays `boolean | undefined` — no default added — which is what `??` depends on.

**Decomposition note:** Tasks 1 and 2 could have been one commit, but a reviewer could reasonably approve the toolbar's separator logic while rejecting the context coupling into `ClassicyBevelButton`, so they are split.
