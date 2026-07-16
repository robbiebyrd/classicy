# Auto-Register Default Apps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `SimpleText`, `PDFViewer`, `MoviePlayer`, and `PictureViewer` mount automatically inside `ClassicyDesktop` (the same way `<Finder />` already does), each individually opt-out-able via a new boolean prop on `ClassicyAppManagerProvider`.

**Architecture:** A new React context (`ClassicyDefaultAppsContext`) carries four `disableX` booleans from `ClassicyAppManagerProvider` down to `ClassicyDesktop`, which conditionally renders each app component next to the existing unconditional `<Finder />`. Mounting an app component is what registers it (desktop icon, Apple-menu entry, file-type associations) via `ClassicyApp`'s existing mount effect — no registry data structure is introduced.

**Tech Stack:** React 18, TypeScript, Zustand, Vitest + `@testing-library/react`.

## Global Constraints

- All four `disableX` props default to `false` (apps load unless explicitly disabled) — this is the spec's core requirement.
- No changes to `ClassicyAppManager.ts` (the reducer), `ClassicyApp.tsx`, or the four app components themselves.
- The `PictureViewer.tsx` barrel export's actual component name is `QuickTimePictureViewer` — do not rename it as part of this work.
- Follow the existing `ClassicyDefaultFileSystemContext` pattern (`src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.tsx`) for the new context's shape and default value.

---

### Task 1: `ClassicyDefaultAppsContext`

**Files:**
- Create: `src/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext.tsx`
- Test: `src/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext.test.tsx`

**Interfaces:**
- Produces: `ClassicyDefaultAppsContext` (a `React.Context<ClassicyDefaultAppsContextValue>`) and `ClassicyDefaultAppsContextValue` type, both exported for Task 2 (Provider) and Task 3 (Desktop) to import.
  ```ts
  export type ClassicyDefaultAppsContextValue = {
    disableSimpleText: boolean;
    disablePDFViewer: boolean;
    disableMoviePlayer: boolean;
    disablePictureViewer: boolean;
  };
  export const ClassicyDefaultAppsContext: React.Context<ClassicyDefaultAppsContextValue>;
  ```

- [ ] **Step 1: Write the failing test**

