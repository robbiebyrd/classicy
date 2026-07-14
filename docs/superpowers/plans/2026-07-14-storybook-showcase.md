# Storybook Component Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Storybook 10 app (new `storybook/` pnpm workspace member) showcasing all ~33 components in `src/SystemFolder/SystemResources`, with a 21-theme toolbar switcher, autodocs, Mac OS 8 manager chrome, and GitHub Pages deployment alongside the existing example app.

**Architecture:** The `storybook/` workspace member runs `@storybook/react-vite` with `viteFinal` aliases pointing into the root `src/` and `assets/`, so stories compile library source with HMR. Story files are co-located (`ClassicyButton.stories.tsx` next to `ClassicyButton.tsx`) and excluded from the library build. Two-tier decorators: a global "Platinum frame" (theme CSS vars + SoundManager provider) for standalone controls, and an opt-in real-`ClassicyDesktop` frame (via `parameters.classicy.desktop`) for desktop-integrated components.

**Tech Stack:** Storybook 10 (`storybook`, `@storybook/react-vite`, `@storybook/addon-docs` — all pinned to the same version), Vite 7, React 19, pnpm workspaces, SCSS.

## Global Constraints

- Package manager is **pnpm** (`corepack enable`); the repo is a pnpm workspace. Node 24 via mise/volta.
- All Storybook packages (`storybook`, `@storybook/react-vite`, `@storybook/addon-docs`) MUST be the same version (use `^10.4.0`).
- Storybook 10 configs are **ESM-only**; use `import.meta.dirname` (Node 24) instead of `__dirname`.
- Storybook types (`Meta`, `StoryObj`, `Preview`, `Decorator`, `StorybookConfig`) import from `@storybook/react-vite`. `fn()` imports from `storybook/test`. Theming imports from `storybook/theming`; manager API from `storybook/manager-api`. Never install or import `@storybook/addon-essentials`, `@storybook/theming`, `@storybook/manager-api`, `@storybook/test`, or `@storybook/react` — they are merged into core or replaced.
- Code style: tabs for indentation, double quotes (repo uses Biome; `pnpm lint` must pass). Path aliases `@/` → `src/`, `@snd/` → `assets/sounds/`, `@img/` → `assets/img/`, `@vid/` → `assets/vid/`.
- Story files are named `<ComponentFile>.stories.tsx`, co-located with the component, and MUST NOT leak into barrel files or `dist/`.
- Never manually edit barrel `index.ts` files (barrelsby generates them).
- Story titles use exactly three sidebar sections: `Controls/…`, `Desktop/…`, `System/…`.
- All commits: end message with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

**Verification command used throughout** (from repo root; ~30–90s):
```bash
pnpm --filter classicy-storybook build
```
Expected: exits 0, prints `info => Output directory: /home/robbiebyrd/classicy/storybook/storybook-static`. Any story that fails to compile fails this build.

---

### Task 1: Scaffold the `storybook/` workspace member

**Files:**
- Modify: `pnpm-workspace.yaml`
- Create: `storybook/package.json`
- Create: `storybook/.storybook/main.ts`
- Create: `storybook/tsconfig.json`
- Create: `storybook/Welcome.mdx`
- Modify: `package.json` (root — scripts only)

**Interfaces:**
- Produces: workspace member `classicy-storybook` with scripts `dev` / `build`; root scripts `pnpm storybook` and `pnpm build:storybook`; Vite aliases `@`, `@snd`, `@img`, `@vid`, `@sb` (where `@sb` → `storybook/.storybook`, used by later tasks to import decorator helpers from stories).

- [ ] **Step 1: Add the workspace member**

In `pnpm-workspace.yaml`, change:
```yaml
packages:
  - 'example'
```
to:
```yaml
packages:
  - 'example'
  - 'storybook'
```

- [ ] **Step 2: Create `storybook/package.json`**

```json
{
	"name": "classicy-storybook",
	"private": true,
	"version": "0.0.0",
	"type": "module",
	"scripts": {
		"dev": "storybook dev -p 6006",
		"build": "storybook build"
	},
	"dependencies": {
		"react": "^19.2.7",
		"react-dom": "^19.2.7"
	},
	"devDependencies": {
		"@storybook/addon-docs": "^10.4.0",
		"@storybook/react-vite": "^10.4.0",
		"@types/react": "^19.2.17",
		"@types/react-dom": "^19.2.3",
		"sass": "^1.101.0",
		"storybook": "^10.4.0",
		"typescript": "~5.9.3",
		"vite": "^7.3.5",
		"vite-plugin-image-tools": "^3.1.3",
		"vite-plugin-react-rich-svg": "^1.3.0"
	}
}
```

Why these deps: stories compile the root `src/` sources, whose bare imports (zustand, classnames, howler, …) resolve from the ROOT `node_modules` because the source files physically live under the repo root — so they don't need re-declaring here. But the SVG/image Vite plugins run inside THIS package's Vite config, so they must be declared here.

- [ ] **Step 3: Create `storybook/.storybook/main.ts`**

```ts
import path from "node:path";
import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";
import VitePluginImageTools from "vite-plugin-image-tools";
import richSvg from "vite-plugin-react-rich-svg";

const repoRoot = path.resolve(import.meta.dirname, "../..");

const config: StorybookConfig = {
	framework: "@storybook/react-vite",
	stories: [
		"../Welcome.mdx",
		"../../src/**/*.mdx",
		"../../src/**/*.stories.@(ts|tsx)",
	],
	addons: ["@storybook/addon-docs"],
	staticDirs: [{ from: "../../assets", to: "/assets" }],
	async viteFinal(config) {
		return mergeConfig(config, {
			assetsInclude: [
				"**/*.ogg",
				"**/*.m4a",
				"**/*.mp3",
				"**/*.ac3",
				"**/*.wav",
				"**/*.caf",
			],
			resolve: {
				dedupe: ["react", "react-dom"],
				alias: {
					"@sb": path.resolve(import.meta.dirname),
					"@": path.join(repoRoot, "src"),
					"@snd": path.join(repoRoot, "assets/sounds"),
					"@img": path.join(repoRoot, "assets/img"),
					"@vid": path.join(repoRoot, "assets/vid"),
				},
			},
			plugins: [
				richSvg(),
				VitePluginImageTools({
					quality: 100,
					enableWebp: true,
					enableDev: true,
					enableDevWebp: true,
				}),
			],
		});
	},
};

export default config;
```

Notes: `@storybook/react-vite` injects `@vitejs/plugin-react` itself — do NOT add it again. `staticDirs` serves `assets/` at `/assets/…` so theme wallpaper URLs like `/assets/img/wallpapers/default.png` resolve.

- [ ] **Step 4: Create `storybook/tsconfig.json`**

```json
{
	"compilerOptions": {
		"target": "ESNext",
		"lib": ["ESNext", "DOM", "DOM.Iterable"],
		"module": "ESNext",
		"moduleResolution": "bundler",
		"moduleDetection": "force",
		"jsx": "react-jsx",
		"noEmit": true,
		"skipLibCheck": true,
		"allowImportingTsExtensions": true,
		"allowSyntheticDefaultImports": true,
		"resolveJsonModule": true,
		"noImplicitAny": true,
		"types": ["vite/client"],
		"paths": {
			"@sb/*": ["./.storybook/*"],
			"@/*": ["../src/*"],
			"@snd/*": ["../assets/sounds/*"],
			"@img/*": ["../assets/img/*"],
			"@vid/*": ["../assets/vid/*"]
		}
	},
	"include": [".storybook/**/*", "../src/**/*.stories.tsx", "../src/custom.d.ts"]
}
```

