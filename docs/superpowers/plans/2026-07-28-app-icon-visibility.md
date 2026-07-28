# App Icon Visibility and Desktop Icon Balloon Help Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a `ClassicyApp` independently decide whether it shows a desktop icon and whether it appears in the derived Applications folder, and give desktop icons Mac OS 8-style balloon help.

**Architecture:** The Applications folder is derived at read time from desktop icon records, so both visibility axes are expressed as fields on the icon record (`hidden` for the desktop, `inApplications` for the folder) and `ClassicyApp` maps its props onto them. Balloon help cannot wrap a desktop icon — the existing `ClassicyBalloonHelp` wrapper div would break the icon's absolute positioning — so the balloon's timer/measure/portal logic is extracted into a `useClassicyBalloonHelp` hook that attaches to an element the caller already owns.

**Tech Stack:** React 19 + TypeScript, Zustand store with an event reducer, vitest + React Testing Library, SCSS, Biome for lint/format, pnpm.

**Spec:** `docs/superpowers/specs/2026-07-28-app-icon-visibility-design.md`

## Global Constraints

- Run tests with `pnpm vitest run <path>` for a single file and `pnpm test` for the full suite.
- `pnpm test` does NOT type-check. Run `pnpm build:source` (which runs `tsc -b`) before the final commit.
- Do NOT hand-edit `index.ts` barrel files — `generate-barrels` regenerates them during `pnpm build:source`.
- Everything stored on a desktop icon record must be JSON-serializable: the desktop state is persisted to `localStorage` under `classicyDesktopState`.
- Biome reformats large parts of the repo if run without a path. Scope it: `pnpm biome check --write <path>` on touched files only.
- Indentation in this repo is **tabs**. Match the surrounding file.
- Default balloon copy, used verbatim:
  - trash: `This is the Trash. Drag items here to get them out of the way. To remove them permanently, choose Empty Trash from the Special menu.`
  - drive: `This is a disk icon. To see what's on the disk, double-click the icon.`
- Known pre-existing quirk, explicitly **out of scope**: `ClassicyDesktopIconAdd` dedupes new icons by `appId` alone, so Finder's multiple drive icons (all `appId: "Finder.app"`) collide. Do not fix it here; just do not make it worse. Anywhere you touch the "icon already exists" path, keep matching on `appId` **and** `appName`, as the current code does.

---

### Task 1: Extract the balloon help hook

`ClassicyBalloonHelp` renders a wrapper `<div class="classicyBalloonHelpAnchor">` styled `position: relative; display: inline-block`. Desktop icons are `position: absolute` with inline `top`/`left`, so wrapping one re-anchors it to a collapsed 0x0 box and measures the wrong rect. This task moves the balloon's behavior into a hook that binds to an element the caller already has, and rebuilds `ClassicyBalloonHelp` on top of it with no change to its props, DOM, or behavior.

**Files:**
- Create: `src/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp.tsx`
- Create: `src/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.test.tsx`
- Create: `src/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp.test.tsx`
- Modify: `src/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.tsx` (whole file)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `type ClassicyBalloonPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right"` — moved here, still re-exported from `ClassicyBalloonHelp.tsx`
  - `interface ClassicyIconBalloonHelp { title?: string; content: string; position?: ClassicyBalloonPosition; delay?: number }`
  - `useClassicyBalloonHelp(anchorRef: RefObject<HTMLElement | null>, config?: ClassicyIconBalloonHelp): { handlers: { onMouseEnter: () => void; onMouseLeave: () => void }; balloon: ReactNode }`

**Note on test timing:** these tests use `delay: 0` and `await screen.findByText(...)` rather than fake timers. `findByText` polls with real timers, so a `setTimeout(..., 0)` resolves naturally and there is no `act()` warning to fight.

- [ ] **Step 1: Write characterization tests for the existing component**

These must pass **before** the refactor — they are the safety net proving the rewrite changed nothing.

Create `src/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";

const mockState = vi.hoisted(() => ({ disableBalloonHelp: false }));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					Manager: { Desktop: { disableBalloonHelp: mockState.disableBalloonHelp } },
				},
			}),
	}),
);

import { ClassicyBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp";

describe("ClassicyBalloonHelp", () => {
	it("renders its children inside an anchor element", () => {
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyBalloonHelp content="Opens the file.">
				<button type="button">Open</button>
			</ClassicyBalloonHelp>,
		);
		const child = screen.getByRole("button", { name: "Open" });
		expect(child.parentElement).toHaveClass("classicyBalloonHelpAnchor");
	});

	it("shows title and content after the delay elapses", async () => {
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyBalloonHelp title="Open" content="Opens the file." delay={0}>
				<button type="button">Open</button>
			</ClassicyBalloonHelp>,
		);
		fireEvent.mouseEnter(screen.getByRole("tooltip"));
		expect(await screen.findByText("Opens the file.")).toBeInTheDocument();
		expect(screen.getByText("Open", { selector: "p" })).toBeInTheDocument();
	});

	it("hides the balloon on mouse leave", async () => {
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyBalloonHelp content="Opens the file." delay={0}>
				<button type="button">Open</button>
			</ClassicyBalloonHelp>,
		);
		const anchor = screen.getByRole("tooltip");
		fireEvent.mouseEnter(anchor);
		expect(await screen.findByText("Opens the file.")).toBeInTheDocument();
		fireEvent.mouseLeave(anchor);
		expect(screen.queryByText("Opens the file.")).not.toBeInTheDocument();
	});

	it("does not show the balloon before the delay elapses", () => {
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyBalloonHelp content="Opens the file.">
				<button type="button">Open</button>
			</ClassicyBalloonHelp>,
		);
		fireEvent.mouseEnter(screen.getByRole("tooltip"));
		expect(screen.queryByText("Opens the file.")).not.toBeInTheDocument();
	});

	it("renders nothing when balloon help is globally disabled", async () => {
		mockState.disableBalloonHelp = true;
		render(
			<ClassicyBalloonHelp content="Opens the file." delay={0}>
				<button type="button">Open</button>
			</ClassicyBalloonHelp>,
		);
		fireEvent.mouseEnter(screen.getByRole("tooltip"));
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(screen.queryByText("Opens the file.")).not.toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run the characterization tests against the unchanged component**

Run: `pnpm vitest run src/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.test.tsx`
Expected: PASS (5 tests). If any fail, the test is wrong, not the component — fix the test before continuing.

- [ ] **Step 3: Write the failing test for the hook**

Create `src/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp.test.tsx`:

```tsx
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";

const mockState = vi.hoisted(() => ({ disableBalloonHelp: false }));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					Manager: { Desktop: { disableBalloonHelp: mockState.disableBalloonHelp } },
				},
			}),
	}),
);

import {
	type ClassicyIconBalloonHelp,
	useClassicyBalloonHelp,
} from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";