Create `src/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { useContext } from "react";
import { describe, expect, it } from "vitest";
import { ClassicyDefaultAppsContext } from "@/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext";

describe("ClassicyDefaultAppsContext", () => {
	it("defaults all four apps to enabled when no Provider is present", () => {
		let captured: unknown;
		function Capture(): null {
			captured = useContext(ClassicyDefaultAppsContext);
			return null;
		}
		render(<Capture />);
		expect(captured).toEqual({
			disableSimpleText: false,
			disablePDFViewer: false,
			disableMoviePlayer: false,
			disablePictureViewer: false,
		});
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext.test.tsx`
Expected: FAIL — `Cannot find module '@/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext'` (file doesn't exist yet)

- [ ] **Step 3: Write minimal implementation**

Create `src/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext.tsx`:

```tsx
import { createContext } from "react";

export type ClassicyDefaultAppsContextValue = {
	disableSimpleText: boolean;
	disablePDFViewer: boolean;
	disableMoviePlayer: boolean;
	disablePictureViewer: boolean;
};

export const ClassicyDefaultAppsContext =
	createContext<ClassicyDefaultAppsContextValue>({
		disableSimpleText: false,
		disablePDFViewer: false,
		disableMoviePlayer: false,
		disablePictureViewer: false,
	});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext.tsx src/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext.test.tsx
git commit -m "feat: add ClassicyDefaultAppsContext for default-app opt-out"
```

---

### Task 2: Wire props through `ClassicyAppManagerProvider`

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.tsx`
- Test: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.test.tsx`

**Interfaces:**
- Consumes: `ClassicyDefaultAppsContext` from Task 1 (`@/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext`).
- Produces: `ClassicyAppManagerProvider` accepts four new optional props — `disableSimpleText?: boolean`, `disablePDFViewer?: boolean`, `disableMoviePlayer?: boolean`, `disablePictureViewer?: boolean` — and provides `ClassicyDefaultAppsContext` with their resolved (default-`false`) values to `{children}`. Task 3 (`ClassicyDesktop`) reads this context.

- [ ] **Step 1: Write the failing tests**

Add this `describe` block to the end of `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.test.tsx` (after the existing `"ClassicyAppManagerProvider defaultFileSystem"` block, same file — no new imports needed beyond what's already imported: `render`, `useContext`, `describe`, `expect`, `it`):

```tsx
describe("ClassicyAppManagerProvider default apps", () => {
	it("defaults all four disableX props to false", async () => {
		const ctx = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext"
		);
		const appsCtx = await import(
			"@/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext"
		);
		let captured: unknown;
		function Capture(): null {
			captured = useContext(appsCtx.ClassicyDefaultAppsContext);
			return null;
		}
		render(
			<ctx.ClassicyAppManagerProvider>
				<Capture />
			</ctx.ClassicyAppManagerProvider>,
		);
		expect(captured).toEqual({
			disableSimpleText: false,
			disablePDFViewer: false,
			disableMoviePlayer: false,
			disablePictureViewer: false,
		});
	});

	it("passes explicit disableX props through context", async () => {
		const ctx = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext"
		);
		const appsCtx = await import(
			"@/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext"
		);
		let captured: unknown;
		function Capture(): null {
			captured = useContext(appsCtx.ClassicyDefaultAppsContext);
			return null;
		}
		render(
			<ctx.ClassicyAppManagerProvider
				disablePictureViewer
				disableMoviePlayer
			>
				<Capture />
			</ctx.ClassicyAppManagerProvider>,
		);
		expect(captured).toEqual({
			disableSimpleText: false,
			disablePDFViewer: false,
			disableMoviePlayer: true,
			disablePictureViewer: true,
		});
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.test.tsx`
Expected: the first new test ("defaults all four disableX props to false") PASSES trivially — with no `ClassicyDefaultAppsContext.Provider` wired up yet, `useContext` still returns the context's own default value from Task 1, which happens to already be all-`false`. The second new test ("passes explicit disableX props through context") FAILS: `captured` still equals that same untouched default (`disableMoviePlayer: false, disablePictureViewer: false`), which does not match the expected `true` values passed as props — this is the test that proves the wiring is missing.

- [ ] **Step 3: Write minimal implementation**

Edit `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.tsx`:

Add the import (alongside the existing `ClassicyDefaultFileSystemContext` import):

```diff
 import {
 	ClassicyDefaultFileSystemContext,
 	type ClassicyDefaultFileSystemMode,
 } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
 import type { ClassicyFileSystemTree } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
+import { ClassicyDefaultAppsContext } from "@/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext";
```

Add the four props to the props type:

```diff
 type ClassicyAppManagerProviderProps = {
 	gaMeasurementIds?: string[];
 	gtmContainerId?: string;
 	appName?: string;
 	eventPrefix?: string;
 	defaultState?: DeepPartial<ClassicyStore>;
 	defaultFileSystem?: ClassicyFileSystemTree;
 	defaultFileSystemMode?: ClassicyDefaultFileSystemMode;
+	disableSimpleText?: boolean;
+	disablePDFViewer?: boolean;
+	disableMoviePlayer?: boolean;
+	disablePictureViewer?: boolean;
 };
```

Destructure the new props in the component signature:

```diff
 	defaultState,
 	defaultFileSystem,
 	defaultFileSystemMode,
+	disableSimpleText,
+	disablePDFViewer,
+	disableMoviePlayer,
+	disablePictureViewer,
 }) => {
```

Add the memoized context value (alongside `fsContextValue`):

```diff
 	const fsContextValue = useMemo(
 		() => ({
 			defaultFileSystem,
 			mode: defaultFileSystemMode ?? ("merge" as const),
 		}),
 		[defaultFileSystem, defaultFileSystemMode],
 	);

+	const defaultAppsContextValue = useMemo(
+		() => ({
+			disableSimpleText: disableSimpleText ?? false,
+			disablePDFViewer: disablePDFViewer ?? false,
+			disableMoviePlayer: disableMoviePlayer ?? false,
+			disablePictureViewer: disablePictureViewer ?? false,
+		}),
+		[
+			disableSimpleText,
+			disablePDFViewer,
+			disableMoviePlayer,
+			disablePictureViewer,
+		],
+	);
+
```

Wrap the render tree in the new provider:

```diff
 	return (
 		<ClassicyAnalyticsPrefixContext.Provider value={eventPrefix}>
 			<ClassicyDefaultFileSystemContext.Provider value={fsContextValue}>
-				<AnalyticsProvider instance={analytics}>
-					<ClassicySoundManagerProvider>{children}</ClassicySoundManagerProvider>
-				</AnalyticsProvider>
+				<ClassicyDefaultAppsContext.Provider value={defaultAppsContextValue}>
+					<AnalyticsProvider instance={analytics}>
+						<ClassicySoundManagerProvider>{children}</ClassicySoundManagerProvider>
+					</AnalyticsProvider>
+				</ClassicyDefaultAppsContext.Provider>
 			</ClassicyDefaultFileSystemContext.Provider>
 		</ClassicyAnalyticsPrefixContext.Provider>
 	);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.test.tsx`
Expected: PASS (all tests in the file, including the two new ones)

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.tsx src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.test.tsx
git commit -m "feat: thread disableX default-app props through ClassicyAppManagerProvider"
```

---

### Task 3: Mount the four apps in `ClassicyDesktop`

**Files:**
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx`
- Create: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.test.tsx`

**Interfaces:**
- Consumes: `ClassicyDefaultAppsContext` (Task 1) and its four `disableX` fields; `ClassicyAppManagerProvider` (Task 2) for the test harness; `SimpleText` (`@/SystemFolder/SimpleText/SimpleText`), `PDFViewer` (`@/SystemFolder/PDFViewer/PDFViewer`), `MoviePlayer` (`@/SystemFolder/QuickTime/MoviePlayer/MoviePlayer`), `QuickTimePictureViewer` (`@/SystemFolder/QuickTime/PictureViewer/PictureViewer`) — each a zero-prop `FunctionalComponent`.
- Produces: `ClassicyDesktop` renders each of the four apps next to `<Finder />` unless the corresponding `disableX` context value is `true`. Each app registers a desktop icon with DOM `id="${appId}.shortcut"` and `<img alt="${appName}">`, where `appId`/`appName` are: SimpleText → `SimpleText.app` / `SimpleText`; PDFViewer → `PDFViewer.app` / `PDFViewer`; MoviePlayer → `MoviePlayer.app` / `Movie Player`; PictureViewer → `PictureViewer.app` / `Picture Viewer` (all defined in each app's `*Utils.tsx` `*AppInfo` constant — no changes needed there).

- [ ] **Step 1: Write the failing test**

Create `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

describe("ClassicyDesktop default apps", () => {
	beforeEach(() => {
		localStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("mounts all four default apps' desktop icons when no disableX props are set", () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		expect(screen.getByAltText("SimpleText")).toBeInTheDocument();
		expect(screen.getByAltText("PDF Viewer")).toBeInTheDocument();
		expect(screen.getByAltText("Movie Player")).toBeInTheDocument();
		expect(screen.getByAltText("Picture Viewer")).toBeInTheDocument();
	});

	it("omits an app's desktop icon when its disableX prop is set, leaving the others", () => {
		render(
			<ClassicyAppManagerProvider disableMoviePlayer disablePictureViewer>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		expect(screen.getByAltText("SimpleText")).toBeInTheDocument();
		expect(screen.getByAltText("PDF Viewer")).toBeInTheDocument();
		expect(screen.queryByAltText("Movie Player")).not.toBeInTheDocument();
		expect(screen.queryByAltText("Picture Viewer")).not.toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.test.tsx`
Expected: FAIL — both tests fail; `getByAltText("SimpleText")` (and the other three) throw `Unable to find an element with the alt text: SimpleText`, since none of the four apps are mounted yet.

- [ ] **Step 3: Write minimal implementation**

Edit `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx`.

Add `useContext` to the existing `react` import:

```diff
 import {
 	type CSSProperties,
 	type FC as FunctionalComponent,
 	type KeyboardEvent,
 	type MouseEvent,
 	type ReactNode,
 	startTransition,
 	useCallback,
 	useEffect,
 	useMemo,
 	useRef,
 	useState,
+	useContext,
 } from "react";
```

Add the four app imports and the context import (alongside the existing `Finder` import):

```diff
 import { ClassicyControlPanels } from "@/SystemFolder/ControlPanels/ClassicyControlPanels";
 import { Finder } from "@/SystemFolder/Finder/Finder";
+import { SimpleText } from "@/SystemFolder/SimpleText/SimpleText";
+import { PDFViewer } from "@/SystemFolder/PDFViewer/PDFViewer";
+import { MoviePlayer } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayer";
+import { QuickTimePictureViewer } from "@/SystemFolder/QuickTime/PictureViewer/PictureViewer";
+import { ClassicyDefaultAppsContext } from "@/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext";
```

Read the context near the component's other hooks (right after `desktopEventDispatch`):

```diff
 	const desktopEventDispatch = useAppManagerDispatch();

+	const {
+		disableSimpleText,
+		disablePDFViewer,
+		disableMoviePlayer,
+		disablePictureViewer,
+	} = useContext(ClassicyDefaultAppsContext);
+
```

Render the four apps next to `<Finder />`:

```diff
 			<Finder />
+			{!disableSimpleText && <SimpleText />}
+			{!disablePDFViewer && <PDFViewer />}
+			{!disableMoviePlayer && <MoviePlayer />}
+			{!disablePictureViewer && <QuickTimePictureViewer />}
 			<ClassicyControlPanels />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the full test suite to check for regressions**

Run: `pnpm vitest run`
Expected: all existing tests still PASS. No existing test renders the full `ClassicyDesktop` tree or asserts an exact desktop-icon count (the only `icons`-count assertions, in `ClassicyDesktopIconEventHandler.test.ts`, seed `Desktop.icons` manually via the reducer and never render components), so none are affected by the two newly-registered icons.

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.test.tsx
git commit -m "feat: mount SimpleText/PDFViewer/MoviePlayer/PictureViewer by default in ClassicyDesktop"
```

---

### Task 4: Remove now-redundant manual mounts in the example app, and document the feature

**Files:**
- Modify: `example/src/app.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: nothing new — this task only removes now-redundant manual mounts and documents Task 2's props.

- [ ] **Step 1: Simplify the example app**

Edit `example/src/app.tsx`, removing the now-redundant manual `SimpleText`/`PDFViewer` imports and elements (since `ClassicyDesktop` mounts both automatically as of Task 3):

```diff
 import {
 	ClassicyAppManagerProvider,
 	ClassicyDesktop,
-	PDFViewer,
 	registerClassicyIcons,
-	SimpleText,
 } from "classicy";
 import { BlueBox } from "./Applications/BlueBox/BlueBox";
 import infiniteMacIcon from "./Applications/BlueBox/infinite-mac.png";
 import { Browser } from "./Applications/Browser/Browser";
 import { Demo } from "./Applications/Demo/Demo";
```

```diff
 			<ClassicyDesktop>
 				<Browser />
 				<BlueBox />
 				<Demo />
-				<SimpleText />
-				<PDFViewer />
 			</ClassicyDesktop>
```

- [ ] **Step 2: Verify the example still builds**

Run: `pnpm build:source`
Expected: build succeeds with no TypeScript errors (confirms `example/src/app.tsx` has no leftover unused imports of `SimpleText`/`PDFViewer`).

- [ ] **Step 3: Add README documentation**

Edit `README.md`, inserting the following new section immediately after the existing "### Seeding the default filesystem" section (which ends at the line `or rebuild the filesystem at runtime.`) and before "### Events" — insert it as new lines, verbatim:

`````markdown
### Default apps

`ClassicyDesktop` automatically mounts four built-in apps — `SimpleText`,
`PDFViewer`, `MoviePlayer`, and `PictureViewer` — the same way it always
mounts `Finder`. Each can be disabled individually via a prop on
`ClassicyAppManagerProvider`:

```tsx
<ClassicyAppManagerProvider
  disableSimpleText={false}    // default: false (loads)
  disablePDFViewer={false}     // default: false (loads)
  disableMoviePlayer={true}    // opt out of Movie Player
  disablePictureViewer={true}  // opt out of Picture Viewer
>
  <ClassicyDesktop />
</ClassicyAppManagerProvider>
```

Disabling an app only stops it from auto-mounting — it remains available to
import and render yourself (e.g. `import { PDFViewer } from "classicy"`) if
you want custom placement.
`````

- [ ] **Step 4: Commit**

```bash
git add example/src/app.tsx README.md
git commit -m "docs: document default-app opt-out props; simplify example app"
```
