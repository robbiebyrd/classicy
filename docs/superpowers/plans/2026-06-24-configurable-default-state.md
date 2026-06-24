# Configurable Default State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a consuming app seed initial classicy store values via an optional `defaultState` prop on `ClassicyAppManagerProvider`, applied only when no persisted state exists (seed-only).

**Architecture:** Add a pure `mergeClassicyState` deep-merge helper and a `DeepPartial` type to `ClassicyAppManager.ts`. Expose a `wasHydratedFromStorage()` flag from `ClassicyAppManagerUtils.tsx` recording whether the module store initialized from localStorage. Add a `defaultState` prop to `ClassicyAppManagerProvider` that, on first mount and only when not hydrated from storage, deep-merges the override into the module store via `useAppManager.setState`.

**Tech Stack:** TypeScript, React, zustand (module-singleton store), immer (in dispatch path), vitest + jsdom + @testing-library/react.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-24-configurable-default-state-design.md`.
- Seed-only semantics: overrides apply **only** when there is no valid persisted localStorage state; a returning visitor's saved state always wins.
- Fully backward compatible: `defaultState` is optional; omitting it must reproduce today's behavior exactly.
- Merge rules (exact): plain objects merge recursively; arrays in the override **replace** the base array wholesale (no concat); primitives — override wins; override keys whose value is `undefined` are skipped; the `base` argument is never mutated.
- `src/index.ts` already does `export *` from all three modified files — no index edit needed; new exports are public automatically.
- Test convention for module-singleton behavior: use `vi.resetModules()` + dynamic `await import(...)` so module-level init (which reads localStorage at import time) is exercised fresh per test. Set localStorage **before** the dynamic import.
- Test runner: `pnpm test` (vitest run). Run individual files with `pnpm exec vitest run <path>`.
- Branch: `feat/configurable-default-state` (already created, rebased on `main`, contains the spec commit).

---

### Task 1: `DeepPartial` type + `mergeClassicyState` helper

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts` (add type + function near the `ClassicyStore` interface / after `DefaultAppManagerState`)
- Test: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts` (append a new `describe` block)

**Interfaces:**
- Consumes: `ClassicyStore` (existing interface in this file).
- Produces:
  - `export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;`
  - `export function mergeClassicyState(base: ClassicyStore, overrides: DeepPartial<ClassicyStore>): ClassicyStore`

- [ ] **Step 1: Write the failing tests**

Append to `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`. The file already imports `describe, expect, it` from vitest and `type ClassicyStore`, and defines `makeStore()`. Add `mergeClassicyState` to the existing import from `@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager`, then append:

```ts
describe("mergeClassicyState", () => {
	it("merges a nested primitive without touching siblings", () => {
		const base = makeStore();
		const merged = mergeClassicyState(base, {
			System: { Manager: { DateAndTime: { dateTime: "2001-09-11T12:40:00.000Z" } } },
		});
		expect(merged.System.Manager.DateAndTime.dateTime).toBe("2001-09-11T12:40:00.000Z");
		// sibling fields retained from base
		expect(merged.System.Manager.DateAndTime.show).toBe(base.System.Manager.DateAndTime.show);
		expect(merged.System.Manager.DateAndTime.militaryTime).toBe(
			base.System.Manager.DateAndTime.militaryTime,
		);
		// unrelated managers retained
		expect(merged.System.Manager.Sound.volume).toBe(base.System.Manager.Sound.volume);
	});

	it("replaces arrays wholesale rather than concatenating", () => {
		const base = makeStore();
		base.System.Manager.Desktop.systemMenu = [{ id: "a" }, { id: "b" }];
		const merged = mergeClassicyState(base, {
			System: { Manager: { Desktop: { systemMenu: [{ id: "z" }] } } },
		} as DeepPartial<ClassicyStore>);
		expect(merged.System.Manager.Desktop.systemMenu).toEqual([{ id: "z" }]);
	});

	it("override primitive wins over base", () => {
		const base = makeStore();
		const merged = mergeClassicyState(base, {
			System: { Manager: { Sound: { volume: 25 } } },
		});
		expect(merged.System.Manager.Sound.volume).toBe(25);
	});

	it("skips override keys whose value is undefined", () => {
		const base = makeStore();
		base.System.Manager.DateAndTime.timeZoneOffset = "-5";
		const merged = mergeClassicyState(base, {
			System: { Manager: { DateAndTime: { timeZoneOffset: undefined } } },
		});
		expect(merged.System.Manager.DateAndTime.timeZoneOffset).toBe("-5");
	});

	it("does not mutate the base argument", () => {
		const base = makeStore();
		const before = base.System.Manager.DateAndTime.dateTime;
		mergeClassicyState(base, {
			System: { Manager: { DateAndTime: { dateTime: "2001-09-11T12:40:00.000Z" } } },
		});
		expect(base.System.Manager.DateAndTime.dateTime).toBe(before);
	});
});
```

Add `DeepPartial` to the type import line in the test file (it's a type, import via `import type { ClassicyStore, DeepPartial } from "..."` — extend the existing type import).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`
Expected: FAIL — `mergeClassicyState is not a function` (and a type error on `DeepPartial`).