const Harness = ({ config }: { config?: ClassicyIconBalloonHelp }) => {
	const ref = useRef<HTMLDivElement>(null);
	const { handlers, balloon } = useClassicyBalloonHelp(ref, config);
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: test harness only
		<div ref={ref} data-testid="anchor" {...handlers}>
			anchor
			{balloon}
		</div>
	);
};

describe("useClassicyBalloonHelp", () => {
	it("shows the balloon on hover after the delay", async () => {
		mockState.disableBalloonHelp = false;
		render(<Harness config={{ content: "Drag items here.", delay: 0 }} />);
		fireEvent.mouseEnter(screen.getByTestId("anchor"));
		expect(await screen.findByText("Drag items here.")).toBeInTheDocument();
	});

	it("adds no DOM around the anchor element", () => {
		mockState.disableBalloonHelp = false;
		render(<Harness config={{ content: "Drag items here.", delay: 0 }} />);
		expect(screen.getByTestId("anchor")).not.toHaveClass(
			"classicyBalloonHelpAnchor",
		);
	});

	it("returns a null balloon when no config is supplied", async () => {
		mockState.disableBalloonHelp = false;
		render(<Harness />);
		fireEvent.mouseEnter(screen.getByTestId("anchor"));
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(screen.queryByText("Drag items here.")).not.toBeInTheDocument();
	});

	it("returns a null balloon when balloon help is globally disabled", async () => {
		mockState.disableBalloonHelp = true;
		render(<Harness config={{ content: "Drag items here.", delay: 0 }} />);
		fireEvent.mouseEnter(screen.getByTestId("anchor"));
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(screen.queryByText("Drag items here.")).not.toBeInTheDocument();
	});

	it("hides the balloon on mouse leave", async () => {
		mockState.disableBalloonHelp = false;
		render(<Harness config={{ content: "Drag items here.", delay: 0 }} />);
		const anchor = screen.getByTestId("anchor");
		fireEvent.mouseEnter(anchor);
		expect(await screen.findByText("Drag items here.")).toBeInTheDocument();
		fireEvent.mouseLeave(anchor);
		expect(screen.queryByText("Drag items here.")).not.toBeInTheDocument();
	});

	it("renders the title when supplied", async () => {
		mockState.disableBalloonHelp = false;
		render(
			<Harness config={{ title: "Trash", content: "Drag items here.", delay: 0 }} />,
		);
		fireEvent.mouseEnter(screen.getByTestId("anchor"));
		expect(await screen.findByText("Trash")).toBeInTheDocument();
	});
});
```

- [ ] **Step 4: Run the hook test to verify it fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp.test.tsx`
Expected: FAIL — `Failed to resolve import ".../useClassicyBalloonHelp"`.

- [ ] **Step 5: Create the hook**

Create `src/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp.tsx`. Move `readControlSize`, `containerPortalStyle`, `tailPositionClasses`, and `BalloonTail` out of `ClassicyBalloonHelp.tsx` into this file unchanged — copy them verbatim from the current `ClassicyBalloonHelp.tsx`, they are not reproduced here.

```tsx
import type { CSSProperties, FC, ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

export type ClassicyBalloonPosition =
	| "top-left"
	| "top-center"
	| "top-right"
	| "bottom-left"
	| "bottom-center"
	| "bottom-right";

/** Serializable balloon help description. Stored on desktop icon records, so
 *  every field must survive a JSON round-trip through localStorage. */
export interface ClassicyIconBalloonHelp {
	title?: string;
	content: string;
	position?: ClassicyBalloonPosition;
	delay?: number;
}

// ---- moved verbatim from ClassicyBalloonHelp.tsx ----
// const readControlSize = ...
// const containerPortalStyle = ...
// const tailPositionClasses = ...
// const BalloonTail: FC<{ className: string }> = ...
// -----------------------------------------------------

/**
 * Balloon help behavior — hover timer, anchor measurement, and the portal —
 * bound to an element the caller already owns. Callers that can accept an extra
 * wrapper element should use `ClassicyBalloonHelp` instead; this hook exists for
 * callers that cannot, such as absolutely positioned desktop icons.
 */
export const useClassicyBalloonHelp = (
	anchorRef: RefObject<HTMLElement | null>,
	config?: ClassicyIconBalloonHelp,
): {
	handlers: { onMouseEnter: () => void; onMouseLeave: () => void };
	balloon: ReactNode;
} => {
	const disableBalloonHelp = useAppManager(
		(s) => s.System.Manager.Desktop.disableBalloonHelp,
	);
	const [visible, setVisible] = useState(false);
	const [rect, setRect] = useState<DOMRect | null>(null);
	const [controlSize, setControlSize] = useState(0);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const delay = config?.delay ?? 600;
	const position = config?.position ?? "top-left";

	const show = () => {
		timerRef.current = setTimeout(() => {
			if (anchorRef.current) {
				setRect(anchorRef.current.getBoundingClientRect());
			}
			setControlSize(readControlSize());
			setVisible(true);
		}, delay);
	};

	const hide = () => {
		if (timerRef.current !== null) clearTimeout(timerRef.current);
		setVisible(false);
		setRect(null);
	};

	useEffect(
		() => () => {
			if (timerRef.current !== null) clearTimeout(timerRef.current);
		},
		[],
	);

	const balloon =
		!config || disableBalloonHelp || !visible || !rect
			? null
			: createPortal(
					<div
						className="classicyBalloonHelpContainer"
						style={containerPortalStyle(position, rect, controlSize)}
					>
						<div className="classicyBalloonHelp">
							{config.title && (
								<p className="classicyBalloonHelpTitle">{config.title}</p>
							)}
							<p className="classicyBalloonHelpContent">{config.content}</p>
						</div>
						<BalloonTail className={tailPositionClasses(position)} />
					</div>,
					document.getElementById("classicyDesktop") ?? document.body,
				);

	return { handlers: { onMouseEnter: show, onMouseLeave: hide }, balloon };
};
```

- [ ] **Step 6: Run the hook test to verify it passes**

Run: `pnpm vitest run src/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 7: Rewrite `ClassicyBalloonHelp` over the hook**

Replace the entire contents of `src/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.tsx` with:

```tsx
import "./ClassicyBalloonHelp.scss";
import type { FC, PropsWithChildren } from "react";
import { useRef } from "react";
import {
	type ClassicyBalloonPosition,
	useClassicyBalloonHelp,
} from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";

export type { ClassicyBalloonPosition };

interface ClassicyBalloonHelpProps extends PropsWithChildren {
	title?: string;
	content: string;
	delay?: number;
	position?: ClassicyBalloonPosition;
	className?: string;
}

