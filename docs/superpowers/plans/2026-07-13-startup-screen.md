# Startup Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show an authentic Mac OS 8 startup splash (per `startup1.png`) for 4 seconds over the freshly-mounted desktop, once per browser-tab session.

**Architecture:** A self-contained `ClassicyStartupScreen` overlay component (co-located with the existing `Boot/` resources) that decides visibility from `sessionStorage` in a lazy state initializer, plays the `ClassicyBoot` chime on mount, animates the existing `ClassicyProgressBar` with a 50 ms interval, and unmounts itself at `duration`. `ClassicyDesktop` renders it by default as the last child of the theme-scoped desktop root; two new optional props configure it. Spec: `docs/superpowers/specs/2026-07-13-startup-screen-design.md`.

**Tech Stack:** TypeScript, React, SCSS (platinum mixins from `appearance.scss`), Vitest + @testing-library/react (jsdom, fake timers).

## Global Constraints

- Package manager **pnpm**; tests via `pnpm vitest run <path>` (full suite `pnpm test`).
- Indentation is **tabs** in all `src/` files. Never edit generated `index.ts` barrels.
- Session key literal: `classicyStartupScreenShown`. Default duration: `4000` ms. Label copy: `Starting Up…` (with the ellipsis character), wordmark copy: `Mac OS`, alt text: `Mac OS`.
- Storage failures degrade to SHOWING the splash; never throw.
- Overlay z-index `100000` (above the desktop error-dialog layer at 99999).
- The splash must not touch the window manager, app registration, or focus system.

---

### Task 1: `ClassicyStartupScreen` component

**Files:**
- Create: `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.tsx`
- Create: `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.scss`
- Test: `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.test.tsx`

**Interfaces:**
- Consumes: `ClassicyProgressBar` (`value?: number; max?: number; label?: string; labelPosition?: "above"`), `useSoundDispatch()` returning a `player(action)` function, `ClassicyIcons.system.macosSvg: string`.
- Produces (Task 2 relies on): `export const ClassicyStartupScreen: FC<{ duration?: number }>` — renders `null` when the session key is set or after `duration` ms; root element has class `classicyStartupScreen`.

- [ ] **Step 1: Write the failing tests**

Create `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.test.tsx`:

```tsx
import { act, render, screen } from "@/__tests__/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassicyStartupScreen } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupScreen";

const mockPlayer = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => mockPlayer,
	}),
);

vi.mock("@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons", () => ({
	ClassicyIcons: { system: { macosSvg: "macos.svg" } },
}));

vi.mock(
	"@/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.scss",
	() => ({}),
);

describe("ClassicyStartupScreen", () => {
	beforeEach(() => {
		sessionStorage.clear();
		mockPlayer.mockClear();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("renders the splash with logo, wordmark, and Starting Up label", () => {
		const { container } = render(<ClassicyStartupScreen />);
		expect(
			container.querySelector(".classicyStartupScreen"),
		).toBeInTheDocument();
		expect(screen.getByAltText("Mac OS")).toBeInTheDocument();
		expect(screen.getByText("Mac OS")).toBeInTheDocument();
		expect(screen.getByText("Starting Up…")).toBeInTheDocument();
	});

	it("plays the ClassicyBoot chime on mount", () => {
		render(<ClassicyStartupScreen />);
		expect(mockPlayer).toHaveBeenCalledWith({
			type: "ClassicySoundPlay",
			sound: "ClassicyBoot",
		});
	});

	it("marks the session so the splash shows only once per session", () => {
		render(<ClassicyStartupScreen />);
		expect(sessionStorage.getItem("classicyStartupScreenShown")).toBe("true");
	});

	it("renders nothing when the session key is already set", () => {
		sessionStorage.setItem("classicyStartupScreenShown", "true");
		const { container } = render(<ClassicyStartupScreen />);
		expect(container.firstChild).toBeNull();
		expect(mockPlayer).not.toHaveBeenCalled();
	});

	it("unmounts itself after the default 4000ms duration", () => {
		const { container } = render(<ClassicyStartupScreen />);
		act(() => {
			vi.advanceTimersByTime(3900);
		});
		expect(
			container.querySelector(".classicyStartupScreen"),
		).toBeInTheDocument();
		act(() => {
			vi.advanceTimersByTime(200);
		});
		expect(container.querySelector(".classicyStartupScreen")).toBeNull();
	});

	it("honors a custom duration", () => {
		const { container } = render(<ClassicyStartupScreen duration={1000} />);
		act(() => {
			vi.advanceTimersByTime(1100);
		});
		expect(container.querySelector(".classicyStartupScreen")).toBeNull();
	});

	it("advances the progress bar as time elapses", () => {
		const { container } = render(<ClassicyStartupScreen />);
		act(() => {
			vi.advanceTimersByTime(2000);
		});
		const progress = container.querySelector(
			"progress",
		) as HTMLProgressElement;
		expect(progress.value).toBeGreaterThan(25);
		expect(progress.value).toBeLessThan(75);
	});
});
```

