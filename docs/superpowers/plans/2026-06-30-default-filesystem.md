# Default Filesystem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let consumers of `ClassicyAppManagerProvider` configure the default virtual filesystem (`ClassicyFileSystem`) that `Finder` and `SimpleText` seed from, either merging onto Classicy's built-in `DefaultFSContent` or replacing it exclusively.

**Architecture:** A new React context (`ClassicyDefaultFileSystemContext`), populated by `ClassicyAppManagerProvider` from two new props (`defaultFileSystem`, `defaultFileSystemMode`), is read by a new `useClassicyFileSystem()` hook that resolves the effective tree and constructs the `ClassicyFileSystem` instance. `Finder.tsx` and `SimpleText.tsx` switch from constructing `ClassicyFileSystem` inline to calling this hook. The deep-merge algorithm already used by `mergeClassicyState` is extracted into a shared generic utility so both the Zustand-store merge and the new filesystem-tree merge share one implementation.

**Tech Stack:** React 19 context/hooks, TypeScript, Vitest + `@testing-library/react` (`render`, `renderHook`), pnpm workspace.

**Spec:** `docs/superpowers/specs/2026-06-30-default-filesystem-design.md`

## Global Constraints

- Merge semantics: plain objects merge recursively; arrays and primitives from the override replace the base value wholesale; `undefined` override values are skipped; the base argument is never mutated. (Same contract as today's `mergeClassicyState`.)
- `defaultFileSystemMode` defaults to `"merge"` when omitted but `defaultFileSystem` is set.
- No new prop set at all (or no `ClassicyAppManagerProvider` in the tree) must produce byte-for-byte identical behavior to today: `ClassicyFileSystem` falls back to `DefaultFSContent`.
- Seed-only behavior comes for free from `ClassicyFileSystem`'s existing constructor (it already discards its `defaultFS` argument whenever valid `localStorage["classicyStorage"]` data exists) — do not add any new hydration-tracking code.
- `DeepPartial<T>` stays importable from `@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager` (existing consumers: `ClassicyAppManagerContext.tsx`, `ClassicyAppManagerUtils.tsx`) — re-export it, don't move the only definition out from under them.
- Existing `mergeClassicyState` tests in `ClassicyAppManager.test.ts` (lines 1140-1190) must keep passing unmodified — they're the regression guard for the extraction in Task 2.

---

### Task 1: Shared deep-merge utility

**Files:**
- Create: `src/SystemFolder/SystemResources/Utils/deepMerge.ts`
- Test: `src/SystemFolder/SystemResources/Utils/deepMerge.test.ts`

**Interfaces:**
- Produces: `export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;` and `export function deepMergeReplacingArrays<T>(base: T, overrides: DeepPartial<T>): T` — both consumed by Task 2 (`ClassicyAppManager.ts`) and Task 3 (`ClassicyFileSystem.ts`).

- [ ] **Step 1: Write the failing test**

Create `src/SystemFolder/SystemResources/Utils/deepMerge.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { deepMergeReplacingArrays } from "@/SystemFolder/SystemResources/Utils/deepMerge";

describe("deepMergeReplacingArrays", () => {
	it("merges a nested primitive without touching siblings", () => {
		const base = { a: { x: 1, y: 2 }, b: 3 };
		const merged = deepMergeReplacingArrays(base, { a: { x: 99 } });
		expect(merged.a.x).toBe(99);
		expect(merged.a.y).toBe(2);
		expect(merged.b).toBe(3);
	});

	it("replaces arrays wholesale rather than concatenating", () => {
		const base = { list: [1, 2, 3] };
		const merged = deepMergeReplacingArrays(base, { list: [9] });
		expect(merged.list).toEqual([9]);
	});

	it("override primitive wins over base", () => {
		const base = { count: 1 };
		const merged = deepMergeReplacingArrays(base, { count: 42 });
		expect(merged.count).toBe(42);
	});

	it("skips override keys whose value is undefined", () => {
		const base = { name: "base-name" };
		const merged = deepMergeReplacingArrays(base, { name: undefined });
		expect(merged.name).toBe("base-name");
	});

	it("does not mutate the base argument", () => {
		const base = { a: { x: 1 } };
		const before = base.a.x;
		deepMergeReplacingArrays(base, { a: { x: 99 } });
		expect(base.a.x).toBe(before);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Utils/deepMerge.test.ts`
Expected: FAIL — `Failed to resolve import "@/SystemFolder/SystemResources/Utils/deepMerge"` (module doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/SystemFolder/SystemResources/Utils/deepMerge.ts`:

```ts
export type DeepPartial<T> = T extends object
	? { [K in keyof T]?: DeepPartial<T[K]> }
	: T;

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Deep-merge `overrides` onto a structural clone of `base`.
 * Plain objects merge recursively; arrays and primitives from `overrides`
 * replace the base value wholesale; `undefined` override values are skipped;
 * `base` is never mutated.
 */
export function deepMergeReplacingArrays<T>(
	base: T,
	overrides: DeepPartial<T>,
): T {
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

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Utils/deepMerge.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/Utils/deepMerge.ts src/SystemFolder/SystemResources/Utils/deepMerge.test.ts
git commit -m "feat: add shared deepMergeReplacingArrays utility"
```

---

### Task 2: Refactor `mergeClassicyState` onto the shared utility

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts:25` (insert import), `:92-94` (DeepPartial type), `:355-397` (isPlainObject + mergeClassicyState)
- Test: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts` (existing `describe("mergeClassicyState", ...)` block at lines 1140-1190 — unmodified, used as the regression check)

**Interfaces:**
- Consumes: `deepMergeReplacingArrays`, `DeepPartial` from Task 1 (`@/SystemFolder/SystemResources/Utils/deepMerge`).
- Produces: `mergeClassicyState(base, overrides)` and `DeepPartial<T>` keep their exact existing signatures and import path (`@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager`) for `ClassicyAppManagerContext.tsx` and `ClassicyAppManagerUtils.tsx`.

This is a behavior-preserving refactor — the existing `mergeClassicyState` tests are the test cycle for this task.

- [ ] **Step 1: Run the existing tests to confirm a green baseline**

Run: `pnpm vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts -t mergeClassicyState`
Expected: PASS (5 tests) — confirms today's behavior before refactoring.

- [ ] **Step 2: Add the import**

In `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts`, insert a new line immediately after line 25 (`import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";`) and before the `hasApp` import block:

```ts
import { deepMergeReplacingArrays } from "@/SystemFolder/SystemResources/Utils/deepMerge";
```

- [ ] **Step 3: Re-export `DeepPartial` instead of redefining it**

Replace lines 92-94:

```ts
export type DeepPartial<T> = T extends object
	? { [K in keyof T]?: DeepPartial<T[K]> }
	: T;
```

with:

```ts
export type { DeepPartial } from "@/SystemFolder/SystemResources/Utils/deepMerge";
```

- [ ] **Step 4: Replace `isPlainObject` + `mergeClassicyState` with a thin wrapper**

Replace lines 355-397 (the `isPlainObject` function through the end of `mergeClassicyState`):

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

with:

```ts
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
	return deepMergeReplacingArrays(base, overrides);
}
```

- [ ] **Step 5: Run the tests to verify the refactor preserved behavior**

Run: `pnpm vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts -t mergeClassicyState`
Expected: PASS (same 5 tests, unmodified).

Also run the full file to make sure nothing else broke from the import/type changes:

Run: `pnpm vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`
Expected: PASS (all tests in the file).

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts
git commit -m "refactor: delegate mergeClassicyState to shared deepMergeReplacingArrays"
```

---

### Task 3: Filesystem-tree merge helper

**Files:**
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts:10` (insert import), append new exported function at end of file (after line 419)
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts:2` (extend import), append new `describe` block

**Interfaces:**
- Consumes: `deepMergeReplacingArrays` from Task 1.
- Produces: `mergeClassicyFileSystemEntries(base: ClassicyFileSystemEntry, overrides: ClassicyFileSystemEntry): ClassicyFileSystemEntry`, consumed by Task 4's `useClassicyFileSystem` hook.

- [ ] **Step 1: Write the failing test**

In `src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts`, change line 2 from:

```ts
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
```

to:

```ts
import {
	ClassicyFileSystem,
	mergeClassicyFileSystemEntries,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
```

Append at the end of the file:

```ts
describe("mergeClassicyFileSystemEntries", () => {
	it("merges a nested entry without touching siblings", () => {
		const base = {
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				Documents: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"Read Me.txt": {
						_type: ClassicyFileSystemEntryFileType.TextFile,
						_data: "hi",
					},
				},
			},
		};
		const merged = mergeClassicyFileSystemEntries(base, {
			"Macintosh HD": {
				Documents: {
					"Welcome.txt": {
						_type: ClassicyFileSystemEntryFileType.TextFile,
						_data: "hello",
					},
				},
			},
		});
		expect(merged["Macintosh HD"].Documents["Read Me.txt"]._data).toBe("hi");
		expect(merged["Macintosh HD"].Documents["Welcome.txt"]._data).toBe(
			"hello",
		);
	});

	it("does not mutate the base argument", () => {
		const base = {
			"Macintosh HD": { _type: ClassicyFileSystemEntryFileType.Drive },
		};
		mergeClassicyFileSystemEntries(base, {
			"Macintosh HD": { _type: ClassicyFileSystemEntryFileType.Directory },
		});
		expect(base["Macintosh HD"]._type).toBe(
			ClassicyFileSystemEntryFileType.Drive,
		);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts`
Expected: FAIL — `mergeClassicyFileSystemEntries` is not exported from `ClassicyFileSystem.ts`.

- [ ] **Step 3: Write the implementation**

In `src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts`, insert a new line after line 10 (`import { DefaultFSContent } from "@/SystemFolder/SystemResources/File/DefaultClassicyFileSystem";`):

```ts
import { deepMergeReplacingArrays } from "@/SystemFolder/SystemResources/Utils/deepMerge";
```

Append at the end of the file (after the closing `}` of the `ClassicyFileSystem` class):

```ts

/**
 * Deep-merge `overrides` onto a structural clone of `base`. Used to resolve
 * the effective default filesystem tree in "merge" mode — see
 * useClassicyFileSystem in ClassicyFileSystemContext.tsx.
 */
export function mergeClassicyFileSystemEntries(
	base: ClassicyFileSystemEntry,
	overrides: ClassicyFileSystemEntry,
): ClassicyFileSystemEntry {
	return deepMergeReplacingArrays(base, overrides);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts`
Expected: PASS (all tests in the file, including the 2 new ones).

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts src/SystemFolder/SystemResources/File/ClassicyFileSystem.test.ts
git commit -m "feat: add mergeClassicyFileSystemEntries helper"
```

---

### Task 4: `ClassicyDefaultFileSystemContext` + `useClassicyFileSystem` hook

**Files:**
- Create: `src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.tsx`
- Test: `src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.test.tsx`

**Interfaces:**
- Consumes: `ClassicyFileSystem`, `mergeClassicyFileSystemEntries` (Task 3, `@/SystemFolder/SystemResources/File/ClassicyFileSystem`); `DefaultFSContent` (`@/SystemFolder/SystemResources/File/DefaultClassicyFileSystem`); `ClassicyFileSystemEntry` type (`@/SystemFolder/SystemResources/File/ClassicyFileSystemModel`).
- Produces: `ClassicyDefaultFileSystemContext` (React context) and `ClassicyDefaultFileSystemMode` type, consumed by Task 5 (`ClassicyAppManagerContext.tsx`). `useClassicyFileSystem(storageKey?, separator?): ClassicyFileSystem`, consumed by Task 6 (`Finder.tsx`, `SimpleText.tsx`).

- [ ] **Step 1: Write the failing test**

Create `src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.test.tsx`:

```tsx
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import {
	ClassicyDefaultFileSystemContext,
	useClassicyFileSystem,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { DefaultFSContent } from "@/SystemFolder/SystemResources/File/DefaultClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

type ContextValue = {
	defaultFileSystem?: Record<string, unknown>;
	mode: "merge" | "exclusive";
};

function wrapperFor(value: ContextValue) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<ClassicyDefaultFileSystemContext.Provider value={value}>
				{children}
			</ClassicyDefaultFileSystemContext.Provider>
		);
	};
}

describe("useClassicyFileSystem", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("resolves to DefaultFSContent when no provider is present", () => {
		const { result } = renderHook(() =>
			useClassicyFileSystem("test-no-provider"),
		);
		expect(result.current.fs).toEqual(DefaultFSContent);
	});

	it("resolves to a merge of DefaultFSContent and the override", () => {
		const { result } = renderHook(() => useClassicyFileSystem("test-merge"), {
			wrapper: wrapperFor({
				defaultFileSystem: {
					"Macintosh HD": {
						Documents: {
							"Welcome.txt": {
								_type: ClassicyFileSystemEntryFileType.TextFile,
								_data: "hello",
							},
						},
					},
				},
				mode: "merge",
			}),
		});
		expect(
			result.current.fs["Macintosh HD"].Documents["Welcome.txt"]._data,
		).toBe("hello");
		// original default content still present alongside the merged addition
		expect(
			result.current.fs["Macintosh HD"].Documents["Read Me.txt"],
		).toBeDefined();
	});

	it("resolves to exactly the override tree in exclusive mode", () => {
		const override = {
			"My Drive": { _type: ClassicyFileSystemEntryFileType.Drive },
		};
		const { result } = renderHook(
			() => useClassicyFileSystem("test-exclusive"),
			{ wrapper: wrapperFor({ defaultFileSystem: override, mode: "exclusive" }) },
		);
		expect(result.current.fs).toEqual(override);
	});

	it("resolves to DefaultFSContent when defaultFileSystem is omitted regardless of mode", () => {
		const { result } = renderHook(
			() => useClassicyFileSystem("test-omitted"),
			{ wrapper: wrapperFor({ mode: "exclusive" }) },
		);
		expect(result.current.fs).toEqual(DefaultFSContent);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.test.tsx`
Expected: FAIL — `Failed to resolve import "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext"` (module doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.tsx`:

```tsx
import { createContext, useContext, useMemo } from "react";
import {
	ClassicyFileSystem,
	mergeClassicyFileSystemEntries,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { DefaultFSContent } from "@/SystemFolder/SystemResources/File/DefaultClassicyFileSystem";
import type { ClassicyFileSystemEntry } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

export type ClassicyDefaultFileSystemMode = "merge" | "exclusive";

type ClassicyDefaultFileSystemContextValue = {
	defaultFileSystem?: ClassicyFileSystemEntry;
	mode: ClassicyDefaultFileSystemMode;
};

export const ClassicyDefaultFileSystemContext =
	createContext<ClassicyDefaultFileSystemContextValue>({ mode: "merge" });

/**
 * Constructs a ClassicyFileSystem seeded from the nearest
 * ClassicyAppManagerProvider's defaultFileSystem/defaultFileSystemMode props,
 * falling back to DefaultFSContent when no provider (or no override) is
 * present. Seed-only behavior (a fresh visitor sees the resolved tree, a
 * returning visitor keeps their persisted state) comes from
 * ClassicyFileSystem's own constructor — no extra hydration tracking here.
 */
export function useClassicyFileSystem(
	storageKey?: string,
	separator?: string,
): ClassicyFileSystem {
	const { defaultFileSystem, mode } = useContext(
		ClassicyDefaultFileSystemContext,
	);

	return useMemo(() => {
		const resolved = !defaultFileSystem
			? DefaultFSContent
			: mode === "exclusive"
				? defaultFileSystem
				: mergeClassicyFileSystemEntries(DefaultFSContent, defaultFileSystem);
		return new ClassicyFileSystem(storageKey, resolved, separator);
	}, [defaultFileSystem, mode, storageKey, separator]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.tsx src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.test.tsx
git commit -m "feat: add ClassicyDefaultFileSystemContext and useClassicyFileSystem hook"
```

---

### Task 5: Wire `defaultFileSystem`/`defaultFileSystemMode` props into `ClassicyAppManagerProvider`

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.tsx`
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.test.tsx`

**Interfaces:**
- Consumes: `ClassicyDefaultFileSystemContext`, `ClassicyDefaultFileSystemMode` (Task 4, `@/SystemFolder/SystemResources/File/ClassicyFileSystemContext`); `ClassicyFileSystemEntry` (`@/SystemFolder/SystemResources/File/ClassicyFileSystemModel`).
- Produces: `ClassicyAppManagerProvider` accepts `defaultFileSystem?: ClassicyFileSystemEntry` and `defaultFileSystemMode?: ClassicyDefaultFileSystemMode`, and provides `ClassicyDefaultFileSystemContext` to its subtree — consumed by Task 6's `Finder.tsx`/`SimpleText.tsx`.

- [ ] **Step 1: Write the failing test**

Append to `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.test.tsx` (add `import { useContext } from "react";` to the top import list alongside the existing imports, then add this new `describe` block at the end of the file):

```tsx
describe("ClassicyAppManagerProvider defaultFileSystem", () => {
	it("provides mode 'merge' and no override by default", async () => {
		const ctx = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext"
		);
		const fsCtx = await import(
			"@/SystemFolder/SystemResources/File/ClassicyFileSystemContext"
		);
		let captured: { defaultFileSystem?: unknown; mode: string } | undefined;
		function Capture() {
			captured = useContext(fsCtx.ClassicyDefaultFileSystemContext);
			return null;
		}
		render(
			<ctx.ClassicyAppManagerProvider>
				<Capture />
			</ctx.ClassicyAppManagerProvider>,
		);
		expect(captured?.defaultFileSystem).toBeUndefined();
		expect(captured?.mode).toBe("merge");
	});

	it("passes defaultFileSystem and defaultFileSystemMode through context", async () => {
		const ctx = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext"
		);
		const fsCtx = await import(
			"@/SystemFolder/SystemResources/File/ClassicyFileSystemContext"
		);
		const tree = { "My Drive": { _type: "drive" } };
		let captured: { defaultFileSystem?: unknown; mode: string } | undefined;
		function Capture() {
			captured = useContext(fsCtx.ClassicyDefaultFileSystemContext);
			return null;
		}
		render(
			<ctx.ClassicyAppManagerProvider
				defaultFileSystem={tree}
				defaultFileSystemMode="exclusive"
			>
				<Capture />
			</ctx.ClassicyAppManagerProvider>,
		);
		expect(captured?.defaultFileSystem).toEqual(tree);
		expect(captured?.mode).toBe("exclusive");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.test.tsx`
Expected: FAIL — `ClassicyAppManagerProvider` doesn't accept `defaultFileSystem`/`defaultFileSystemMode` and doesn't provide `ClassicyDefaultFileSystemContext`, so `captured` stays `undefined` and the assertions fail.

- [ ] **Step 3: Write the implementation**

In `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.tsx`, add imports after the existing `mergeClassicyState` import (after line 16):

```ts
import {
	ClassicyDefaultFileSystemContext,
	type ClassicyDefaultFileSystemMode,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import type { ClassicyFileSystemEntry } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
```

Update the props type (replace lines 24-30):

```ts
type ClassicyAppManagerProviderProps = {
	gaMeasurementIds?: string[];
	gtmContainerId?: string;
	appName?: string;
	eventPrefix?: string;
	defaultState?: DeepPartial<ClassicyStore>;
	defaultFileSystem?: ClassicyFileSystemEntry;
	defaultFileSystemMode?: ClassicyDefaultFileSystemMode;
};
```

Update the component signature to destructure the new props (replace lines 45-54):

```ts
export const ClassicyAppManagerProvider: FunctionalComponent<
	PropsWithChildren<ClassicyAppManagerProviderProps>
> = ({
	children,
	gtmContainerId,
	gaMeasurementIds,
	appName = "classicy",
	eventPrefix = "classicy_",
	defaultState,
	defaultFileSystem,
	defaultFileSystemMode,
}) => {
```

Add a memoized context value, immediately after the existing `seeded`/`useEffect` block for `defaultState` (after what was line 62, the closing `}, [defaultState]);`):

```ts

	const fsContextValue = useMemo(
		() => ({
			defaultFileSystem,
			mode: defaultFileSystemMode ?? ("merge" as const),
		}),
		[defaultFileSystem, defaultFileSystemMode],
	);
```

Wrap the render output with the new context provider (replace the final `return (...)` block):

```tsx
	return (
		<ClassicyAnalyticsPrefixContext.Provider value={eventPrefix}>
			<ClassicyDefaultFileSystemContext.Provider value={fsContextValue}>
				<AnalyticsProvider instance={analytics}>
					<ClassicySoundManagerProvider>{children}</ClassicySoundManagerProvider>
				</AnalyticsProvider>
			</ClassicyDefaultFileSystemContext.Provider>
		</ClassicyAnalyticsPrefixContext.Provider>
	);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.test.tsx`
Expected: PASS (all tests in the file, including the 2 new ones — and the 3 pre-existing `defaultState` tests still pass unmodified).

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.tsx src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.test.tsx
git commit -m "feat: add defaultFileSystem/defaultFileSystemMode props to ClassicyAppManagerProvider"
```

---

### Task 6: Adopt `useClassicyFileSystem` in `Finder.tsx` and `SimpleText.tsx`

**Files:**
- Modify: `src/SystemFolder/Finder/Finder.tsx:23` (import), `:183` (usage)
- Modify: `src/SystemFolder/SimpleText/SimpleText.tsx:1` (import), `:9` (import), `:33` (usage)

**Interfaces:**
- Consumes: `useClassicyFileSystem` (Task 4, `@/SystemFolder/SystemResources/File/ClassicyFileSystemContext`).

No new test file — `FinderData.test.ts` and `ClassicyFinderEventHandler.test.ts` don't render the component tree or touch `ClassicyFileSystem` construction, so the full existing suite is the regression check for this wiring change.

- [ ] **Step 1: Run the full test suite to confirm a green baseline**

Run: `pnpm test`
Expected: PASS (all tests, no failures).

- [ ] **Step 2: Update `Finder.tsx`**

Replace line 23:

```ts
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
```

with:

```ts
import { useClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
```

Replace line 183:

```ts
	const fs = useMemo(() => new ClassicyFileSystem(), []);
```

with:

```ts
	const fs = useClassicyFileSystem();
```

(`useMemo` stays imported — it's still used at line 69 for `appMenu`.)

- [ ] **Step 3: Update `SimpleText.tsx`**

Replace line 1:

```ts
import { useCallback, useMemo, useState } from "react";
```

with:

```ts
import { useCallback, useState } from "react";
```

Replace line 9:

```ts
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
```

with:

```ts
import { useClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
```

Replace line 33:

```ts
	const fs = useMemo(() => new ClassicyFileSystem(), []);
```

with:

```ts
	const fs = useClassicyFileSystem();
```

- [ ] **Step 4: Run the full test suite to confirm no regressions**

Run: `pnpm test`
Expected: PASS (all tests, same count as Step 1).

- [ ] **Step 5: Lint and typecheck/build**

Run: `pnpm lint`
Expected: no errors (in particular, no unused-import error for `useMemo` in `SimpleText.tsx` or `ClassicyFileSystem` in either file).

Run: `pnpm build:source`
Expected: succeeds — regenerates barrels (picking up the new `ClassicyFileSystemContext.tsx` exports automatically) and typechecks cleanly via `tsc -b`.

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/Finder/Finder.tsx src/SystemFolder/SimpleText/SimpleText.tsx
git commit -m "refactor: use useClassicyFileSystem hook in Finder and SimpleText"
```

---

## Final verification

- [ ] **Run the full suite one more time end-to-end**

Run: `pnpm test`
Expected: PASS, including:
  - `deepMerge.test.ts` (Task 1, 5 tests)
  - `ClassicyAppManager.test.ts` mergeClassicyState block (Task 2, 5 tests, unmodified)
  - `ClassicyFileSystem.test.ts` mergeClassicyFileSystemEntries block (Task 3, 2 new tests)
  - `ClassicyFileSystemContext.test.tsx` (Task 4, 4 tests)
  - `ClassicyAppManagerContext.test.tsx` defaultFileSystem block (Task 5, 2 new tests) + existing defaultState block (3 tests, unmodified)
