# Crash Screen (Sad Mac) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `ClassicyCrashScreen` React error boundary into Classicy that replaces the desktop with a full-viewport black Sad Mac screen on any render error; click or keypress reloads the page.

**Architecture:** A class-component error boundary (React requires classes for `getDerivedStateFromError`) in `src/SystemFolder/SystemResources/CrashScreen/`, with the Sad Mac PNG bundled in `assets/img/ui/`. `ClassicyDesktop`'s existing body is renamed to a private `ClassicyDesktopInner`; the exported `ClassicyDesktop` wraps it in the boundary so both desktop internals and consumer apps are covered. The boundary is also exported from `index.ts`.

**Tech Stack:** React 18 class component, SCSS, Vitest + Testing Library (jsdom), Vite asset imports (`@img` alias → `assets/img`).

**Spec:** `docs/superpowers/specs/2026-07-10-crash-screen-design.md`

## Global Constraints

- Repo: `~/classicy` (all paths below are relative to it). Work on `main` per this repo's flow; pushing `main` auto-publishes to npm — do NOT push until the final verification task passes.
- The crash fallback render must NOT touch Classicy state/theme/sound managers (they may be what crashed).
- The overlay uses `z-index: 2000` (above `ClassicyBoot`'s 1000).
- Trigger scope is React render errors only — no `window.onerror`/`unhandledrejection` handlers.
- Test conventions: co-located `*.test.tsx`, mock `.scss` imports with `vi.mock(path, () => ({}))`, mock `window.location.reload` with `vi.stubGlobal("location", { ...window.location, reload })` (**verified working** in this repo's jsdom setup; `vi.spyOn(window.location, "reload")` does NOT work — jsdom's `reload` is non-configurable).
- Run tests with `pnpm exec vitest run <path>` from the repo root.

---

### Task 1: Sad Mac asset + `ClassicyCrashScreen` component

**Files:**
- Create: `assets/img/ui/sad-mac.png`
- Create: `src/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen.scss`
- Create: `src/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen.tsx`
- Test: `src/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `export class ClassicyCrashScreen extends Component<ClassicyCrashScreenProps, ClassicyCrashScreenState>` where `ClassicyCrashScreenProps = { children?: ReactNode }`. Renders `children` normally; renders `<div className="classicyCrashScreen">` containing an `<img>` after a descendant throws. Task 2 imports it from `@/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen`.

- [ ] **Step 1: Create the cropped Sad Mac asset**

The source image (1456×680) is mostly black padding; trim it so the content centers predictably at any viewport size. This exact command was verified to produce a clean 245×226 PNG (Sad Mac icon + hex codes + 32px black margin, 1.5 KB):

```bash
cd ~/classicy
curl -sL "https://files.911realtime.org/feedback/a16d5d88-8dbc-46f8-af20-b114971e26d2/ddkdgin-4befc28a-5dfb-4a45-b51d-b411fb2a4e7a.png" -o /tmp/sad-mac-source.png
convert /tmp/sad-mac-source.png -fuzz 10% -trim +repage -bordercolor black -border 32 assets/img/ui/sad-mac.png
identify assets/img/ui/sad-mac.png
```

Expected: `assets/img/ui/sad-mac.png PNG 245x226 ...`

- [ ] **Step 2: Write the failing test**

Create `src/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen.test.tsx`:

```tsx
import {
	fireEvent,
	render,
	userEvent,
} from "@/__tests__/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassicyCrashScreen } from "@/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen";

vi.mock(
	"@/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen.scss",
	() => ({}),
);

// A component that always throws during render.
const Bomb = () => {
	throw new Error("boom");
};

describe("ClassicyCrashScreen", () => {
	beforeEach(() => {
		// React logs caught render errors loudly; keep test output clean.
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("renders its children when nothing throws", () => {
		const { getByText, container } = render(
			<ClassicyCrashScreen>
				<p>desktop</p>
			</ClassicyCrashScreen>,
		);
		expect(getByText("desktop")).toBeInTheDocument();
		expect(
			container.querySelector(".classicyCrashScreen"),
		).not.toBeInTheDocument();
	});

	it("renders the Sad Mac overlay instead of children when a child throws", () => {
		const { container, getByRole, queryByText } = render(
			<ClassicyCrashScreen>
				<Bomb />
			</ClassicyCrashScreen>,
		);
		expect(container.querySelector(".classicyCrashScreen")).toBeInTheDocument();
		expect(getByRole("img")).toBeInTheDocument();
		expect(queryByText("desktop")).not.toBeInTheDocument();
	});

	it("logs the error via console.error", () => {
		render(
			<ClassicyCrashScreen>
				<Bomb />
			</ClassicyCrashScreen>,
		);
		expect(console.error).toHaveBeenCalled();
	});

	it("reloads the page when the overlay is clicked", async () => {
		const reload = vi.fn();
		vi.stubGlobal("location", { ...window.location, reload });
		const { container } = render(
			<ClassicyCrashScreen>
				<Bomb />
			</ClassicyCrashScreen>,
		);
		await userEvent.click(
			container.querySelector(".classicyCrashScreen") as HTMLElement,
		);
		expect(reload).toHaveBeenCalled();
	});

	it("reloads the page on any keydown while crashed", () => {
		const reload = vi.fn();
		vi.stubGlobal("location", { ...window.location, reload });
		render(
			<ClassicyCrashScreen>
				<Bomb />
			</ClassicyCrashScreen>,
		);
		fireEvent.keyDown(window, { key: "Escape" });
		expect(reload).toHaveBeenCalled();
	});

	it("does not listen for keydown before a crash", () => {
		const reload = vi.fn();
		vi.stubGlobal("location", { ...window.location, reload });
		render(
			<ClassicyCrashScreen>
				<p>desktop</p>
			</ClassicyCrashScreen>,
		);
		fireEvent.keyDown(window, { key: "Escape" });
		expect(reload).not.toHaveBeenCalled();
	});
});
```

Note: `@/__tests__/test-utils` re-exports all of `@testing-library/react` plus `userEvent`.

- [ ] **Step 3: Run the test to verify it fails**

```bash
cd ~/classicy && pnpm exec vitest run src/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen.test.tsx
```

Expected: FAIL — cannot resolve `ClassicyCrashScreen.tsx` (module not found).

- [ ] **Step 4: Write the stylesheet**

Create `src/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen.scss` (mirrors `ClassicyBoot.scss`, one layer higher):

```scss
.classicyCrashScreen {
  position: absolute;
  z-index: 2000 !important;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  cursor: pointer;
  background: black !important;

  img {
    /* 2x the asset's natural 245px width; crisp pixel scaling. */
    width: 490px;
    max-width: 80vw;
    image-rendering: pixelated;
  }
}
```

- [ ] **Step 5: Write the component**

Create `src/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen.tsx`:

```tsx
import "./ClassicyCrashScreen.scss";
import sadMac from "@img/ui/sad-mac.png";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface ClassicyCrashScreenProps {
	children?: ReactNode;
}

interface ClassicyCrashScreenState {
	crashed: boolean;
}

/**
 * Error boundary that replaces the desktop with a full-screen Sad Mac when
 * any descendant throws during render. Click or press any key to reload.
 *
 * The fallback render is deliberately self-contained: no Classicy state,
 * theme, or sound managers — those providers may be the very thing that
 * crashed, and a fallback that depends on them would throw again and escape
 * the boundary entirely.
 */
export class ClassicyCrashScreen extends Component<
	ClassicyCrashScreenProps,
	ClassicyCrashScreenState
> {
	state: ClassicyCrashScreenState = { crashed: false };

	static getDerivedStateFromError(): Partial<ClassicyCrashScreenState> {
		return { crashed: true };
	}

	componentDidCatch(error: Error, info: ErrorInfo): void {
		console.error("Classicy crashed:", error, info.componentStack);
	}

	componentDidUpdate(
		_prevProps: ClassicyCrashScreenProps,
		prevState: ClassicyCrashScreenState,
	): void {
		if (!prevState.crashed && this.state.crashed) {
			window.addEventListener("keydown", this.reload);
		}
	}

	componentWillUnmount(): void {
		window.removeEventListener("keydown", this.reload);
	}

	private readonly reload = (): void => {
		window.location.reload();
	};

	render(): ReactNode {
		if (this.state.crashed) {
			return (
				<div
					className="classicyCrashScreen"
					onClick={this.reload}
					onKeyDown={this.reload}
				>
					<img
						src={sadMac as string}
						alt="Sad Mac — the system has crashed. Click or press any key to restart."
					/>
				</div>
			);
		}
		return this.props.children;
	}
}
```

Notes for the implementer:
- `sadMac as string`: `src/custom.d.ts` types `*.png` default exports as `unknown`; Vite/Vitest resolve them to URL strings at runtime.
- The keydown listener uses `window` (nothing on the overlay is focused after a crash) and is attached only on the not-crashed → crashed transition. The `onKeyDown` on the div is redundant at runtime but satisfies Biome's `useKeyWithClickEvents` a11y rule.

- [ ] **Step 6: Run the test to verify it passes**

```bash
cd ~/classicy && pnpm exec vitest run src/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen.test.tsx
```

Expected: PASS — 6 tests.

- [ ] **Step 7: Lint**

```bash
cd ~/classicy && pnpm exec biome check src/SystemFolder/SystemResources/CrashScreen/
```

Expected: no errors. Fix any formatting complaints with `pnpm exec biome check --write src/SystemFolder/SystemResources/CrashScreen/`.

- [ ] **Step 8: Commit**

```bash
cd ~/classicy
git add assets/img/ui/sad-mac.png src/SystemFolder/SystemResources/CrashScreen/
git commit -m "feat: add ClassicyCrashScreen Sad Mac error boundary"
```

---

### Task 2: Build `ClassicyCrashScreen` into `ClassicyDesktop` and export it

**Files:**
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx` (the exported component begins at line ~58; the file is ~619 lines and the component runs to the end)
- Modify: `src/index.ts` (export list; Boot's export is at line ~48)
- Test: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.test.tsx` (add one case to the existing file)

**Interfaces:**
- Consumes: `ClassicyCrashScreen` from `@/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen` (Task 1).
- Produces: `ClassicyDesktop`'s public API is unchanged (`FunctionalComponent<ClassicyDesktopProps>` with `children`); `ClassicyCrashScreen` becomes part of the package's public exports.

- [ ] **Step 1: Write the failing test**

Append this case to the existing `describe` block in `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.test.tsx` (it already renders the full desktop under `ClassicyAppManagerProvider` with no mocks; keep its existing imports and `beforeEach`):

```tsx
	it("shows the Sad Mac crash screen when a child app throws during render", () => {
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});
		const Bomb = () => {
			throw new Error("boom");
		};
		const { container } = render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop>
					<Bomb />
				</ClassicyDesktop>
			</ClassicyAppManagerProvider>,
		);
		expect(container.querySelector(".classicyCrashScreen")).toBeInTheDocument();
		// The desktop itself is gone — the boundary replaced it entirely.
		expect(screen.queryByAltText("SimpleText")).not.toBeInTheDocument();
		consoleError.mockRestore();
	});
```

Also add `vi` to the existing vitest import at the top of the file:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd ~/classicy && pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.test.tsx
```

Expected: the new case FAILS (the uncaught `Bomb` error propagates — no boundary yet); the two pre-existing cases still pass.

- [ ] **Step 3: Wrap the desktop in the boundary**

In `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx`:

(a) Add the import alongside the other `@/SystemFolder` imports at the top:

```tsx
import { ClassicyCrashScreen } from "@/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen";
```

(b) Rename the existing exported component (line ~58) — change:

```tsx
export const ClassicyDesktop: FunctionalComponent<ClassicyDesktopProps> = ({
	children,
}) => {
```

to:

```tsx
const ClassicyDesktopInner: FunctionalComponent<ClassicyDesktopProps> = ({
	children,
}) => {
```

(c) Add the new exported wrapper at the very end of the file (after the closing `};` of `ClassicyDesktopInner`):

```tsx
export const ClassicyDesktop: FunctionalComponent<ClassicyDesktopProps> = ({
	children,
}) => (
	<ClassicyCrashScreen>
		<ClassicyDesktopInner>{children}</ClassicyDesktopInner>
	</ClassicyCrashScreen>
);
```

Nothing else in the file changes — the inner component keeps every hook, handler, and JSX exactly as-is.

- [ ] **Step 4: Export the boundary from the package**

In `src/index.ts`, next to the Boot export (line ~48), add:

```ts
export * from "./SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen";
```

- [ ] **Step 5: Run the Desktop tests to verify they pass**

```bash
cd ~/classicy && pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.test.tsx
```

Expected: PASS — all 3 cases (2 pre-existing + the new crash case).

- [ ] **Step 6: Commit**

```bash
cd ~/classicy
git add src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx src/index.ts src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.test.tsx
git commit -m "feat: wrap ClassicyDesktop in the Sad Mac crash boundary and export it"
```

---

### Task 3: Full verification + ship

**Files:**
- No new files; runs the whole suite and build.

**Interfaces:**
- Consumes: everything from Tasks 1–2.
- Produces: a green `main` ready to push (push = npm publish via CI; rt911 picks up the new version through its `"latest"` pin on the next commit).

- [ ] **Step 1: Run the entire test suite**

```bash
cd ~/classicy && pnpm exec vitest run
```

Expected: all test files pass, no regressions.

- [ ] **Step 2: Run the library build**

```bash
cd ~/classicy && pnpm build
```

Expected: exits 0; `dist/` contains the built library and `dist/types` the declarations. Confirm the asset made it into the bundle:

```bash
ls dist | grep -i sad
```

Expected: a hashed `sad-mac-*.png` (or the asset inlined — either is fine as long as the build passed).

- [ ] **Step 3: Lint the whole repo**

```bash
cd ~/classicy && pnpm exec biome check src/
```

Expected: no new errors versus `main`.

- [ ] **Step 4: Verify in a real browser (manual/agent-driven)**

Run the example app (`pnpm dev` in `~/classicy`), then in the browser console force a crash inside a rendered component (e.g. temporarily add `<Bomb/>` as a desktop child in the example entry, or use React DevTools to break a component). Confirm:
- black full-viewport screen with the pixelated Sad Mac centered,
- clicking anywhere reloads,
- pressing any key reloads.

Revert any temporary bomb code before the final commit.

- [ ] **Step 5: Ship**

```bash
cd ~/classicy && git push origin main
```

Pushing `main` auto-bumps + publishes to npm. rt911 requires **no code change** — its husky pre-commit runs `pnpm update classicy --latest` on the next commit.