export const ClassicyBalloonHelp: FC<ClassicyBalloonHelpProps> = ({
	children,
	title,
	content,
	delay,
	position,
	className,
}) => {
	const anchorRef = useRef<HTMLDivElement>(null);
	const { handlers, balloon } = useClassicyBalloonHelp(anchorRef, {
		title,
		content,
		delay,
		position,
	});

	return (
		<div
			ref={anchorRef}
			role="tooltip"
			className={["classicyBalloonHelpAnchor", className]
				.filter(Boolean)
				.join(" ")}
			{...handlers}
		>
			{children}
			{balloon}
		</div>
	);
};
```

Note: the `.scss` import stays in this file, and the hook file does **not** import it — the hook's portal markup relies on the stylesheet already being loaded by whichever component uses it. Task 2 adds the import to `ClassicyDesktopIcon.tsx`.

- [ ] **Step 8: Run both test files to verify the refactor changed nothing**

Run: `pnpm vitest run src/SystemFolder/SystemResources/BalloonHelp/`
Expected: PASS (11 tests). The 5 characterization tests passing unchanged is the point of this task.

- [ ] **Step 9: Format and commit**

```bash
pnpm biome check --write src/SystemFolder/SystemResources/BalloonHelp/
git add src/SystemFolder/SystemResources/BalloonHelp/
git commit -m "refactor(balloonhelp): extract useClassicyBalloonHelp hook

Lets callers that cannot accept a wrapper element -- absolutely
positioned desktop icons -- attach balloon help to their own element.
ClassicyBalloonHelp is now a thin wrapper over the hook."
```

---

### Task 2: Balloon help on desktop icons, with stock system copy

**Files:**
- Create: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconBalloons.ts`
- Create: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconBalloons.test.ts`
- Create: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.balloonhelp.test.tsx`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.tsx`

**Interfaces:**
- Consumes: `ClassicyIconBalloonHelp`, `useClassicyBalloonHelp` from Task 1.
- Produces:
  - `defaultBalloonForKind(kind: string, title: string): ClassicyIconBalloonHelp | undefined`
  - `normalizeIconBalloonHelp(value: string | ClassicyIconBalloonHelp | undefined, defaultTitle: string): ClassicyIconBalloonHelp | undefined` (used by Task 5)
  - `ClassicyDesktopIcon` prop `balloonHelp?: ClassicyIconBalloonHelp`

- [ ] **Step 1: Write the failing test for the balloon copy module**

Create `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconBalloons.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
	defaultBalloonForKind,
	normalizeIconBalloonHelp,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconBalloons";

describe("defaultBalloonForKind", () => {
	it("returns stock copy for the trash", () => {
		const balloon = defaultBalloonForKind("trash", "Trash");
		expect(balloon?.title).toBe("Trash");
		expect(balloon?.content).toBe(
			"This is the Trash. Drag items here to get them out of the way. To remove them permanently, choose Empty Trash from the Special menu.",
		);
	});

	it("returns stock copy for a drive", () => {
		const balloon = defaultBalloonForKind("drive", "Macintosh HD");
		expect(balloon?.title).toBe("Macintosh HD");
		expect(balloon?.content).toBe(
			"This is a disk icon. To see what's on the disk, double-click the icon.",
		);
	});

	it("returns undefined for kinds with no stock copy", () => {
		expect(defaultBalloonForKind("app_shortcut", "TV")).toBeUndefined();
		expect(defaultBalloonForKind("icon", "Thing")).toBeUndefined();
	});

	it("matches kind case-insensitively", () => {
		expect(defaultBalloonForKind("Trash", "Trash")).toBeDefined();
	});
});