- [ ] **Step 5: Create `storybook/Welcome.mdx`**

```mdx
import { Meta } from "@storybook/addon-docs/blocks";

<Meta title="Welcome" />

# Classicy

A React/TypeScript UI framework replicating the Mac OS 8 (Platinum) interface.

Browse the sidebar to explore every component in `SystemResources`. Use the
**Theme** toolbar menu to preview any component in each of Classicy's 21
appearance themes.

- **Controls** — buttons, inputs, pickers, and other standalone widgets
- **Desktop** — windows, menus, icons, and the desktop environment
- **System** — boot, startup, and crash screens
```

- [ ] **Step 6: Add root scripts**

In root `package.json` `scripts`, add:
```json
		"storybook": "pnpm --filter classicy-storybook dev",
		"build:storybook": "pnpm --filter classicy-storybook build",
```

- [ ] **Step 7: Install and verify the build**

Run:
```bash
pnpm install
pnpm --filter classicy-storybook build
```
Expected: install succeeds (lockfile gains the storybook member); build exits 0 and creates `storybook/storybook-static/` containing the Welcome docs page.

- [ ] **Step 8: Commit**

```bash
git add pnpm-workspace.yaml pnpm-lock.yaml package.json storybook/
git commit -m "feat(storybook): scaffold Storybook 10 workspace member"
```

---

### Task 2: Library build hygiene — keep stories out of barrels, tsc, and dist

**Files:**
- Modify: `.ts-barrel.json`
- Modify: `tsconfig.json` (root)

**Interfaces:**
- Produces: guarantee that any `src/**/*.stories.tsx` file is ignored by barrelsby, root tsc, and vite-plugin-dts. All later tasks rely on this.

- [ ] **Step 1: Exclude stories from barrelsby**

In `.ts-barrel.json`, change the `exclude` array to:
```json
	"exclude": [
		"__tests__",
		"\\.test\\.tsx?$",
		"\\.stories\\.tsx?$",
		"custom\\.d\\.ts",
		"\\s\\d+\\.ts$"
	]
```

- [ ] **Step 2: Exclude stories from the root TypeScript build**

In root `tsconfig.json`, change:
```json
	"exclude": ["example/", "rt911/"]
```
to:
```json
	"exclude": ["example/", "rt911/", "storybook/", "src/**/*.stories.tsx"]
```
(`vite-plugin-dts` follows the tsconfig include set, so this also keeps story `.d.ts` files out of `dist/types`. Stories are typechecked by `storybook/tsconfig.json` instead.)

- [ ] **Step 3: Verify the library build is unaffected**

Run:
```bash
pnpm build:source
```
Expected: exits 0; `dist/classicy.es.js` and `dist/classicy.umd.js` regenerate as before. (No stories exist in `src/` yet — Task 3 re-verifies with a real story present.)

- [ ] **Step 4: Commit**

```bash
git add .ts-barrel.json tsconfig.json
git commit -m "chore: exclude story files from barrels and library build"
```

---

### Task 3: Platinum frame decorator, theme toolbar, and the first story (Button)

**Files:**
- Create: `storybook/.storybook/ClassicyDecorators.tsx`
- Create: `storybook/.storybook/preview.tsx`
- Create: `src/SystemFolder/SystemResources/Button/ClassicyButton.stories.tsx`

**Interfaces:**
- Consumes: `getTheme(id: string)` and `getThemeVars(theme): Record<string,string>` from `@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance`; `ClassicySoundManagerProvider` from `@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider`; `stopAppManagerPersistence` from `@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils`.
- Produces: global decorator `withClassicy: Decorator` (exported from `ClassicyDecorators.tsx`). Every story is wrapped in `<ClassicySoundManagerProvider>` + a themed `div` carrying the selected theme's CSS variables. In canvas mode the div has `id="classicyDesktop"` (portal target for BalloonHelp etc.); in docs mode it only has the class, avoiding duplicate ids. Toolbar global `theme` (string theme id).

- [ ] **Step 1: Create `storybook/.storybook/ClassicyDecorators.tsx`**

```tsx
import type { Decorator } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import {
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { stopAppManagerPersistence } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicySoundManagerProvider } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider";

// Stories must not write desktop state into the user's localStorage.
stopAppManagerPersistence();

export const withClassicy: Decorator = (Story, context) => {
	const theme = getTheme((context.globals.theme as string) ?? "default");
	const vars = getThemeVars(theme) as CSSProperties;
	const isCanvas = context.viewMode === "story";

	return (
		<ClassicySoundManagerProvider>
			<div
				id={isCanvas ? "classicyDesktop" : undefined}
				className="classicyDesktop classicyStorybookFrame"
				style={{
					...vars,
					fontFamily: "var(--ui-font)",
					fontSize: "var(--ui-font-size)",
					color: "var(--color-black)",
					backgroundColor: "var(--color-system-03)",
					padding: "calc(var(--window-padding-size) * 4)",
					minHeight: isCanvas ? "100vh" : undefined,
					boxSizing: "border-box",
				}}
			>
				<Story />
			</div>
		</ClassicySoundManagerProvider>
	);
};
```

- [ ] **Step 2: Create `storybook/.storybook/preview.tsx`**

```tsx
import "@/SystemFolder/ControlPanels/AppearanceManager/styles/fonts.scss";
import type { Preview } from "@storybook/react-vite";
import themesData from "@/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json";
import { withClassicy } from "./ClassicyDecorators";

const preview: Preview = {
	globalTypes: {
		theme: {
			name: "Theme",
			description: "Classicy appearance theme",
			toolbar: {
				icon: "paintbrush",
				items: themesData.map((t) => ({ value: t.id, title: t.name })),
				dynamicTitle: true,
			},
		},
	},
	initialGlobals: {
		theme: "default",
	},
	decorators: [withClassicy],
	tags: ["autodocs"],
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},
};

export default preview;
```

- [ ] **Step 3: Create `src/SystemFolder/SystemResources/Button/ClassicyButton.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyButton } from "./ClassicyButton";

const meta = {
	title: "Controls/Button",
	component: ClassicyButton,
	args: {
		children: "OK",
		onClickFunc: fn(),
	},
} satisfies Meta<typeof ClassicyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DefaultAction: Story = {
	args: { isDefault: true, children: "Save" },
};

export const Disabled: Story = {
	args: { disabled: true, children: "Disabled" },
};

export const Depressed: Story = {
	args: { depressed: true, children: "Pressed" },
};

export const Small: Story = {
	args: { buttonSize: "small", children: "Small" },
};

export const Square: Story = {
	args: { buttonShape: "square", children: "▸" },
};
```

- [ ] **Step 4: Verify the library build still excludes stories**

Run:
```bash
pnpm build:source
grep -rn "stories" src/SystemFolder/SystemResources/Button/index.ts src/index.ts 2>/dev/null
```
Expected: build exits 0; the grep prints NOTHING (story not in any barrel).

- [ ] **Step 5: Verify the Storybook build**

Run:
```bash
pnpm --filter classicy-storybook build
```
Expected: exits 0. Then spot-check interactively (optional but recommended): `pnpm storybook`, open http://localhost:6006, confirm the Button stories render with Platinum styling (Charcoal/Geneva fonts, gray frame), the Theme toolbar lists 21 themes, and switching to e.g. "Azul" recolors the button chrome.

- [ ] **Step 6: Commit**

