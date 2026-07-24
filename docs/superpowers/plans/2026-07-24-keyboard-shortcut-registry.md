# Central Keyboard-Shortcut Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A central keyboard-shortcut registry in the Zustand store, arbitrated by one `document` keydown dispatcher: app menu shortcuts fire only when their app is focused; the desktop's Apple/system/Help shortcuts are always active; Extensions declare unique global shortcuts (first-registrant wins).

**Architecture:** A `System.Manager.Keyboard` store slice holds `app` (per-appId canonical chord claims), `system` (always-active claims), and `global` (extension chord → dispatched event). App/system claims auto-register from the menu bar's live menus; extensions register globals via a new `ClassicyApp` prop. A single dispatcher, mounted in the menu bar (which already assembles the combined Apple+app+Help menu), resolves each modifier-chord keydown in precedence order (focused app → system → global), reusing the existing `findMenuItemByShortcut`/`runMenuItemAction` for menu-backed actions. `ClassicyMenu`'s own document listener is removed.

**Tech Stack:** React + TypeScript, Zustand, Vitest + React Testing Library, Biome.

## Global Constraints

- Test runner: `pnpm test <path>` (vitest). Single file as shown per task.
- Lint scoped to touched files only: `pnpm exec biome check --write <paths>` — NEVER repo-wide `biome check .` (reformats ~70 unrelated files).
- Vitest does NOT type-check. Run `pnpm build:source` (tsc -b) before declaring a task done when it changes types.
- **Canonical chord format:** modifiers in fixed order `control, option, shift, command`, joined with `+`, then the lowercased key, e.g. `"Cmd+Shift+S"` → `"command+shift+s"`, `"⌥H"` → `"option+h"`. A modifier-only chord canonicalizes to `""` and is ignored everywhere.
- **Event matching must mirror the existing `shortcutMatchesEvent`:** "Command" matches meta-OR-ctrl; a physical Ctrl press can satisfy both a command chord and a control chord. Therefore the dispatcher matches an event against a **candidate set** of canonical chords, not one string.
- **Precedence, highest→lowest:** (1) focused app, (2) system, (3) global. A lower tier fires only when no higher tier claims the chord.
- **First-wins:** a global chord already present is not overwritten; the later registration is ignored (dev `console.warn`).
- **Registry excluded from persistence:** `sanitizeStateForPersistence` strips `System.Manager.Keyboard`.
- **Reuse, don't reinvent:** `parseKeyboardShortcut`, `findMenuItemByShortcut`, `runMenuItemAction` are used unchanged. `nativeShortcut` items (⌘Z/X/C/V/A) are never claimed nor intercepted.
- **Scope:** modifier chords only (`⌘`/`⌃`/`⌥` + key). Dialog Return/Escape/⌘-. and media plain keys are out of scope and unchanged.
- App id used in tests: `"HyperCard.app"` / `"TextEditor.app"` etc. Store shape: `state.System.Manager.Keyboard`.

---

## File Structure

- `src/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut.ts` — add `canonicalChord`, `canonicalChordsFromEvent`, `collectMenuChords` (pure helpers).
- `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts` — `Keyboard` slice type + default; `classicyShortcutEventHandler`; route `ClassicyShortcut*`.
- `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.tsx` — strip `Keyboard` in `sanitizeStateForPersistence`.
- `src/SystemFolder/SystemResources/App/ClassicyApp.tsx` — `globalShortcuts` prop + register/unregister effect.
- `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher.ts` — NEW: `useClassicyShortcutDispatcher(combinedMenu)` hook (the one listener).
- `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx` — app/system auto-registration effects + mount the dispatcher.
- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx` — remove the root document keydown listener.

Tests: `ClassicyKeyboardShortcut.test.ts`, `ClassicyAppManager.test.ts`, `ClassicyAppManagerUtils.test.ts`, `ClassicyApp.extension.test.tsx`, `ClassicyDesktopMenuBar.test.tsx`, plus a new `ClassicyShortcutDispatcher.test.ts` and integration cases.

---

## Task 1: Chord helpers

**Files:**
- Modify: `src/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut.ts` (append after `parseKeyboardShortcut`, ~line 75)
- Test: `src/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut.test.ts`

**Interfaces:**
- Consumes: existing `parseKeyboardShortcut`, `ParsedKeyboardShortcut`, `ClassicyMenuItem` (type import).
- Produces:
  - `canonicalChord(raw: string | undefined): string`
  - `canonicalChordsFromEvent(e: KeyboardEvent): string[]`
  - `collectMenuChords(items: ClassicyMenuItem[]): string[]`

- [ ] **Step 1: Write the failing tests**

Append to `src/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut.test.ts` (add the new symbols to the existing import from `./ClassicyKeyboardShortcut`; add `import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu"`):