describe("normalizeIconBalloonHelp", () => {
	it("turns a string into content titled with the default title", () => {
		expect(normalizeIconBalloonHelp("Opens the editor.", "Foo")).toEqual({
			title: "Foo",
			content: "Opens the editor.",
		});
	});

	it("keeps an explicit title on the object form", () => {
		expect(
			normalizeIconBalloonHelp(
				{ title: "Custom", content: "Opens the editor.", position: "bottom-center" },
				"Foo",
			),
		).toEqual({
			title: "Custom",
			content: "Opens the editor.",
			position: "bottom-center",
		});
	});

	it("fills in the default title when the object omits one", () => {
		expect(
			normalizeIconBalloonHelp({ content: "Opens the editor." }, "Foo"),
		).toEqual({ title: "Foo", content: "Opens the editor." });
	});

	it("returns undefined for undefined or empty input", () => {
		expect(normalizeIconBalloonHelp(undefined, "Foo")).toBeUndefined();
		expect(normalizeIconBalloonHelp("", "Foo")).toBeUndefined();
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconBalloons.test.ts`
Expected: FAIL — module cannot be resolved.

- [ ] **Step 3: Create the balloon copy module**

Create `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconBalloons.ts`:

```ts
import type { ClassicyIconBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";

/**
 * Stock balloon copy for the system's own desktop icons, keyed by icon kind.
 * Resolved at render time rather than stored on the icon record, so revised
 * copy ships with the library instead of staying frozen in a user's
 * localStorage.
 */
const DEFAULT_BALLOON_CONTENT: Record<string, string> = {
	trash:
		"This is the Trash. Drag items here to get them out of the way. To remove them permanently, choose Empty Trash from the Special menu.",
	drive:
		"This is a disk icon. To see what's on the disk, double-click the icon.",
};

export const defaultBalloonForKind = (
	kind: string,
	title: string,
): ClassicyIconBalloonHelp | undefined => {
	const content = DEFAULT_BALLOON_CONTENT[kind?.toLowerCase()];
	return content ? { title, content } : undefined;
};

/**
 * Widens the app-facing `string | ClassicyIconBalloonHelp` prop into the single
 * object form stored on the icon record, titling it with the app's name unless
 * the caller supplied a title.
 */
export const normalizeIconBalloonHelp = (
	value: string | ClassicyIconBalloonHelp | undefined,
	defaultTitle: string,
): ClassicyIconBalloonHelp | undefined => {
	if (!value) return undefined;
	if (typeof value === "string") return { title: defaultTitle, content: value };
	return { ...value, title: value.title ?? defaultTitle };
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconBalloons.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Write the failing test for the icon component**

Create `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.balloonhelp.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockState = vi.hoisted(() => ({ disableBalloonHelp: false }));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					Manager: {
						Desktop: {
							selectedIcons: [] as string[],
							icons: [{ appId: "TestApp", location: [100, 200] }],
							disableBalloonHelp: mockState.disableBalloonHelp,
						},
						Applications: {
							apps: {
								"Finder.app": { windows: [] as unknown[] },
								TestApp: { open: false },
							},
						},
					},
				},
			}),
		useAppManagerDispatch: () => mockDispatch,
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss",
	() => ({}),
);

import { ClassicyDesktopIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon";

const defaultProps = {
	appId: "TestApp",
	appName: "Test Application",
	icon: "/icons/test.png",
	kind: "app_shortcut",
};

const iconRoot = () => screen.getByRole("button");

describe("ClassicyDesktopIcon balloon help", () => {
	it("shows app-supplied balloon help on hover", async () => {
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyDesktopIcon
				{...defaultProps}
				balloonHelp={{ content: "Opens the editor.", delay: 0 }}
			/>,
		);
		fireEvent.mouseEnter(iconRoot());
		expect(await screen.findByText("Opens the editor.")).toBeInTheDocument();
	});

	it("hides it again on mouse leave", async () => {
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyDesktopIcon
				{...defaultProps}
				balloonHelp={{ content: "Opens the editor.", delay: 0 }}
			/>,
		);
		fireEvent.mouseEnter(iconRoot());
		expect(await screen.findByText("Opens the editor.")).toBeInTheDocument();
		fireEvent.mouseLeave(iconRoot());
		expect(screen.queryByText("Opens the editor.")).not.toBeInTheDocument();
	});

	it("keeps the icon root free of a balloon wrapper and its inline position", () => {
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyDesktopIcon
				{...defaultProps}
				balloonHelp={{ content: "Opens the editor.", delay: 0 }}
			/>,
		);
		const root = iconRoot();
		expect(root).toHaveClass("classicyDesktopIcon");
		expect(root.parentElement).not.toHaveClass("classicyBalloonHelpAnchor");
		// location [100, 200] is rendered as top: 200px / left: 100px
		expect(root).toHaveStyle({ top: "200px", left: "100px" });
	});

	it("is suppressed when balloon help is globally disabled", async () => {
		mockState.disableBalloonHelp = true;
		render(
			<ClassicyDesktopIcon
				{...defaultProps}
				balloonHelp={{ content: "Opens the editor.", delay: 0 }}
			/>,
		);
		fireEvent.mouseEnter(iconRoot());
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(screen.queryByText("Opens the editor.")).not.toBeInTheDocument();
	});

	it("shows stock copy for the trash with no balloonHelp prop", async () => {
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyDesktopIcon
				appId="Trash"
				appName="Trash"
				icon="/icons/trash.png"
				kind="trash"
			/>,
		);
		fireEvent.mouseEnter(iconRoot());
		expect(
			await screen.findByText(/This is the Trash\./, {}, { timeout: 2000 }),
		).toBeInTheDocument();
	});

	it("shows stock copy for a drive with no balloonHelp prop", async () => {
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyDesktopIcon
				appId="Finder.app"
				appName="Macintosh HD"
				icon="/icons/hd.png"
				kind="drive"
			/>,
		);
		fireEvent.mouseEnter(iconRoot());
		expect(
			await screen.findByText(/This is a disk icon\./, {}, { timeout: 2000 }),
		).toBeInTheDocument();
	});

	it("lets an explicit balloonHelp override the stock copy for its kind", async () => {
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyDesktopIcon
				appId="Trash"
				appName="Trash"
				icon="/icons/trash.png"
				kind="trash"
				balloonHelp={{ content: "Custom trash text.", delay: 0 }}
			/>,
		);
		fireEvent.mouseEnter(iconRoot());
		expect(await screen.findByText("Custom trash text.")).toBeInTheDocument();
		expect(screen.queryByText(/This is the Trash\./)).not.toBeInTheDocument();
	});

	it("shows nothing for an app icon with no balloonHelp", async () => {
		mockState.disableBalloonHelp = false;
		const { container } = render(<ClassicyDesktopIcon {...defaultProps} />);
		fireEvent.mouseEnter(iconRoot());
		await new Promise((resolve) => setTimeout(resolve, 10));
		// The icon's own label is a <p>, so assert on the balloon container
		// rather than on paragraphs.
		expect(
			container.ownerDocument.querySelector(".classicyBalloonHelpContainer"),
		).toBeNull();
	});
});
```

The two stock-copy tests use the default 600ms delay (the record supplies no
`delay`), hence the explicit 2000ms `findByText` timeout.

- [ ] **Step 6: Run it to verify it fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.balloonhelp.test.tsx`
Expected: FAIL — TypeScript/runtime rejects the unknown `balloonHelp` prop and no balloon text ever appears.

- [ ] **Step 7: Wire the hook into `ClassicyDesktopIcon`**

In `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.tsx`:

Add imports alongside the existing ones:

```tsx
import "@/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.scss";
import {
	type ClassicyIconBalloonHelp,
	useClassicyBalloonHelp,
} from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";
import { defaultBalloonForKind } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconBalloons";
```

Add to `ClassicyDesktopIconProps`:

```tsx
	balloonHelp?: ClassicyIconBalloonHelp;
```

Destructure `balloonHelp` in the component's parameter list, after `contextMenu`.

After the existing `const iconRef = useRef<HTMLDivElement>(null);`, add:

```tsx
	// Stock copy is resolved here, not stored on the icon record, so revised
	// text ships with the library rather than staying frozen in localStorage.
	const effectiveBalloonHelp =
		balloonHelp ?? defaultBalloonForKind(kind, label ?? appName);
	const { handlers: balloonHandlers, balloon } = useClassicyBalloonHelp(
		iconRef,
		effectiveBalloonHelp,
	);
```

On the root `<div role="button">`, add `{...balloonHandlers}` immediately after
the `style` prop, and render `{balloon}` as the last child, after the `<p>`:

```tsx
			<p>{label ? label : appName}</p>
			{balloon}
		</div>
```

- [ ] **Step 8: Run the new and existing icon tests**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.balloonhelp.test.tsx src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.test.tsx`
Expected: PASS. The pre-existing `ClassicyDesktopIcon.test.tsx` must still pass unchanged — its store mock has no `disableBalloonHelp` key, which reads as `undefined` and therefore leaves balloons enabled.

- [ ] **Step 9: Format and commit**

```bash
pnpm biome check --write src/SystemFolder/SystemResources/Desktop/
git add src/SystemFolder/SystemResources/Desktop/
git commit -m "feat(desktop): balloon help on desktop icons

Adds a balloonHelp prop to ClassicyDesktopIcon, attached via
useClassicyBalloonHelp so the icon gains no wrapper element, plus stock
Mac OS 8 copy for the Trash and drive icons resolved by kind at render
time."
```

---

### Task 3: Icon record fields and refresh-on-re-add

**Files:**
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx:28-44` (the `ClassicyStoreSystemDesktopManagerIcon` interface)
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.tsx:161-212` (the `ClassicyDesktopIconAdd` case)
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconEventHandler.test.ts`

**Interfaces:**
- Consumes: `ClassicyIconBalloonHelp` from Task 1.
- Produces: icon record fields `inApplications?: boolean` (undefined means included) and `balloonHelp?: ClassicyIconBalloonHelp`; `ClassicyDesktopIconAdd` accepts matching `inApplications` and `balloonHelp` action fields and refreshes them on re-add.

- [ ] **Step 1: Write the failing tests**

Append to `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconEventHandler.test.ts`. Reuse that file's existing `makeStore()` helper and its `classicyDesktopIconEventHandler` import — do not redefine them.

```ts
describe("ClassicyDesktopIconAdd new fields", () => {
	const addAction = (extra: Record<string, unknown> = {}) => ({
		type: "ClassicyDesktopIconAdd",
		app: { id: "TV.app", name: "TV", icon: "/icons/tv.png" },
		kind: "app_shortcut",
		...extra,
	});

	it("persists inApplications: false", () => {
		const ds = classicyDesktopIconEventHandler(
			makeStore(),
			addAction({ inApplications: false }),
		);
		const icon = ds.System.Manager.Desktop.icons.find(
			(i) => i.appId === "TV.app",
		);
		expect(icon?.inApplications).toBe(false);
	});

	it("leaves inApplications undefined when not supplied", () => {
		const ds = classicyDesktopIconEventHandler(makeStore(), addAction());
		const icon = ds.System.Manager.Desktop.icons.find(
			(i) => i.appId === "TV.app",
		);
		expect(icon?.inApplications).toBeUndefined();
	});

	it("persists balloonHelp", () => {
		const ds = classicyDesktopIconEventHandler(
			makeStore(),
			addAction({
				balloonHelp: { title: "TV", content: "Watch TV.", delay: 250 },
			}),
		);
		const icon = ds.System.Manager.Desktop.icons.find(
			(i) => i.appId === "TV.app",
		);
		expect(icon?.balloonHelp).toEqual({
			title: "TV",
			content: "Watch TV.",
			position: undefined,
			delay: 250,
		});
	});

	it("ignores a malformed balloonHelp payload", () => {
		const ds = classicyDesktopIconEventHandler(
			makeStore(),
			addAction({ balloonHelp: { title: "TV" } }),
		);
		const icon = ds.System.Manager.Desktop.icons.find(
			(i) => i.appId === "TV.app",
		);
		expect(icon?.balloonHelp).toBeUndefined();
	});

	it("refreshes inApplications, hidden and balloonHelp on re-add", () => {
		let ds = classicyDesktopIconEventHandler(
			makeStore(),
			addAction({ balloonHelp: { content: "Old text." } }),
		);
		ds = classicyDesktopIconEventHandler(
			ds,
			addAction({
				hidden: true,
				inApplications: false,
				balloonHelp: { content: "New text." },
			}),
		);
		const icon = ds.System.Manager.Desktop.icons.find(
			(i) => i.appId === "TV.app",
		);
		expect(icon?.hidden).toBe(true);
		expect(icon?.inApplications).toBe(false);
		expect(icon?.balloonHelp?.content).toBe("New text.");
	});

	it("preserves a user-moved location across a re-add", () => {
		let ds = classicyDesktopIconEventHandler(makeStore(), addAction());
		ds = classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconMove",
			app: { id: "TV.app" },
			location: [42, 84],
		});
		ds = classicyDesktopIconEventHandler(
			ds,
			addAction({ balloonHelp: { content: "New text." } }),
		);
		const icon = ds.System.Manager.Desktop.icons.find(
			(i) => i.appId === "TV.app",
		);
		expect(icon?.location).toEqual([42, 84]);
	});

	it("re-flows the desktop grid when hidden changes on re-add", () => {
		let ds = classicyDesktopIconEventHandler(makeStore(), addAction());
		ds = classicyDesktopIconEventHandler(ds, {
			type: "ClassicyDesktopIconAdd",
			app: { id: "News.app", name: "News", icon: "/icons/news.png" },
			kind: "app_shortcut",
		});
		const newsBefore = ds.System.Manager.Desktop.icons.find(
			(i) => i.appId === "News.app",
		)?.location;

		ds = classicyDesktopIconEventHandler(ds, addAction({ hidden: true }));
		const newsAfter = ds.System.Manager.Desktop.icons.find(
			(i) => i.appId === "News.app",
		)?.location;

		// TV.app no longer occupies a grid slot, so News.app moves up into it.
		expect(newsAfter).not.toEqual(newsBefore);
	});
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconEventHandler.test.ts`
Expected: FAIL on the new `describe` block (fields undefined, no refresh, no re-flow); every pre-existing test in the file still passes.

- [ ] **Step 3: Add the fields to the icon record**

In `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx`, import the type and add two fields to `ClassicyStoreSystemDesktopManagerIcon`, after the existing `hidden` field:

```tsx
import type { ClassicyIconBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";
```

```tsx
	/** When false, the icon is excluded from the derived Applications folder.
	 * Undefined means included, so icons persisted before this field existed
	 * keep their current behavior. */
	inApplications?: boolean;
	/** Balloon help shown when the pointer rests on the icon. Stock copy for
	 * system kinds (trash, drive) is resolved at render time instead — see
	 * ClassicyDesktopIconBalloons. */
	balloonHelp?: ClassicyIconBalloonHelp;
```

- [ ] **Step 4: Read the new fields in the reducer**

In `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.tsx`, add this helper above `classicyDesktopIconEventHandler` (and import the two types):

```ts
import type {
	ClassicyBalloonPosition,
	ClassicyIconBalloonHelp,
} from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";
```

```ts
// Actions arrive untyped, and whatever lands here is persisted to localStorage,
// so balloon payloads are validated field by field rather than cast.
const readBalloonHelp = (
	value: unknown,
): ClassicyIconBalloonHelp | undefined => {
	if (typeof value !== "object" || value === null) return undefined;
	const candidate = value as Record<string, unknown>;
	if (typeof candidate.content !== "string") return undefined;
	return {
		content: candidate.content,
		title: typeof candidate.title === "string" ? candidate.title : undefined,
		position:
			typeof candidate.position === "string"
				? (candidate.position as ClassicyBalloonPosition)
				: undefined,
		delay: typeof candidate.delay === "number" ? candidate.delay : undefined,
	};
};
```

In the `ClassicyDesktopIconAdd` case, add two properties to the object pushed
onto `ds.System.Manager.Desktop.icons`, after the existing `hidden` property:

```ts
					inApplications: action.inApplications === false ? false : undefined,
					balloonHelp: readBalloonHelp(action.balloonHelp),
```

- [ ] **Step 5: Restructure the refresh branch**

Still in the `ClassicyDesktopIconAdd` case, replace the whole
`} else if (Array.isArray(action.contextMenu)) { ... }` branch with:

```ts
			} else {
				// Icons persist to localStorage, so an app whose registration changed
				// between sessions would otherwise keep its stale record forever.
				// Code-derived fields are refreshed on every re-add; location and
				// label are user state and are left alone.
				const existing = ds.System.Manager.Desktop.icons.find(
					(i) => i.appId === action.app.id && i.appName === action.app.name,
				);
				if (existing) {
					if (Array.isArray(action.contextMenu)) {
						existing.contextMenu = action.contextMenu as ClassicyMenuItem[];
					}
					const nextHidden = action.hidden === true ? true : undefined;
					const hiddenChanged = existing.hidden !== nextHidden;
					existing.hidden = nextHidden;
					existing.inApplications =
						action.inApplications === false ? false : undefined;
					existing.balloonHelp = readBalloonHelp(action.balloonHelp);

					// Hidden icons do not consume a grid slot, so a change in either
					// direction has to re-flow the remaining icons.
					if (hiddenChanged) {
						ds.System.Manager.Desktop.icons = cleanupDesktopIcons(
							ds.System.Manager.Appearance.activeTheme,
							ds.System.Manager.Desktop.icons,
						);
					}
				}
			}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Desktop/`
Expected: PASS — the whole Desktop directory, including Tasks 1 and 2's tests.

- [ ] **Step 7: Format and commit**

```bash
pnpm biome check --write src/SystemFolder/SystemResources/Desktop/
git add src/SystemFolder/SystemResources/Desktop/
git commit -m "feat(desktop): store inApplications and balloonHelp on icon records

Adds the two fields and refreshes all code-derived icon fields whenever an
existing icon is re-added, so a persisted record cannot pin an app to a
registration it no longer declares. Re-flows the grid when hidden flips."
```

---

### Task 4: Exclude opted-out icons from the Applications folder

**Files:**
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileSystemApplications.ts`
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileSystemApplications.test.ts`

**Interfaces:**
- Consumes: the `inApplications` icon field from Task 3.
- Produces: `buildApplicationsFolder` and `withApplicationsFolder` both skip icons with `inApplications === false`.

- [ ] **Step 1: Write the failing tests**

Append to `src/SystemFolder/SystemResources/File/ClassicyFileSystemApplications.test.ts`, reusing that file's existing `appIcon` helper. Add `withApplicationsFolder` to the existing import from `ClassicyFileSystemApplications`.

```ts
describe("Applications folder opt-out", () => {
	it("excludes an app_shortcut icon with inApplications: false", () => {
		const folder = buildApplicationsFolder([
			appIcon("TV.app", "TV"),
			{ ...appIcon("Secret.app", "Secret"), inApplications: false },
		]);

		expect(folder.TV).toBeDefined();
		expect(folder.Secret).toBeUndefined();
	});

	it("includes icons where inApplications is undefined", () => {
		const folder = buildApplicationsFolder([appIcon("TV.app", "TV")]);
		expect(folder.TV).toBeDefined();
	});

	it("leaves the tree untouched when every app_shortcut opts out", () => {
		const tree = {
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				_icon: "/icons/hd.png",
			},
		};
		const result = withApplicationsFolder(tree, [
			{ ...appIcon("Secret.app", "Secret"), inApplications: false },
		]);

		expect(result).toBe(tree);
	});

	it("still merges Applications when at least one app opts in", () => {
		const tree = {
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				_icon: "/icons/hd.png",
			},
		};
		const result = withApplicationsFolder(tree, [
			appIcon("TV.app", "TV"),
			{ ...appIcon("Secret.app", "Secret"), inApplications: false },
		]);

		expect(result["Macintosh HD"].Applications.TV).toBeDefined();
		expect(result["Macintosh HD"].Applications.Secret).toBeUndefined();
	});
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystemApplications.test.ts`
Expected: FAIL — `Secret` is present in the folder and `withApplicationsFolder` merges an Applications folder it should have skipped.

- [ ] **Step 3: Add the shared predicate and use it in both functions**

In `src/SystemFolder/SystemResources/File/ClassicyFileSystemApplications.ts`, add below `APP_SHORTCUT_ICON_KIND`:

```ts
/** An icon belongs in the derived Applications folder when it is an app
 *  shortcut that has not opted out. Undefined `inApplications` means opted in,
 *  so icons persisted before the field existed keep appearing. */
const isApplicationsEntry = (
	icon: ClassicyStoreSystemDesktopManagerIcon,
): boolean =>
	icon.kind === APP_SHORTCUT_ICON_KIND && icon.inApplications !== false;
```

In `buildApplicationsFolder`, replace:

```ts
		if (icon.kind !== APP_SHORTCUT_ICON_KIND) continue;
```

with:

```ts
		if (!isApplicationsEntry(icon)) continue;
```

In `withApplicationsFolder`, replace:

```ts
	if (!icons.some((i) => i.kind === APP_SHORTCUT_ICON_KIND)) return tree;
```

with:

```ts
	if (!icons.some(isApplicationsEntry)) return tree;
```

Also update the `buildApplicationsFolder` doc comment's first line to read:
`Derives the virtual "Applications" folder from the desktop's registered app-shortcut icons that have not opted out.`

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystemApplications.test.ts`
Expected: PASS (all tests in the file, old and new).

- [ ] **Step 5: Format and commit**

```bash
pnpm biome check --write src/SystemFolder/SystemResources/File/
git add src/SystemFolder/SystemResources/File/
git commit -m "feat(file): honor inApplications when deriving the Applications folder"
```

---

### Task 5: The `ClassicyApp` props

**Files:**
- Modify: `src/SystemFolder/SystemResources/App/ClassicyApp.tsx`
- Modify: `src/SystemFolder/SystemResources/App/ClassicyApp.applicationsfolder.test.tsx`

**Interfaces:**
- Consumes: `normalizeIconBalloonHelp` (Task 2), the `inApplications`/`balloonHelp` action fields (Task 3).
- Produces: `ClassicyAppProps` gains `showDesktopIcon?: boolean`, `showInApplicationsFolder?: boolean`, and `desktopIconBalloonHelp?: string | ClassicyIconBalloonHelp`; `noDesktopIcon` and `inApplicationsFolder` become deprecated aliases.

Registration matrix, from the spec:

| `drawDesktopIcon` | `listInApplications` | Dispatch |
| --- | --- | --- |
| true | true | `ClassicyDesktopIconAdd` |
| false | true | `ClassicyDesktopIconAdd` with `hidden: true` |
| true | false | `ClassicyDesktopIconAdd` with `inApplications: false` |
| false | false | `ClassicyDesktopIconRemove` |

- [ ] **Step 1: Rewrite the visibility test file**

Replace the `describe` block in `src/SystemFolder/SystemResources/App/ClassicyApp.applicationsfolder.test.tsx` (keep the file's existing imports and mocks). Extend the `IconAddAction` type and add an actions helper for removals:

```tsx
type IconAddAction = {
	type: string;
	kind?: string;
	hidden?: boolean;
	inApplications?: boolean;
	balloonHelp?: { title?: string; content: string };
	app?: { id?: string };
};

const iconAddActions = (): IconAddAction[] =>
	mockDispatch.mock.calls
		.map((call) => call[0] as IconAddAction)
		.filter((a) => a.type === "ClassicyDesktopIconAdd");

const iconRemoveActions = (): IconAddAction[] =>
	mockDispatch.mock.calls
		.map((call) => call[0] as IconAddAction)
		.filter((a) => a.type === "ClassicyDesktopIconRemove");

describe("ClassicyApp icon visibility", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
	});

	it("shows a desktop icon and lists in Applications by default", () => {
		render(<ClassicyApp id="Reg.app" name="Reg" icon="/icons/reg.png" />);
		const adds = iconAddActions();
		expect(adds).toHaveLength(1);
		expect(adds[0].kind).toBe("app_shortcut");
		expect(adds[0].hidden).toBeFalsy();
		expect(adds[0].inApplications).toBeUndefined();
	});

	it("registers a hidden icon for showDesktopIcon={false}", () => {
		render(
			<ClassicyApp
				id="Panel.app"
				name="Panel"
				icon="/icons/panel.png"
				showDesktopIcon={false}
			/>,
		);
		const adds = iconAddActions();
		expect(adds).toHaveLength(1);
		expect(adds[0].hidden).toBe(true);
		expect(adds[0].inApplications).toBeUndefined();
	});

	it("registers a visible icon opted out of Applications", () => {
		render(
			<ClassicyApp
				id="Solo.app"
				name="Solo"
				icon="/icons/solo.png"
				showInApplicationsFolder={false}
			/>,
		);
		const adds = iconAddActions();
		expect(adds).toHaveLength(1);
		expect(adds[0].hidden).toBeFalsy();
		expect(adds[0].inApplications).toBe(false);
	});

	it("removes the icon when both surfaces are off", () => {
		render(
			<ClassicyApp
				id="Ghost.app"
				name="Ghost"
				icon="/icons/ghost.png"
				showDesktopIcon={false}
				showInApplicationsFolder={false}
			/>,
		);
		expect(iconAddActions()).toHaveLength(0);
		const removes = iconRemoveActions();
		expect(removes).toHaveLength(1);
		expect(removes[0].app?.id).toBe("Ghost.app");
	});

	it("registers no icon at all for an extension, whatever the props say", () => {
		render(
			<ClassicyApp
				id="Ext.app"
				name="Ext"
				icon="/icons/ext.png"
				extension
				showDesktopIcon
				showInApplicationsFolder
			/>,
		);
		expect(iconAddActions()).toHaveLength(0);
		expect(iconRemoveActions()).toHaveLength(0);
	});

	it("attaches normalized balloon help titled with the app name", () => {
		render(
			<ClassicyApp
				id="TV.app"
				name="TV"
				icon="/icons/tv.png"
				desktopIconBalloonHelp="Watch TV."
			/>,
		);
		expect(iconAddActions()[0].balloonHelp).toEqual({
			title: "TV",
			content: "Watch TV.",
		});
	});

	it("passes the object form of balloon help through", () => {
		render(
			<ClassicyApp
				id="TV.app"
				name="TV"
				icon="/icons/tv.png"
				desktopIconBalloonHelp={{
					title: "Television",
					content: "Watch TV.",
					position: "bottom-center",
				}}
			/>,
		);
		expect(iconAddActions()[0].balloonHelp).toEqual({
			title: "Television",
			content: "Watch TV.",
			position: "bottom-center",
		});
	});
});

describe("ClassicyApp deprecated icon props", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
	});

	it("maps noDesktopIcon to a hidden icon", () => {
		render(
			<ClassicyApp
				id="Panel.app"
				name="Panel"
				icon="/icons/panel.png"
				noDesktopIcon
			/>,
		);
		const adds = iconAddActions();
		expect(adds).toHaveLength(1);
		expect(adds[0].hidden).toBe(true);
	});

	it("still honors noDesktopIcon + inApplicationsFolder", () => {
		render(
			<ClassicyApp
				id="DriveSetup.app"
				name="Drive Setup"
				icon="/icons/disk.png"
				noDesktopIcon
				inApplicationsFolder
			/>,
		);
		const adds = iconAddActions();
		expect(adds).toHaveLength(1);
		expect(adds[0].kind).toBe("app_shortcut");
		expect(adds[0].hidden).toBe(true);
		expect(adds[0].app?.id).toBe("DriveSetup.app");
	});

	it("maps inApplicationsFolder={false} to an opt-out", () => {
		render(
			<ClassicyApp
				id="Solo.app"
				name="Solo"
				icon="/icons/solo.png"
				inApplicationsFolder={false}
			/>,
		);
		expect(iconAddActions()[0].inApplications).toBe(false);
	});

	it("lets the new props win when both forms are passed", () => {
		render(
			<ClassicyApp
				id="Both.app"
				name="Both"
				icon="/icons/both.png"
				noDesktopIcon
				showDesktopIcon
			/>,
		);
		expect(iconAddActions()[0].hidden).toBeFalsy();
	});
});
```

Note the deliberate behavior change captured by the first deprecated test:
`noDesktopIcon` alone now registers a hidden icon (so the app appears in
Applications), where it previously registered nothing.

- [ ] **Step 2: Run to verify the new tests fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/App/ClassicyApp.applicationsfolder.test.tsx`
Expected: FAIL — unknown props, no `inApplications`/`balloonHelp` on the dispatched action, and no removal dispatch.

