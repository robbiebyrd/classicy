# Pre-Boot "Power On" Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Classicy consumer inject a "power on" screen that shows before the startup sequence, dismissed by a consumer-owned button, once per browser-tab session.

**Architecture:** A new internal `ClassicyBootSequence` component owns a two-phase state machine (`powerOn` → `startup`) and replaces the inline `ClassicyStartupScreen` render in `ClassicyDesktop`. A new `preBootScreen` render-prop supplies the pre-boot content and receives a `powerOn()` callback. A new presentational `ClassicyWindowFrame` (no window-manager coupling) gives consumers the framed-window look. `ClassicyStartupScreen` is unchanged.

**Tech Stack:** React 18 + TypeScript, Zustand (app state), Vitest + Testing Library, SCSS (co-located), Vite library build, pnpm.

## Global Constraints

- Package manager is **pnpm** (`corepack enable`). Run tests with `pnpm exec vitest run <path>`.
- All styling in **co-located SCSS files** — no Tailwind, no inline styles for layout/presentation. Dynamic values pass through **CSS custom properties** set via `style` (the established pattern), never raw layout properties.
- Path alias `@/` → `./src/`.
- Barrel `index.ts` files are **auto-generated** by `generate-barrels` (barrelsby) during `pnpm build:source` — never hand-edit them.
- Import `classNames` from `"classnames"` (already a dependency; see `ClassicyWindow.tsx`).
- Session flag key is `"classicyStartupScreenShown"`; read via `hasShownStartupScreenThisSession()` from `@/SystemFolder/SystemResources/Boot/ClassicyStartupScreenSession`.
- Sound is played by dispatching `{ type: "ClassicySoundPlay", sound: "ClassicyBoot" }`; `ClassicyStartupScreen` already owns this — do not duplicate it.

---

## File Structure

- **New** `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.tsx` — presentational Platinum window frame (title bar + body), zero manager coupling.
- **New** `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss` — frame styling, reuses title-bar assets.
- **New** `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.test.tsx` — renders without any provider.
- **New** `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.stories.tsx` — Storybook showcase.
- **New** `src/SystemFolder/SystemResources/Boot/ClassicyBootSequence.tsx` — phase machine.
- **New** `src/SystemFolder/SystemResources/Boot/ClassicyBootSequence.scss` — pre-boot overlay.
- **New** `src/SystemFolder/SystemResources/Boot/ClassicyBootSequence.test.tsx` — phase-machine behavior.
- **Modify** `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx` — add `preBootScreen` prop, thread it, render `ClassicyBootSequence` instead of inline `ClassicyStartupScreen`.

---

## Task 1: `ClassicyWindowFrame` presentational component

**Files:**
- Create: `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.tsx`
- Create: `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss`
- Create: `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.stories.tsx`
- Test: `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces:
  ```ts
  interface ClassicyWindowFrameProps {
    title?: string;
    children: ReactNode;
    className?: string;
    width?: string | number; // becomes CSS var --classicy-window-frame-width (number → px)
  }
  export const ClassicyWindowFrame: FunctionalComponent<ClassicyWindowFrameProps>;
  ```
  Root element class `classicyWindowFrame`; title text in `.classicyWindowFrameTitleText`; body in `.classicyWindowFrameBody`.

- [ ] **Step 1: Write the failing test**

Create `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { ClassicyWindowFrame } from "@/SystemFolder/SystemResources/Window/ClassicyWindowFrame";

vi.mock(
	"@/SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss",
	() => ({}),
);