```ts
describe("canonicalChord", () => {
	it("normalizes spelling/spacing/glyphs to one canonical form", () => {
		expect(canonicalChord("Cmd+Shift+S")).toBe("shift+command+s");
		expect(canonicalChord("⇧⌘S")).toBe("shift+command+s");
		expect(canonicalChord("command shift s")).toBe("shift+command+s");
	});
	it("orders modifiers control, option, shift, command", () => {
		expect(canonicalChord("Ctrl+Option+Shift+Cmd+K")).toBe(
			"control+option+shift+command+k",
		);
		expect(canonicalChord("⌥H")).toBe("option+h");
		expect(canonicalChord("⌃S")).toBe("control+s");
	});
	it("returns '' for a modifier-only or empty chord", () => {
		expect(canonicalChord("Cmd")).toBe("");
		expect(canonicalChord("")).toBe("");
		expect(canonicalChord(undefined)).toBe("");
	});
});

describe("canonicalChordsFromEvent", () => {
	const ev = (init: Partial<KeyboardEventInit> & { key: string }) =>
		new KeyboardEvent("keydown", init);

	it("meta+S yields the command candidate only", () => {
		expect(canonicalChordsFromEvent(ev({ key: "s", metaKey: true }))).toEqual([
			"command+s",
		]);
	});
	it("ctrl+S yields BOTH command and control candidates (meta-or-ctrl)", () => {
		const out = canonicalChordsFromEvent(ev({ key: "s", ctrlKey: true }));
		expect(out).toContain("command+s");
		expect(out).toContain("control+s");
	});
	it("alt+H (no meta/ctrl) yields the option candidate", () => {
		expect(canonicalChordsFromEvent(ev({ key: "h", altKey: true }))).toEqual([
			"option+h",
		]);
	});
	it("returns [] when no chord modifier is present", () => {
		expect(canonicalChordsFromEvent(ev({ key: "a" }))).toEqual([]);
	});
	it("derives the key from code when key is a dead/composed char (⌥ physical key)", () => {
		const out = canonicalChordsFromEvent(
			ev({ key: "≈", code: "KeyX", altKey: true }),
		);
		expect(out).toEqual(["option+x"]);
	});
});

describe("collectMenuChords", () => {
	it("collects canonical chords from nested menus, skipping native and empty", () => {
		const menu: ClassicyMenuItem[] = [
			{ id: "a", title: "Save", keyboardShortcut: "Cmd+S" },
			{ id: "b", title: "Undo", keyboardShortcut: "Cmd+Z", nativeShortcut: true },
			{ id: "c", title: "No shortcut" },
			{
				id: "sub",
				title: "More",
				menuChildren: [{ id: "d", title: "Find", keyboardShortcut: "⌘F" }],
			},
		];
		const out = collectMenuChords(menu);
		expect(out).toContain("command+s");
		expect(out).toContain("command+f");
		expect(out).not.toContain("command+z"); // native excluded
		expect(out).toHaveLength(2);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut.test.ts`
Expected: the three new describe blocks FAIL (symbols undefined). Existing tests PASS.

- [ ] **Step 3: Implement the helpers**

Append to `src/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut.ts`. NOTE: this file **already imports** `ClassicyMenuItem` (line 2: `import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";`) — do NOT add a second import. Just append the helpers:

```ts
// Fixed HIG-ish canonical order for building a stable key from modifier flags.
const buildChord = (
	flags: { control?: boolean; option?: boolean; shift?: boolean; command?: boolean },
	key: string,
): string => {
	const mods: string[] = [];
	if (flags.control) mods.push("control");
	if (flags.option) mods.push("option");
	if (flags.shift) mods.push("shift");
	if (flags.command) mods.push("command");
	return [...mods, key].join("+");
};

/**
 * Canonical string form of a declared shortcut, used as a registry key and for
 * conflict detection. `"Cmd+Shift+S"` → `"shift+command+s"`, `"⌥H"` → `"option+h"`.
 * Returns `""` for a modifier-only or empty chord (never a usable shortcut).
 */
export const canonicalChord = (raw: string | undefined): string => {
	const p = parseKeyboardShortcut(raw);
	if (!p.key) return "";
	return buildChord(p, p.key.toLowerCase());
};

const keyFromEvent = (e: KeyboardEvent): string => {
	if (e.key && e.key.length === 1) return e.key.toLowerCase();
	if (e.code.startsWith("Key")) return e.code.slice(3).toLowerCase();
	if (e.code.startsWith("Digit")) return e.code.slice(5);
	const k = (e.key || "").toLowerCase();
	return k === "meta" || k === "control" || k === "shift" || k === "alt"
		? ""
		: k;
};

/**
 * Canonical chord candidates an event could satisfy, mirroring
 * `shortcutMatchesEvent`: Command matches meta-OR-ctrl, so a physical Ctrl press
 * yields both a `command+…` and a `control+…` candidate. The `option`/`shift`
 * flags of each candidate always equal the event's `altKey`/`shiftKey` (a
 * declared shortcut only matches when those agree). Returns `[]` when no chord
 * modifier is down or no usable key is present.
 */
export const canonicalChordsFromEvent = (e: KeyboardEvent): string[] => {
	const key = keyFromEvent(e);
	if (!key) return [];
	const option = e.altKey;
	const shift = e.shiftKey;
	const out: string[] = [];
	if (e.metaKey || e.ctrlKey) {
		out.push(buildChord({ command: true, option, shift }, key));
	}
	if (e.ctrlKey) {
		out.push(buildChord({ control: true, option, shift }, key));
	}
	if (option && !e.metaKey && !e.ctrlKey) {
		out.push(buildChord({ option: true, shift }, key));
	}
	return [...new Set(out)];
};

/**
 * All canonical chords declared by a menu tree, skipping `nativeShortcut` items
 * (handled by the browser) and modifier-only/empty chords. Recurses submenus.
 */
export const collectMenuChords = (items: ClassicyMenuItem[]): string[] => {
	const acc = new Set<string>();
	const walk = (list: ClassicyMenuItem[]) => {
		for (const item of list) {
			if (item.keyboardShortcut && !item.nativeShortcut) {
				const c = canonicalChord(item.keyboardShortcut);
				if (c) acc.add(c);
			}
			if (item.menuChildren?.length) walk(item.menuChildren);
		}
	};
	walk(items);
	return [...acc];
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut.test.ts`
Expected: PASS (all new + existing).