- [ ] **Step 3: Implement the type and helper**

In `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts`, add after the `ClassicyStore` interface (around line 90) the type, and after `DefaultAppManagerState` (end of file) the function:

```ts
export type DeepPartial<T> = T extends object
	? { [K in keyof T]?: DeepPartial<T[K]> }
	: T;
```

```ts
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value)
	);
}

/**
 * Deep-merge `overrides` onto a structural clone of `base`.
 * Plain objects merge recursively; arrays and primitives from `overrides`
 * replace the base value wholesale; `undefined` override values are skipped;
 * `base` is never mutated.
 */
export function mergeClassicyState(
	base: ClassicyStore,
	overrides: DeepPartial<ClassicyStore>,
): ClassicyStore {
	const mergeInto = (
		target: Record<string, unknown>,
		source: Record<string, unknown>,
	): void => {
		for (const key of Object.keys(source)) {
			const next = source[key];
			if (next === undefined) continue;
			const current = target[key];
			if (isPlainObject(next) && isPlainObject(current)) {
				const cloned = { ...current };
				mergeInto(cloned, next);
				target[key] = cloned;
			} else {
				target[key] = next;
			}
		}
	};

	const result = structuredClone(base);
	mergeInto(
		result as unknown as Record<string, unknown>,
		overrides as unknown as Record<string, unknown>,
	);
	return result;
}
```

Note: `structuredClone` is available in the jsdom test env and all browsers classicy targets. It guarantees `base` is untouched and arrays are copied by value before any replacement.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`
Expected: PASS (all 5 new cases plus existing cases green).

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts \
        src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts
git commit -m "feat(app-manager): add DeepPartial type and mergeClassicyState helper"
```

---

### Task 2: `wasHydratedFromStorage()` flag

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.tsx` (set a module flag inside `getInitialState`; export a reader)
- Test: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.test.ts` (append a new `describe` block)

**Interfaces:**
- Consumes: existing `getInitialState()` and module store in this file.
- Produces: `export const wasHydratedFromStorage = (): boolean => hydratedFromStorage;` — returns `true` iff the module store initialized from a valid persisted localStorage entry, `false` if it fell back to `DefaultAppManagerState`.

- [ ] **Step 1: Write the failing tests**

Append to `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.test.ts`. Reuse the existing `makeValidStoredState()` helper at the top of that file.

```ts
describe("wasHydratedFromStorage", () => {
	afterEach(() => {
		localStorage.clear();
	});

	it("returns false when no persisted state exists at import", async () => {
		vi.resetModules();
		localStorage.clear();
		const mod = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		expect(mod.wasHydratedFromStorage()).toBe(false);
		mod.stopAppManagerPersistence();
	});

	it("returns true when valid persisted state exists at import", async () => {
		vi.resetModules();
		localStorage.setItem(
			"classicyDesktopState",
			JSON.stringify(makeValidStoredState()),
		);
		const mod = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		expect(mod.wasHydratedFromStorage()).toBe(true);
		mod.stopAppManagerPersistence();
	});

	it("returns false when persisted state is schema-invalid", async () => {
		vi.resetModules();
		localStorage.setItem("classicyDesktopState", JSON.stringify({ bogus: true }));
		const mod = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		expect(mod.wasHydratedFromStorage()).toBe(false);
		mod.stopAppManagerPersistence();
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.test.ts -t wasHydratedFromStorage`
Expected: FAIL — `mod.wasHydratedFromStorage is not a function`.