describe("ClassicyWindowFrame", () => {
	it("renders title and children with no provider", () => {
		const { container } = render(
			<ClassicyWindowFrame title="9/11 in Realtime">
				<p>About text</p>
			</ClassicyWindowFrame>,
		);
		expect(
			container.querySelector(".classicyWindowFrame"),
		).toBeInTheDocument();
		expect(screen.getByText("9/11 in Realtime")).toBeInTheDocument();
		expect(screen.getByText("About text")).toBeInTheDocument();
	});

	it("omits the title text node when no title is given", () => {
		const { container } = render(
			<ClassicyWindowFrame>
				<span>body</span>
			</ClassicyWindowFrame>,
		);
		expect(
			container.querySelector(".classicyWindowFrameTitleText"),
		).toBeNull();
	});

	it("applies a custom className to the root", () => {
		const { container } = render(
			<ClassicyWindowFrame className="myFrame">
				<span>body</span>
			</ClassicyWindowFrame>,
		);
		expect(container.querySelector(".classicyWindowFrame")).toHaveClass(
			"myFrame",
		);
	});

	it("exposes a numeric width as a px CSS custom property", () => {
		const { container } = render(
			<ClassicyWindowFrame width={480}>
				<span>body</span>
			</ClassicyWindowFrame>,
		);
		const root = container.querySelector(
			".classicyWindowFrame",
		) as HTMLElement;
		expect(root.style.getPropertyValue("--classicy-window-frame-width")).toBe(
			"480px",
		);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.test.tsx`
Expected: FAIL — cannot resolve `ClassicyWindowFrame` (module does not exist).

- [ ] **Step 3: Write the component**

Create `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.tsx`:

```tsx
import "./ClassicyWindowFrame.scss";
import classNames from "classnames";
import type { CSSProperties, FC as FunctionalComponent, ReactNode } from "react";

interface ClassicyWindowFrameProps {
	title?: string;
	children: ReactNode;
	className?: string;
	width?: string | number;
}

/**
 * Presentational Mac OS 8 window frame: title bar (pinstripes + centered
 * title chip) over a body region. Intentionally decoupled from the window
 * manager — no appId, no store reads, no dispatches — so it renders anywhere,
 * including the pre-boot overlay before any app exists.
 */
export const ClassicyWindowFrame: FunctionalComponent<
	ClassicyWindowFrameProps
> = ({ title = "", children, className, width }) => {
	const style =
		width !== undefined
			? ({
					"--classicy-window-frame-width":
						typeof width === "number" ? `${width}px` : width,
				} as CSSProperties)
			: undefined;

	return (
		<div className={classNames("classicyWindowFrame", className)} style={style}>
			<div className="classicyWindowFrameTitleBar">
				{title !== "" && (
					<span className="classicyWindowFrameTitleText">{title}</span>
				)}
			</div>
			<div className="classicyWindowFrameBody">{children}</div>
		</div>
	);
};
```

- [ ] **Step 4: Write the SCSS**

Create `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss`:

```scss
@use "../../ControlPanels/AppearanceManager/styles/assets";

.classicyWindowFrame {
  display: flex;
  flex-direction: column;
  max-width: var(--classicy-window-frame-width, none);
  font-family: var(--ui-font), sans-serif;
  color: var(--color-black);
  background: var(--color-system-03);
  border: var(--window-border-size) solid var(--color-black);
  box-shadow: 2px 2px 0 var(--color-black);
}

.classicyWindowFrameTitleBar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(var(--window-control-size) * 1.5);
  background: assets.$title-bar-center;
  background-size: auto 100%;
  border-bottom: var(--window-border-size) solid var(--color-black);
}

.classicyWindowFrameTitleText {
  padding: 0 calc(var(--window-padding-size) * 1.5);
  background: var(--color-system-03);
  font-size: calc(var(--ui-font-size) * 0.865);
  font-weight: bold;
  white-space: nowrap;
}

.classicyWindowFrameBody {
  padding: calc(var(--window-padding-size) * 2);
  background: var(--color-system-03);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Add a Storybook story**

Create `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.stories.tsx` (mirror the CSF3 conventions of the sibling `ClassicyStartupScreen.stories.tsx`):

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyWindowFrame } from "@/SystemFolder/SystemResources/Window/ClassicyWindowFrame";

const meta: Meta<typeof ClassicyWindowFrame> = {
	title: "SystemResources/WindowFrame",
	component: ClassicyWindowFrame,
};
export default meta;

type Story = StoryObj<typeof ClassicyWindowFrame>;

export const PowerOn: Story = {
	render: () => (
		<ClassicyWindowFrame title="9/11 in Realtime" width={560}>
			<h1>About 9/11 in Realtime</h1>
			<p>
				A multimedia experiment for teachers. Press the button below to power
				on.
			</p>
			<ClassicyButton onClickFunc={() => {}}>POWER ON</ClassicyButton>
		</ClassicyWindowFrame>
	),
};
```

- [ ] **Step 7: Verify the story renders**

Run: `pnpm storybook` and confirm **SystemResources/WindowFrame → PowerOn** shows a Platinum-framed window with a pinstriped title bar, the title on an opaque chip, and a working POWER ON button. Adjust the SCSS if the title bar or borders look off. Stop Storybook when done.

- [ ] **Step 8: Commit**

```bash
git add src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.tsx \
  src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss \
  src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.test.tsx \
  src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.stories.tsx
git commit -m "feat(window): add presentational ClassicyWindowFrame"
```

---

## Task 2: `ClassicyBootSequence` phase machine

**Files:**
- Create: `src/SystemFolder/SystemResources/Boot/ClassicyBootSequence.tsx`
- Create: `src/SystemFolder/SystemResources/Boot/ClassicyBootSequence.scss`
- Test: `src/SystemFolder/SystemResources/Boot/ClassicyBootSequence.test.tsx`

**Interfaces:**
- Consumes: `ClassicyStartupScreen` (unchanged) and `hasShownStartupScreenThisSession` from `ClassicyStartupScreenSession`.
- Produces:
  ```ts
  interface ClassicyBootSequenceProps {
    startupScreen?: boolean;   // default true
    startupDuration?: number;  // default 4000
    preBootScreen?: (powerOn: () => void) => ReactNode;
  }
  export const ClassicyBootSequence: FunctionalComponent<ClassicyBootSequenceProps>;
  ```
  Pre-boot overlay root class `classicyPreBootScreen`.

- [ ] **Step 1: Write the failing test**

Create `src/SystemFolder/SystemResources/Boot/ClassicyBootSequence.test.tsx`. This mounts the **real** `ClassicyStartupScreen` with its leaf dependencies mocked (same technique as `ClassicyStartupScreen.test.tsx`), so we can assert the chime fires only after power-on:

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@/__tests__/test-utils";
import { ClassicyBootSequence } from "@/SystemFolder/SystemResources/Boot/ClassicyBootSequence";

const mockPlayer = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => mockPlayer }),
);

vi.mock("@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons", () => ({
	ClassicyIcons: { system: { macosSvg: "macos.svg" } },
}));

vi.mock(
	"@/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/Boot/ClassicyBootSequence.scss",
	() => ({}),
);

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					Manager: {
						Applications: { apps: {} },
						Boot: { paradeIcons: [] },
					},
				},
			}),
	}),
);

const powerOnScreen = (powerOn: () => void) => (
	<button type="button" onClick={powerOn}>
		POWER ON
	</button>
);

describe("ClassicyBootSequence", () => {
	beforeEach(() => {
		sessionStorage.clear();
		mockPlayer.mockClear();
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("goes straight to the startup screen (chime fires) with no preBootScreen", () => {
		const { container } = render(<ClassicyBootSequence />);
		expect(container.querySelector(".classicyPreBootScreen")).toBeNull();
		expect(container.querySelector(".classicyStartupScreen")).toBeInTheDocument();
		expect(mockPlayer).toHaveBeenCalledWith({
			type: "ClassicySoundPlay",
			sound: "ClassicyBoot",
		});
	});

	it("shows the power-on screen and does NOT play the chime yet", () => {
		const { container } = render(
			<ClassicyBootSequence preBootScreen={powerOnScreen} />,
		);
		expect(
			container.querySelector(".classicyPreBootScreen"),
		).toBeInTheDocument();
		expect(screen.getByText("POWER ON")).toBeInTheDocument();
		expect(container.querySelector(".classicyStartupScreen")).toBeNull();
		expect(mockPlayer).not.toHaveBeenCalled();
	});

	it("advances to the startup screen and plays the chime on POWER ON", () => {
		const { container } = render(
			<ClassicyBootSequence preBootScreen={powerOnScreen} />,
		);
		act(() => {
			fireEvent.click(screen.getByText("POWER ON"));
		});
		expect(container.querySelector(".classicyPreBootScreen")).toBeNull();
		expect(container.querySelector(".classicyStartupScreen")).toBeInTheDocument();
		expect(mockPlayer).toHaveBeenCalledWith({
			type: "ClassicySoundPlay",
			sound: "ClassicyBoot",
		});
	});

	it("skips the power-on screen when the session was already shown", () => {
		sessionStorage.setItem("classicyStartupScreenShown", "true");
		const { container } = render(
			<ClassicyBootSequence preBootScreen={powerOnScreen} />,
		);
		expect(container.querySelector(".classicyPreBootScreen")).toBeNull();
		// startup screen self-gates to null; nothing renders, no chime.
		expect(container.querySelector(".classicyStartupScreen")).toBeNull();
		expect(mockPlayer).not.toHaveBeenCalled();
	});

	it("with startupScreen=false, POWER ON reveals the desktop and plays no chime", () => {
		const { container } = render(
			<ClassicyBootSequence
				startupScreen={false}
				preBootScreen={powerOnScreen}
			/>,
		);
		expect(
			container.querySelector(".classicyPreBootScreen"),
		).toBeInTheDocument();
		act(() => {
			fireEvent.click(screen.getByText("POWER ON"));
		});
		expect(container.querySelector(".classicyPreBootScreen")).toBeNull();
		expect(container.querySelector(".classicyStartupScreen")).toBeNull();
		expect(mockPlayer).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/Boot/ClassicyBootSequence.test.tsx`
Expected: FAIL — cannot resolve `ClassicyBootSequence`.

- [ ] **Step 3: Write the component**

Create `src/SystemFolder/SystemResources/Boot/ClassicyBootSequence.tsx`:

```tsx
import "./ClassicyBootSequence.scss";
import { type FC as FunctionalComponent, type ReactNode, useState } from "react";
import { ClassicyStartupScreen } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupScreen";
import { hasShownStartupScreenThisSession } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupScreenSession";

interface ClassicyBootSequenceProps {
	startupScreen?: boolean;
	startupDuration?: number;
	preBootScreen?: (powerOn: () => void) => ReactNode;
}

/**
 * Orchestrates the boot phases. When a preBootScreen is supplied and the
 * splash has not run this session, shows a "power on" overlay first; the
 * consumer's button calls powerOn() to advance to ClassicyStartupScreen
 * (which plays the chime + parade). Gating the chime behind that click also
 * satisfies the browser's autoplay gesture requirement. ClassicyStartupScreen
 * self-gates on the session flag, so a reload before power-on replays the
 * overlay, and a reload after boot skips everything.
 */
export const ClassicyBootSequence: FunctionalComponent<
	ClassicyBootSequenceProps
> = ({ startupScreen = true, startupDuration = 4000, preBootScreen }) => {
	const [phase, setPhase] = useState<"powerOn" | "startup">(() =>
		preBootScreen && !hasShownStartupScreenThisSession()
			? "powerOn"
			: "startup",
	);

	if (phase === "powerOn" && preBootScreen) {
		return (
			<div className="classicyPreBootScreen" role="dialog" aria-modal="true">
				{preBootScreen(() => setPhase("startup"))}
			</div>
		);
	}

	return startupScreen ? (
		<ClassicyStartupScreen duration={startupDuration} />
	) : null;
};
```

- [ ] **Step 4: Write the SCSS**

Create `src/SystemFolder/SystemResources/Boot/ClassicyBootSequence.scss`:

```scss
.classicyPreBootScreen {
  position: fixed;
  z-index: 100000;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/Boot/ClassicyBootSequence.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/SystemResources/Boot/ClassicyBootSequence.tsx \
  src/SystemFolder/SystemResources/Boot/ClassicyBootSequence.scss \
  src/SystemFolder/SystemResources/Boot/ClassicyBootSequence.test.tsx
git commit -m "feat(boot): add ClassicyBootSequence power-on phase machine"
```

---

## Task 3: Wire `preBootScreen` into `ClassicyDesktop`

**Files:**
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx`

**Interfaces:**
- Consumes: `ClassicyBootSequence` from Task 2.
- Produces: `ClassicyDesktop` gains an optional prop `preBootScreen?: (powerOn: () => void) => ReactNode`.

- [ ] **Step 1: Replace the startup-screen import with the boot sequence**

In `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx`, change the import on line 18:

```tsx
import { ClassicyStartupScreen } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupScreen";
```

to:

```tsx
import { ClassicyBootSequence } from "@/SystemFolder/SystemResources/Boot/ClassicyBootSequence";
```

(Leave the `resetStartupScreenSession` import on line 19 as-is — it is still used by `emptyTrash`.)

- [ ] **Step 2: Add `preBootScreen` to the props interface**

Change the `ClassicyDesktopProps` interface (lines 59-63):

```tsx
interface ClassicyDesktopProps {
	children?: ReactNode;
	startupScreen?: boolean;
	startupDuration?: number;
	preBootScreen?: (powerOn: () => void) => ReactNode;
}
```

- [ ] **Step 3: Thread the prop through `ClassicyDesktopInner` and render the boot sequence**

Update the `ClassicyDesktopInner` destructuring (lines 65-69) to accept `preBootScreen`:

```tsx
const ClassicyDesktopInner: FunctionalComponent<ClassicyDesktopProps> = ({
	children,
	startupScreen = true,
	startupDuration = 4000,
	preBootScreen,
}) => {
```

Then replace the inline startup render (line 545):

```tsx
			{startupScreen && <ClassicyStartupScreen duration={startupDuration} />}
```

with:

```tsx
			<ClassicyBootSequence
				startupScreen={startupScreen}
				startupDuration={startupDuration}
				preBootScreen={preBootScreen}
			/>
```

- [ ] **Step 4: Pass the prop through the outer `ClassicyDesktop` wrapper**

Update the outer `ClassicyDesktop` component (lines 550-565):

```tsx
export const ClassicyDesktop: FunctionalComponent<ClassicyDesktopProps> = ({
	children,
	startupScreen,
	startupDuration,
	preBootScreen,
}) => (
	<ClassicyCrashScreen>
		<ClassicyContextualMenuProvider>
			<ClassicyDesktopInner
				startupScreen={startupScreen}
				startupDuration={startupDuration}
				preBootScreen={preBootScreen}
			>
				{children}
			</ClassicyDesktopInner>
		</ClassicyContextualMenuProvider>
	</ClassicyCrashScreen>
);
```

- [ ] **Step 5: Run the desktop tests to confirm no regression**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.test.tsx`
Expected: PASS. (The default `startupScreen` behavior is preserved; `ClassicyBootSequence` with no `preBootScreen` renders exactly what the old inline expression did.)

- [ ] **Step 6: Run the full boot + desktop suite**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/Boot src/SystemFolder/SystemResources/Desktop src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.test.tsx`
Expected: PASS — including the unchanged `ClassicyStartupScreen.test.tsx`.

- [ ] **Step 7: Build to regenerate barrels and confirm the export**

Run: `pnpm build:source`
Expected: build succeeds (TypeScript passes, barrels regenerate). Confirm `ClassicyWindowFrame` is re-exported (barrelsby picks up the new file automatically). `ClassicyDesktop`'s new `preBootScreen` prop is part of its already-exported type.

- [ ] **Step 8: Lint**

Run: `pnpm lint`
Expected: no new errors in the created/modified files.

- [ ] **Step 9: Commit**

```bash
# Stage the desktop change plus the barrel files regenerated by build:source.
# Do NOT use `git add -A` — an untracked 2.png reference image sits in the repo root.
git add src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx
git add $(git diff --name-only -- '*index.ts')
git commit -m "feat(desktop): add preBootScreen prop with power-on gate"
```

---

## Consumer Usage (for reference, not a task)

```tsx
import { ClassicyDesktop, ClassicyWindowFrame, ClassicyButton } from "classicy";

<ClassicyDesktop
  preBootScreen={(powerOn) => (
    <ClassicyWindowFrame title="9/11 in Realtime" width={560}>
      <h1>About 9/11 in Realtime</h1>
      <p>…</p>
      <ClassicyButton onClickFunc={powerOn}>POWER ON</ClassicyButton>
    </ClassicyWindowFrame>
  )}
>
  {/* apps */}
</ClassicyDesktop>
```