- [ ] **Step 3: Add the props**

In `src/SystemFolder/SystemResources/App/ClassicyApp.tsx`, add the import:

```tsx
import type { ClassicyIconBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";
import { normalizeIconBalloonHelp } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconBalloons";
```

Replace the existing `noDesktopIcon` and `inApplicationsFolder` declarations in
`ClassicyAppProps` with:

```tsx
	/** Draw an icon for this app on the desktop. Defaults to true. Ignored for
	 *  `extension` apps, which are background-only. */
	showDesktopIcon?: boolean;
	/** List this app in the derived Applications folder. Defaults to true, and
	 *  is independent of `showDesktopIcon` — an app can appear on the desktop
	 *  but not in Applications, or the reverse. Ignored for `extension` apps. */
	showInApplicationsFolder?: boolean;
	/** Balloon help for this app's desktop icon. A bare string supplies the
	 *  content and titles the balloon with the app's name. */
	desktopIconBalloonHelp?: string | ClassicyIconBalloonHelp;
	/** @deprecated Use `showDesktopIcon={false}`. */
	noDesktopIcon?: boolean;
	/** @deprecated Use `showInApplicationsFolder`. Note that this no longer
	 *  needs to accompany `noDesktopIcon` — Applications membership now
	 *  defaults to true on its own. */
	inApplicationsFolder?: boolean;
```