- [ ] **Step 3: Implement the flag**

In `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.tsx`, add a module-level flag above `getInitialState`, set it on the two success/fallback paths, and export a reader. Edit `getInitialState` so every `return` records the source:

```ts
let hydratedFromStorage = false;

/** True iff the module store initialized from valid persisted localStorage state. */
export const wasHydratedFromStorage = (): boolean => hydratedFromStorage;
```

Inside `getInitialState()`:
- On the successful persisted-state branch (the `return parsed;` after schema validation), set `hydratedFromStorage = true;` immediately before that `return`.
- On the schema-mismatch `return DefaultAppManagerState;`, the catch-block fallback, and the final `return DefaultAppManagerState;`, leave `hydratedFromStorage` as `false` (it is already `false` by initialization; no change needed, but do not set it true).

Resulting persisted branch:
```ts
				hydratedFromStorage = true;
				return parsed;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.test.ts`
Expected: PASS (3 new cases plus the existing suite green).

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.tsx \
        src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.test.ts
git commit -m "feat(app-manager): expose wasHydratedFromStorage() init-source flag"
```

---

### Task 3: `defaultState` prop + seed effect on the Provider

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.tsx` (add prop, imports, one-time seed effect)
- Test: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.test.tsx` (create)

**Interfaces:**
- Consumes:
  - `mergeClassicyState`, `DeepPartial`, `ClassicyStore` from `./ClassicyAppManager` (Task 1)
  - `useAppManager`, `wasHydratedFromStorage` from `./ClassicyAppManagerUtils` (Task 2)
- Produces: `ClassicyAppManagerProvider` now accepts `defaultState?: DeepPartial<ClassicyStore>` and seeds the store on first mount when not hydrated from storage.

- [ ] **Step 1: Write the failing tests**

Create `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.test.tsx`. Because seeding depends on `wasHydratedFromStorage()` (a module-init value), set localStorage before each dynamic import and import the Provider + store from the same fresh module graph.

```tsx
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Minimal valid persisted-state shape that passes the store's schema check. */
function makeValidStoredState(): Record<string, unknown> {
	return {
		System: {
			Manager: {
				Applications: { apps: {} },
				Desktop: {
					selectedIcons: [],
					contextMenu: [],
					showContextMenu: false,
					icons: [],
					systemMenu: [],
					appMenu: [],
					selectBox: { size: [0, 0], start: [0, 0], active: false },
					disableBalloonHelp: false,
				},
				Appearance: { activeTheme: { id: "default" }, availableThemes: [] },
				Sound: { volume: 100, labels: {}, disabled: [] },
				DateAndTime: {
					show: true,
					dateTime: "2020-01-01T00:00:00.000Z",
					timeZoneOffset: "0",
					militaryTime: false,
					displaySeconds: true,
					displayPeriod: true,
					displayDay: true,
					displayLongDay: false,
					flashSeparators: false,
					paused: false,
				},
			},
		},
	};
}

const SEED = {
	System: { Manager: { DateAndTime: { dateTime: "2001-09-11T12:40:00.000Z", timeZoneOffset: "-4" } } },
};