- [ ] **Step 5: Type-check and lint**

Run: `pnpm build:source` (expect clean). Then
`pnpm exec biome check --write src/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut.ts src/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut.test.ts` (expect no errors).

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut.ts \
        src/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut.test.ts
git commit -m "feat(keyboard): canonical chord + event-candidate + menu-collect helpers"
```

---

## Task 2: Registry store slice, reducer, routing, persistence exclusion

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts` (type ~line 110-118; default ~line 413; router ~line 371; new handler near other handlers)
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.tsx` (`sanitizeStateForPersistence` ~line 127)
- Test: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`, `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.test.ts`

**Interfaces:**
- Consumes: `canonicalChord` (Task 1); `ClassicyStore`, `ActionMessage`, `classicyDesktopStateEventReducer`.
- Produces:
  - Store slice `state.System.Manager.Keyboard: ClassicyStoreSystemKeyboardManager` = `{ app: Record<string,string[]>; system: string[]; global: Record<string,{appId:string;event:string;eventData?:Record<string,unknown>}> }`.
  - Reducer `classicyShortcutEventHandler(ds, action)` handling `ClassicyShortcutRegister` / `ClassicyShortcutUnregister`.
  - Action shapes:
    - `{ type:"ClassicyShortcutRegister", scope:"app", appId:string, chords:string[] }`
    - `{ type:"ClassicyShortcutRegister", scope:"system", chords:string[] }`
    - `{ type:"ClassicyShortcutRegister", scope:"global", appId:string, chord:string, event:string, eventData?:object }`
    - `{ type:"ClassicyShortcutUnregister", scope:"app", appId:string }`
    - `{ type:"ClassicyShortcutUnregister", scope:"global", appId:string, chord:string }`

- [ ] **Step 1: Write the failing reducer tests**