Destructure `showDesktopIcon`, `showInApplicationsFolder`, and
`desktopIconBalloonHelp` alongside the existing `noDesktopIcon` /
`inApplicationsFolder` entries.

- [ ] **Step 4: Resolve the props and rewrite the registration branch**

Above the registration `useEffect`, add:

```tsx
	// New props win over their deprecated counterparts. Both surfaces default
	// to on; `extension` overrides both below.
	const drawDesktopIcon = showDesktopIcon ?? !noDesktopIcon;
	const listInApplications =
		showInApplicationsFolder ?? inApplicationsFolder ?? true;
	// Serialized so the effect's dependency list is stable across renders that
	// pass an inline object literal.
	const balloonHelpKey = JSON.stringify(
		normalizeIconBalloonHelp(desktopIconBalloonHelp, name) ?? null,
	);
```

Inside the effect, replace the whole `if (!extension) { ... }` block with:

```tsx
		if (!extension) {
			const balloonHelp: ClassicyIconBalloonHelp | null =
				JSON.parse(balloonHelpKey);
			if (drawDesktopIcon || listInApplications) {
				desktopEventDispatch({
					type: "ClassicyDesktopIconAdd",
					app: { id, name, icon },
					kind: "app_shortcut",
					// A hidden icon still populates the derived Applications folder,
					// which is built from app-shortcut icon records.
					...(drawDesktopIcon ? {} : { hidden: true }),
					...(listInApplications ? {} : { inApplications: false }),
					...(balloonHelp ? { balloonHelp } : {}),
				});
			} else {
				// Icons persist to localStorage, so opting out of both surfaces has
				// to clear any record left by an earlier registration.
				desktopEventDispatch({
					type: "ClassicyDesktopIconRemove",
					app: { id, name },
				});
			}
		}
```