describe("ClassicyAppManagerProvider defaultState", () => {
	beforeEach(() => {
		vi.resetModules();
		localStorage.clear();
	});
	afterEach(async () => {
		const mod = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		mod.stopAppManagerPersistence();
		localStorage.clear();
	});

	it("seeds the store when no persisted state exists", async () => {
		const ctx = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext"
		);
		const utils = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		render(<ctx.ClassicyAppManagerProvider defaultState={SEED} />);
		await waitFor(() => {
			expect(
				utils.useAppManager.getState().System.Manager.DateAndTime.dateTime,
			).toBe("2001-09-11T12:40:00.000Z");
		});
		expect(
			utils.useAppManager.getState().System.Manager.DateAndTime.timeZoneOffset,
		).toBe("-4");
	});

	it("does NOT override when valid persisted state exists", async () => {
		localStorage.setItem(
			"classicyDesktopState",
			JSON.stringify(makeValidStoredState()),
		);
		const ctx = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext"
		);
		const utils = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		render(<ctx.ClassicyAppManagerProvider defaultState={SEED} />);
		// give any effect a chance to run, then assert persisted value survived
		await new Promise((r) => setTimeout(r, 0));
		expect(
			utils.useAppManager.getState().System.Manager.DateAndTime.dateTime,
		).toBe("2020-01-01T00:00:00.000Z");
	});

	it("is a no-op when defaultState is omitted", async () => {
		const ctx = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext"
		);
		const utils = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		const before = utils.useAppManager.getState().System.Manager.DateAndTime.dateTime;
		render(<ctx.ClassicyAppManagerProvider />);
		await new Promise((r) => setTimeout(r, 0));
		expect(
			utils.useAppManager.getState().System.Manager.DateAndTime.dateTime,
		).toBe(before);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.test.tsx`
Expected: FAIL — the seed test's `waitFor` times out because the store is never updated (no `defaultState` handling yet).

- [ ] **Step 3: Implement the prop and seed effect**

In `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.tsx`:

Add to the imports already present (`useEffect`, `useMemo` are imported from `react`; add `useRef`):
```ts
import {
	type FC as FunctionalComponent,
	type PropsWithChildren,
	useEffect,
	useMemo,
	useRef,
} from "react";
```

Add new imports for the store and merge helper:
```ts
import type { ClassicyStore, DeepPartial } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { mergeClassicyState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	useAppManager,
	wasHydratedFromStorage,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
```

Extend the props type:
```ts
type ClassicyAppManagerProviderProps = {
	gaMeasurementIds?: string[];
	gtmContainerId?: string;
	appName?: string;
	eventPrefix?: string;
	defaultState?: DeepPartial<ClassicyStore>;
};
```

Destructure `defaultState` in the component parameter list (alongside `children`, `gtmContainerId`, etc.), then add the seed effect inside the component body, before the `return`:
```ts
	const seeded = useRef(false);
	useEffect(() => {
		if (seeded.current || !defaultState || wasHydratedFromStorage()) return;
		seeded.current = true;
		useAppManager.setState((s) => mergeClassicyState(s as ClassicyStore, defaultState));
	}, [defaultState]);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.test.tsx`
Expected: PASS (all 3 cases).

- [ ] **Step 5: Run the full suite + typecheck**

Run: `pnpm test`
Expected: PASS (no regressions).
Run: `pnpm exec tsc --noEmit`
Expected: no type errors.
Run: `pnpm lint`
Expected: no new biome errors in the touched files.

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.tsx \
        src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.test.tsx
git commit -m "feat(app-manager): add defaultState seed prop to ClassicyAppManagerProvider"
```

---

### Task 4: README / usage documentation

**Files:**
- Modify: `README.md` (add a short "Seeding default state" subsection under the existing provider/usage docs; if no provider section exists, add one near other `ClassicyAppManagerProvider` mentions)

**Interfaces:**
- Consumes: the `defaultState` prop from Task 3. No code; documentation only.

- [ ] **Step 1: Add usage docs**

Add to `README.md`:

````markdown
### Seeding default state

`ClassicyAppManagerProvider` accepts an optional `defaultState` — a deep-partial
`ClassicyStore` merged over the built-in defaults **on first load only** (when no
saved state exists in `localStorage`). Returning visitors keep their persisted
state.

```tsx
<ClassicyAppManagerProvider
  defaultState={{
    System: { Manager: { DateAndTime: {
      dateTime: "2001-09-11T12:40:00.000Z", // 8:40 AM US Eastern (EDT, UTC-4)
      timeZoneOffset: "-4",
    } } },
  }}
>
  {/* ... */}
</ClassicyAppManagerProvider>
```

Arrays in `defaultState` replace their default counterparts wholesale (they are
not concatenated). To force a value on every load regardless of saved state,
clear `localStorage["classicyDesktopState"]` or dispatch the change at runtime.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document defaultState seeding on ClassicyAppManagerProvider"
```

---

## Post-implementation (out of plan scope, maintainer-driven)

1. Bump classicy package version and publish.
2. Bump the classicy dependency in rt911.
3. In rt911 `packages/frontend/src/app.tsx`, pass `defaultState` to set the 8:40 AM 2001-09-11 clock (see spec "Consumer usage").