```bash
git add storybook/.storybook src/SystemFolder/SystemResources/Button/ClassicyButton.stories.tsx
git commit -m "feat(storybook): Platinum frame decorator, theme toolbar, Button stories"
```

---

### Task 4: Mac OS 8 manager chrome

**Files:**
- Create: `storybook/.storybook/PlatinumTheme.ts`
- Create: `storybook/.storybook/manager.ts`

- [ ] **Step 1: Create `storybook/.storybook/PlatinumTheme.ts`**

```ts
import { create } from "storybook/theming";

// Mac OS 8 Platinum palette: #DDDDDD light gray chrome, #CCCCCC bars,
// #333399 selection blue-violet accents.
export default create({
	base: "light",

	brandTitle: "Classicy",
	brandUrl: "https://github.com/robbiebyrd/classicy",
	brandImage: "/assets/img/icons/system/macos.png",
	brandTarget: "_blank",

	fontBase: '"Charcoal", "Geneva", "Helvetica Neue", sans-serif',
	fontCode: '"Monaco", monospace',

	colorPrimary: "#333399",
	colorSecondary: "#333399",

	appBg: "#dddddd",
	appContentBg: "#eeeeee",
	appPreviewBg: "#dddddd",
	appBorderColor: "#888888",
	appBorderRadius: 0,

	textColor: "#000000",
	textInverseColor: "#ffffff",

	barTextColor: "#333333",
	barSelectedColor: "#333399",
	barHoverColor: "#333399",
	barBg: "#cccccc",

	inputBg: "#ffffff",
	inputBorder: "#000000",
	inputTextColor: "#000000",
	inputBorderRadius: 0,
});
```