Update the effect's dependency array: drop `noDesktopIcon` and
`inApplicationsFolder`, add `drawDesktopIcon`, `listInApplications`, and
`balloonHelpKey`.

- [ ] **Step 5: Run to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/App/`
Expected: PASS — the whole App directory, including the other `ClassicyApp.*.test.tsx` files.

- [ ] **Step 6: Format and commit**

```bash
pnpm biome check --write src/SystemFolder/SystemResources/App/
git add src/SystemFolder/SystemResources/App/
git commit -m "feat(app): independent desktop icon and Applications folder visibility

Adds showDesktopIcon, showInApplicationsFolder, and desktopIconBalloonHelp
to ClassicyApp; noDesktopIcon and inApplicationsFolder stay as deprecated
aliases. showInApplicationsFolder now defaults to true on its own, so
hiding the desktop icon no longer hides the app from Applications."
```

---

### Task 6: Wire it up, update consumers, document

**Files:**
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx:499-517` (the `desktopIcons.map` block)
- Modify: `src/SystemFolder/Finder/Finder.tsx:385`
- Modify: `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManager.tsx:126`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx:290`
- Modify: `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManager.tsx:208`
- Modify: `src/SystemFolder/ControlPanels/DriveSetup/ClassicyDriveSetup.tsx:111-112`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.stories.tsx`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: everything from Tasks 1-5.
- Produces: no new API.