Notes for the implementer: `vi.useFakeTimers()` in Vitest fakes `Date.now` as well as `setInterval`, so the elapsed-time math advances with `advanceTimersByTime`. The `act()` wrapper is required because timer callbacks set React state.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.test.tsx`
Expected: FAIL — cannot resolve `ClassicyStartupScreen` module (it does not exist yet).

- [ ] **Step 3: Create the stylesheet**

Create `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.scss`:

```scss
@use "../../ControlPanels/AppearanceManager/styles/appearance";

.classicyStartupScreen {
  position: fixed;
  z-index: 100000;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--desktop-background-color);
}

.classicyStartupScreenPanel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--window-padding-size) * 3);
  padding: calc(var(--window-padding-size) * 6)
    calc(var(--window-padding-size) * 8);
  background: var(--color-system-03);
  @include appearance.platinumWindowBorder;
}

.classicyStartupScreenLogo {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  min-width: 20rem;
  padding: 2.5rem 3.5rem;
  background: var(--color-white);
  border: 1px solid var(--color-black);

  img {
    width: 7rem;
    height: auto;
  }
}

.classicyStartupScreenWordmark {
  font-family: var(--header-font), Georgia, "Times New Roman", serif;
  font-size: 3rem;
  line-height: 1;
  color: var(--color-black);

  @include appearance.no-select;
}

.classicyStartupScreenProgress {
  width: 12rem;
  text-align: center;
}
```

- [ ] **Step 4: Create the component**

Create `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.tsx`:

```tsx
import "./ClassicyStartupScreen.scss";
import {
	type FC as FunctionalComponent,
	useEffect,
	useState,
} from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { ClassicyProgressBar } from "@/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar";

const SESSION_KEY = "classicyStartupScreenShown";

const hasShownThisSession = (): boolean => {
	try {
		return sessionStorage.getItem(SESSION_KEY) !== null;
	} catch {
		// Storage unavailable (private browsing, SSR): degrade to showing.
		return false;
	}
};

const markShownThisSession = (): void => {
	try {
		sessionStorage.setItem(SESSION_KEY, "true");
	} catch {
		// Storage unavailable: the splash will simply show again next load.
	}
};

interface ClassicyStartupScreenProps {
	duration?: number;
}

/**
 * Mac OS 8 boot splash: covers the already-mounted desktop, plays the boot
 * chime, fills a progress bar over `duration` ms, then removes itself.
 * Shows once per browser-tab session. Deliberately self-contained — it does
 * not touch the window manager, app registration, or focus system.
 */
export const ClassicyStartupScreen: FunctionalComponent<
	ClassicyStartupScreenProps