(The manager UI does not load the preview iframe's `@font-face` fonts; `Charcoal`/`Geneva` apply only if installed locally, with clean fallbacks otherwise. That is acceptable — the skin comes from the palette.)

- [ ] **Step 2: Create `storybook/.storybook/manager.ts`**

```ts
import { addons } from "storybook/manager-api";
import platinumTheme from "./PlatinumTheme";

addons.setConfig({
	theme: platinumTheme,
});
```

- [ ] **Step 3: Verify**

Run: `pnpm --filter classicy-storybook build` — exits 0. Optional spot-check with `pnpm storybook`: sidebar/toolbar are Platinum gray with the Mac OS icon next to "Classicy".

- [ ] **Step 4: Commit**

```bash
git add storybook/.storybook/PlatinumTheme.ts storybook/.storybook/manager.ts
git commit -m "feat(storybook): Mac OS 8 Platinum manager chrome"
```

---

### Task 5: Desktop decorator, story helpers, and Window stories

**Files:**
- Modify: `storybook/.storybook/ClassicyDecorators.tsx`
- Create: `storybook/.storybook/helpers.tsx`
- Create: `src/SystemFolder/SystemResources/Window/ClassicyWindow.stories.tsx`

**Interfaces:**
- Consumes: `ClassicyAppManagerProvider` from `@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext`; `ClassicyDesktop` from `@/SystemFolder/SystemResources/Desktop/ClassicyDesktop`; `DefaultAppManagerState` from `@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager`; `useAppManager`, `useAppManagerDispatch` from `@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils`; `ClassicyApp` from `@/SystemFolder/SystemResources/App/ClassicyApp`.
- Produces (used by ALL later desktop-hosted stories, import from `@sb/helpers`):
  - `desktopParameters: object` — spread into a story/meta `parameters` to opt into the desktop frame (`{ layout: "fullscreen", classicy: { desktop: true }, docs: { story: { inline: false, height: "600px" } } }`).
  - `StoryApp: FC<{ id: string; name: string; icon: string; children?: ReactNode }>` — wraps children in `ClassicyApp` and auto-opens the app so windows render immediately.
  - `SB_ICON: string` — a default app icon URL.

- [ ] **Step 1: Add the desktop frame to `storybook/.storybook/ClassicyDecorators.tsx`**

Replace the entire file with:

```tsx
import type { Decorator } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";
import { useLayoutEffect, useState } from "react";
import {
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	stopAppManagerPersistence,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicySoundManagerProvider } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

// Stories must not write desktop state into the user's localStorage.
stopAppManagerPersistence();

const resetClassicyStore = (themeId: string) => {
	const fresh = structuredClone(DefaultAppManagerState);
	fresh.System.Manager.Appearance.activeTheme = getTheme(themeId);
	useAppManager.setState(fresh, true);
};

const ClassicyDesktopFrame = ({
	storyId,
	themeId,
	children,
}: {
	storyId: string;
	themeId: string;
	children: ReactNode;
}) => {
	const [ready, setReady] = useState(false);

	useLayoutEffect(() => {
		resetClassicyStore(themeId);
		setReady(true);
		return () => setReady(false);
	}, [storyId, themeId]);

	if (!ready) return null;
	return (
		<ClassicyAppManagerProvider>
			<ClassicyDesktop startupScreen={false}>{children}</ClassicyDesktop>
		</ClassicyAppManagerProvider>
	);
};

export const withClassicy: Decorator = (Story, context) => {
	const themeId = (context.globals.theme as string) ?? "default";

	if (context.parameters.classicy?.desktop) {
		return (
			<ClassicyDesktopFrame storyId={context.id} themeId={themeId}>
				<Story />
			</ClassicyDesktopFrame>
		);
	}

	const vars = getThemeVars(getTheme(themeId)) as CSSProperties;
	const isCanvas = context.viewMode === "story";

	return (
		<ClassicySoundManagerProvider>
			<div
				id={isCanvas ? "classicyDesktop" : undefined}
				className="classicyDesktop classicyStorybookFrame"
				style={{
					...vars,
					fontFamily: "var(--ui-font)",
					fontSize: "var(--ui-font-size)",
					color: "var(--color-black)",
					backgroundColor: "var(--color-system-03)",
					padding: "calc(var(--window-padding-size) * 4)",
					minHeight: isCanvas ? "100vh" : undefined,
					boxSizing: "border-box",
				}}
			>
				<Story />
			</div>
		</ClassicySoundManagerProvider>
	);
};
```

Design notes: the store is module-global Zustand, so the frame resets it (`setState(fresh, true)`) before mounting the desktop, keyed by story id + theme — no state bleed between stories, and the toolbar theme drives the desktop's own theming (`ClassicyDesktop` applies `activeTheme` from the store). Children mount only after the reset (`ready` gate). `startupScreen={false}` skips the 4-second splash.

- [ ] **Step 2: Create `storybook/.storybook/helpers.tsx`**

```tsx
import type { FC, ReactNode } from "react";
import { useEffect } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";

export const SB_ICON: string = ClassicyIcons.system.macClassic as string;

/** Spread into a story or meta `parameters` to render inside a real ClassicyDesktop. */
export const desktopParameters = {
	layout: "fullscreen",
	classicy: { desktop: true },
	docs: { story: { inline: false, height: "600px" } },
};

/**
 * Wraps children in ClassicyApp and immediately opens the app, so
 * ClassicyWindow children render without a desktop-icon double-click.
 */
export const StoryApp: FC<{
	id: string;
	name: string;
	icon?: string;
	children?: ReactNode;
}> = ({ id, name, icon = SB_ICON, children }) => {
	const dispatch = useAppManagerDispatch();

	useEffect(() => {
		dispatch({ type: "ClassicyAppOpen", app: { id, name, icon } });
	}, [dispatch, id, name, icon]);

	return (
		<ClassicyApp id={id} name={name} icon={icon}>
			{children}
		</ClassicyApp>
	);
};
```

(If `dispatch` rejects that action object's type, cast: `dispatch({ type: "ClassicyAppOpen", app: { id, name, icon } } as never)` — the repo's own call sites use this exact shape, see `CLAUDE.md` "Dispatching actions".)

- [ ] **Step 3: Create `src/SystemFolder/SystemResources/Window/ClassicyWindow.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { desktopParameters, StoryApp } from "@sb/helpers";
import { ClassicyWindow } from "./ClassicyWindow";

const meta = {
	title: "Desktop/Window",
	component: ClassicyWindow,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyWindow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="default"
				appId="storybook.app"
				title="Untitled Document"
				initialSize={[440, 300]}
				initialPosition={[80, 60]}
			>
				<p style={{ padding: "1em" }}>
					A resizable, movable, collapsable Platinum window.
				</p>
			</ClassicyWindow>
		</StoryApp>
	),
};

export const Modal: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="modal"
				appId="storybook.app"
				title="Alert"
				modal={true}
				closable={true}
				resizable={false}
				initialSize={[320, 140]}
				initialPosition={["center", "center"]}
			>
				<p style={{ padding: "1em" }}>This is a modal dialog window.</p>
			</ClassicyWindow>
		</StoryApp>
	),
};

export const FixedSize: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="fixed"
				appId="storybook.app"
				title="Fixed Palette"
				resizable={false}
				zoomable={false}
				initialSize={[260, 180]}
				initialPosition={[120, 90]}
			>
				<p style={{ padding: "1em" }}>Not resizable, not zoomable.</p>
			</ClassicyWindow>
		</StoryApp>
	),
};
```

- [ ] **Step 4: Verify**

Run: `pnpm --filter classicy-storybook build` — exits 0. Spot-check with `pnpm storybook`: the Window stories render a full desktop (menu bar, Trash icon, wallpaper) with the window open; the theme toolbar restyles the whole desktop; switching stories resets the desktop.

- [ ] **Step 5: Commit**

```bash
git add storybook/.storybook src/SystemFolder/SystemResources/Window/ClassicyWindow.stories.tsx
git commit -m "feat(storybook): desktop frame decorator, StoryApp helper, Window stories"
```

---

### Task 6: Form control stories (Checkbox, RadioInput, Input, FileInput, Spinner, Slider)

**Files:**
- Create: `src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.stories.tsx`
- Create: `src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.stories.tsx`
- Create: `src/SystemFolder/SystemResources/Input/ClassicyInput.stories.tsx`
- Create: `src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.stories.tsx`
- Create: `src/SystemFolder/SystemResources/Spinner/ClassicySpinner.stories.tsx`
- Create: `src/SystemFolder/SystemResources/Slider/ClassicySlider.stories.tsx`

**Interfaces:**
- Consumes: the global Platinum frame (automatic — no parameters needed).

- [ ] **Step 1: Create `ClassicyCheckbox.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyCheckbox } from "./ClassicyCheckbox";

const meta = {
	title: "Controls/Checkbox",
	component: ClassicyCheckbox,
	args: { onClickFunc: fn() },
} satisfies Meta<typeof ClassicyCheckbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Checked: Story = {
	args: { id: "cb-checked", checked: true, label: "Enable AppleTalk" },
};

export const Unchecked: Story = {
	args: { id: "cb-unchecked", checked: false, label: "Show Balloons" },
};

export const Mixed: Story = {
	args: { id: "cb-mixed", mixed: true, label: "Partially Selected" },
};

export const Disabled: Story = {
	args: { id: "cb-disabled", disabled: true, checked: true, label: "Locked" },
};
```

- [ ] **Step 2: Create `ClassicyRadioInput.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyRadioInput } from "./ClassicyRadioInput";

const meta = {
	title: "Controls/RadioInput",
	component: ClassicyRadioInput,
	args: {
		name: "speed",
		label: "Mouse Speed",
		onClickFunc: fn(),
		inputs: [
			{ id: "slow", label: "Slow" },
			{ id: "medium", label: "Medium", checked: true },
			{ id: "fast", label: "Fast" },
		],
	},
} satisfies Meta<typeof ClassicyRadioInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Columns: Story = {};

export const Rows: Story = {
	args: { align: "rows" },
};

export const Disabled: Story = {
	args: { disabled: true },
};
```

- [ ] **Step 3: Create `ClassicyInput.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyInput } from "./ClassicyInput";

const meta = {
	title: "Controls/Input",
	component: ClassicyInput,
	args: { onChangeFunc: fn() },
} satisfies Meta<typeof ClassicyInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { id: "input-default", labelTitle: "Computer Name" },
};

export const Placeholder: Story = {
	args: {
		id: "input-placeholder",
		labelTitle: "Search",
		placeholder: "Find items…",
	},
};

export const LabelLeft: Story = {
	args: {
		id: "input-left",
		labelTitle: "Name:",
		labelPosition: "left",
		prefillValue: "Macintosh HD",
	},
};

export const Disabled: Story = {
	args: { id: "input-disabled", labelTitle: "Serial Number", disabled: true },
};
```

- [ ] **Step 4: Create `ClassicyFileInput.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyFileInput } from "./ClassicyFileInput";

const meta = {
	title: "Controls/FileInput",
	component: ClassicyFileInput,
	args: { onChangeFunc: fn() },
} satisfies Meta<typeof ClassicyFileInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { id: "file-default", labelTitle: "Attachment" },
};

export const MultipleImages: Story = {
	args: {
		id: "file-multi",
		labelTitle: "Pictures",
		multiple: true,
		accept: "image/*",
		maxFiles: 5,
		maxFileSizeMb: 10,
	},
};

export const Disabled: Story = {
	args: { id: "file-disabled", labelTitle: "Attachment", disabled: true },
};
```

- [ ] **Step 5: Create `ClassicySpinner.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicySpinner } from "./ClassicySpinner";

const meta = {
	title: "Controls/Spinner",
	component: ClassicySpinner,
	args: { onChangeFunc: fn() },
} satisfies Meta<typeof ClassicySpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		id: "spin-default",
		labelTitle: "Font Size",
		prefillValue: 12,
		minValue: 9,
		maxValue: 72,
	},
};

export const Disabled: Story = {
	args: {
		id: "spin-disabled",
		labelTitle: "Copies",
		prefillValue: 1,
		disabled: true,
	},
};
```

- [ ] **Step 6: Create `ClassicySlider.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicySlider } from "./ClassicySlider";

const meta = {
	title: "Controls/Slider",
	component: ClassicySlider,
	args: { onChangeFunc: fn(), onCommitFunc: fn() },
} satisfies Meta<typeof ClassicySlider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { id: "slider-default", labelTitle: "Volume", value: 60 },
};

export const WithValueLabel: Story = {
	args: {
		id: "slider-value",
		labelTitle: "Brightness:",
		labelPosition: "left",
		value: 40,
		valueLabel: "40 %",
	},
};

export const Highlighted: Story = {
	args: { id: "slider-hl", labelTitle: "Bass", value: 75, highlighted: true },
};

export const Disabled: Story = {
	args: { id: "slider-disabled", labelTitle: "Treble", value: 30, disabled: true },
};
```

- [ ] **Step 7: Verify**

Run: `pnpm --filter classicy-storybook build` — exits 0.

- [ ] **Step 8: Commit**

```bash
git add src/SystemFolder/SystemResources/{Checkbox,RadioInput,Input,FileInput,Spinner,Slider}/*.stories.tsx
git commit -m "feat(storybook): form control stories"
```

---

### Task 7: Picker stories (PopUpMenu, DatePicker, TimePicker, ColorPicker)

**Files:**
- Create: `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.stories.tsx`
- Create: `src/SystemFolder/SystemResources/DatePicker/ClassicyDatePicker.stories.tsx`
- Create: `src/SystemFolder/SystemResources/TimePicker/ClassicyTimePicker.stories.tsx`
- Create: `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.stories.tsx`

**Interfaces:**
- Consumes: `desktopParameters`, `StoryApp` from `@sb/helpers` (ColorPicker only — its dialog renders a real `ClassicyWindow`, so it lives in the desktop frame). DatePicker reads the module Zustand store's default `DateAndTime.dateTime` — present without seeding.

- [ ] **Step 1: Create `ClassicyPopUpMenu.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyPopUpMenu } from "./ClassicyPopUpMenu";

const OPTIONS = [
	{ value: "geneva", label: "Geneva" },
	{ value: "chicago", label: "Chicago" },
	{ value: "monaco", label: "Monaco" },
	{ value: "charcoal", label: "Charcoal" },
];

const meta = {
	title: "Controls/PopUpMenu",
	component: ClassicyPopUpMenu,
	args: { options: OPTIONS, onChangeFunc: fn() },
} satisfies Meta<typeof ClassicyPopUpMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { id: "popup-default", selected: "geneva" },
};

export const WithLabel: Story = {
	args: {
		id: "popup-label",
		label: "Font:",
		labelPosition: "left",
		selected: "chicago",
	},
};

export const Mini: Story = {
	args: { id: "popup-mini", size: "mini", selected: "monaco" },
};
```

- [ ] **Step 2: Create `ClassicyDatePicker.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyDatePicker } from "./ClassicyDatePicker";

const meta = {
	title: "Controls/DatePicker",
	component: ClassicyDatePicker,
	args: { onChangeFunc: fn() },
} satisfies Meta<typeof ClassicyDatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { id: "date-default", labelTitle: "Date" },
};

export const Disabled: Story = {
	args: { id: "date-disabled", labelTitle: "Date", disabled: true },
};
```

- [ ] **Step 3: Create `ClassicyTimePicker.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyTimePicker } from "./ClassicyTimePicker";

const meta = {
	title: "Controls/TimePicker",
	component: ClassicyTimePicker,
	args: { onChangeFunc: fn() },
} satisfies Meta<typeof ClassicyTimePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		id: "time-default",
		labelTitle: "Time",
		prefillValue: new Date("2026-07-14T10:30:00"),
	},
};

export const Disabled: Story = {
	args: {
		id: "time-disabled",
		labelTitle: "Time",
		prefillValue: new Date("2026-07-14T10:30:00"),
		disabled: true,
	},
};
```

- [ ] **Step 4: Create `ClassicyColorPicker.stories.tsx`**

The picker's dialog is a real `ClassicyWindow`, so these stories run inside the desktop frame, hosted in a window like a real control panel.

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { desktopParameters, StoryApp } from "@sb/helpers";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { ClassicyColorPicker } from "./ClassicyColorPicker";

const meta = {
	title: "Controls/ColorPicker",
	component: ClassicyColorPicker,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const InWindow = ({ children }: { children: ReactNode }) => (
	<StoryApp id="storybook.app" name="Storybook">
		<ClassicyWindow
			id="colors"
			appId="storybook.app"
			title="Colors"
			initialSize={[420, 220]}
			initialPosition={[80, 60]}
		>
			<div style={{ padding: "1em" }}>{children}</div>
		</ClassicyWindow>
	</StoryApp>
);

export const Default: Story = {
	render: () => (
		<InWindow>
			<ClassicyColorPicker
				id="cp-default"
				defaultValue={0xba572c}
				labelTitle="Highlight color:"
			/>
		</InWindow>
	),
};

export const Disabled: Story = {
	render: () => (
		<InWindow>
			<ClassicyColorPicker
				id="cp-disabled"
				defaultValue={0x888888}
				labelTitle="Locked color:"
				disabled={true}
			/>
		</InWindow>
	),
};
```

- [ ] **Step 5: Verify**

Run: `pnpm --filter classicy-storybook build` — exits 0. Spot-check: ColorPicker story — clicking the swatch opens the crayon-picker dialog window.

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/SystemResources/{PopUpMenu,DatePicker,TimePicker,ColorPicker}/*.stories.tsx
git commit -m "feat(storybook): picker stories (popup menu, date, time, color)"
```

---

### Task 8: Structure & layout stories (ControlGroup, ControlLabel, Disclosure, Triangle, Tabs, ProgressBar, Icon)

**Files:**
- Create: `src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.stories.tsx`
- Create: `src/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.stories.tsx`
- Create: `src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.stories.tsx`
- Create: `src/SystemFolder/SystemResources/Triangle/ClassicyTriangle.stories.tsx`
- Create: `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.stories.tsx`
- Create: `src/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.stories.tsx`
- Create: `src/SystemFolder/SystemResources/Icon/ClassicyIcon.stories.tsx`

- [ ] **Step 1: Create `ClassicyControlGroup.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyControlGroup } from "./ClassicyControlGroup";

const meta = {
	title: "Controls/ControlGroup",
	component: ClassicyControlGroup,
} satisfies Meta<typeof ClassicyControlGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		label: "Connection",
		children: (
			<>
				<ClassicyInput id="cg-host" labelTitle="Host" />
				<ClassicyCheckbox id="cg-remember" checked={true} label="Remember me" />
			</>
		),
	},
};

export const Columns: Story = {
	args: {
		label: "Options",
		columns: true,
		children: (
			<>
				<ClassicyCheckbox id="cg-a" checked={true} label="Sound" />
				<ClassicyCheckbox id="cg-b" label="Speech" />
				<ClassicyCheckbox id="cg-c" label="Alerts" />
			</>
		),
	},
};
```

- [ ] **Step 2: Create `ClassicyControlLabel.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { ClassicyControlLabel } from "./ClassicyControlLabel";

const meta = {
	title: "Controls/ControlLabel",
	component: ClassicyControlLabel,
} satisfies Meta<typeof ClassicyControlLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { label: "Printer Name" },
};

export const WithIcon: Story = {
	args: {
		label: "Get Info",
		icon: ClassicyIcons.system.info as string,
	},
};

export const Large: Story = {
	args: { label: "Section Heading", labelSize: "large" },
};

export const Disabled: Story = {
	args: { label: "Unavailable Option", disabled: true },
};
```

- [ ] **Step 3: Create `ClassicyDisclosure.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyDisclosure } from "./ClassicyDisclosure";

const meta = {
	title: "Controls/Disclosure",
	component: ClassicyDisclosure,
} satisfies Meta<typeof ClassicyDisclosure>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		label: "Advanced Options",
		children: <p>Hidden details revealed on disclosure.</p>,
	},
};
```

- [ ] **Step 4: Create `ClassicyTriangle.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyTriangle } from "./ClassicyTriangle";

const meta = {
	title: "Controls/Triangle",
	component: ClassicyTriangle,
	args: { onToggle: fn() },
} satisfies Meta<typeof ClassicyTriangle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
	args: { defaultOpen: false },
};

export const Directions: Story = {
	render: () => (
		<div style={{ display: "flex", gap: "1em" }}>
			<ClassicyTriangle direction="up" interactive={false} />
			<ClassicyTriangle direction="right" interactive={false} />
			<ClassicyTriangle direction="down" interactive={false} />
			<ClassicyTriangle direction="left" interactive={false} />
		</div>
	),
};
```

- [ ] **Step 5: Create `ClassicyTabs.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyTabs } from "./ClassicyTabs";

const meta = {
	title: "Controls/Tabs",
	component: ClassicyTabs,
} satisfies Meta<typeof ClassicyTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		tabs: [
			{
				title: "General",
				children: <ClassicyInput id="tab-name" labelTitle="Name" />,
			},
			{
				title: "Sharing",
				children: (
					<ClassicyCheckbox id="tab-share" checked={true} label="File Sharing" />
				),
			},
			{
				title: "Memory",
				children: <p>Virtual memory is on.</p>,
			},
		],
	},
};
```

- [ ] **Step 6: Create `ClassicyProgressBar.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyProgressBar } from "./ClassicyProgressBar";

const meta = {
	title: "Controls/ProgressBar",
	component: ClassicyProgressBar,
} satisfies Meta<typeof ClassicyProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Determinate: Story = {
	args: { value: 59 },
};

export const Indeterminate: Story = {
	args: { indeterminate: true },
};

export const WithLabel: Story = {
	args: { value: 33, label: "Copying files…" },
};
```

- [ ] **Step 7: Create `ClassicyIcon.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { ClassicyIcon } from "./ClassicyIcon";

const meta = {
	title: "Controls/Icon",
	component: ClassicyIcon,
	decorators: [
		(Story) => (
			<div style={{ position: "relative", width: 320, height: 200 }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ClassicyIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		appId: "storybook.app",
		name: "Macintosh HD",
		icon: ClassicyIcons.system.macClassic as string,
		label: "Macintosh HD",
		initialPosition: [24, 24],
		onClickFunc: fn(),
	},
};
```

- [ ] **Step 8: Verify**

Run: `pnpm --filter classicy-storybook build` — exits 0.

- [ ] **Step 9: Commit**

```bash
git add src/SystemFolder/SystemResources/{ControlGroup,ControlLabel,Disclosure,Triangle,Tabs,ProgressBar,Icon}/*.stories.tsx
git commit -m "feat(storybook): structure and layout stories"
```

---

### Task 9: Overlay & text stories (BalloonHelp, ContextualMenu, TextEditor, RichTextEditor)

**Files:**
- Create: `src/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.stories.tsx`
- Create: `src/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu.stories.tsx`
- Create: `src/SystemFolder/SystemResources/TextEditor/ClassicyTextEditor.stories.tsx`
- Create: `src/SystemFolder/SystemResources/RichTextEditor/ClassicyRichTextEditor.stories.tsx`

**Interfaces:**
- Consumes: BalloonHelp portals into `#classicyDesktop` — provided by the Platinum frame in canvas mode (falls back to `document.body` in docs mode; acceptable).

- [ ] **Step 1: Create `ClassicyBalloonHelp.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyBalloonHelp } from "./ClassicyBalloonHelp";

const meta = {
	title: "Controls/BalloonHelp",
	component: ClassicyBalloonHelp,
} satisfies Meta<typeof ClassicyBalloonHelp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		title: "Do Nothing",
		content: "Hover for 600ms to see this Mac OS 8-style help balloon.",
		position: "top-left",
		children: <ClassicyButton isDefault={true}>Hover Me</ClassicyButton>,
	},
	decorators: [
		(Story) => (
			<div style={{ paddingTop: "8em", paddingLeft: "2em" }}>
				<Story />
			</div>
		),
	],
};

export const BottomCenter: Story = {
	args: {
		content: "Balloons can point in six directions.",
		position: "bottom-center",
		delay: 200,
		children: <ClassicyButton>Quick Balloon</ClassicyButton>,
	},
	decorators: [
		(Story) => (
			<div style={{ padding: "2em 6em 10em" }}>
				<Story />
			</div>
		),
	],
};
```

- [ ] **Step 2: Create `ClassicyContextualMenu.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyContextualMenu } from "./ClassicyContextualMenu";

const MENU_ITEMS = [
	{ id: "open", title: "Open", onClickFunc: fn() },
	{ id: "duplicate", title: "Duplicate", keyboardShortcut: "⌘D", onClickFunc: fn() },
	{ id: "sep1" },
	{ id: "info", title: "Get Info", onClickFunc: fn() },
	{ id: "trash", title: "Move To Trash", onClickFunc: fn() },
];

const meta = {
	title: "Controls/ContextualMenu",
	component: ClassicyContextualMenu,
	decorators: [
		(Story) => (
			<div style={{ position: "relative", height: 260 }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ClassicyContextualMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		name: "storybook_context",
		position: [16, 16],
		menuItems: MENU_ITEMS,
		onClose: fn(),
	},
};
```

(If a separator item without `title` renders oddly, drop the `{ id: "sep1" }` entry — check the canvas.)

- [ ] **Step 3: Create `ClassicyTextEditor.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyTextEditor } from "./ClassicyTextEditor";

const meta = {
	title: "Controls/TextEditor",
	component: ClassicyTextEditor,
	args: { onChangeFunc: fn() },
} satisfies Meta<typeof ClassicyTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		id: "te-default",
		prefillValue: "It was a dark and stormy night…",
	},
};

export const Bordered: Story = {
	args: {
		id: "te-bordered",
		labelTitle: "Notes",
		border: true,
		autoHeight: true,
		prefillValue: "SimpleText uses this editor for plain text files.",
	},
};

export const Disabled: Story = {
	args: {
		id: "te-disabled",
		disabled: true,
		prefillValue: "Read-only content.",
	},
};
```

- [ ] **Step 4: Create `ClassicyRichTextEditor.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyRichTextEditor } from "./ClassicyRichTextEditor";

const meta = {
	title: "Controls/RichTextEditor",
	component: ClassicyRichTextEditor,
} satisfies Meta<typeof ClassicyRichTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		content: [
			"# Welcome to Classicy",
			"",
			"A **Markdown** editor styled for Mac OS 8.",
			"",
			"> Blockquotes, headings, and shortcuts all work.",
		].join("\n"),
	},
};
```

- [ ] **Step 5: Verify**

Run: `pnpm --filter classicy-storybook build` — exits 0. Spot-check BalloonHelp in the canvas: hover shows the balloon (portal into the frame's `#classicyDesktop`).

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/SystemResources/{BalloonHelp,ContextualMenu,TextEditor,RichTextEditor}/*.stories.tsx
git commit -m "feat(storybook): overlay and text editor stories"
```

---

### Task 10: QuickTime stories

**Files:**
- Create: `src/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed.stories.tsx`

**Interfaces:**
- Consumes: sample video at `@vid/quicktime/sample.mp4` (exists; the repo's MoviePlayer imports it with the `?no-inline` suffix — copy that pattern exactly).

- [ ] **Step 1: Create `QuickTimeMovieEmbed.stories.tsx`**

```tsx
import sampleMovie from "@vid/quicktime/sample.mp4?no-inline";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { QuickTimeVideoEmbed } from "./QuickTimeMovieEmbed";

const meta = {
	title: "Controls/QuickTime",
	component: QuickTimeVideoEmbed,
	decorators: [
		(Story) => (
			<div style={{ width: 480 }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof QuickTimeVideoEmbed>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DockedControls: Story = {
	args: {
		appId: "storybook.app",
		name: "Sample Movie",
		url: sampleMovie,
		type: "video",
		controlsDocked: true,
	},
};

export const OverlayControls: Story = {
	args: {
		appId: "storybook.app",
		name: "Sample Movie",
		url: sampleMovie,
		type: "video",
		controlsDocked: false,
	},
};
```

- [ ] **Step 2: Verify**

Run: `pnpm --filter classicy-storybook build` — exits 0. Spot-check: video renders with the QuickTime control strip; play/pause works.

- [ ] **Step 3: Commit**

```bash
git add src/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed.stories.tsx
git commit -m "feat(storybook): QuickTime player stories"
```

---

### Task 11: Desktop-family stories (Desktop, DesktopIcon, MenuBar, Menu, AboutWindow, App)

**Files:**
- Create: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.stories.tsx`
- Create: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.stories.tsx`
- Create: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.stories.tsx`
- Create: `src/SystemFolder/SystemResources/Menu/ClassicyMenu.stories.tsx`
- Create: `src/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindow.stories.tsx`
- Create: `src/SystemFolder/SystemResources/App/ClassicyApp.stories.tsx`

**Interfaces:**
- Consumes: `desktopParameters`, `StoryApp`, `SB_ICON` from `@sb/helpers`; `useAppManagerDispatch` from `@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils`; `ClassicyMenuProvider` from `@/SystemFolder/SystemResources/Menu/ClassicyMenuProvider`.

- [ ] **Step 1: Create `ClassicyDesktop.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { desktopParameters } from "@sb/helpers";
import { ClassicyDesktop } from "./ClassicyDesktop";

const meta = {
	title: "Desktop/Desktop",
	component: ClassicyDesktop,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyDesktop>;

export default meta;
type Story = StoryObj<typeof meta>;

// The desktop frame decorator supplies the ClassicyDesktop; the story
// contributes nothing extra — this showcases the bare environment
// (menu bar, wallpaper, Trash, Finder).
export const Default: Story = {
	render: () => null,
};
```

- [ ] **Step 2: Create `ClassicyDesktopIcon.stories.tsx`**

Desktop icons live in the store and are rendered by `ClassicyDesktop` itself, so the story seeds one via dispatch and renders nothing.

```tsx
import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { desktopParameters, SB_ICON } from "@sb/helpers";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktopIcon } from "./ClassicyDesktopIcon";

const meta = {
	title: "Desktop/DesktopIcon",
	component: ClassicyDesktopIcon,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyDesktopIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

const AddIcon = () => {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({
			type: "ClassicyDesktopIconAdd",
			app: { id: "storybook.app", name: "Storybook", icon: SB_ICON },
			kind: "app",
		});
	}, [dispatch]);
	return null;
};

export const Default: Story = {
	render: () => <AddIcon />,
};
```

- [ ] **Step 3: Create `MenuBar/ClassicyDesktopMenuBar.stories.tsx`**

The menu bar takes no props and reads the module store (which has defaults: system menu, Finder). It renders standalone in the Platinum frame.

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyDesktopMenuBar } from "./ClassicyDesktopMenuBar";

const meta = {
	title: "Desktop/MenuBar",
	component: ClassicyDesktopMenuBar,
} satisfies Meta<typeof ClassicyDesktopMenuBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```

- [ ] **Step 4: Create `ClassicyMenu.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClassicyMenuProvider } from "./ClassicyMenuProvider";
import { ClassicyMenu } from "./ClassicyMenu";

const meta = {
	title: "Desktop/Menu",
	component: ClassicyMenu,
	decorators: [
		(Story) => (
			<ClassicyMenuProvider>
				<div style={{ position: "relative", height: 240 }}>
					<Story />
				</div>
			</ClassicyMenuProvider>
		),
	],
} satisfies Meta<typeof ClassicyMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		name: "storybook_menu",
		menuItems: [
			{ id: "new", title: "New", keyboardShortcut: "⌘N", onClickFunc: fn() },
			{ id: "open", title: "Open…", keyboardShortcut: "⌘O", onClickFunc: fn() },
			{ id: "close", title: "Close", disabled: true },
			{
				id: "export",
				title: "Export",
				menuChildren: [
					{ id: "pdf", title: "As PDF…", onClickFunc: fn() },
					{ id: "text", title: "As Plain Text…", onClickFunc: fn() },
				],
			},
		],
	},
};
```

- [ ] **Step 5: Create `ClassicyAboutWindow.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { desktopParameters, SB_ICON, StoryApp } from "@sb/helpers";
import { ClassicyAboutWindow } from "./ClassicyAboutWindow";

const meta = {
	title: "Desktop/AboutWindow",
	component: ClassicyAboutWindow,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyAboutWindow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyAboutWindow
				appId="storybook.app"
				appName="Storybook"
				appIcon={SB_ICON}
				hideFunc={fn()}
			/>
		</StoryApp>
	),
};
```

- [ ] **Step 6: Create `ClassicyApp.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { desktopParameters, StoryApp } from "@sb/helpers";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { ClassicyApp } from "./ClassicyApp";

const meta = {
	title: "Desktop/App",
	component: ClassicyApp,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyApp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoWindows: Story = {
	render: () => (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="doc1"
				appId="storybook.app"
				title="Document 1"
				initialSize={[360, 240]}
				initialPosition={[60, 60]}
			>
				<p style={{ padding: "1em" }}>First document window.</p>
			</ClassicyWindow>
			<ClassicyWindow
				id="doc2"
				appId="storybook.app"
				title="Document 2"
				initialSize={[360, 240]}
				initialPosition={[160, 140]}
			>
				<p style={{ padding: "1em" }}>Second document window — click to focus.</p>
			</ClassicyWindow>
		</StoryApp>
	),
};
```

- [ ] **Step 7: Verify**

Run: `pnpm --filter classicy-storybook build` — exits 0. Spot-check: Desktop story shows the bare environment; DesktopIcon story shows the seeded "Storybook" icon; Menu story opens submenus; App story focuses windows on click.

- [ ] **Step 8: Commit**

```bash
git add src/SystemFolder/SystemResources/Desktop/*.stories.tsx src/SystemFolder/SystemResources/Desktop/MenuBar/*.stories.tsx src/SystemFolder/SystemResources/{Menu,AboutWindow,App}/*.stories.tsx
git commit -m "feat(storybook): desktop environment stories"
```

---

### Task 12: File browser stories

**Files:**
- Create: `src/SystemFolder/SystemResources/File/ClassicyFileBrowser.stories.tsx`

**Interfaces:**
- Consumes: `useClassicyFileSystem(storageKey?)` from `@/SystemFolder/SystemResources/File/ClassicyFileSystemContext` (falls back to the built-in `DefaultFSContent` when no provider customizes it); `desktopParameters`, `StoryApp` from `@sb/helpers`.

- [ ] **Step 1: Create `ClassicyFileBrowser.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { desktopParameters, StoryApp } from "@sb/helpers";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { ClassicyFileBrowser } from "./ClassicyFileBrowser";
import { useClassicyFileSystem } from "./ClassicyFileSystemContext";

const meta = {
	title: "Desktop/FileBrowser",
	component: ClassicyFileBrowser,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyFileBrowser>;

export default meta;
type Story = StoryObj<typeof meta>;

const BrowserWindow = ({ display }: { display: "icons" | "list" }) => {
	const fs = useClassicyFileSystem(`storybookFS-${display}`);
	return (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id={`browser-${display}`}
				appId="storybook.app"
				title="Macintosh HD"
				initialSize={[480, 320]}
				initialPosition={[80, 60]}
				scrollable={true}
			>
				<ClassicyFileBrowser
					fs={fs}
					path="Macintosh HD"
					appId="storybook.app"
					display={display}
					dirOnClickFunc={fn()}
					fileOnClickFunc={fn()}
				/>
			</ClassicyWindow>
		</StoryApp>
	);
};

export const IconView: Story = {
	render: () => <BrowserWindow display="icons" />,
};

export const ListView: Story = {
	render: () => <BrowserWindow display="list" />,
};
```

- [ ] **Step 2: Verify**

Run: `pnpm --filter classicy-storybook build` — exits 0. Spot-check: both views list the default file system's `Macintosh HD` contents; the list view shows the sortable table.

- [ ] **Step 3: Commit**

```bash
git add src/SystemFolder/SystemResources/File/ClassicyFileBrowser.stories.tsx
git commit -m "feat(storybook): file browser stories (icon and list views)"
```

---

### Task 13: System stories (Boot, StartupScreen, CrashScreen, Cursor)

**Files:**
- Create: `src/SystemFolder/SystemResources/Boot/ClassicyBoot.stories.tsx`
- Create: `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.stories.tsx`
- Create: `src/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen.stories.tsx`
- Create: `src/SystemFolder/SystemResources/Cursor/useClassicyCursor.stories.tsx`

- [ ] **Step 1: Create `ClassicyBoot.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyBoot } from "./ClassicyBoot";

const meta = {
	title: "System/Boot",
	component: ClassicyBoot,
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ClassicyBoot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```

- [ ] **Step 2: Create `ClassicyStartupScreen.stories.tsx`**

The startup screen shows once per browser-tab session, so the story resets the session flag before each render.

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyStartupScreen } from "./ClassicyStartupScreen";
import { resetStartupScreenSession } from "./ClassicyStartupScreenSession";

const meta = {
	title: "System/StartupScreen",
	component: ClassicyStartupScreen,
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ClassicyStartupScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => {
		resetStartupScreenSession();
		return <ClassicyStartupScreen duration={30000} />;
	},
};
```

- [ ] **Step 3: Create `ClassicyCrashScreen.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyCrashScreen } from "./ClassicyCrashScreen";

const meta = {
	title: "System/CrashScreen",
	component: ClassicyCrashScreen,
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ClassicyCrashScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const Bomb = (): never => {
	throw new Error("Storybook demo crash — this error is intentional.");
};

// NOTE: in dev mode React logs the caught error to the console and Vite may
// flash an overlay — dismiss it; the built static Storybook shows only the
// Sad Mac. Click or press a key on the crash screen reloads the iframe.
export const Crashed: Story = {
	render: () => (
		<ClassicyCrashScreen>
			<Bomb />
		</ClassicyCrashScreen>
	),
};
```

- [ ] **Step 4: Create `useClassicyCursor.stories.tsx`**

Cursor is a hook, not a component — the story is an interactive demo.

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { useClassicyCursor } from "./useClassicyCursor";

const CursorDemo = () => {
	const setCursor = useClassicyCursor();
	return (
		<div style={{ display: "flex", gap: "1em" }}>
			<ClassicyButton onClickFunc={() => setCursor("watch")}>
				Watch
			</ClassicyButton>
			<ClassicyButton onClickFunc={() => setCursor("hand")}>
				Hand
			</ClassicyButton>
			<ClassicyButton onClickFunc={() => setCursor("eyedropper")}>
				Eyedropper
			</ClassicyButton>
			<ClassicyButton onClickFunc={() => setCursor()}>Reset</ClassicyButton>
		</div>
	);
};

const meta = {
	title: "System/Cursor",
	component: CursorDemo,
} satisfies Meta<typeof CursorDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```

(`watch`, `hand`, and `eyedropper` are verified keys of `ClassicyIcons.ui.cursors`.)

- [ ] **Step 5: Verify**

Run: `pnpm --filter classicy-storybook build` — exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/SystemResources/Boot/*.stories.tsx src/SystemFolder/SystemResources/CrashScreen/*.stories.tsx src/SystemFolder/SystemResources/Cursor/*.stories.tsx
git commit -m "feat(storybook): system stories (boot, startup, crash, cursor)"
```

---

### Task 14: GitHub Pages deployment alongside the example app

The repo's existing `pages.yml` deploys `example/dist` as THE GitHub Pages site (one site per repo). Storybook joins it at the `/storybook/` subpath — do NOT create a second Pages workflow.

**Files:**
- Modify: `.github/workflows/pages.yml`
- Modify: `.github/workflows/push.yml`

- [ ] **Step 1: Keep story-only pushes from triggering npm releases**

In `.github/workflows/push.yml`, the `on.push.paths` list currently reads:
```yaml
    paths:
      - 'src/**'
      - 'assets/**'
```
Add a negation so story files don't trigger a version bump + npm publish:
```yaml
    paths:
      - 'src/**'
      - 'assets/**'
      - '!src/**/*.stories.tsx'
```

- [ ] **Step 2: Build and merge Storybook into the Pages artifact**

In `.github/workflows/pages.yml`:

(a) Add trigger paths so Storybook changes deploy (keep existing entries):
```yaml
    paths:
      - 'example/**'
      - 'storybook/**'
      - 'src/**/*.stories.tsx'
```

(b) After the existing step that builds the example app (the `pnpm exec vite build --base /` step inside `example/`), add:
```yaml
      - name: Build Storybook
        run: pnpm --filter classicy-storybook build

      - name: Merge Storybook into Pages artifact
        run: mv storybook/storybook-static example/dist/storybook
```
(The subsequent upload step already uploads `example/dist`, which now contains `storybook/`. Storybook's static build uses relative asset paths, so it works from a subdirectory without a base-path flag.)

- [ ] **Step 3: Validate workflow syntax**

Run:
```bash
gh workflow list >/dev/null 2>&1 && echo gh-ok
pnpm exec prettier --check .github/workflows/pages.yml 2>/dev/null || python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/pages.yml')); yaml.safe_load(open('.github/workflows/push.yml')); print('yaml-ok')"
```
Expected: `yaml-ok` (both files parse).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/pages.yml .github/workflows/push.yml
git commit -m "ci: deploy Storybook to GitHub Pages under /storybook/"
```

---

### Task 15: Final verification and docs

**Files:**
- Modify: `CLAUDE.md` (Common Commands section)

- [ ] **Step 1: Document the commands**

In `CLAUDE.md`, add to the commands code block after the `pnpm preview` line:
```bash
pnpm storybook            # Run the component showcase (Storybook) dev server
pnpm build:storybook      # Build static Storybook to storybook/storybook-static/
```

- [ ] **Step 2: Full verification suite**

Run each and confirm:
```bash
pnpm lint                  # exits 0 — stories pass Biome
pnpm build:source          # exits 0 — library build unaffected
pnpm test                  # exits 0 — all existing tests still pass
pnpm build:storybook       # exits 0 — full catalog builds
```
Also confirm no story leaked into the library output:
```bash
grep -l "stories" dist/classicy.es.js dist/types -r 2>/dev/null
```
Expected: no output.

- [ ] **Step 3: Visual smoke test**

Run `pnpm storybook`; verify in the browser: (1) all three sidebar sections present with every component; (2) theme toolbar switches all 21 themes on a Controls story AND a Desktop story; (3) autodocs pages show prop tables; (4) Platinum manager chrome active.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add Storybook commands to CLAUDE.md"
```