Add to `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts` (it already imports `classicyDesktopStateEventReducer` and `DefaultAppManagerState` — confirm and reuse; if it builds state differently, follow the file's existing pattern for producing a base store):

```ts
describe("keyboard shortcut registry reducer", () => {
	const base = () => structuredClone(DefaultAppManagerState);

	it("registers app chords under the appId (replacing prior claims)", () => {
		let ds = base();
		ds = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyShortcutRegister",
			scope: "app",
			appId: "TextEditor.app",
			chords: ["command+s", "command+o"],
		});
		expect(ds.System.Manager.Keyboard.app["TextEditor.app"]).toEqual([
			"command+s",
			"command+o",
		]);
		// re-register replaces
		ds = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyShortcutRegister",
			scope: "app",
			appId: "TextEditor.app",
			chords: ["command+p"],
		});
		expect(ds.System.Manager.Keyboard.app["TextEditor.app"]).toEqual([
			"command+p",
		]);
	});

	it("registers system chords", () => {
		let ds = base();
		ds = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyShortcutRegister",
			scope: "system",
			chords: ["control+s", "option+h"],
		});
		expect(ds.System.Manager.Keyboard.system).toEqual(["control+s", "option+h"]);
	});

	it("registers a global; a duplicate chord is ignored (first-wins)", () => {
		let ds = base();
		ds = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyShortcutRegister",
			scope: "global",
			appId: "ExtA",
			chord: "control+space",
			event: "ExtAToggle",
		});
		ds = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyShortcutRegister",
			scope: "global",
			appId: "ExtB",
			chord: "control+space",
			event: "ExtBToggle",
		});
		expect(ds.System.Manager.Keyboard.global["control+space"]).toEqual({
			appId: "ExtA",
			event: "ExtAToggle",
			eventData: undefined,
		});
	});

	it("unregisters an app's claims and an owned global", () => {
		let ds = base();
		ds = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyShortcutRegister",
			scope: "app",
			appId: "TextEditor.app",
			chords: ["command+s"],
		});
		ds = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyShortcutRegister",
			scope: "global",
			appId: "ExtA",
			chord: "control+space",
			event: "ExtAToggle",
		});
		ds = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyShortcutUnregister",
			scope: "app",
			appId: "TextEditor.app",
		});
		ds = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyShortcutUnregister",
			scope: "global",
			appId: "ExtA",
			chord: "control+space",
		});
		expect(ds.System.Manager.Keyboard.app["TextEditor.app"]).toBeUndefined();
		expect(ds.System.Manager.Keyboard.global["control+space"]).toBeUndefined();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`
Expected: FAIL — `Keyboard` undefined / action unhandled.

- [ ] **Step 3: Add the slice type and default state**

In `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts`, add `Keyboard` to the `Manager` type (after `Boot`, line ~117):

```ts
		Boot: ClassicyStoreSystemBootManager;
		Keyboard: ClassicyStoreSystemKeyboardManager;
```

Add the interface (near the other `ClassicyStoreSystem*Manager` interfaces):

```ts
export interface ClassicyStoreSystemKeyboardManager
	extends ClassicyStoreSystemManager {
	/** Canonical chords each app claims (auto-derived from its menu). Keyed by appId. */
	app: Record<string, string[]>;
	/** Always-active chords owned by the desktop's Apple/system/Help menus. */
	system: string[];
	/** Extension globals: canonical chord → dispatched action. Unique; first-wins. */
	global: Record<
		string,
		{ appId: string; event: string; eventData?: Record<string, unknown> }
	>;
}
```

In `DefaultAppManagerState.System.Manager` (after the `Boot:` entry — find it near the end of the Manager literal), add:

```ts
			Keyboard: {
				app: {},
				system: [],
				global: {},
			},
```

(If `Boot` is defined after the excerpt shown, add `Keyboard` immediately after the `Boot` literal, staying inside `Manager`.)

- [ ] **Step 4: Add the reducer handler and route it**

Add the handler in `ClassicyAppManager.ts` (near `classicyAppEventHandler`):

```ts
export const classicyShortcutEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
): ClassicyStore => {
	const kb = ds.System.Manager.Keyboard;
	switch (action.type) {
		case "ClassicyShortcutRegister": {
			if (action.scope === "app" && typeof action.appId === "string") {
				kb.app[action.appId] = Array.isArray(action.chords)
					? [...new Set(action.chords as string[])]
					: [];
			} else if (action.scope === "system") {
				kb.system = Array.isArray(action.chords)
					? [...new Set(action.chords as string[])]
					: [];
			} else if (
				action.scope === "global" &&
				typeof action.chord === "string" &&
				action.chord !== "" &&
				typeof action.event === "string"
			) {
				if (kb.global[action.chord]) {
					if (process.env.NODE_ENV !== "production") {
						console.warn(
							"[ClassicyShortcut] global chord already registered; ignoring",
							{ chord: action.chord, by: action.appId },
						);
					}
				} else {
					kb.global[action.chord] = {
						appId: String(action.appId ?? ""),
						event: action.event,
						eventData: action.eventData as
							| Record<string, unknown>
							| undefined,
					};
				}
			}
			break;
		}
		case "ClassicyShortcutUnregister": {
			if (action.scope === "app" && typeof action.appId === "string") {
				delete kb.app[action.appId];
			} else if (
				action.scope === "global" &&
				typeof action.chord === "string"
			) {
				const owner = kb.global[action.chord];
				if (owner && owner.appId === action.appId) {
					delete kb.global[action.chord];
				}
			}
			break;
		}
	}
	return ds;
};
```

Route it in `classicyDesktopStateEventReducer` — add this branch BEFORE the `ClassicyDesktopIcon`/`ClassicyDesktop` checks is unnecessary (prefix is distinct); add it right after the `ClassicyManagerDateTime` branch (line ~372):

```ts
		} else if (action.type.startsWith("ClassicyManagerDateTime")) {
			ds = classicyDateTimeManagerEventHandler(ds, action);
		} else if (action.type.startsWith("ClassicyShortcut")) {
			ds = classicyShortcutEventHandler(ds, action);
```

- [ ] **Step 5: Run reducer tests to verify they pass**

Run: `pnpm test src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`
Expected: PASS.

- [ ] **Step 6: Write the failing persistence test**

Add to `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.test.ts` (follow the file's existing way of obtaining a sanitized snapshot; if `sanitizeStateForPersistence` is not exported, assert via the persisted `localStorage` payload the file already exercises). If the function is not currently exported, export it in `ClassicyAppManagerUtils.tsx` (`export function sanitizeStateForPersistence`). Test:

```ts
it("strips System.Manager.Keyboard from the persisted snapshot", () => {
	const state = structuredClone(DefaultAppManagerState);
	state.System.Manager.Keyboard.app["X.app"] = ["command+s"];
	const out = sanitizeStateForPersistence(state);
	expect(out.System.Manager.Keyboard.app).toEqual({});
	expect(out.System.Manager.Keyboard.system).toEqual([]);
	expect(out.System.Manager.Keyboard.global).toEqual({});
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `pnpm test src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.test.ts`
Expected: FAIL — Keyboard not stripped (and/or export missing).

- [ ] **Step 8: Strip Keyboard in `sanitizeStateForPersistence`**

In `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.tsx`, inside the `produce(state, (draft) => { ... })` body, after the Boot-parade reset (line ~127), add:

```ts
		// The keyboard-shortcut registry is runtime state: apps and extensions
		// re-register on every mount. Persisting it would resurrect claims whose
		// owner is gone (and can hold non-serializable intent). Reset to empty.
		draft.System.Manager.Keyboard = { app: {}, system: [], global: {} };
```

Ensure `sanitizeStateForPersistence` is exported (change `function` → `export function` if the test imports it).

- [ ] **Step 9: Run persistence test**

Run: `pnpm test src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.test.ts`
Expected: PASS.

- [ ] **Step 10: Full type-check + routing test + lint**

Run: `pnpm build:source` (clean).
Run: `pnpm test src/SystemFolder/ControlPanels/AppManager/` (no regressions in the manager suite).
Run: `pnpm exec biome check --write src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.tsx src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.test.ts`

- [ ] **Step 11: Commit**

```bash
git add src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts \
        src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.tsx \
        src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts \
        src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.test.ts
git commit -m "feat(keyboard): Keyboard registry store slice, reducer, persistence exclusion"
```

---

## Task 3: Extension `globalShortcuts` prop on ClassicyApp

**Files:**
- Modify: `src/SystemFolder/SystemResources/App/ClassicyApp.tsx` (props ~line 17-41; component ~line 43-58; new effect after the file-types effect ~line 187)
- Test: `src/SystemFolder/SystemResources/App/ClassicyApp.extension.test.tsx`

**Interfaces:**
- Consumes: `canonicalChord` (Task 1); `useAppManagerDispatch`; the `ClassicyShortcutRegister`/`Unregister` global actions (Task 2).
- Produces: `ClassicyGlobalShortcut = { shortcut: string; event: string; eventData?: Record<string, unknown> }`; new optional prop `globalShortcuts?: ClassicyGlobalShortcut[]` honored only for `extension` apps.

- [ ] **Step 1: Write the failing tests**

Add to `src/SystemFolder/SystemResources/App/ClassicyApp.extension.test.tsx` (reuse the file's existing render/mock setup and dispatch capture; mirror its patterns):

```tsx
it("an extension registers its global shortcuts on mount and unregisters on unmount", () => {
	const { unmount } = renderApp({
		id: "Ext.app",
		extension: true,
		globalShortcuts: [{ shortcut: "Ctrl+Space", event: "ExtToggle" }],
	});
	expect(dispatch).toHaveBeenCalledWith(
		expect.objectContaining({
			type: "ClassicyShortcutRegister",
			scope: "global",
			appId: "Ext.app",
			chord: "control+space",
			event: "ExtToggle",
		}),
	);
	unmount();
	expect(dispatch).toHaveBeenCalledWith(
		expect.objectContaining({
			type: "ClassicyShortcutUnregister",
			scope: "global",
			appId: "Ext.app",
			chord: "control+space",
		}),
	);
});

it("a NON-extension app's globalShortcuts are ignored", () => {
	renderApp({
		id: "Reg.app",
		extension: false,
		globalShortcuts: [{ shortcut: "Ctrl+Space", event: "Nope" }],
	});
	expect(dispatch).not.toHaveBeenCalledWith(
		expect.objectContaining({ type: "ClassicyShortcutRegister", scope: "global" }),
	);
});
```

(If the existing test file lacks a `renderApp` helper that forwards arbitrary props / returns `unmount`, add a thin one following the file's current render approach — it already mounts `<ClassicyApp>` with a mocked store dispatch.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/SystemFolder/SystemResources/App/ClassicyApp.extension.test.tsx`
Expected: FAIL — no global registration dispatched.

- [ ] **Step 3: Add the prop and the effect**

In `src/SystemFolder/SystemResources/App/ClassicyApp.tsx`, add the exported type and prop, and destructure it:

```ts
export type ClassicyGlobalShortcut = {
	shortcut: string;
	event: string;
	eventData?: Record<string, unknown>;
};
```

Add to `ClassicyAppProps` (after `extension?: boolean;`):

```ts
	/** Global keyboard shortcuts, honored only for `extension` apps. Each is
	 *  registered into the shortcut registry on mount (first-registrant wins)
	 *  and unregistered on unmount; firing dispatches `event` (+ `eventData`). */
	globalShortcuts?: ClassicyGlobalShortcut[];
```

Destructure `globalShortcuts` in the component params. Add `import { canonicalChord } from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";`.

Add this effect (after the `handlesFileTypes` effect, ~line 187). Serialize the prop for a stable dependency:

```ts
	const globalShortcutsKey = JSON.stringify(
		extension ? (globalShortcuts ?? []) : [],
	);
	useEffect(() => {
		if (!extension) return;
		const list: ClassicyGlobalShortcut[] = JSON.parse(globalShortcutsKey);
		const registered: string[] = [];
		for (const gs of list) {
			const chord = canonicalChord(gs.shortcut);
			if (!chord) continue;
			registered.push(chord);
			desktopEventDispatch({
				type: "ClassicyShortcutRegister",
				scope: "global",
				appId: id,
				chord,
				event: gs.event,
				eventData: gs.eventData,
			});
		}
		return () => {
			for (const chord of registered) {
				desktopEventDispatch({
					type: "ClassicyShortcutUnregister",
					scope: "global",
					appId: id,
					chord,
				});
			}
		};
	}, [extension, globalShortcutsKey, id, desktopEventDispatch]);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/SystemFolder/SystemResources/App/ClassicyApp.extension.test.tsx`
Expected: PASS.

- [ ] **Step 5: Type-check + lint**

Run: `pnpm build:source` (clean).
Run: `pnpm exec biome check --write src/SystemFolder/SystemResources/App/ClassicyApp.tsx src/SystemFolder/SystemResources/App/ClassicyApp.extension.test.tsx`

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/SystemResources/App/ClassicyApp.tsx \
        src/SystemFolder/SystemResources/App/ClassicyApp.extension.test.tsx
git commit -m "feat(keyboard): extension globalShortcuts prop registers/unregisters globals"
```

---

## Task 4: App + system auto-registration in the menu bar

**Files:**
- Modify: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx` (`ClassicyDesktopMenuBarContent`, after `defaultMenuItems` memo ~line 262)
- Test: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.test.tsx`

**Interfaces:**
- Consumes: `collectMenuChords` (Task 1); the `ClassicyShortcutRegister` app/system actions (Task 2); the bar's existing `appMenu`, `systemMenu`, `helpMenuItem`, `apps` (for focusedAppId), `desktopEventDispatch`.
- Produces: keeps `System.Manager.Keyboard.app[focusedAppId]` and `.system` in sync with the live menus.

- [ ] **Step 1: Write the failing tests**

Add to `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.test.tsx` (reuse its store-mock + dispatch-capture setup; seed a focused app whose `appMenu` has a shortcut and a `systemMenu`/help with one):

```tsx
it("registers the focused app's menu chords under its appId", () => {
	// Arrange a store where appMenu has a Cmd+T item and focusedAppId is set.
	renderMenuBarWith({
		focusedAppId: "HyperCard.app",
		appMenu: [
			{ id: "view", title: "View", menuChildren: [
				{ id: "t", title: "Tools", keyboardShortcut: "Ctrl+T" },
			] },
		],
	});
	expect(dispatch).toHaveBeenCalledWith(
		expect.objectContaining({
			type: "ClassicyShortcutRegister",
			scope: "app",
			appId: "HyperCard.app",
			chords: expect.arrayContaining(["control+t"]),
		}),
	);
});

it("registers system + Help chords under the system scope", () => {
	renderMenuBarWith({ focusedAppId: "Finder.app", appMenu: [] });
	expect(dispatch).toHaveBeenCalledWith(
		expect.objectContaining({
			type: "ClassicyShortcutRegister",
			scope: "system",
			chords: expect.arrayContaining(["control+s", "option+h"]),
		}),
	);
});
```

(`control+s` is the store's default `systemMenu` "About This Computer" ⌃S; `option+h` is the Help toggle ⌥H built in the bar. If the existing test file has no `renderMenuBarWith`, add one that renders `<ClassicyDesktopMenuBar />` under the file's existing mocked store, allowing `focusedAppId`/`appMenu`/`systemMenu` overrides.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.test.tsx`
Expected: FAIL — no shortcut registration dispatched.

- [ ] **Step 3: Add the registration effects**

In `ClassicyDesktopMenuBarContent`, add `import { collectMenuChords } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu"`... — actually import from the shortcut module: `import { collectMenuChords } from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";`. Compute `focusedAppId` from `apps` and add two effects after the `defaultMenuItems` memo (~line 262):

```ts
	const focusedAppId = useMemo(() => {
		const focused = Object.values(apps).find((a) => a.focused === true);
		return focused?.id ?? "Finder.app";
	}, [apps]);

	// App scope: the focused app's menu chords, keyed by appId. Re-runs when the
	// focused app or its published menu changes.
	const appChordsKey = useMemo(
		() => collectMenuChords(appMenu ?? []).join("|"),
		[appMenu],
	);
	useEffect(() => {
		desktopEventDispatch({
			type: "ClassicyShortcutRegister",
			scope: "app",
			appId: focusedAppId,
			chords: appChordsKey ? appChordsKey.split("|") : [],
		});
	}, [focusedAppId, appChordsKey, desktopEventDispatch]);

	// System scope: the desktop's own always-active chords (system menu + Help).
	const systemChordsKey = useMemo(
		() =>
			collectMenuChords([...(systemMenu ?? []), helpMenuItem]).join("|"),
		[systemMenu, helpMenuItem],
	);
	useEffect(() => {
		desktopEventDispatch({
			type: "ClassicyShortcutRegister",
			scope: "system",
			chords: systemChordsKey ? systemChordsKey.split("|") : [],
		});
	}, [systemChordsKey, desktopEventDispatch]);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Type-check + lint**

Run: `pnpm build:source` (clean).
Run: `pnpm exec biome check --write src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.test.tsx`

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx \
        src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.test.tsx
git commit -m "feat(keyboard): auto-register focused-app and system menu chords"
```

---

## Task 5: Central dispatcher hook + mount

**Files:**
- Create: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher.ts`
- Modify: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx` (call the hook in `ClassicyDesktopMenuBarContent`, passing `defaultMenuItems`)
- Test: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher.test.ts`

**Interfaces:**
- Consumes: `canonicalChordsFromEvent`, `findMenuItemByShortcut`, `runMenuItemAction` (existing); `useAppManager`, `useAppManagerDispatch`; the `Keyboard` slice; the combined menu (`defaultMenuItems`).
- Produces: `useClassicyShortcutDispatcher(combinedMenu: ClassicyMenuItem[]): void` — binds ONE `document` keydown listener implementing tiers 1→3.

- [ ] **Step 1: Write the failing tests**

Create `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher.test.ts`. Mock the store hooks so the test can seed `Keyboard` + `focusedAppId` and capture dispatch, then render a component that calls the hook and fire keydowns on `document`:

```ts
import { fireEvent } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const dispatch = vi.fn();
let store: any;
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (sel: (s: any) => unknown) => sel(store),
		useAppManagerDispatch: () => dispatch,
	}),
);
import { useClassicyShortcutDispatcher } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher";