> = ({ duration = 4000 }) => {
	const [visible, setVisible] = useState(() => !hasShownThisSession());
	const [progress, setProgress] = useState(0);
	const player = useSoundDispatch();

	useEffect(() => {
		if (!visible) return;
		markShownThisSession();
		player({ type: "ClassicySoundPlay", sound: "ClassicyBoot" });
	}, [visible, player]);

	useEffect(() => {
		if (!visible) return;
		const startedAt = Date.now();
		const tick = setInterval(() => {
			const elapsed = Date.now() - startedAt;
			if (elapsed >= duration) {
				setVisible(false);
			} else {
				setProgress((elapsed / duration) * 100);
			}
		}, 50);
		return () => clearInterval(tick);
	}, [visible, duration]);

	if (!visible) return null;

	return (
		<div className="classicyStartupScreen" role="status">
			<div className="classicyStartupScreenPanel">
				<div className="classicyStartupScreenLogo">
					<img src={ClassicyIcons.system.macosSvg} alt="Mac OS" />
					<span className="classicyStartupScreenWordmark">Mac OS</span>
				</div>
				<div className="classicyStartupScreenProgress">
					<ClassicyProgressBar
						value={progress}
						max={100}
						label="Starting Up…"
						labelPosition="above"
					/>
				</div>
			</div>
		</div>
	);
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Boot/`
Expected: PASS (the new file's 7 tests plus the existing `ClassicyBoot.test.tsx`).

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.tsx src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.scss src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.test.tsx
git commit -m "feat: add ClassicyStartupScreen boot splash component"
```

---

### Task 2: Desktop integration (`startupScreen` / `startupDuration` props)

**Files:**
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx` (props interface ~line 55, `ClassicyDesktopInner` signature ~line 59, render root before closing tag ~line 623, wrapper export ~line 628)
- Test: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.test.tsx`

**Interfaces:**
- Consumes: `ClassicyStartupScreen` from Task 1 (`{ duration?: number }`, root class `classicyStartupScreen`).
- Produces: `ClassicyDesktopProps` gains `startupScreen?: boolean` (default `true`) and `startupDuration?: number` (default `4000`).

- [ ] **Step 1: Write the failing tests**

Append to `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.test.tsx`:

```tsx
describe("ClassicyDesktop startup screen", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("renders the startup splash by default on a fresh session", () => {
		const { container } = render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		expect(
			container.querySelector(".classicyStartupScreen"),
		).toBeInTheDocument();
		// The desktop is mounted underneath while the splash is up
		expect(screen.getByAltText("SimpleText")).toBeInTheDocument();
	});

	it("suppresses the splash when startupScreen is false", () => {
		const { container } = render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);
		expect(container.querySelector(".classicyStartupScreen")).toBeNull();
	});

	it("does not show the splash again within the same session", () => {
		sessionStorage.setItem("classicyStartupScreenShown", "true");
		const { container } = render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		expect(container.querySelector(".classicyStartupScreen")).toBeNull();
	});
});
```

Also add `sessionStorage.clear();` to the existing `beforeEach` of the `"ClassicyDesktop default apps"` describe in the same file (its tests render the desktop; clearing keeps them independent of test order now that a splash can appear — their queries still pass either way, this is belt-and-braces):

```tsx
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.test.tsx`
Expected: FAIL — `"renders the startup splash by default"` finds no `.classicyStartupScreen`; the TypeScript compile of `startupScreen={false}` also errors until the prop exists.

- [ ] **Step 3: Implement the desktop integration**

In `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx`:

1. Add the import (with the other SystemResources imports near the top):

```tsx
import { ClassicyStartupScreen } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupScreen";
```

2. Extend the props interface (currently `children` only):

```tsx
interface ClassicyDesktopProps {
	children?: ReactNode;
	startupScreen?: boolean;
	startupDuration?: number;
}
```

3. Update `ClassicyDesktopInner`'s signature to accept the new props:

```tsx
const ClassicyDesktopInner: FunctionalComponent<ClassicyDesktopProps> = ({
	children,
	startupScreen = true,
	startupDuration = 4000,
}) => {
```

4. Render the splash as the LAST child of the root desktop div, immediately after `{children}` (so it sits above everything and inherits the theme variables):

```tsx
			{children}
			{startupScreen && <ClassicyStartupScreen duration={startupDuration} />}
		</div>
	);
};
```

5. Thread the props through the wrapper export:

```tsx
export const ClassicyDesktop: FunctionalComponent<ClassicyDesktopProps> = ({
	children,
	startupScreen,
	startupDuration,
}) => (
	<ClassicyCrashScreen>
		<ClassicyDesktopInner
			startupScreen={startupScreen}
			startupDuration={startupDuration}
		>
			{children}
		</ClassicyDesktopInner>
	</ClassicyCrashScreen>
);
```

- [ ] **Step 4: Run the desktop tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.test.tsx`
Expected: PASS — all pre-existing "default apps" tests plus the 3 new ones. (The pre-existing tests tolerate the splash: it overlays visually but the desktop DOM beneath is still queryable.)

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.test.tsx
git commit -m "feat: show startup splash on desktop boot, configurable via props"
```

---

### Task 3: Full-repo verification

**Files:**
- No new files; fix-ups only if verification fails.

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces: green suite, lint-clean touched files, successful build.

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: PASS (0 failures). Known pre-existing flake: `ClassicyAppManagerContext.test.tsx > seeds the store when no persisted state exists` occasionally fails under the parallel full run but passes in isolation — re-run to confirm before treating any failure as new.

- [ ] **Step 2: Lint the touched files**

Run:
```bash
pnpm exec biome check src/SystemFolder/SystemResources/Boot/ src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.test.tsx
```
Expected: 0 errors/warnings on these paths. (Repo-wide `pnpm lint` has 139 pre-existing errors — biome.json schema mismatch and asset SVG rules — that are out of scope.) Apply `pnpm exec biome check --write <paths>` for any formatting complaints.

- [ ] **Step 3: Build the library**

Run: `pnpm build:source`
Expected: barrels regenerate (picking up the new `ClassicyStartupScreen` export automatically — do not hand-edit them), `tsc -b` and Vite complete. If the regenerated barrel files changed, include them in the fix-up commit.

- [ ] **Step 4: Commit any fix-ups**

```bash
git status --short
# only if there are changes:
git add -A src/
git commit -m "chore: startup screen verification fix-ups"
```

---

## Self-Review Notes (already applied)

- **Spec coverage:** splash visuals/markup, chime, session gating, self-unmount, storage error handling → Task 1; desktop-underneath model, default-on props, non-breaking API threading → Task 2; export via barrels + suite/lint/build → Task 3. No fade, no skip, no changes to `ClassicyBoot` — nothing in the plan adds them (YAGNI holds).
- **Copy consistency:** `Starting Up…`, `Mac OS`, `classicyStartupScreenShown`, `4000` appear identically in spec, tests, and implementation code.
- **Timer testability:** interval + `Date.now()` both faked by `vi.useFakeTimers()`; assertions use wide bounds (progress 25–75 at the halfway mark) to stay robust against timer-scheduling jitter.
