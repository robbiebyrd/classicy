# Classicy Extensions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `extension` boolean prop to `ClassicyApp` for background apps that are hidden from the App Switcher/desktop/Applications folder, get a derived icon in `System Folder/Extensions` that shows a "Library" error dialog on double-click, and parade their icons across the `ClassicyStartupScreen`.

**Architecture:** An `extension` flag on the app's Zustand store entry drives everything: `loadApp` auto-opens extensions unfocused; the App Switcher filters them out; a derivation module (mirroring the existing Applications-folder overlay) builds `System Folder/Extensions` entries from flagged apps; a new `Extension` file type routes Finder double-clicks to the existing error-dialog plumbing; the startup screen reads flagged apps and reveals their icons paced against its progress bar.

**Tech Stack:** React 18 + TypeScript, Zustand, SCSS, Vitest + Testing Library, Storybook.

**Spec:** `docs/superpowers/specs/2026-07-16-classicy-extensions-design.md`

## Global Constraints

- Package manager is **pnpm**. Run tests with `pnpm exec vitest run <path>`.
- Error dialog copy is exact: title `Library`, message `This file adds functionality to your computer. It cannot be opened.`
- Never edit `index.ts` barrel files — `pnpm build:source` regenerates them via barrelsby.
- Scope any biome formatting to touched files only (`pnpm exec biome check --write <files>`); repo-wide `lint:fix` reformats ~70 unrelated files.
- Tab indentation, `@/` path alias, co-located SCSS. No inline styles.
- End commit messages with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: `extension` flag in the store + `loadApp` auto-run lifecycle

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts` (interface ~line 52-67, `ClassicyAppLoad` case ~line 195-208)
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers.ts` (`loadApp`, ~line 104-127)
- Test: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`

**Interfaces:**
- Consumes: existing `loadApp(ds, appId, appName, appIcon, contextMenu?)`.
- Produces: `ClassicyStoreSystemApp.extension?: boolean`; `loadApp(ds, appId, appName, appIcon, contextMenu?, extension?: boolean)`; `ClassicyAppLoad` actions honor an `extension: true` field. Extension entries are created `open: true, focused: false, extension: true`.

- [ ] **Step 1: Write the failing tests**

Append to `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts` (uses the file's existing `makeStore()` helper):

```ts
describe("ClassicyAppLoad — extensions", () => {
	it("creates an extension entry open and unfocused", () => {
		const ds = makeStore();
		classicyAppEventHandler(ds, {
			type: "ClassicyAppLoad",
			app: { id: "ClockExt.app", name: "Clock", icon: "/icons/clock.png" },
			extension: true,
		});

		const app = ds.System.Manager.Applications.apps["ClockExt.app"];
		expect(app.extension).toBe(true);
		expect(app.open).toBe(true);
		expect(app.focused).toBe(false);
		// Loading an extension must not steal focus from the focused app
		expect(ds.System.Manager.Applications.focusedAppId).toBe("Finder.app");
	});

	it("still creates regular apps closed and without the flag", () => {
		const ds = makeStore();
		classicyAppEventHandler(ds, {
			type: "ClassicyAppLoad",
			app: { id: "TV.app", name: "TV", icon: "/icons/tv.png" },
		});

		const app = ds.System.Manager.Applications.apps["TV.app"];
		expect(app.open).toBe(false);
		expect(app.extension).toBeUndefined();
	});

	it("revives a persisted extension entry that was closed", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["ClockExt.app"] = {
			id: "ClockExt.app",
			name: "Clock",
			icon: "/icons/clock.png",
			windows: [],
			open: false,
			data: {},
		};

		classicyAppEventHandler(ds, {
			type: "ClassicyAppLoad",
			app: { id: "ClockExt.app", name: "Clock", icon: "/icons/clock.png" },
			extension: true,
		});

		const app = ds.System.Manager.Applications.apps["ClockExt.app"];
		expect(app.extension).toBe(true);
		expect(app.open).toBe(true);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`
Expected: the three new tests FAIL (`app.extension` undefined / `app.open` false).

- [ ] **Step 3: Implement**

In `ClassicyAppManager.ts`, add to `ClassicyStoreSystemApp` (after `noDesktopIcon?: boolean;`):

```ts
	extension?: boolean;
```

In the same file, `ClassicyAppLoad` case — pass the flag through:

```ts
		case "ClassicyAppLoad": {
			if (hasDesktopAppRef(action)) {
				loadApp(
					ds,
					action.app.id,
					action.app.name,
					action.app.icon,
					Array.isArray(action.contextMenu)
						? (action.contextMenu as ClassicyMenuItem[])
						: undefined,
					action.extension === true,
				);
			}
			break;
		}
```

In `ClassicyAppHelpers.ts`, replace `loadApp`:

```ts
export function loadApp(
	ds: ClassicyStore,
	appId: string,
	appName: string,
	appIcon: string,
	contextMenu?: ClassicyMenuItem[],
	extension?: boolean,
) {
	const findApp = ds.System.Manager.Applications.apps[appId];
	if (!findApp) {
		ds.System.Manager.Applications.apps[appId] = {
			id: appId,
			name: appName,
			icon: appIcon,
			windows: [],
			// Extensions run in the background from the moment they load; their
			// windows can only render while the app is open. They never take
			// focus on load.
			open: extension === true,
			data: {},
			contextMenu,
			...(extension ? { extension: true, focused: false } : {}),
		};
	} else {
		// Always refresh: menu onClickFunc handlers do not survive localStorage
		// persistence, so a re-mounting app must overwrite the persisted value.
		findApp.contextMenu = contextMenu;
		if (extension) {
			// A persisted extension entry may have open: false from an old
			// session; extensions always run once mounted.
			findApp.extension = true;
			findApp.open = true;
		}
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`
Expected: PASS (all tests in file, including pre-existing `loadApp` tests).

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts src/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers.ts src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts
git commit -m "feat: extension flag on app store entries with auto-run loadApp lifecycle

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: App Switcher excludes extensions

**Files:**
- Create: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils.ts`
- Modify: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx:53-65`
- Test: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils.test.ts`

**Interfaces:**
- Consumes: `ClassicyStoreSystemApp` (with `extension?: boolean` from Task 1).
- Produces: `appSwitcherAppsFrom(apps: Record<string, ClassicyStoreSystemApp>): ClassicyAppSwitcherEntry[]` where `ClassicyAppSwitcherEntry = { id: string; name: string; icon: string; focused?: boolean; open: boolean }`.

The filter is extracted to a pure, exported helper in its own file (react-refresh lint disallows non-component exports from component files) so it is directly unit-testable.

- [ ] **Step 1: Write the failing test**

Create `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ClassicyStoreSystemApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { appSwitcherAppsFrom } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils";

const app = (
	id: string,
	overrides: Partial<ClassicyStoreSystemApp> = {},
): ClassicyStoreSystemApp => ({
	id,
	name: id.replace(".app", ""),
	icon: `/icons/${id}.png`,
	windows: [],
	open: true,
	data: {},
	...overrides,
});

describe("appSwitcherAppsFrom", () => {
	it("lists open apps", () => {
		const result = appSwitcherAppsFrom({
			"Finder.app": app("Finder.app", { focused: true }),
			"TV.app": app("TV.app"),
		});
		expect(result.map((a) => a.id)).toEqual(["Finder.app", "TV.app"]);
	});

	it("excludes closed, unfocused apps", () => {
		const result = appSwitcherAppsFrom({
			"TV.app": app("TV.app", { open: false }),
		});
		expect(result).toEqual([]);
	});

	it("excludes extensions even when open or focused", () => {
		const result = appSwitcherAppsFrom({
			"Finder.app": app("Finder.app"),
			"ClockExt.app": app("ClockExt.app", { extension: true }),
			"FocusedExt.app": app("FocusedExt.app", {
				extension: true,
				focused: true,
			}),
		});
		expect(result.map((a) => a.id)).toEqual(["Finder.app"]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils.test.ts`
Expected: FAIL — module `ClassicyAppSwitcherUtils` does not exist.

- [ ] **Step 3: Implement**

Create `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils.ts`:

```ts
import type { ClassicyStoreSystemApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

export type ClassicyAppSwitcherEntry = {
	id: string;
	name: string;
	icon: string;
	focused?: boolean;
	open: boolean;
};

/**
 * Apps eligible for the menu-bar App Switcher: open (or transiently focused)
 * and not background extensions — extensions run with open: true but must
 * never surface in the switcher.
 */
export function appSwitcherAppsFrom(
	apps: Record<string, ClassicyStoreSystemApp>,
): ClassicyAppSwitcherEntry[] {
	return Object.values(apps)
		.filter((a) => (a.open || a.focused) && !a.extension)
		.map((a) => ({
			id: a.id,
			name: a.name,
			icon: a.icon,
			focused: a.focused,
			open: a.open,
		}));
}
```

In `ClassicyDesktopMenuBar.tsx`, replace the `appSwitcherData` memo body (lines 53-65) with the helper and add the import:

```ts
import { appSwitcherAppsFrom } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils";
```

```ts
	const appSwitcherData = useMemo(() => appSwitcherAppsFrom(apps), [apps]);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils.test.ts src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.test.tsx`
Expected: PASS (desktop tests confirm no menu-bar regression).

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils.ts src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils.test.ts src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx
git commit -m "feat: exclude extension apps from the App Switcher menu

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: `extension` prop on ClassicyApp

**Files:**
- Modify: `src/SystemFolder/SystemResources/App/ClassicyApp.tsx` (props ~line 17-29, mount effect ~line 84-125)
- Test: `src/SystemFolder/SystemResources/App/ClassicyApp.extension.test.tsx` (create)

**Interfaces:**
- Consumes: `ClassicyAppLoad` with `extension` field (Task 1).
- Produces: `ClassicyAppProps.extension?: boolean`. When true: load dispatch carries `extension: true`; no `ClassicyDesktopIconAdd`; no `ClassicyDesktopAppMenuAdd` (the `ClassicyDesktopAppMenuRemove` cleanup still fires).

- [ ] **Step 1: Write the failing test**

Create `src/SystemFolder/SystemResources/App/ClassicyApp.extension.test.tsx` (mock pattern copied from `ClassicyApp.defaultwindow.test.tsx`):

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";

const mockDispatch = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) => {
			const mockState = {
				System: {
					Manager: {
						Applications: {
							apps: {
								"ClockExt.app": {
									id: "ClockExt.app",
									name: "Clock",
									icon: "/icons/clock.png",
									open: true,
									focused: false,
									extension: true,
									windows: [],
									data: {},
								},
							},
						},
						Appearance: {
							activeTheme: {
								color: {
									white: 0xffffff,
									black: 0x000000,
									error: 0xff0000,
									system: [0, 0, 0, 0, 0, 0, 0, 0],
									theme: [0, 0, 0, 0, 0, 0, 0, 0],
								},
							},
						},
					},
				},
			};
			return selector(mockState);
		},
		useAppManagerDispatch: () => mockDispatch,
	}),
);

vi.mock("@/SystemFolder/SystemResources/Window/ClassicyWindow", () => ({
	ClassicyWindow: (): null => null,
}));

const dispatchedTypes = () =>
	mockDispatch.mock.calls.map((call) => (call[0] as { type: string }).type);

function renderExtension() {
	return render(
		<ClassicyApp
			id="ClockExt.app"
			name="Clock"
			icon="/icons/clock.png"
			extension
			addSystemMenu
		>
			<div data-testid="ext-child" />
		</ClassicyApp>,
	);
}

describe("ClassicyApp extension prop", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
	});

	it("dispatches ClassicyAppLoad with extension: true", () => {
		renderExtension();
		const load = mockDispatch.mock.calls
			.map((call) => call[0] as { type: string; extension?: boolean })
			.find((e) => e.type === "ClassicyAppLoad");
		expect(load?.extension).toBe(true);
	});

	it("never adds a desktop icon or Apple-menu entry, even with addSystemMenu", () => {
		renderExtension();
		expect(dispatchedTypes()).not.toContain("ClassicyDesktopIconAdd");
		expect(dispatchedTypes()).not.toContain("ClassicyDesktopAppMenuAdd");
	});

	it("renders its children because the extension is open in the store", () => {
		renderExtension();
		expect(screen.getByTestId("ext-child")).toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/App/ClassicyApp.extension.test.tsx`
Expected: FAIL — load dispatch has no `extension` field and `ClassicyDesktopIconAdd`/`ClassicyDesktopAppMenuAdd` are dispatched (no `noDesktopIcon`, `addSystemMenu` set).

- [ ] **Step 3: Implement**

In `ClassicyApp.tsx`:

Add to `ClassicyAppProps` (after `addSystemMenu?: boolean;`):

```ts
	extension?: boolean;
```

Destructure it in the component signature (after `addSystemMenu,`):

```ts
	extension,
```

Replace the mount effect (lines 84-125):

```ts
	useEffect(() => {
		desktopEventDispatch({
			type: "ClassicyAppLoad",
			app: { id, name, icon },
			contextMenu,
			extension,
		});

		// Extensions are background-only: no Apple-menu entry and no desktop
		// icon (which also keeps them out of the derived Applications folder).
		if (addSystemMenu && !extension) {
			desktopEventDispatch({
				type: "ClassicyDesktopAppMenuAdd",
				app: {
					id: id,
					name: name,
					icon: icon,
				},
			});
		} else {
			desktopEventDispatch({
				type: "ClassicyDesktopAppMenuRemove",
				app: {
					id: id,
					name: name,
					icon: icon,
				},
			});
		}

		if (!noDesktopIcon && !extension) {
			desktopEventDispatch({
				type: "ClassicyDesktopIconAdd",
				app: {
					id: id,
					name: name,
					icon: icon,
				},
				kind: "app_shortcut",
			});
		}
		// contextMenu is intentionally omitted from the deps: inline menu
		// literals change identity every render and must not re-fire the load
		// effect.
	}, [addSystemMenu, noDesktopIcon, extension, desktopEventDispatch, id, name, icon]);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/App/`
Expected: PASS (new file plus existing App tests).

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/App/ClassicyApp.tsx src/SystemFolder/SystemResources/App/ClassicyApp.extension.test.tsx
git commit -m "feat: extension prop on ClassicyApp for background apps

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `Extension` file type + seeded `System Folder/Extensions` directory

**Files:**
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileSystemModel.ts:3-15`
- Modify: `src/SystemFolder/SystemResources/File/DefaultClassicyFileSystem.ts:39-54`
- Test: `src/SystemFolder/SystemResources/File/DefaultClassicyFileSystem.test.ts`

**Interfaces:**
- Produces: `ClassicyFileSystemEntryFileType.Extension = "extension"`; seed entry `Macintosh HD:System Folder:Extensions` (Directory, icon `ClassicyIcons.system.folders.extensions`).
- Note: `fileTypeHandlers` records are built with `Object.fromEntries(Object.values(ClassicyFileSystemEntryFileType)...)` in both `ClassicyAppManager.ts` and test fixtures, so the new member needs no other changes.

- [ ] **Step 1: Write the failing test**

Append to `src/SystemFolder/SystemResources/File/DefaultClassicyFileSystem.test.ts`:

```ts
describe("DefaultClassicyFileSystem Extensions folder", () => {
	it("seeds System Folder/Extensions as a directory", () => {
		const fs = new ClassicyFileSystem();
		const entry = fs.resolve("Macintosh HD:System Folder:Extensions");

		expect(entry?._type).toBe(ClassicyFileSystemEntryFileType.Directory);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/File/DefaultClassicyFileSystem.test.ts`
Expected: FAIL — the path does not resolve (no such seed entry).

- [ ] **Step 3: Implement**

In `ClassicyFileSystemModel.ts`, add to the enum (after `AppShortcut = "app_shortcut",`):

```ts
	Extension = "extension",
```

In `DefaultClassicyFileSystem.ts`, add a module-level constant next to the other icon aliases (line 4-7):

```ts
const extensionsFolderIcon = ClassicyIcons.system.folders.extensions;
```

and inside the `"System Folder"` entry (after the `System` file entry):

```ts
			Extensions: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				_icon: extensionsFolderIcon,
			},
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/File/DefaultClassicyFileSystem.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/File/ClassicyFileSystemModel.ts src/SystemFolder/SystemResources/File/DefaultClassicyFileSystem.ts src/SystemFolder/SystemResources/File/DefaultClassicyFileSystem.test.ts
git commit -m "feat: Extension file type and seeded System Folder/Extensions directory

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Extensions folder derivation module

**Files:**
- Create: `src/SystemFolder/SystemResources/File/ClassicyFileSystemExtensions.ts`
- Test: `src/SystemFolder/SystemResources/File/ClassicyFileSystemExtensions.test.ts`

**Interfaces:**
- Consumes: `ClassicyStoreSystemApp` (Task 1), `ClassicyFileSystemEntryFileType.Extension` (Task 4).
- Produces: `buildExtensionsFolder(apps: ClassicyStoreSystemApp[]): ClassicyFileSystemEntry` and `withExtensionsFolder(tree: ClassicyFileSystemEntry, apps: ClassicyStoreSystemApp[]): ClassicyFileSystemEntry`. Entries are keyed by app name with `_type: Extension, _icon, _creator: app.id, _readOnly: true, _nameLocked: true`.

- [ ] **Step 1: Write the failing test**

Create `src/SystemFolder/SystemResources/File/ClassicyFileSystemExtensions.test.ts` (mirrors `ClassicyFileSystemApplications.test.ts`):

```ts
import { describe, expect, it } from "vitest";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import type { ClassicyStoreSystemApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	buildExtensionsFolder,
	withExtensionsFolder,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemExtensions";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

const app = (
	id: string,
	name: string,
	extension = true,
): ClassicyStoreSystemApp => ({
	id,
	name,
	icon: `/icons/${id}.png`,
	windows: [],
	open: true,
	data: {},
	...(extension ? { extension: true } : {}),
});

describe("buildExtensionsFolder", () => {
	it("builds an Extension entry per extension app", () => {
		const folder = buildExtensionsFolder([
			app("ClockExt.app", "Clock"),
			app("NetExt.app", "Network"),
		]);

		expect(folder._type).toBe(ClassicyFileSystemEntryFileType.Directory);
		expect(folder._icon).toBe(ClassicyIcons.system.folders.extensions);
		expect(folder._readOnly).toBe(true);
		expect(folder.Clock).toEqual({
			_type: ClassicyFileSystemEntryFileType.Extension,
			_icon: "/icons/ClockExt.app.png",
			_creator: "ClockExt.app",
			_readOnly: true,
			_nameLocked: true,
		});
		expect(folder.Network._creator).toBe("NetExt.app");
	});

	it("excludes non-extension apps", () => {
		const folder = buildExtensionsFolder([
			app("Finder.app", "Finder", false),
			app("ClockExt.app", "Clock"),
		]);

		expect(folder.Finder).toBeUndefined();
		expect(folder.Clock).toBeDefined();
	});
});

describe("withExtensionsFolder", () => {
	const drive = () => ({
		"Macintosh HD": {
			_type: ClassicyFileSystemEntryFileType.Drive,
			"System Folder": {
				_type: ClassicyFileSystemEntryFileType.Directory,
				Finder: {
					_type: ClassicyFileSystemEntryFileType.File,
					_system: true,
				},
			},
		},
	});

	it("merges the derived folder into System Folder on the first drive", () => {
		const tree = withExtensionsFolder(drive(), [app("ClockExt.app", "Clock")]);
		const extensions = tree["Macintosh HD"]["System Folder"].Extensions;

		expect(extensions.Clock._creator).toBe("ClockExt.app");
		// sibling seed entries survive
		expect(tree["Macintosh HD"]["System Folder"].Finder._system).toBe(true);
	});

	it("creates System Folder when the drive lacks one", () => {
		const tree = withExtensionsFolder(
			{ "Macintosh HD": { _type: ClassicyFileSystemEntryFileType.Drive } },
			[app("ClockExt.app", "Clock")],
		);

		expect(
			tree["Macintosh HD"]["System Folder"].Extensions.Clock._type,
		).toBe(ClassicyFileSystemEntryFileType.Extension);
	});

	it("keeps static Extensions children alongside derived entries", () => {
		const tree = drive();
		tree["Macintosh HD"]["System Folder"].Extensions = {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"Read Me.txt": {
				_type: ClassicyFileSystemEntryFileType.TextFile,
				_data: "hi",
			},
		};
		const result = withExtensionsFolder(tree, [app("ClockExt.app", "Clock")]);
		const extensions = result["Macintosh HD"]["System Folder"].Extensions;

		expect(extensions["Read Me.txt"]._data).toBe("hi");
		expect(extensions.Clock._creator).toBe("ClockExt.app");
	});

	it("passes through unchanged when no extension apps exist", () => {
		const tree = drive();
		expect(withExtensionsFolder(tree, [app("Finder.app", "Finder", false)])).toBe(
			tree,
		);
	});

	it("passes through a drive-less tree unchanged", () => {
		const tree = { Stuff: { _type: ClassicyFileSystemEntryFileType.Directory } };
		expect(withExtensionsFolder(tree, [app("ClockExt.app", "Clock")])).toBe(
			tree,
		);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystemExtensions.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

Create `src/SystemFolder/SystemResources/File/ClassicyFileSystemExtensions.ts`:

```ts
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import type { ClassicyStoreSystemApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

export const SYSTEM_FOLDER_NAME = "System Folder";

/**
 * Derives the virtual "System Folder/Extensions" directory from the app
 * manager's registered extension apps. Like the Applications folder, the
 * result is merged into the live file system tree at read time (see
 * useClassicyFileSystem) and never persisted, so the folder always mirrors
 * the extensions currently mounted.
 */
export const buildExtensionsFolder = (
	apps: ClassicyStoreSystemApp[],
): ClassicyFileSystemEntry => {
	const folder: ClassicyFileSystemEntry = {
		_type: ClassicyFileSystemEntryFileType.Directory,
		_icon: ClassicyIcons.system.folders.extensions,
		_readOnly: true,
	};

	for (const app of apps) {
		if (!app.extension) continue;
		folder[app.name] = {
			_type: ClassicyFileSystemEntryFileType.Extension,
			_icon: app.icon,
			_creator: app.id,
			_readOnly: true,
			_nameLocked: true,
		};
	}

	return folder;
};

/**
 * Returns a copy of the tree with the derived Extensions folder merged into
 * "System Folder" on its first drive (creating the folder when a custom tree
 * lacks one). Static Extensions children are kept; derived entries win on
 * name collisions. The input tree is not mutated, and a tree with no drive —
 * or a store with no extension apps — passes through unchanged.
 */
export const withExtensionsFolder = (
	tree: ClassicyFileSystemEntry,
	apps: ClassicyStoreSystemApp[],
): ClassicyFileSystemEntry => {
	if (!apps.some((a) => a.extension)) return tree;

	const driveKey = Object.keys(tree).find(
		(key) => tree[key]?._type === ClassicyFileSystemEntryFileType.Drive,
	);
	if (!driveKey) return tree;

	const systemFolder = tree[driveKey][SYSTEM_FOLDER_NAME] ?? {
		_type: ClassicyFileSystemEntryFileType.Directory,
	};
	const existing = systemFolder.Extensions;
	return {
		...tree,
		[driveKey]: {
			...tree[driveKey],
			[SYSTEM_FOLDER_NAME]: {
				...systemFolder,
				Extensions: { ...existing, ...buildExtensionsFolder(apps) },
			},
		},
	};
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystemExtensions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/File/ClassicyFileSystemExtensions.ts src/SystemFolder/SystemResources/File/ClassicyFileSystemExtensions.test.ts
git commit -m "feat: derive System Folder/Extensions entries from extension apps

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Wire the Extensions overlay into `useClassicyFileSystem`

**Files:**
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.tsx`
- Test: `src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.test.tsx`

**Interfaces:**
- Consumes: `withExtensionsFolder` (Task 5), `ClassicyAppLoad` with `extension: true` (Task 1).
- Produces: the live file system exposes `Macintosh HD:System Folder:Extensions:<AppName>` for every mounted extension, reactive to load events, never persisted.

- [ ] **Step 1: Write the failing tests**

Append to `src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.test.tsx` (reuses the file's `wrapperFor`, `dispatch`, `useAppManager`, `DefaultAppManagerState` imports):

```tsx
describe("useClassicyFileSystem Extensions overlay", () => {
	const drive = () => ({
		"Macintosh HD": {
			_type: ClassicyFileSystemEntryFileType.Drive,
			"System Folder": { _type: ClassicyFileSystemEntryFileType.Directory },
		},
	});

	const addExtensionApp = (id: string, name: string) => {
		act(() => {
			dispatch({
				type: "ClassicyAppLoad",
				app: { id, name, icon: `/icons/${id}.png` },
				extension: true,
			});
		});
	};

	beforeEach(() => {
		localStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("overlays registered extensions into System Folder/Extensions", () => {
		const { result } = renderHook(
			() => useClassicyFileSystem("test-ext-overlay"),
			{ wrapper: wrapperFor({ defaultFileSystem: drive(), mode: "exclusive" }) },
		);

		addExtensionApp("ClockExt.app", "Clock");

		const entry = result.current.resolve(
			"Macintosh HD:System Folder:Extensions:Clock",
		);
		expect(entry._type).toBe(ClassicyFileSystemEntryFileType.Extension);
		expect(entry._creator).toBe("ClockExt.app");
	});

	it("adds no Extensions overlay when no extensions are registered", () => {
		const { result } = renderHook(
			() => useClassicyFileSystem("test-ext-overlay-empty"),
			{ wrapper: wrapperFor({ defaultFileSystem: drive(), mode: "exclusive" }) },
		);

		expect(
			result.current.resolve("Macintosh HD:System Folder:Extensions"),
		).toBeUndefined();
	});

	it("does not persist the Extensions overlay to localStorage", () => {
		renderHook(() => useClassicyFileSystem("test-ext-overlay-persist"), {
			wrapper: wrapperFor({ defaultFileSystem: drive(), mode: "exclusive" }),
		});

		addExtensionApp("ClockExt.app", "Clock");

		const persisted = localStorage.getItem("test-ext-overlay-persist");
		expect(persisted).not.toBeNull();
		expect(
			JSON.parse(persisted as string)["Macintosh HD"]["System Folder"]
				.Extensions,
		).toBeUndefined();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.test.tsx`
Expected: the first and third new tests FAIL (no overlay); pre-existing tests PASS.

- [ ] **Step 3: Implement**

In `ClassicyFileSystemContext.tsx`, add the import:

```ts
import { withExtensionsFolder } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemExtensions";
```

Add a second invalidation key after `appShortcutsKey`:

```ts
	// Stable key over the extension-app set so the tree is only rebuilt when
	// an extension registers/unregisters — not on focus or window changes.
	const extensionAppsKey = useAppManager((s) =>
		Object.values(s.System.Manager.Applications.apps)
			.filter((a) => a.extension)
			.map((a) => `${a.id}\u0000${a.name}\u0000${a.icon}`)
			.join("\u0001"),
	);
```

Inside the `useMemo`, after the `withApplicationsFolder` assignment, add:

```ts
		// Same live-only overlay strategy for System Folder/Extensions, derived
		// from apps flagged extension rather than desktop icons (extensions have
		// no desktop icon). extensionAppsKey keeps this in sync with the store.
		fs.fs = withExtensionsFolder(
			fs.fs,
			Object.values(useAppManager.getState().System.Manager.Applications.apps),
		);
```

and extend the dependency array to `[defaultFileSystem, mode, storageKey, separator, appShortcutsKey, extensionAppsKey]`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.test.tsx`
Expected: PASS (all, including pre-existing overlay tests).

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.tsx src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.test.tsx
git commit -m "feat: overlay derived Extensions folder in useClassicyFileSystem

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Finder double-click shows the "Library" error dialog

**Files:**
- Modify: `src/SystemFolder/Finder/FinderContext.tsx` (`ClassicyAppFinderOpenFile` case, after the `_system` guard at ~line 112-118)
- Test: `src/SystemFolder/Finder/ClassicyFinderEventHandler.test.ts`

**Interfaces:**
- Consumes: `ClassicyFileSystemEntryFileType.Extension` (Task 4), existing `errorDialog` store field.
- Produces: double-clicking an Extension entry sets `System.Manager.Desktop.errorDialog = { title: "Library", message: "This file adds functionality to your computer. It cannot be opened." }` and performs no other routing.

- [ ] **Step 1: Write the failing test**

Append to `src/SystemFolder/Finder/ClassicyFinderEventHandler.test.ts` (uses the file's `makeStore()`):

```ts
describe("classicyFinderEventHandler — ClassicyAppFinderOpenFile (Extension)", () => {
	it("shows the Library error dialog and does not open any app", () => {
		const ds = makeStore();

		classicyFinderEventHandler(ds, {
			type: "ClassicyAppFinderOpenFile",
			file: {
				_type: ClassicyFileSystemEntryFileType.Extension,
				_creator: "ClockExt.app",
			},
			path: "Macintosh HD:System Folder:Extensions:Clock",
		});

		expect(ds.System.Manager.Desktop.errorDialog).toEqual({
			title: "Library",
			message:
				"This file adds functionality to your computer. It cannot be opened.",
		});
		expect(
			ds.System.Manager.Applications.apps["ClockExt.app"],
		).toBeUndefined();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/SystemFolder/Finder/ClassicyFinderEventHandler.test.ts`
Expected: the new test FAILS — `errorDialog` message is "Finder cannot open the file type you requested." (fallthrough routing) instead of the Library dialog.

- [ ] **Step 3: Implement**

In `FinderContext.tsx`, immediately after the `file?._system` guard's closing brace (after line 118), insert:

```ts
			if (file?._type === ClassicyFileSystemEntryFileType.Extension) {
				// Mac OS 8 behavior: extensions add functionality at boot and are
				// not openable documents or applications.
				ds.System.Manager.Desktop.errorDialog = {
					title: "Library",
					message:
						"This file adds functionality to your computer. It cannot be opened.",
				};
				return ds;
			}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/SystemFolder/Finder/ClassicyFinderEventHandler.test.ts`
Expected: PASS (all, including pre-existing OpenFile tests).

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/Finder/FinderContext.tsx src/SystemFolder/Finder/ClassicyFinderEventHandler.test.ts
git commit -m "feat: Library error dialog when opening an extension in Finder

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Extension icon parade on the startup screen

**Files:**
- Modify: `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.tsx`
- Modify: `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.scss`
- Test: `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.test.tsx`

**Interfaces:**
- Consumes: `ClassicyStoreSystemApp.extension` (Task 1) via `useAppManager`.
- Produces: `.classicyStartupScreenExtensions` row of `<img alt={app.name}>` icons; with `N` extensions and `duration` ms, icon `i` (0-based) appears once elapsed ≥ `(i + 1) × duration / (N + 1)`.

- [ ] **Step 1: Write the failing tests**

In `ClassicyStartupScreen.test.tsx`, add a store mock after the existing `vi.mock` blocks (the component will import `useAppManager`; existing tests keep passing because the default is an empty app record):

```ts
type MockApp = {
	id: string;
	name: string;
	icon: string;
	open: boolean;
	extension?: boolean;
};

const mockApps = vi.hoisted(() => ({
	current: {} as Record<string, MockApp>,
}));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: { Manager: { Applications: { apps: mockApps.current } } },
			}),
	}),
);
```

Reset it inside the existing `beforeEach`:

```ts
		mockApps.current = {};
```

Append a new describe block:

```tsx
const extApp = (id: string, name: string): MockApp => ({
	id,
	name,
	icon: `/icons/${id}.png`,
	open: true,
	extension: true,
});

describe("ClassicyStartupScreen extension parade", () => {
	it("renders no parade row when no extensions are registered", () => {
		mockApps.current = {
			"Finder.app": { id: "Finder.app", name: "Finder", icon: "", open: true },
		};
		const { container } = render(<ClassicyStartupScreen />);
		expect(
			container.querySelector(".classicyStartupScreenExtensions"),
		).toBeNull();
	});

	it("reveals extension icons one at a time, paced by duration/(N+1)", () => {
		mockApps.current = {
			"AExt.app": extApp("AExt.app", "Alpha"),
			"BExt.app": extApp("BExt.app", "Beta"),
			"CExt.app": extApp("CExt.app", "Gamma"),
		};
		// duration 4000, N=3 → reveal interval 1000ms
		const { container } = render(<ClassicyStartupScreen />);
		const icons = () =>
			container.querySelectorAll(".classicyStartupScreenExtensions img")
				.length;

		expect(icons()).toBe(0);
		act(() => {
			vi.advanceTimersByTime(950);
		});
		expect(icons()).toBe(0);
		act(() => {
			vi.advanceTimersByTime(100); // t=1050
		});
		expect(icons()).toBe(1);
		expect(screen.getByAltText("Alpha")).toBeInTheDocument();
		act(() => {
			vi.advanceTimersByTime(1000); // t=2050
		});
		expect(icons()).toBe(2);
		act(() => {
			vi.advanceTimersByTime(1000); // t=3050
		});
		expect(icons()).toBe(3);
		// splash still visible with the full parade before completion
		expect(
			container.querySelector(".classicyStartupScreen"),
		).toBeInTheDocument();
	});

	it("excludes non-extension apps from the parade", () => {
		mockApps.current = {
			"Finder.app": { id: "Finder.app", name: "Finder", icon: "", open: true },
			"AExt.app": extApp("AExt.app", "Alpha"),
		};
		// N=1 → interval 2000ms
		const { container } = render(<ClassicyStartupScreen />);
		act(() => {
			vi.advanceTimersByTime(3000);
		});
		const imgs = container.querySelectorAll(
			".classicyStartupScreenExtensions img",
		);
		expect(imgs).toHaveLength(1);
		expect(screen.getByAltText("Alpha")).toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.test.tsx`
Expected: the second and third new tests FAIL (no `.classicyStartupScreenExtensions` markup exists yet); the first new test passes trivially (it asserts absence). Pre-existing tests PASS.

- [ ] **Step 3: Implement**

In `ClassicyStartupScreen.tsx`:

Update imports:

```ts
import { type FC as FunctionalComponent, useEffect, useMemo, useState } from "react";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
```

Inside the component, after the `player` line:

```ts
	// Extension apps have already dispatched ClassicyAppLoad by the time the
	// splash covers the desktop, so the store is the parade's source of truth.
	// Select the stable apps record and derive with useMemo — a filtering
	// selector would return a fresh array every snapshot.
	const apps = useAppManager((state) => state.System.Manager.Applications.apps);
	const extensions = useMemo(
		() => Object.values(apps).filter((app) => app.extension),
		[apps],
	);

	// Mac OS 7-style parade: with N extensions, icon i appears once elapsed
	// time passes (i + 1) × duration / (N + 1) — the last icon lands before
	// the progress bar completes.
	const revealInterval = duration / (extensions.length + 1);
	const elapsed = (progress / 100) * duration;
	const visibleExtensions = extensions.slice(
		0,
		Math.min(extensions.length, Math.floor(elapsed / revealInterval)),
	);
```

(Place these after the existing `progress` state declaration so `progress` is in scope.)

In the JSX, inside the `.classicyStartupScreen` div, after the closing `</div>` of `.classicyStartupScreenPanel`:

```tsx
			{visibleExtensions.length > 0 && (
				<div className="classicyStartupScreenExtensions">
					{visibleExtensions.map((ext) => (
						<img key={ext.id} src={ext.icon} alt={ext.name} title={ext.name} />
					))}
				</div>
			)}
```

In `ClassicyStartupScreen.scss`, append:

```scss
.classicyStartupScreenExtensions {
  position: absolute;
  inset: auto calc(var(--window-padding-size) * 2)
    calc(var(--window-padding-size) * 2);
  display: flex;
  // wrap-reverse grows the parade upward when a row fills, like Mac OS 7
  flex-wrap: wrap-reverse;
  gap: calc(var(--window-padding-size) * 1.5);

  img {
    width: var(--icon-size-regular, 32px);
    height: var(--icon-size-regular, 32px);
    image-rendering: pixelated;
  }
}
```

(If `--icon-size-regular` does not exist as a CSS var — check `grep -r "icon-size-regular" src/` — use `32px` directly.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.test.tsx`
Expected: PASS (all 12+ tests, old and new).

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.tsx src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.scss src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.test.tsx
git commit -m "feat: Mac OS 7-style extension icon parade on the startup screen

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Storybook variant, example demo extension, full verification

**Files:**
- Modify: `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.stories.tsx`
- Create: `example/src/Applications/DemoExtension/DemoExtension.tsx`
- Modify: `example/src/app.tsx`

**Interfaces:**
- Consumes: everything above; `dispatch` from `ClassicyAppManagerUtils`; `ClassicyApp`/`ClassicyIcons` from the `classicy` package export.

- [ ] **Step 1: Add the Storybook variant**

In `ClassicyStartupScreen.stories.tsx`, add imports:

```tsx
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { dispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
```

and a story:

```tsx
export const WithExtensions: Story = {
	render: () => {
		resetStartupScreenSession();
		const seed = [
			{ id: "ClockExt.app", name: "Clock", icon: ClassicyIcons.system.extension },
			{ id: "ColorsExt.app", name: "Colors", icon: ClassicyIcons.system.colors.extension },
			{ id: "MacExt.app", name: "Mac", icon: ClassicyIcons.system.mac },
			{ id: "ClassicExt.app", name: "Classic", icon: ClassicyIcons.system.macClassic },
			{ id: "WinkExt.app", name: "Wink", icon: ClassicyIcons.system.macWink },
		];
		for (const app of seed) {
			dispatch({ type: "ClassicyAppLoad", app, extension: true });
		}
		return <ClassicyStartupScreen duration={15000} />;
	},
};
```

(Verify the exact `ClassicyIcons` paths compile; `system.extension`, `system.colors.extension`, `system.mac`, `system.macClassic`, `system.macWink` all exist in `ClassicyIcons.ts`.)

- [ ] **Step 2: Add the example demo extension**

Create `example/src/Applications/DemoExtension/DemoExtension.tsx`:

```tsx
import { ClassicyApp, ClassicyIcons } from "classicy";

/**
 * Minimal background extension: no desktop icon, no App Switcher entry, no
 * Applications-folder entry. It appears in the startup-screen parade and in
 * Macintosh HD:System Folder:Extensions, where double-clicking it shows the
 * "Library" error dialog.
 */
export const DemoExtension = () => (
	<ClassicyApp
		id="DemoExtension.app"
		name="Demo Extension"
		icon={ClassicyIcons.system.extension}
		extension
	/>
);
```

(If `ClassicyIcons` is not exported from the package index, run `pnpm build:source` first — barrelsby regenerates exports — and confirm with `grep ClassicyIcons dist/classicy.es.js | head -1`.)

In `example/src/app.tsx`, import and mount it inside `<ClassicyDesktop>`:

```tsx
import { DemoExtension } from "./Applications/DemoExtension/DemoExtension";
```

```tsx
				<Browser />
				<BlueBox />
				<Demo />
				<DemoExtension />
```

- [ ] **Step 3: Full verification**

```bash
pnpm exec vitest run
pnpm build:source
pnpm lint
```

Expected: all tests pass; build succeeds (barrels regenerate, picking up `ClassicyFileSystemExtensions.ts` and `ClassicyAppSwitcherUtils.ts`); lint clean. If biome formatting is needed, scope it: `pnpm exec biome check --write <touched files only>`.

- [ ] **Step 4: Manual browser check (if a browser is available)**

Run `pnpm preview`, then in the example app verify: boot splash shows the Demo Extension icon bottom-left partway through; no "Demo Extension" in the App Switcher; no desktop icon; `Macintosh HD → System Folder → Extensions` contains "Demo Extension"; double-clicking it shows the "Library" dialog with the exact copy; OK dismisses it.

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.stories.tsx example/src/Applications/DemoExtension/DemoExtension.tsx example/src/app.tsx
git commit -m "docs: startup-parade story and example demo extension

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