const seed = (over: any) => {
	store = {
		System: {
			Manager: {
				Applications: { focusedAppId: over.focusedAppId ?? "Finder.app" },
				Keyboard: {
					app: over.app ?? {},
					system: over.system ?? [],
					global: over.global ?? {},
				},
			},
		},
	};
};

describe("useClassicyShortcutDispatcher", () => {
	const toolsItem = {
		id: "t",
		title: "Tools",
		keyboardShortcut: "Ctrl+T",
		onClickFunc: vi.fn(),
	};
	const menu = [{ id: "view", title: "View", menuChildren: [toolsItem] }];

	it("fires the focused app's claimed chord via its menu action", () => {
		toolsItem.onClickFunc.mockClear();
		seed({ focusedAppId: "HC.app", app: { "HC.app": ["control+t"] } });
		renderHook(() => useClassicyShortcutDispatcher(menu));
		fireEvent.keyDown(document, { key: "t", ctrlKey: true });
		expect(toolsItem.onClickFunc).toHaveBeenCalledOnce();
	});

	it("does NOT fire when a different app is focused (no claim)", () => {
		toolsItem.onClickFunc.mockClear();
		seed({ focusedAppId: "Other.app", app: { "HC.app": ["control+t"] } });
		renderHook(() => useClassicyShortcutDispatcher(menu));
		fireEvent.keyDown(document, { key: "t", ctrlKey: true });
		expect(toolsItem.onClickFunc).not.toHaveBeenCalled();
	});

	it("dispatches a global event when no focused-app/system claim matches", () => {
		dispatch.mockClear();
		seed({
			focusedAppId: "Other.app",
			global: { "control+space": { appId: "Ext", event: "ExtToggle" } },
		});
		renderHook(() => useClassicyShortcutDispatcher([]));
		fireEvent.keyDown(document, { key: " ", code: "Space", ctrlKey: true });
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({ type: "ExtToggle" }),
		);
	});

	it("shadows a global when the focused app claims the same chord", () => {
		dispatch.mockClear();
		toolsItem.onClickFunc.mockClear();
		seed({
			focusedAppId: "HC.app",
			app: { "HC.app": ["control+t"] },
			global: { "control+t": { appId: "Ext", event: "ExtToggle" } },
		});
		renderHook(() => useClassicyShortcutDispatcher(menu));
		fireEvent.keyDown(document, { key: "t", ctrlKey: true });
		expect(toolsItem.onClickFunc).toHaveBeenCalledOnce();
		expect(dispatch).not.toHaveBeenCalledWith(
			expect.objectContaining({ type: "ExtToggle" }),
		);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher.test.ts`
Expected: FAIL — module/hook does not exist.

- [ ] **Step 3: Implement the dispatcher hook**

Create `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher.ts`:

```ts
import { useEffect } from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	canonicalChordsFromEvent,
	findMenuItemByShortcut,
	runMenuItemAction,
} from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/**
 * The single app-wide keyboard-shortcut dispatcher. Binds one `document` keydown
 * listener and arbitrates modifier chords by registry precedence:
 *   1. the focused app's claimed chords → run the item's action from the live menu
 *   2. the always-active system chords   → run the item's action from the live menu
 *   3. an extension global               → dispatch its event
 * `combinedMenu` is the menu bar's assembled Apple + focused-app + Help menu; it
 * is the source for resolving tiers 1–2 actions (chords are unique per item).
 */
export const useClassicyShortcutDispatcher = (
	combinedMenu: ClassicyMenuItem[],
): void => {
	const focusedAppId = useAppManager(
		(s) => s.System.Manager.Applications.focusedAppId,
	);
	const keyboard = useAppManager((s) => s.System.Manager.Keyboard);
	const dispatch = useAppManagerDispatch();

	useEffect(() => {
		const handler = (event: KeyboardEvent) => {
			if (event.defaultPrevented) return;
			if (!(event.metaKey || event.ctrlKey || event.altKey)) return;
			// Option-only chords must not hijack text entry (accented chars).
			if (!event.metaKey && !event.ctrlKey) {
				const t = event.target as HTMLElement | null;
				if (
					t &&
					(t.tagName === "INPUT" ||
						t.tagName === "TEXTAREA" ||
						t.isContentEditable)
				) {
					return;
				}
			}

			const candidates = canonicalChordsFromEvent(event);
			if (candidates.length === 0) return;

			const appClaims = keyboard.app[focusedAppId] ?? [];
			const claimsChord = (list: string[]) =>
				candidates.some((c) => list.includes(c));

			// Tier 1 + 2: focused app, then system — action resolved from the live
			// combined menu (handles onClickFunc closures + nativeShortcut skip).
			if (claimsChord(appClaims) || claimsChord(keyboard.system)) {
				const match = findMenuItemByShortcut(combinedMenu, event);
				if (match) {
					event.preventDefault();
					runMenuItemAction(match, dispatch);
				}
				return;
			}

			// Tier 3: extension global.
			const chord = candidates.find((c) => keyboard.global[c]);
			if (chord) {
				const g = keyboard.global[chord];
				event.preventDefault();
				dispatch({ type: g.event, ...(g.eventData ?? {}) });
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [combinedMenu, focusedAppId, keyboard, dispatch]);
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher.test.ts`
Expected: PASS.

- [ ] **Step 5: Mount the dispatcher in the menu bar**

In `ClassicyDesktopMenuBarContent` (`ClassicyDesktopMenuBar.tsx`), add
`import { useClassicyShortcutDispatcher } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher";`
and, after the `defaultMenuItems` memo, call:

```ts
	useClassicyShortcutDispatcher(defaultMenuItems);
```

- [ ] **Step 6: Type-check + lint + menu-bar tests**

Run: `pnpm build:source` (clean).
Run: `pnpm test src/SystemFolder/SystemResources/Desktop/MenuBar/` (no regressions).
Run: `pnpm exec biome check --write src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher.ts src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher.test.ts src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx`

- [ ] **Step 7: Commit**

```bash
git add src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher.ts \
        src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher.test.ts \
        src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx
git commit -m "feat(keyboard): central shortcut dispatcher (focused app > system > global)"
```

---

## Task 6: Remove ClassicyMenu's document listener + integration + final build

**Files:**
- Modify: `src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx` (remove the root keydown effect, lines ~93-121, and its now-unused imports)
- Test: `src/SystemFolder/SystemResources/Menu/ClassicyMenu.test.tsx` (remove/replace the two command-key tests that exercised the removed listener), plus keep dispatcher coverage from Task 5.

**Interfaces:**
- Consumes: nothing new. Removes the duplicate listener so only the central dispatcher (Task 5) handles chords.

- [ ] **Step 1: Note the tests that will change**

In `src/SystemFolder/SystemResources/Menu/ClassicyMenu.test.tsx`, the tests
`"fires a menu item's action on its command-key press…"`, `"fires a menu item's action on a Control (⌃) shortcut"`, `"fires a menu item's action on an Option (⌥) shortcut…"`, and `"does not fire an Option shortcut while typing in a text field"` assert the behavior of the listener being removed. These move to the dispatcher (Task 5 already covers app/global/system dispatch and the text-field guard). Delete these four tests from `ClassicyMenu.test.tsx` (the dispatcher owns that behavior now). Keep all rendering/submenu/shortcut-glyph tests.

- [ ] **Step 2: Run the menu test to see the four listener tests still pass (pre-removal)**

Run: `pnpm test src/SystemFolder/SystemResources/Menu/ClassicyMenu.test.tsx`
Expected: PASS currently (listener still present). After Step 3 they would fail, which is why Step 1 removes them.

- [ ] **Step 3: Remove the listener from ClassicyMenu**

In `src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx`, delete the entire `useEffect` that binds `document.addEventListener("keydown", handler)` for command-key dispatch (the block ~lines 93-121, including its `findMenuItemByShortcut(menuItems, event)` usage). Remove now-unused imports (`findMenuItemByShortcut`, `runMenuItemAction`, and `desktopDispatch`/`closeAll`/`isSubmenu`-only-for-that-effect references) **only if** they are unused elsewhere in the file — verify each remaining usage before deleting an import. Delete the four tests named in Step 1.

- [ ] **Step 4: Run menu tests**

Run: `pnpm test src/SystemFolder/SystemResources/Menu/ClassicyMenu.test.tsx`
Expected: PASS (remaining tests; the four listener tests removed).

- [ ] **Step 5: Write the integration test**

Add an integration test file `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher.integration.test.tsx` that renders a real `ClassicyDesktop` (or the menu bar within the app-manager provider — follow the pattern used by existing desktop/menu-bar integration tests) with (a) a focused app whose menu has `Ctrl+T`, and (b) a mounted extension declaring a global `Ctrl+Space`. Assert:

```tsx
it("app shortcut fires only when its app is focused; extension global fires regardless", () => {
	// Render desktop with FocusedApp (menu Ctrl+T) + an extension (global Ctrl+Space).
	// 1) Focus FocusedApp → Ctrl+T runs its action; Ctrl+Space dispatches the global.
	// 2) Focus a different app → Ctrl+T no longer runs FocusedApp's action;
	//    Ctrl+Space still dispatches the global.
	// (Assert via a spy on the app menu item's action and on dispatch for the global event.)
});
```

Implement it concretely against the existing desktop test harness (reuse the store provider + `fireEvent.keyDown(document, …)`; if no such harness exists, drive the registry directly through `classicyDesktopStateEventReducer` to seed claims and render only the menu bar with the dispatcher, mirroring Task 5's approach at integration scale).

- [ ] **Step 6: Run the integration test**

Run: `pnpm test src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher.integration.test.tsx`
Expected: PASS.

- [ ] **Step 7: Full suite, type-check, lint**

Run: `pnpm build:source` (type-clean).
Run: `pnpm test` (full suite green; no regressions from removing the old listener).
Run: `pnpm exec biome check --write src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx src/SystemFolder/SystemResources/Menu/ClassicyMenu.test.tsx src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher.integration.test.tsx`

- [ ] **Step 8: Commit**

```bash
git add src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx \
        src/SystemFolder/SystemResources/Menu/ClassicyMenu.test.tsx \
        src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher.integration.test.tsx
git commit -m "feat(keyboard): route all chord shortcuts through the central dispatcher"
```

---

## Self-Review

**Spec coverage:**
- R1 (app shortcuts fire only when focused; chords reusable across apps) → Task 4 (per-app claim keyed by focusedAppId) + Task 5 tier 1 gate + Task 6 integration.
- R2 (globals only via extensions; fire dispatches event) → Task 3 (prop honored only for `extension`) + Task 5 tier 3.
- R3 (globals unique, first-wins) → Task 2 reducer (ignore duplicate) + test.
- R4 (precedence app > system > global) → Task 5 dispatcher order + tests (shadowing) + Task 4 system registration.
- R5 (modifier chords only; dialogs/plain keys unchanged) → Task 5 guard (`metaKey||ctrlKey||altKey`), `canonicalChordsFromEvent` returns `[]` otherwise; no dialog/media files touched.
- R6 (onClickFunc + event actions still fire; nativeShortcut never intercepted) → Task 5 uses `findMenuItemByShortcut`/`runMenuItemAction`; `collectMenuChords` skips `nativeShortcut` (Task 1) so those chords are never claimed.
- R7 (registry excluded from persistence) → Task 2 Step 8 + test.
- Acceptance 8 (old listener removed; build clean; tests green) → Task 6.

**Placeholder scan:** the only non-literal steps are Task 6 Step 5's integration test body and the test-helper adjustments (Task 3/4 `renderApp`/`renderMenuBarWith`), which depend on each test file's existing harness; every such step names the concrete assertions and the fallback (drive the reducer directly). All production code is shown in full.

**Type consistency:** `canonicalChord`/`canonicalChordsFromEvent`/`collectMenuChords` (Task 1) are consumed with matching signatures in Tasks 3–5. The `Keyboard` slice shape `{ app: Record<string,string[]>; system: string[]; global: Record<string,{appId;event;eventData?}> }` defined in Task 2 is read identically in Tasks 4 (register app/system `chords: string[]`), 3 (`scope:"global"` with `chord/event/eventData`), and 5 (dispatcher reads `app[focusedAppId]`, `system`, `global[chord]`). Action `type` strings (`ClassicyShortcutRegister`/`ClassicyShortcutUnregister`, `scope` values `"app"|"system"|"global"`) are identical across producer (Tasks 3,4) and reducer (Task 2). Dispatch is loosely typed (`ActionMessage = Record<string,unknown> & {type}`), so the register payloads need no casts.
```