- [ ] **Step 1: Pass balloon help from the store through to each icon**

In `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx`, add one prop
inside the `desktopIcons.map` block, after `contextMenu={i.contextMenu}`:

```tsx
					balloonHelp={i.balloonHelp}
```

- [ ] **Step 2: Keep the control panels out of the Applications folder**

`showInApplicationsFolder` now defaults to true, so these four apps need an
explicit opt-out to preserve their current behavior. In each file, add the new
prop directly below the existing `noDesktopIcon={true}` line and convert that
line to the new prop name:

`src/SystemFolder/Finder/Finder.tsx:385`,
`src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManager.tsx:126`,
`src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx:290`,
`src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManager.tsx:208`
— replace `noDesktopIcon={true}` with:

```tsx
			showDesktopIcon={false}
			showInApplicationsFolder={false}
```

Match each file's existing indentation (tabs).

- [ ] **Step 3: Migrate Drive Setup to the new props**

In `src/SystemFolder/ControlPanels/DriveSetup/ClassicyDriveSetup.tsx`, replace
lines 111-112:

```tsx
				noDesktopIcon={true}
				inApplicationsFolder={true}
```

with:

```tsx
				showDesktopIcon={false}
				showInApplicationsFolder={true}
```

This is a rename with no behavior change: Drive Setup stays off the desktop and
stays in Applications.

- [ ] **Step 4: Run the full suite**

Run: `pnpm test`
Expected: PASS, with the suite total up by the tests added in Tasks 1-5.

If a control-panel or Finder test fails here, it is asserting on the old prop
names — update the assertion to the new props rather than reverting the source.

- [ ] **Step 5: Add a Storybook story for icon balloon help**

In `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.stories.tsx`,
add a story alongside the existing ones. Match the file's existing story
structure — read it first and follow its `meta` / `StoryObj` shape rather than
copying a different file's conventions.

```tsx
export const WithBalloonHelp: Story = {
	args: {
		appId: "TV.app",
		appName: "TV",
		icon: ClassicyIcons.system.applications.default,
		kind: "app_shortcut",
		balloonHelp: {
			title: "TV",
			content: "Double-click to watch TV.",
		},
	},
};
```

If the existing stories use a different icon constant or a decorator that
registers the icon in the store first, reuse whatever they already do — only the
`balloonHelp` arg is new.

- [ ] **Step 6: Verify Storybook builds**

Run: `pnpm build:storybook`
Expected: builds without error.

- [ ] **Step 7: Document the props in CLAUDE.md**

In `CLAUDE.md`, add a subsection under `### Creating Apps`, after the existing
code block:

````markdown
#### App Icon Visibility

`ClassicyApp` controls its two icon surfaces independently. Both default to on;
`extension` apps get neither.

```tsx
<ClassicyApp
    id="TV.app" name="TV" icon={icon}
    showDesktopIcon={false}          // keep it off the desktop
    showInApplicationsFolder={true}  // but list it in Applications
    desktopIconBalloonHelp="Double-click to watch TV."
/>
```

- `showDesktopIcon` (default `true`) — draw an icon on the desktop.
- `showInApplicationsFolder` (default `true`) — list the app in the derived
  Applications folder. Independent of `showDesktopIcon`, so all four
  combinations are reachable; turning both off removes any icon record.
- `desktopIconBalloonHelp` — `string` (titled with the app name) or
  `{ title?, content, position?, delay? }`.

`noDesktopIcon` and `inApplicationsFolder` are deprecated aliases. Note the
behavior change: `noDesktopIcon` alone no longer keeps an app out of
Applications — pass `showInApplicationsFolder={false}` for that.

The Trash and drive icons carry stock balloon help automatically
(`ClassicyDesktopIconBalloons.ts`), resolved by icon kind at render time.
````

- [ ] **Step 8: Type-check the whole library**

Run: `pnpm build:source`
Expected: builds clean. `pnpm test` does not type-check, so this is the first
step that catches a signature mismatch.

- [ ] **Step 9: Format and commit**

```bash
pnpm biome check --write src/SystemFolder/SystemResources/Desktop/ src/SystemFolder/Finder/ src/SystemFolder/ControlPanels/ CLAUDE.md
git add -A
git commit -m "feat(desktop): wire icon balloon help through and migrate consumers

Passes each icon record's balloonHelp to ClassicyDesktopIcon, moves Finder
and the Sound/Appearance/Date & Time/Drive Setup control panels onto the
new visibility props, and documents both in CLAUDE.md."
```

- [ ] **Step 10: Verify in a browser**

Use the `/verify` skill to build the library, run the example app, and confirm:

1. Desktop icons still land on their normal grid positions — no shifting or
   overlap introduced by the balloon wiring.
2. Resting the pointer on the Trash shows its stock balloon after ~600ms.
3. Resting on a drive icon shows the disk balloon.
4. The Applications folder in Finder lists the same apps as before this branch,
   with Finder, Sound, Appearance, and Date & Time absent and Drive Setup
   present.
5. Turning Balloon Help off from the Help menu suppresses icon balloons.

Report what you actually observed. If any check fails, fix it and re-run
`pnpm test` plus `pnpm build:source` before finishing.
