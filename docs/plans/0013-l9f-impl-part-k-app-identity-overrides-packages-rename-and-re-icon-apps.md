---
id: 0013-l9f
title: 'Part K: App identity overrides (packages rename and re-icon apps)'
type: impl
status: in_progress
priority: "2"
effort: L
created: "2026-10-30T15:03:17.932Z"
updated: "2026-10-30T21:05:02.853Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  specs:
    - ./docs/plans/0002-ldj-dsgn-appearance-packages-program.md
  stories:
    - ["0089-r2d", "included"]
  plans:
    - ["0002-ldj", "parent"]
    - ["0009-agy", "depends"]
progress:
  "0":
    status: complete
  "1":
    status: complete
  "1.1":
    status: complete
  "1.2":
    status: complete
  "2":
    status: complete
  "2.1":
    status: complete
  "2.2":
    status: complete
  "3":
    status: complete
  "3.1":
    status: complete
  "3.2":
    status: complete
  "3.3":
    status: complete
  "3.4":
    status: complete
  "4":
    status: complete
  "4.1":
    status: complete
  "5":
    status: in_progress
  "5.1":
    status: in_progress
  "6":
    status: pending
  "6.1":
    status: pending
---

Story: 0089-r2d. Parent: 0002-ldj (umbrella). Starts after Part E (`origin/land/part-e-v3`) lands.

## Summary

**Goal:** An Appearance Package can give any app, keyed by its id, its own display name, icon and (optionally) balloon copy. The override shows wherever the app's name or icon reaches the user: the desktop icon, the Applications and Extensions folders, the App Switcher, the Apple menu (About and app entries), the About box, balloon help, window titles that name the app, window proxy icons, the startup parade, and the Control Strip's "Open … Control Panel" items. It follows live package switches. Internal ids, action types, routing, persisted state and analytics keep the original identity, so switching back restores everything. Platinum declares no overrides and renders pixel-identical.

**Problem:**
- App names and icons are code constants: `MoviePlayerAppInfo` (`MoviePlayerUtils.tsx:73-79`) and `APP_NAME` in each control panel. They are copied into persisted records at first load:
  - `apps[id].name/icon` (`ClassicyAppHelpers.ts:157-190`). `loadApp` never refreshes them (`:191-208`), so the App Switcher and the startup parade show whatever was stored first.
  - Desktop-icon records `appName/icon/balloonHelp` (`ClassicyDesktopIconContext.tsx:302-329, 366-400`). Their balloon title is baked from the name (`ClassicyApp.tsx:177-182`).
  - Apple-menu items `title/image` (`ClassicyDesktopManager.tsx:251-277`).
- The derived Applications and Extensions folders key their entries by those names (`ClassicyFileSystemApplications.ts:37`, `ClassicyFileSystemExtensions.ts:29`).
- Some action types are built from the name. Examples: `` `ClassicyApp${name}CloseFile` `` (`ClassicyApp.tsx:352`), `` `ClassicyApp${appName.replace(/\s+/g,"")}CloseFile` `` (`MoviePlayer.tsx:181`, `PictureViewer.tsx:143`), `` `ClassicyApp${targetApp.name}OpenFile` `` (`FinderContext.tsx:432, 441`). `PDFViewer.tsx:41,64,72` already dispatches `"ClassicyAppPDF ViewerCloseFile"`, with a space, which misses its own reducer prefix and lands in the generic handler.
- `ClassicyDesktopIconRemove` matches on `appName` (`ClassicyDesktopIconContext.tsx:408-422`). Finder's drive icons share appId `Finder.app` and use the drive path as `appName` (`Finder.tsx:500, 509`).

A package therefore has no way to rename or re-icon an app. Writing display data into those records would corrupt identity and leave stale values after a switch back.

**Approach:**
- **Declaration.** A new optional package field, `apps?: Record<appId, { name?, icon?, description? }>`, validated by zod with `.describe()`.
- **Resolver.** A store-free `resolveClassicyAppIdentity(appId, fallback, packageId?)` plus the hooks `useClassicyAppIdentity` and `useClassicyAppIdentityOverrides`. The hooks use `useSyncExternalStore` over the package and asset registries, the same pattern as `useClassicyAppearanceLayout`.
- **What the store holds.** Store records keep only the app's own identity (internal name and its own icon), refreshed from code on every load. Every display surface resolves at render time, with the record as the fallback.
- **Derived folders.** They key entries by the display name. That is safe because their entries are derived, read-only, name-locked, rebuilt on every change, never journaled, and opened by `_creator` (the app id).
- **Action types.** Bundled apps' name-derived action types become literal constants, and tests pin that a renaming package changes no action type, no record and no persisted byte.

---

# Part K: App identity overrides (packages rename and re-icon apps)

**Architecture:**
- Under umbrella plan 0002-ldj, after Parts A–J. It consumes:
  - Part B: `ClassicyAppearancePackage`, `ClassicyAppearancePackageSchema`, `registerClassicyAppearancePackage`, `getRegisteredClassicyAppearancePackageOrDefault`, `subscribeClassicyAppearancePackages`, `System.Manager.Appearance.packageId`, `ClassicyDesktopChangeAppearancePackage`.
  - Part C: `ClassicyAssetSource`, `isClassicyAssetSource`, `subscribeClassicyAssets`, the `.internal` package source.
  - Part F's store-free reader pattern (`useClassicyAppearanceLayout.ts`) and its Storybook test-package pattern (`MirroredPackage.ts`, `mirrored.ts`, `parameters.classicy.appearancePackage`).
- Adding `apps` to `ClassicyAppearancePackage` amends the shared contract (an additive optional field). The controller records it in 0002-ldj's "Contract amendments".
- **Part E dependency:** tasks marked **[E]** edit files Part E changes. Line numbers are given for both the current branch and `origin/land/part-e-v3`. All work starts after E lands. Phase 0 checks this.
- For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans task by task; steps use checkbox syntax.

**Tech Stack:** TypeScript, React 19, Zustand + the event reducer, zod 4, vitest/jsdom, Biome, Storybook 10 (`storybook/.storybook/ClassicyDecorators.tsx`, `helpers.tsx`), Playwright MCP + ImageMagick `compare`.


## Rulings (2026-10-30)

**Owner rulings** (story 0089-r2d):
1. Overrides apply to any app, keyed by its id, bundled or host.
2. A package-supplied name shows everywhere the app name is displayed. Internal ids, action types and persisted state keep the original identity.

**Controller rulings** on the planning decisions:
- **K-C1.** Filed as Part K (plan 0013-l9f), which depends on Part E. The contract amendment in 0002-ldj is additive: an optional `apps` field on `ClassicyAppearancePackage`.
- **Adopted as recommended:** K-C2, K-D1, K-D2, K-D3, K-D5, K-D6, K-D8, K-D9, K-D11 and K-D12. Concretely:
  - Overrides are a package field, and the package wins for display.
  - Derived folder entries are keyed by display name. On a collision the first entry wins and a warning is logged.
  - Analytics keep internal names.
  - The Quit item stays a plain "Quit".
  - The `renamed` test package uses Movie Player and a host TV.app.
  - Generic name-built action types are kept verbatim, and records hold only internal identity.
  - Display names follow the display-name rules.
  - `loadApp` refreshes code-derived identity.
- **K-D4.** Adopted: an optional `description` override, used when the app passes no `desktopIconBalloonHelp`.
- **K-D7. Changed from the recommendation.** The owner said the name shows "everywhere the app is displayed". So a Control Strip module that declares an `appId` shows that app's display name as its label, in three places: the strip balloon, the Control Strip control panel and the Control Strip Modules folder. Modules without an `appId` keep their own label. This is part of 3.4.
- **K-D10.** Out of scope: renaming bundled apps without a package.
- **Latent bug, fixed here.** PDF Viewer dispatches `"ClassicyAppPDF ViewerCloseFile"`, with a space, so it misses its own reducer. Task 2.1 makes it a literal type.

## Surface inventory (what this part must cover)

Display surfaces, meaning places where an app's name or icon reaches the user. Each row cites today's source and the task that covers it.

| # | Surface | Source today (file:line) | Reads | Task |
|---|---|---|---|---|
| D1 | Desktop icon label, image and alt | `ClassicyDesktopIcon.tsx:546, 566`, fed from records by `ClassicyDesktop.tsx:712-729` | record `appName`/`icon` | 3.1 |
| D2 | Desktop icon balloon title | `ClassicyApp.tsx:177-182` (baked into record), `ClassicyDesktopIcon.tsx:234-241` | `name` prop, persisted | 2.2, 3.1 |
| D3 | Desktop icon balloon content (manifest description) | `ClassicyApp.tsx:179` → record | `getAppManifest(id).description`, persisted | 2.2, 3.1 |
| D4 | Desktop type-select (typing a name selects the icon) | `ClassicyDesktopKeyNav.ts:64-74`, call `ClassicyDesktop.tsx:373` | record `label ?? appName` | 3.1 |
| D5 | Special ▸ Clean Up / Arrange by Name order | `ClassicyDesktopIconContext.tsx:153-170`, calls `:249-268, 337` | record `appName` | 3.1 |
| D6 | Applications folder entry name and icon (Finder icon/list views, file dialogs) | `ClassicyFileSystemApplications.ts:37, 39`, overlay `ClassicyFileSystemContext.tsx:106-111, 176-182` | record `appName`/`icon` | 3.3 |
| D7 | Extensions folder entry name and icon | `ClassicyFileSystemExtensions.ts:29, 31`, key `ClassicyFileSystemContext.tsx:113-120, 186-193` | `apps[id].name/icon` (never refreshed) | 2.2, 3.3 |
| D8 | App Switcher title, icon, menu entries, width samples | `ClassicyDesktopMenuBar.tsx:195, 204-226`, `ClassicyAppSwitcherUtils.ts:16-28` | `apps[id].name/icon` | 3.2 |
| D9 | Apple menu "About <app>" | `ClassicyDesktopMenuBar.tsx:286-327` (`:288`, `:304`); literal `"Finder"` fallback `:210, :288` | `apps[id].name` | 3.2 |
| D10 | Apple-menu app entries (control panels, `addSystemMenu`) | `ClassicyDesktopManager.tsx:251-277` (title `:255`, image `:256`), dispatched by `ClassicyApp.tsx:195-213` | persisted `systemMenu` | 3.2 |
| D11 | App-owned About menu titles `` `About ${APP_NAME}` `` (shown in window menu-bar placement, hoisted otherwise) | `ClassicyDateAndTimeManager.tsx:200`, `ClassicyAppearanceManager.tsx:459`, `ClassicyDriveSetup.tsx:94`, `ClassicyControlStripManager.tsx:121`, `ClassicySoundManager.tsx:98`, `ClassicyScreenSaverManager.tsx:129`, `HyperCard.tsx:656` | constants | 4.1 |
| D12 | About box heading and icon (every `useClassicyAboutMenu` app, plus the desktop's Finder About) | `ClassicyAboutWindow.tsx:104-105`; `ClassicyAppMenuHooks.tsx:53-88`; `ClassicyDesktop.tsx:705-711` | props | 3.4 |
| D13 | Window titles that are the app name | `ClassicyDateAndTimeManager.tsx:260`, `ClassicyAppearanceManager.tsx:588`, `ClassicyDriveSetup.tsx:125`, `ClassicyControlStripManager.tsx:104`, `ClassicySoundManager.tsx:136`, `ClassicyScreenSaverManager.tsx:112`, `HyperCard.tsx:990-994` (no-stack fallback), `HyperCardDialog.tsx:65` | constants | 4.1 |
| D14 | Window proxy icons that are the app icon | `ClassicyDateAndTimeManager.tsx:262`, `ClassicyAppearanceManager.tsx:590`, `ClassicyDriveSetup.tsx:127`, `ClassicyControlStripManager.tsx:106`, `ClassicySoundManager.tsx:138`, `ClassicyScreenSaverManager.tsx:114` | `appIcon` | 4.1 |
| D15 | Startup parade icon and alt/title | `ClassicyStartupScreen.tsx:77-93, 155-156`; parade entries from `ClassicyApp.tsx:246-253`, `ClassicyBootManager.ts:25-37` | `apps[id].name/icon`, parade entries | 2.2, 3.4 |
| D16 | Control Strip "Open Control Strip Control Panel" | `ClassicyControlStrip.tsx:524-539` **[E: 515-530]** | `CONTROL_STRIP_MANAGER_APP_NAME` | 3.4 |
| D17 | Screen Saver module "Open Screen Saver Control Panel" | `ClassicyScreenSaverControlStripModule.ts:63-67`; helper `ClassicyControlStripRegistry.ts:252-260` | literal `"Screen Saver"` | 3.4 |

Covered with no change, recorded so reviewers don't re-check them:
- **N1, Quit items.** `"Quit"` carries no app name (`ClassicyAppUtils.tsx:25`; HIGOS8 File menu). The payload's `app.title` (`:12, :30`) is never displayed. See decision K-D6.
- **N2, HyperCard `open app`.** It resolves by app id (`HyperCardEngine.ts:235-242`, `HyperCard.tsx:344-375`). The script builder takes a free-text app id (`HyperCardScriptBuilder.tsx:71`). Nothing looks an app up by name.
- **N3, menu-bar Time/Sound widgets.** `ClassicyAppOpen` payloads only (`ClassicyDesktopMenuWidgetTime.tsx:197`, `ClassicyDesktopMenuWidgetSound.tsx:73`); nothing displayed.
- **N4, default per-file windows.** `ClassicyApp.tsx:368-380` titles them with file names.
- **N5, window title bar.** `ClassicyWindowTitleBar.tsx:112-121` **[E]** renders the `title`/`icon` props it is given. The fix sits in the apps (D13/D14).
- **N6, analytics.** These keep the internal identity (decision K-D5): the page title `classicyWindowPageTitle(currentApp?.name, …)` (`ClassicyWindow.tsx:957, 965` **[E: 952, 960]**, `ClassicyAnalyticsPath.ts:74-82`), the About-box `track` payload (`ClassicyAboutWindow.tsx:78-85`) and the desktop-icon payload (`ClassicyDesktopIcon.tsx:245`).
- **N7, Control Strip module labels.** `label: "Screen Saver"` (`ClassicyScreenSaverControlStripModule.ts:77`) belongs to the module, not the app (decision K-D7).

Identity uses, meaning places where a name or record stands for identity. Each must keep the original:

| # | Use | Source | Disposition | Task |
|---|---|---|---|---|
| I1 | `` `ClassicyApp${name}CloseFile` `` from the `name` prop | `ClassicyApp.tsx:349-358` | `name` stays the internal name; pinned by test | 2.1 |
| I2 | Bundled apps build file action types from the display constant | `MoviePlayer.tsx:181`, `PictureViewer.tsx:143`, `PDFViewer.tsx:41, 64, 72` (space bug), `SimpleText.tsx:181, 249, 268, 357` | literal action-type constants | 2.1 |
| I3 | Finder routes OpenFile with `` `ClassicyApp${record.name}OpenFile` `` | `FinderContext.tsx:432, 441` | record name stays internal; pinned by test | 2.1 |
| I4 | `ClassicyDesktopIconRemove` matches `appName` | `ClassicyDesktopIconContext.tsx:408-422`, sent by `ClassicyApp.tsx:236-242`, `Finder.tsx:525-529` | records keep internal names; pinned | 2.1 |
| I5 | Finder drive icons share appId `Finder.app`, with `appName` = drive path | `Finder.tsx:496-520` | display resolution is kind-gated to `app_shortcut` | 3.1 |
| I6 | Applications/Extensions entry keys are names; `_creator` is the app id | `ClassicyFileSystemApplications.ts:37-44`, `ClassicyFileSystemExtensions.ts:29-36`, opened by `FinderContext.tsx:380-399` | key by display name; `_creator` stays the identity; collision rule | 3.3 |
| I7 | FS overlay invalidation keys contain name and icon but not the package | `ClassicyFileSystemContext.tsx:106-120, 167` | add the overrides object to the keys | 3.3 |
| I8 | `apps[id].name/icon` persisted and never refreshed | `ClassicyAppHelpers.ts:168-209`; Finder default `ClassicyAppManager.ts:600-611` | refresh from code on every load; never hold display data | 2.2 |
| I9 | Desktop-icon `balloonHelp.title` baked with the name, persisted | `ClassicyApp.tsx:177-182, 231`, `ClassicyDesktopIconContext.tsx:328, 400` | store only a host-given title; title at render | 2.2 |
| I10 | `systemMenu` items persist `title`/`image`/`eventData.app.name` | `ClassicyDesktopManager.tsx:251-277` | stay internal; re-titled at render | 3.2 |
| I11 | `findAppAboutItem` falls back to `item.title === "About"` | `ClassicyDesktopMenuBar.tsx:55-83` | `useClassicyAboutMenu` keeps the literal `"About"` title (`ClassicyAppMenuHooks.tsx:72`) | 4.1 |
| I12 | `ClassicyAppOpen`/`IconOpen` payloads carry `name`/`icon` (used only to create a missing record) | `ClassicyDesktopIcon.tsx:310-319`, `HyperCard.tsx:369-371`, `ClassicyControlStrip.tsx:529-537` **[E]** | payloads keep internal values | 3.1, 3.4 |
| I13 | Persisted state as a whole | `sanitizeStateForPersistence` (`ClassicyAppManagerUtils.tsx:172-248`) | test: under a renaming package, the sanitized JSON never contains the display name | 5.1 |
| I14 | Docs say "the name is load-bearing" | `docs/BUILDING-APPS.md:100-109, 924-945` | rewrite: internal name vs display name | 6.1 |

## Constraints

- **Starts after Part E lands.** Phase 0 fails fast if `origin/land/part-e-v3`'s tip is not an ancestor of HEAD.
- **Parity.** Platinum declares no `apps`, so every resolver returns its fallback. Parity is AE 0 for every story in `stories.txt` (Phase 0). The only new pixels are in the new `--renamed-by-package` story, which has no `before/`.
- **Nothing display-derived is ever written to the store, to localStorage or to the file-system journal.**
  - The derived folders are the one place a display name becomes an FS key. They are `_derived`, never journaled, dropped and rebuilt on every overlay build (`withoutDerivedEntries`).
  - Session-only parade entries carry a flag, not the override.
- **Resolver modules stay store-free** (they never import `ClassicyAppManagerUtils`), like `useClassicyAppearanceLayout.ts:13-18`, so reducers may import them.
- **Override lookups use `Object.hasOwn`.** The schema refuses `__proto__`, `constructor` and `prototype` keys.
- **Before each commit:** `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`. `pnpm test` does not type-check, so run `pnpm build:source` before the part merges.
- **Other rules:**
  - Run `pnpm exec barrelsby -c .ts-barrel.json` after adding a module; never hand-edit barrels.
  - Library code logs through `classicyLog`.
  - Use American English throughout.
  - Commits end with the session's attribution trailer.
  - Scope Biome to touched paths (`pnpm exec biome check <paths>`): repo-wide `lint:fix` reformats untouched files.
- **Review focus:**
  1. Drive icons share `Finder.app`: display resolution must be gated on `kind === "app_shortcut"` (3.1 Step 1 test).
  2. Name-derived action types: after 2.1, `git grep -n 'ClassicyApp\${' src/SystemFolder --include=*.tsx` lists only `ClassicyApp.tsx` (generic `name` prop) and `FinderContext.tsx` (record name).
  3. The FS overlay must rebuild on a package switch with no store change (3.3 Step 1).
  4. The persisted-state test (5.1 Step 1) is the guard against any future write of display data.

## Files

| File | Change | Responsibility |
|---|---|---|
| `src/Appearance/ClassicyAppearancePackage.ts` | modify | `ClassicyAppIdentityOverride` type; `apps?` on `ClassicyAppearancePackage` (`:140-164`). |
| `src/Appearance/ClassicyAppearancePackageSchema.ts` | modify | `ClassicyAppIdentityOverrideSchema`, `apps` on the package schema (`:78-88`), `.describe()` on each. |
| `src/Appearance/ClassicyAppIdentity.ts` | create | Store-free resolver, pure merge, both hooks, `CLASSICY_NO_APP_IDENTITY_OVERRIDES`. |
| `src/__tests__/testRenamePackage.ts` | create | `registerTestRenamePackage()`: `test-rename` package renaming `MoviePlayer.app` and `TV.app`. |
| `src/SystemFolder/SystemResources/App/ClassicyApp.tsx` | modify | Doc comments; balloon stored only when the prop gives one; parade `followsAppIcon`; internal-name naming. |
| `src/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers.ts` | modify | `loadApp` refreshes `name`/`icon` on existing records (`:191-208`). |
| `src/SystemFolder/SystemResources/Boot/ClassicyBootManager.ts` | modify | `followsAppIcon?: boolean` on `ClassicyBootParadeIcon` (`:9-13, 25-37`). |
| `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.tsx` | modify | Parade resolves display identity (`:77-93`). |
| `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.tsx` | modify | Self-resolves for `app_shortcut`; balloon title/content at render. |
| `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx` | modify | Type-select reads display names (`:373`). |
| `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.tsx` | modify | Name sort uses display names for `app_shortcut` (`:153-170`). |
| `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils.ts` | modify | `appSwitcherAppsFrom(apps, overrides?)`; `withClassicyAppIdentityMenuItems(items, overrides)`. |
| `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx` | modify | Switcher, About <app>, Apple-menu app entries, Finder fallback. |
| `src/SystemFolder/SystemResources/File/ClassicyFileSystemApplications.ts` | modify | Display-keyed entries, collision rule, separator guard. |
| `src/SystemFolder/SystemResources/File/ClassicyFileSystemExtensions.ts` | modify | Same for extensions. |
| `src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.tsx` | modify | Overrides in the invalidation keys; pass them to the builders. |
| `src/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindow.tsx` | modify | Heading and icon from `useClassicyAppIdentity`; analytics unchanged. |
| `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.tsx` | modify **[E]** | "Open … Control Panel" from the identity hook. |
| `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverControlStripModule.ts` | modify | Panel name from the identity hook. |
| `src/SystemFolder/QuickTime/MoviePlayer/MoviePlayer.tsx`, `src/SystemFolder/QuickTime/PictureViewer/PictureViewer.tsx`, `src/SystemFolder/PDFViewer/PDFViewer.tsx`, `src/SystemFolder/SimpleText/SimpleText.tsx` | modify | Literal file action types. |
| `src/SystemFolder/ControlPanels/{DateAndTimeManager,AppearanceManager,DriveSetup,ControlStripManager,SoundManager,ScreenSaverManager}/*.tsx` (main component each) | modify | Window title, proxy icon, About title from the identity hook. |
| `src/SystemFolder/HyperCard/HyperCard.tsx`, `src/SystemFolder/HyperCard/HyperCardDialog.tsx` | modify | Fallback window title, About title, answer-dialog title. |
| `storybook/.storybook/RenamedPackage.ts`, `storybook/.storybook/renamed.ts`, `storybook/.storybook/renamed-media-player.svg`, `storybook/.storybook/renamed-television.svg` | create | Storybook-only `renamed` package (Platinum's CSS rescoped) and its parameters. |
| `storybook/.storybook/RenamedPackage.test.ts` | create | Pins the package and its CSS equivalence to Platinum. |
| `src/SystemFolder/SystemResources/App/ClassicyApp.stories.tsx` | modify | `RenamedByPackage` story. |
| `docs/AGENT-REFERENCE.md` **[E]**, `CLAUDE.md` **[E]**, `docs/BUILDING-APPS.md` | modify | Documentation. |

## Phase 0: Baseline and gate

- [ ] **Step 1: Part E gate.** `git fetch origin && git merge-base --is-ancestor origin/land/part-e-v3 HEAD && echo E-landed`. Expected: `E-landed`. If it fails, stop and report; no task starts before E lands. Then confirm the E line numbers this plan cites: `git grep -n 'CONTROL_STRIP_MANAGER_APP_NAME' src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.tsx` and `git grep -n 'classicyWindowPageTitle(currentApp' src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx`. Record the actual lines in `.playwright-mcp/parity/part-K/lines.txt`.
- [ ] **Step 2: Identity snapshot.** `git grep -n 'ClassicyApp\${' src --include=*.ts --include=*.tsx > .playwright-mcp/parity/part-K/identity-before.txt`. Expected: the I1–I3 rows (ClassicyApp, Finder, MoviePlayer, PictureViewer, PDFViewer ×3, SimpleText ×4).
- [ ] **Step 3: Story list.**
  1. Start Storybook (`pnpm storybook`, in the background; note the port).
  2. From `index.json`, keep every id whose title starts with `Desktop/`, `Extensions/`, `System/AppearanceManager` or `System/StartupScreen`. Write them to `.playwright-mcp/parity/part-K/stories.txt`.
- [ ] **Step 4: Before shots.** With Playwright MCP, open each `iframe.html?id=<id>&viewMode=story` at 1024×768, wait for networkidle + 500 ms, and save `.playwright-mcp/parity/part-K/before/<id>.png`. `ls before | wc -l` must equal `wc -l < stories.txt`.
- [ ] **Step 5:** No commit.

**Validation:** `ls .playwright-mcp/parity/part-K/before | wc -l  # equals wc -l stories.txt`

## Phase 1: Declaration and resolver

### 1.1: `apps` on the package, validated

**Files:**
- Modify: `src/Appearance/ClassicyAppearancePackage.ts`
- Modify: `src/Appearance/ClassicyAppearancePackageSchema.ts`
- Test: `src/Appearance/ClassicyAppearancePackageSchema.test.ts`

**Depends on:** 0

**Interfaces:**
- Consumes: `ClassicyAppearancePackage` (`ClassicyAppearancePackage.ts:140-164`); `ClassicyAppearancePackageSchema` (`ClassicyAppearancePackageSchema.ts:78-103`); `isClassicyAssetSource` (`ClassicyAssetSource.ts`); registration validation (`ClassicyAppearancePackageRegistry.ts:63-84`). The registry stores the original object, not the parsed one, so the schema must refuse anything it would otherwise transform. Use refinements, never `.trim()`.
- Produces in `ClassicyAppearancePackage.ts`:
  ```ts
  /** A package's display override for one app (by app id). Display only:
   *  the app's id, action types, routing and saved state never change. */
  export type ClassicyAppIdentityOverride = {
    /** Shown wherever the app's name is shown. */
    name?: string;
    /** Shown wherever the app's icon is shown. */
    icon?: ClassicyAssetSource;
    /** Balloon-help copy for the app's desktop icon when the app supplies none. */
    description?: string;
  };
  ```
  `ClassicyAppearancePackage` gains `apps?: Readonly<Record<string, ClassicyAppIdentityOverride>>`, documented "Per-app display overrides keyed by app id (`"MoviePlayer.app"`); read with `useClassicyAppIdentity`".
- Produces in `ClassicyAppearancePackageSchema.ts`:
  - `export const ClassicyAppIdentityOverrideSchema`, a `z.strictObject({ name, icon, description })`, all optional, each with `.describe()`:
    - `name`: a string, 1–64 chars, equal to its trim, not starting with `_`, not containing `:`, not one of `__proto__|constructor|prototype`. Message: "must be a display name usable as a file name (no leading _, no :)".
    - `icon`: `z.string().refine(isClassicyAssetSource)`.
    - `description`: 1–512 chars, equal to its trim.
  - The package schema gains `apps: z.record(appIdKey, ClassicyAppIdentityOverrideSchema).optional().describe("Per-app display overrides keyed by app id …")`. `appIdKey` is 1–128 chars and not a forbidden key.
  - The compile-time guard at `:108-114` still holds.

- [ ] **Step 1: Write the failing tests** in `ClassicyAppearancePackageSchema.test.ts`, using the existing valid-package fixture there.
  ```ts
  it("accepts per-app overrides", () => {
    expect(ClassicyAppearancePackageSchema.safeParse({ ...valid, apps: { "MoviePlayer.app": { name: "Media Player", icon: "data:image/png;base64,AA==" } } }).success).toBe(true);
  });
  it.each([["_x"], ["A:B"], [" Pad"], [""], ["x".repeat(65)]])("refuses the name %j", (name) => {
    expect(ClassicyAppearancePackageSchema.safeParse({ ...valid, apps: { "A.app": { name } } }).success).toBe(false);
  });
  it("refuses a script icon, unknown keys and forbidden ids", () => {
    for (const apps of [
      { "A.app": { icon: "javascript:alert(1)" } },
      { "A.app": { label: "x" } },
      JSON.parse('{"__proto__": {"name": "X"}}'),
    ]) {
      expect(ClassicyAppearancePackageSchema.safeParse({ ...valid, apps }).success).toBe(false);
    }
  });
  it("describes the field", () => {
    expect(ClassicyAppearancePackageSchema.shape.apps.description).toMatch(/app id/);
  });
  ```
  Also add a registry case to `ClassicyAppearancePackageRegistry.test.ts`: an invalid `apps` is logged and not registered.
- [ ] **Step 2: Run them to verify they fail.** `pnpm exec vitest run src/Appearance/ClassicyAppearancePackageSchema.test.ts src/Appearance/ClassicyAppearancePackageRegistry.test.ts`. Expected: FAIL (`apps` is stripped as an unknown key, so invalid values pass).
- [ ] **Step 3: Implement** the type and schema per Interfaces.
- [ ] **Step 4: Run the tests to verify they pass.** Run `pnpm exec vitest run src/Appearance`. Expected: PASS.
- [ ] **Step 5: Lint, type-check, commit.** `git add src/Appearance && git commit -m "feat(appearance): packages declare per-app display overrides (apps)"`.

**Validation:** `pnpm exec vitest run src/Appearance/ClassicyAppearancePackageSchema.test.ts`

### 1.2: Store-free resolver and live hooks

**Files:**
- Create: `src/Appearance/ClassicyAppIdentity.ts`
- Create: `src/__tests__/testRenamePackage.ts`
- Test: `src/Appearance/ClassicyAppIdentity.test.tsx`

**Depends on:** 1.1

**Interfaces:**
- Consumes:
  - `getRegisteredClassicyAppearancePackageOrDefault` and `subscribeClassicyAppearancePackages` (`ClassicyAppearancePackageRegistry.ts:121-138`).
  - `getClassicyAssetPackageSource` (`ClassicyAssetPackageSource.internal.ts`) and `subscribeClassicyAssets` (`ClassicyAssetRegistry.ts`), the pattern of `useClassicyAppearanceLayout.ts:30-54`.
- Produces (`ClassicyAppIdentity.ts`; barrel-exported):
  ```ts
  export type ClassicyAppIdentity = { name: string; icon: string; description?: string };
  export type ClassicyAppIdentityOverrides = Readonly<Record<string, ClassicyAppIdentityOverride>>;
  export const CLASSICY_NO_APP_IDENTITY_OVERRIDES: ClassicyAppIdentityOverrides; // Object.freeze({})

  /** The active (or given) package's `apps`, else the frozen empty map. Store-free. */
  export const getClassicyAppIdentityOverrides = (packageId?: string): ClassicyAppIdentityOverrides;
  // getRegisteredClassicyAppearancePackageOrDefault(packageId ?? getClassicyAssetPackageSource()?.getId())?.apps
  //   ?? CLASSICY_NO_APP_IDENTITY_OVERRIDES

  /** Pure merge: each override field wins over the fallback's; no override → `fallback` itself. */
  export const classicyAppIdentityFrom = (
    overrides: ClassicyAppIdentityOverrides,
    appId: string,
    fallback: ClassicyAppIdentity,
  ): ClassicyAppIdentity; // Object.hasOwn

  export const resolveClassicyAppIdentity = (
    appId: string,
    fallback: ClassicyAppIdentity,
    packageId?: string,
  ): ClassicyAppIdentity;

  /** Live: re-renders on a package switch or re-registration; the snapshot is
   *  the package's own `apps` object, so it is reference-stable. */
  export const useClassicyAppIdentityOverrides = (): ClassicyAppIdentityOverrides;

  /** `appId === undefined` returns `fallback` (callers gate on icon kind).
   *  Memoized on the overrides and the fallback's fields. */
  export const useClassicyAppIdentity = (
    appId: string | undefined,
    fallback: ClassicyAppIdentity,
  ): ClassicyAppIdentity;
  ```
  `testRenamePackage.ts`: `TEST_RENAME_PACKAGE_ID = "test-rename"`, `TEST_RENAMED_ICON = "data:image/svg+xml,…"` and `registerTestRenamePackage()`. The last copies `registerTestMirrorPackage`'s shape (`src/__tests__/testMirrorPackage.ts`) with Platinum's layout and `apps: { "MoviePlayer.app": { name: "Media Player", icon: TEST_RENAMED_ICON, description: "Plays movies and sound." }, "TV.app": { name: "Television" } }`.

- [ ] **Step 1: Write the failing tests** in `ClassicyAppIdentity.test.tsx`.
  - Platinum returns the fallback object itself (`toBe`).
  - `resolveClassicyAppIdentity("MoviePlayer.app", fb, "test-rename")` gives `{ name: "Media Player", icon: TEST_RENAMED_ICON, description: "Plays movies and sound." }`.
  - With only a `name` override, the fallback icon is kept.
  - An unregistered id falls back to Platinum.
  - `"__proto__"` and `"constructor"` app ids return the fallback.
  - The hook follows `dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId: "test-rename" })` and back. It also follows a re-registration under the active id.
  - Its value is reference-stable across unrelated store updates. Count renders with `renderHook` and dispatch `ClassicyDesktopSetBalloonHelp`.
  - Import graph check: `ClassicyAppIdentity.ts` does not import `ClassicyAppManagerUtils`. Assert with a module-graph check like `useClassicyAppearance.storeFree.test.ts`.
  - `afterEach`: `resetClassicyAppearancePackagesForTests()`, then re-import Platinum, as `useClassicyAppearanceLayout.test.ts` does.
- [ ] **Step 2: Run them to verify they fail.** `pnpm exec vitest run src/Appearance/ClassicyAppIdentity.test.tsx`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement per Interfaces.** Copy `subscribeActiveLayout` locally as `subscribeActivePackage`, with a comment naming its twin. Then run `pnpm exec barrelsby -c .ts-barrel.json`.
- [ ] **Step 4: Run the tests to verify they pass.** Expected: PASS.
- [ ] **Step 5: Lint, type-check, commit.** `git commit -m "feat(appearance): resolveClassicyAppIdentity and useClassicyAppIdentity"`.

**Validation:** `pnpm exec vitest run src/Appearance/ClassicyAppIdentity.test.tsx`

## Phase 2: Identity stays internal

### 2.1: Literal action types; pin the generic name paths

**Files:**
- Modify: `src/SystemFolder/QuickTime/MoviePlayer/MoviePlayer.tsx`, `src/SystemFolder/QuickTime/PictureViewer/PictureViewer.tsx`, `src/SystemFolder/PDFViewer/PDFViewer.tsx`, `src/SystemFolder/SimpleText/SimpleText.tsx`, `src/SystemFolder/SystemResources/App/ClassicyApp.tsx`
- Test: `src/SystemFolder/SystemResources/App/ClassicyAppIdentity.routing.test.tsx` (new)
- Test: `src/SystemFolder/PDFViewer/PDFViewer.test.tsx` (extend, or create beside `PDFViewerContext`)

**Depends on:** 1.2

**Interfaces:**
- Consumes:
  - I1–I4 above.
  - The literal types each app's reducer already declares:
    - `ClassicyAppMoviePlayerCloseFile` (`MoviePlayerContext.tsx:105, 153`)
    - `ClassicyAppPictureViewerCloseFile` (`PictureViewerContext.tsx:102, 150`)
    - `ClassicyAppPDFViewerCloseFile` (`PDFViewerContext.tsx:54, 78`)
    - `ClassicyAppSimpleTextOpenFile` and `ClassicyAppSimpleTextCloseFile` (the SimpleText reducer's prefix `ClassicyAppSimpleText`)
  - Routing (`ClassicyAppManager.ts:487-515`): plugin prefix first, then the generic `default` (`:376-399`) keyed on `action.app.id`.
- Produces:
  - Each name-derived template is replaced by a module constant, e.g. `const CLOSE_FILE = "ClassicyAppMoviePlayerCloseFile";`. MoviePlayer, PictureViewer and SimpleText produce byte-identical types.
  - **PDF Viewer changes route on purpose.** `"ClassicyAppPDF ViewerCloseFile"` becomes `"ClassicyAppPDFViewerCloseFile"`, now handled by `classicyPDFViewerEventHandler`, which filters `openFiles` exactly as the generic handler did (`PDFViewerContext.tsx:54-57`).
  - `ClassicyApp.tsx`: the destructured `name` gains the comment "the app's internal name: action types (`ClassicyApp${name}CloseFile`), Finder's OpenFile routing and every store record use it; a package's display name never replaces it". The prop's JSDoc (`:40-41`) becomes "Internal name and default display name. Keys `ClassicyApp${name}OpenFile`/`CloseFile`; an Appearance Package may show another name (`apps`), never changing this one".
  - No behavior change in `ClassicyApp.tsx:349-358` or `FinderContext.tsx:432, 441` (decision K-D9).

- [ ] **Step 1: Write the failing tests.**
  - In `ClassicyAppIdentity.routing.test.tsx`, register `test-rename` and switch to it, mount `<MoviePlayer />` and a host `<ClassicyApp id="TV.app" name="TV" icon={X} handlesFileTypes={[Text]} />` inside the providers, and spy on the reducer (wrap `useAppManager.getState().dispatch`). Then:
    1. Assert `apps["MoviePlayer.app"].name === "Movie Player"` and the TV record's `name === "TV"`.
    2. Invoke the MoviePlayer window close for a path doc and assert the dispatched type is `"ClassicyAppMoviePlayerCloseFile"`.
    3. Have Finder open a `.txt` path routed to TV.app (`ClassicyAppFinderOpenFile`) and assert TV's `data.openFiles` gained it. That is the generic path with the record name.
    4. Unmount TV with `showDesktopIcon={false} showInApplicationsFolder={false}` and assert `ClassicyDesktopIconRemove` removed the record. That is I4 with the internal name.
  - In the PDF test, assert that closing dispatches `"ClassicyAppPDFViewerCloseFile"` and that the PDF reducer runs (spy `classicyPDFViewerEventHandler` or assert no `Unhandled`/generic path).
- [ ] **Step 2: Run them to verify they fail.** Expected: the PDF case FAILS (type has a space). The routing file PASSES except where an assertion depends on 2.2; mark those `it.todo` until 2.2.
- [ ] **Step 3: Implement the literal constants** in the four apps and the `ClassicyApp` comments.
- [ ] **Step 4: Run tests.** `pnpm exec vitest run src/SystemFolder/QuickTime src/SystemFolder/PDFViewer src/SystemFolder/SimpleText src/SystemFolder/SystemResources/App`. Expected: PASS.
- [ ] **Step 5: Lint, type-check, commit.** `git commit -m "refactor(apps): file action types are literals, never built from the app's display name"`.

**Validation:** `git grep -n 'ClassicyApp\${' src/SystemFolder --include=*.tsx  # only ClassicyApp.tsx and FinderContext.tsx`

### 2.2: Records hold the app's own identity, refreshed from code

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers.ts`
- Modify: `src/SystemFolder/SystemResources/App/ClassicyApp.tsx`
- Modify: `src/SystemFolder/SystemResources/Boot/ClassicyBootManager.ts`
- Test: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`, `src/SystemFolder/SystemResources/App/ClassicyApp.applicationsfolder.test.tsx`, `src/SystemFolder/SystemResources/App/ClassicyApp.booticon.test.tsx`, `src/SystemFolder/SystemResources/Boot/ClassicyBootManager.test.ts`

**Depends on:** 2.1

**Interfaces:**
- Consumes:
  - `loadApp` (`ClassicyAppHelpers.ts:168-209`).
  - `ClassicyApp`'s registration effect (`ClassicyApp.tsx:177-265`).
  - `normalizeIconBalloonHelp` (`ClassicyDesktopIconBalloons.ts:29-36`).
  - `ClassicyBootParadeIcon` (`ClassicyBootManager.ts:9-13`).
  - The parade dispatch (`ClassicyApp.tsx:246-253`).
- Produces:
  - **`loadApp`.** In the existing-record branch, also set `findApp.name = appName; findApp.icon = appIcon;`. Comment: "code-derived, like desktop-icon re-adds: the record is the app's own identity, and a package's display override is never written here".
  - **`ClassicyApp` balloon.**
    - The record gets a balloon only when `desktopIconBalloonHelp` is given: `normalizeIconBalloonHelp(desktopIconBalloonHelp, undefined)`.
    - Widen the second parameter to `defaultTitle?: string`; the title is omitted when absent.
    - The manifest description is no longer copied into the record. 3.1 resolves it at render.
    - `balloonHelpKey` (`:177-182`) drops `getAppManifest`, and the import goes if unused.
  - **Parade.** `ClassicyBootParadeIcon` gains `followsAppIcon?: boolean`. `ClassicyApp` sends `followsAppIcon: bootIcon === true` (`:246-253`). The boot reducer stores it (`:25-37`).

- [ ] **Step 1: Write the failing tests.**
  - Reducer: dispatch `ClassicyAppLoad { app: { id: "A.app", name: "A", icon: "a.png" } }`, then the same with `name: "A2", icon: "b.png"`. Expect the record to be `{ name: "A2", icon: "b.png" }`.
  - `ClassicyApp.applicationsfolder.test.tsx`: an app with no `desktopIconBalloonHelp` but a registered manifest stores `balloonHelp === undefined` on its icon record. One with `desktopIconBalloonHelp="Hi"` stores `{ content: "Hi" }` with no `title`.
  - Boot: `bootIcon` true stores `followsAppIcon: true`; a string `bootIcon` stores none.
  - Re-enable the `it.todo`s from 2.1.
- [ ] **Step 2: Run them to verify they fail.** Expected: FAIL (record not refreshed; balloon baked with title and manifest copy).
- [ ] **Step 3: Implement per Interfaces.**
- [ ] **Step 4: Run tests.** `pnpm exec vitest run src/SystemFolder/ControlPanels/AppManager src/SystemFolder/SystemResources/App src/SystemFolder/SystemResources/Boot src/SystemFolder/SystemResources/Desktop`. Expected: PASS. The existing `ClassicyDesktopIcon.balloonhelp.test.tsx` cases that read the manifest balloon from the record are updated in 3.1. If they fail here, move this step's balloon half into 3.1 and keep 2.2 to the `loadApp` and parade halves.
- [ ] **Step 5: Lint, type-check, commit.** `git commit -m "refactor(apps): records keep the app's own name and icon, refreshed on every load"`.

**Validation:** `pnpm exec vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`

## Phase 3: Shell surfaces read the display identity

### 3.1: Desktop icons, type-select, Clean Up by name

**Files:**
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.tsx`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.tsx`
- Test: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.identity.test.tsx` (new), `ClassicyDesktopIcon.balloonhelp.test.tsx`, `ClassicyDesktopKeyNav.test.ts`, `ClassicyDesktopIconContext.test.ts`

**Depends on:** 2.2

**Interfaces:**
- Consumes:
  - `ClassicyDesktopIcon` props (`:44-89`), the balloon (`:234-241`), the open dispatch (`:310-319`), img/label (`:546, 566`).
  - `APP_SHORTCUT_ICON_KIND` (`ClassicyFileSystemApplications.ts:9`) and `getAppManifest` (`ClassicyAppManifest.ts`).
  - `typeaheadMatch` (`ClassicyDesktopKeyNav.ts:64-74`), called at `ClassicyDesktop.tsx:373`.
  - `sortDesktopIcons` (`ClassicyDesktopIconContext.tsx:153-170`), its callers (`:249-268, :337`) and `iconGridOrigin(ds)` (`:238-242`), the store-free pattern.
- Produces:
  - **`ClassicyDesktopIcon`:**
    ```ts
    const identity = useClassicyAppIdentity(
      kind === APP_SHORTCUT_ICON_KIND ? appId : undefined,
      { name: appName, icon, description: kind === APP_SHORTCUT_ICON_KIND ? getAppManifest(appId)?.description : undefined },
    );
    ```
    - The `<img src={identity.icon} alt={identity.name}>` and the label `label ?? identity.name`.
    - `effectiveBalloonHelp`:
      ```ts
      balloonHelp
        ? { ...balloonHelp, title: balloonHelp.title ?? label ?? identity.name }
        : identity.description
          ? { title: label ?? identity.name, content: identity.description }
          : defaultBalloonForKind(kind, label ?? appName)
      ```
    - The `ClassicyDesktopIconOpen` payload and `analyticsArgs` keep `appName`/`icon` (I12, K-D5).
    - The JSDoc for `appName`/`icon` adds: "for an `app_shortcut`, an Appearance Package's `apps` override is shown instead".
  - **`ClassicyDesktop`:**
    - `const appIdentityOverrides = useClassicyAppIdentityOverrides()`.
    - Memoize `typeaheadIcons = desktopIcons.map(i => i.kind === APP_SHORTCUT_ICON_KIND && !i.label ? { ...i, label: classicyAppIdentityFrom(appIdentityOverrides, i.appId, { name: i.appName, icon: i.icon }).name } : i)`.
    - Pass `typeaheadIcons` at `:373`.
  - **`ClassicyDesktopIconContext`:**
    - `sortDesktopIcons(icons, sortType, packageId?: string)`.
    - Its name key is `displayName(i) = i.kind === APP_SHORTCUT_ICON_KIND ? resolveClassicyAppIdentity(i.appId, { name: i.appName, icon: i.icon }, packageId).name : i.appName`.
    - The three callers pass `ds.System.Manager.Appearance.packageId`.

- [ ] **Step 1: Write the failing tests.** In `ClassicyDesktopIcon.identity.test.tsx`, under `test-rename`:
  1. An `app_shortcut` icon for `TV.app` with `appName="TV"` renders the label "Television" and `alt="Television"`.
  2. A `drive` icon with `appId="Finder.app"` and `appName="Macintosh HD"` keeps "Macintosh HD" even when `test-rename` declares `"Finder.app": { name: "Explorer" }`. Extend the fixture locally for this test.
  3. A user `label` wins over the override.
  4. Switching back to Platinum restores "TV".
  5. Double-clicking dispatches `ClassicyDesktopIconOpen` with `app.name === "TV"`.
  6. Balloon: hovering a renamed MoviePlayer-style icon with no stored balloon shows the title "Media Player" and the content "Plays movies and sound."; under Platinum it shows the manifest description.
  - KeyNav: `typeaheadMatch` over mapped icons finds "Tel".
  - IconContext: `ClassicyDesktopIconSort { sortBy: "name" }` under `test-rename` orders "Television" after "Scrapbook" and before "Zed".
- [ ] **Step 2: Run them to verify they fail.** Expected: FAIL (labels show "TV").
- [ ] **Step 3: Implement per Interfaces.**
- [ ] **Step 4: Run the tests, then the parity check.** Run `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop`. Expected: PASS. Re-shoot `desktop-desktopicon--*`, `desktop-desktop--*` and `desktop-app--*` into `after/`, then run `compare -metric AE`. Expected: `0`.
- [ ] **Step 5: Lint, type-check, commit.** `git commit -m "feat(desktop): app icons show the package's display name and icon"`.

**Validation:** `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.identity.test.tsx`

### 3.2: Menu bar — App Switcher, About <app>, Apple-menu app entries

**Files:**
- Modify: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils.ts`
- Modify: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx`
- Test: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils.test.ts`, `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.identity.test.tsx` (new)

**Depends on:** 1.2

**Interfaces:**
- Consumes: `appSwitcherAppsFrom` (`ClassicyAppSwitcherUtils.ts:16-28`); in `ClassicyDesktopMenuBar.tsx`, the `apps`/`systemMenu` selectors (`:174-176`), `appSwitcherData` (`:195`), the switcher item (`:204-226`), `focusedMenuApp` (`:236-243`), the Apple-menu memo (`:286-327`), and the literal `"Finder"` fallbacks (`:210, :288`). `systemMenu` item ids are `system_menu_${appId}` (`ClassicyDesktopManager.tsx:254`).
- Produces:
  - `appSwitcherAppsFrom(apps, overrides: ClassicyAppIdentityOverrides = CLASSICY_NO_APP_IDENTITY_OVERRIDES)`: maps `name`/`icon` through `classicyAppIdentityFrom(overrides, a.id, a)`.
  - `export const withClassicyAppIdentityMenuItems = (items: ClassicyMenuItem[] | undefined, overrides): ClassicyMenuItem[] | undefined`:
    - For each item whose `id` starts with `"system_menu_"`, returns a copy with `title` and `image` resolved for `id.slice(12)`, falling back to the item's own.
    - Returns other items and the input array unchanged (same reference) when nothing matched an override.
  - In `ClassicyDesktopMenuBar`:
    - `const overrides = useClassicyAppIdentityOverrides()`.
    - `appSwitcherAppsFrom(apps, overrides)` at `:195`, with deps `[apps, overrides]`.
    - `finderName = classicyAppIdentityFrom(overrides, "Finder.app", { name: "Finder", icon: "" }).name` replaces both `"Finder"` literals.
    - `:288` becomes `appName = focusedMenuApp ? classicyAppIdentityFrom(overrides, focusedMenuApp.id, focusedMenuApp).name : finderName`.
    - `rest`/`systemMenu` at `:296-312` pass through `withClassicyAppIdentityMenuItems(…, overrides)`. Add `overrides` to the memo deps (`:327`).
    - `eventData.app` is untouched (I10).

- [ ] **Step 1: Write the failing tests.**
  - Utils: with overrides `{ "B.app": { name: "Bee" } }`, the entries rename B only, and an empty map returns names unchanged. `withClassicyAppIdentityMenuItems` renames `system_menu_B.app` only, keeps `eventData.app.name`, and returns the same array reference with no overrides.
  - Menu bar under `test-rename`, with MoviePlayer.app open and focused (dispatch `ClassicyAppOpen` with `MoviePlayerAppInfo`):
    - The switcher title text is "Media Player" and its `<img>` src is `TEST_RENAMED_ICON`.
    - Opening the Apple menu shows "About Media Player".
    - An `addSystemMenu` host app `TV.app` appears as "Television".
    - Switching to Platinum shows "Movie Player" / "TV".
    - Model the open-menu helpers on `ClassicyDesktopMenuBar.test.tsx:36-60`; leaf menu clicks need the synthetic `webkitAnimationEnd` (`src/__tests__/animationEnd.ts`).
- [ ] **Step 2: Run them to verify they fail.** `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/MenuBar`. Expected: FAIL.
- [ ] **Step 3: Implement per Interfaces.**
- [ ] **Step 4: Run the tests, then the parity check.** Expected: PASS. Re-shoot `desktop-menubar--*`, `desktop-menubar-extension--*` and `desktop-desktop--*`. Expected: AE `0`.
- [ ] **Step 5: Lint, type-check, commit.** `git commit -m "feat(menubar): App Switcher and Apple menu show package display names and icons"`.

**Validation:** `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.identity.test.tsx`

### 3.3: Derived Applications and Extensions folders

**Files:**
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileSystemApplications.ts`
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileSystemExtensions.ts`
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileSystemContext.tsx`
- Test: `ClassicyFileSystemApplications.test.ts`, `ClassicyFileSystemExtensions.test.ts`, `ClassicyFileSystemContext.test.tsx`, `src/SystemFolder/SystemResources/App/ClassicyApp.applicationsfolder.test.tsx`

**Depends on:** 2.2

**Interfaces:**
- Consumes:
  - `buildApplicationsFolder` and `withApplicationsFolder` (`ClassicyFileSystemApplications.ts:26-79`).
  - `buildExtensionsFolder` and `withExtensionsFolder` (`ClassicyFileSystemExtensions.ts:18-80`).
  - `useClassicyFileSystem` keys (`ClassicyFileSystemContext.tsx:106-120`), its memo and overlay calls (`:167-200`), and `fs.separator`.
  - `withoutDerivedEntries` (`ClassicyFileSystemModel.ts:94-106`).
  - Finder's AppShortcut open by `_creator` (`FinderContext.tsx:380-399`).
- Produces:
  - `buildApplicationsFolder(icons, overrides = CLASSICY_NO_APP_IDENTITY_OVERRIDES, separator = ":")`.
  - **Entry key and icon.** Each entry's key is `classicyAppIdentityFrom(overrides, icon.appId, { name: icon.appName, icon: icon.icon })`'s `name`, and `_icon` is its `icon`. `_creator` stays `icon.appId`.
  - **Collision rule (decision K-D3).** Entries are processed in icon order. Rather than overwrite, a display name that is unusable falls back to the original `appName`:
    - it is already taken by an earlier derived entry in this build;
    - it contains `separator`; or
    - it starts with `_`.

    Each fallback is logged once per build as `classicyLog("warn", "ClassicyFileSystem", "App display name unusable in Applications; using its own name", { appId, name })`. If the original name is also taken, today's last-wins behavior is unchanged.
  - `withApplicationsFolder(tree, icons, overrides?, separator?)` forwards them. The Extensions pair gets the same three parameters, using `app.id`, `app.name` and `app.icon`.
  - In `useClassicyFileSystem`:
    - Add `const appIdentityOverrides = useClassicyAppIdentityOverrides();` and include it in the memo's deps (update the biome-ignore comment).
    - Pass it and `fs.separator` to both builders.
    - Keys `:106-120` are unchanged; the overrides object is the extra invalidation key.

- [ ] **Step 1: Write the failing tests.**
  - Builder: with overrides `{ "A.app": { name: "Ay", icon: "i.png" } }`, the folder has key `Ay` with `_creator: "A.app"` and `_icon: "i.png"`, and has no `A`.
  - Collision: two apps renamed "Same" give the first under "Same" and the second under its own name, plus one warning.
  - Separator: `name: "A:B"` cannot pass the schema. Call the builder directly with `"A/B"` and `separator "/"` and expect a fallback.
  - Context, under the real hook: switching to `test-rename` with `MoviePlayer.app` mounted relists `Macintosh HD:Applications` with "Media Player" and no "Movie Player". Switching back restores it. No store action other than the package change is dispatched.
  - Finder `ClassicyAppFinderOpenFile` on the renamed entry's path opens `MoviePlayer.app`.
  - Persistence: after the switch, `localStorage.getItem("classicyStorage")` holds no `"Media Player"` key outside `_derived` entries. Read it through the existing helper that `ClassicyFileSystem.shared.test.ts` uses.
- [ ] **Step 2: Run them to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement per Interfaces.**
- [ ] **Step 4: Run the tests, then the parity check.** `pnpm exec vitest run src/SystemFolder/SystemResources/File src/SystemFolder/SystemResources/App src/SystemFolder/Finder`. Expected: PASS. Re-shoot `desktop-filebrowser--*`. Expected: AE `0`.
- [ ] **Step 5: Lint, type-check, commit.** `git commit -m "feat(filesystem): derived Applications and Extensions folders list apps by display name"`.

**Validation:** `pnpm exec vitest run src/SystemFolder/SystemResources/File/ClassicyFileSystemApplications.test.ts`

### 3.4: About box, startup parade, Control Strip "Open … Control Panel" **[E]**

**Files:**
- Modify: `src/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindow.tsx`
- Modify: `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.tsx`
- Modify: `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.tsx` **[E]**
- Modify: `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverControlStripModule.ts`
- Test: `ClassicyAboutWindow.test.tsx`, `ClassicyStartupScreen.test.tsx`, `ClassicyControlStrip.test.tsx`, `ClassicyScreenSaverControlStripModule.test.ts` (or the existing module test)

**Depends on:** 2.2

**Interfaces:**
- Consumes:
  - `ClassicyAboutWindow` (`:51-117`): analytics at `:78-85`, render at `:104-105`.
  - `ClassicyStartupScreen` parade memo (`:77-93`) and render (`:155-156`).
  - The `ClassicyControlStrip` contextual item (`:524-539`, **[E: 515-530]**).
  - `useScreenSaverModuleMenu` (`ClassicyScreenSaverControlStripModule.ts:26-68`).
  - `classicyControlStripOpenControlPanelItem` (`ClassicyControlStripRegistry.ts:252-260`): unchanged signature, and its `app` stays internal.
- Produces:
  - **`ClassicyAboutWindow`.** `const identity = useClassicyAppIdentity(appId, { name: appName, icon: appIcon })` renders `<img src={identity.icon}>` and `<h1>{identity.name}</h1>`. `track` keeps `appName`/`appIcon`. The JSDoc for `appName`/`appIcon` changes to "the app's own name/icon; an Appearance Package's `apps` override is shown instead".
  - **`ClassicyStartupScreen`:**
    - Uses `const overrides = useClassicyAppIdentityOverrides()`.
    - Extension entries: `classicyAppIdentityFrom(overrides, app.id, app)`.
    - Parade entries: the name is resolved by `entry.id` (fallback `entry.name ?? ""`); the icon is resolved only when `entry.followsAppIcon`.
    - Deps: `[paradeIcons, apps, overrides]`.
  - **`ClassicyControlStrip`.** `const panel = useClassicyAppIdentity(CONTROL_STRIP_MANAGER_APP_ID, { name: CONTROL_STRIP_MANAGER_APP_NAME, icon: "" })`. The title becomes `` `Open ${panel.name} Control Panel` `` and the `app` payload is unchanged. Add `panel.name` to that memo's deps.
  - **Screen Saver module.** `const panel = useClassicyAppIdentity(SCREEN_SAVER_MANAGER_APP_ID, { name: "Screen Saver", icon: ClassicyIcons.system.extensions.screensaver })`. Pass `panel.name` as `panelName`; `app` stays internal.

- [ ] **Step 1: Write the failing tests.**
  - About: under `test-rename`, `<ClassicyAboutWindow appId="MoviePlayer.app" appName="Movie Player" appIcon="x.png" …/>` shows "Media Player" and `TEST_RENAMED_ICON`. The `track` spy still receives `appName: "Movie Player"`.
  - Parade:
    - Extension app `X.app`, renamed in a local fixture: its parade `img` title is the display name.
    - A `bootIcon` true entry for `MoviePlayer.app` shows `TEST_RENAMED_ICON`.
    - A string `bootIcon` keeps its own icon.
  - Control Strip, with a fixture renaming `ControlStripManager.app` to "Strip": the contextual menu offers "Open Strip Control Panel", and clicking it dispatches `ClassicyAppOpen` with `app.name === "Control Strip"`.
  - Screen Saver module, with `ScreenSaverManager.app` renamed to "Savers": the item is titled "Open Savers Control Panel".
- [ ] **Step 2: Run them to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement per Interfaces.** In `ClassicyControlStrip.tsx`, use the post-E lines recorded in Phase 0 Step 1.
- [ ] **Step 4: Run the tests, then the parity check.** `pnpm exec vitest run src/SystemFolder/SystemResources/AboutWindow src/SystemFolder/SystemResources/Boot src/SystemFolder/SystemResources/ControlStrip src/SystemFolder/Extensions/ScreenSaver`. Expected: PASS. Re-shoot `desktop-aboutwindow--*`, `desktop-controlstrip--*`, `system-startupscreen--*` and `extensions-screensaver--*`. Expected: AE `0`.
- [ ] **Step 5: Lint, type-check, commit.** `git commit -m "feat(apps): About box, startup parade and Control Strip panel items show display names"`.

**Validation:** `pnpm exec vitest run src/SystemFolder/SystemResources/AboutWindow`

## Phase 4: App-authored text

### 4.1: Bundled apps' window titles, proxy icons and About titles

**Files:**
- Modify:
  - `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManager.tsx`
  - `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx`
  - `src/SystemFolder/ControlPanels/DriveSetup/ClassicyDriveSetup.tsx`
  - `src/SystemFolder/ControlPanels/ControlStripManager/ClassicyControlStripManager.tsx`
  - `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManager.tsx`
  - `src/SystemFolder/ControlPanels/ScreenSaverManager/ClassicyScreenSaverManager.tsx`
  - `src/SystemFolder/HyperCard/HyperCard.tsx`
  - `src/SystemFolder/HyperCard/HyperCardDialog.tsx`
- Test: `src/SystemFolder/SystemResources/App/ClassicyBundledAppIdentity.test.tsx` (new)

**Depends on:** 3.4

**Interfaces:**
- Consumes the D11/D13/D14 rows:

  | App | About title | Window title | Proxy icon | Notes |
  |---|---|---|---|---|
  | Date and Time | `:200` | `:260` | `:262` | |
  | Appearance | `:459` | `:588` | `:590` | |
  | Drive Setup | `:94` | `:125` | `:127` | |
  | Control Strip | `:121` | `:104` | `:106` | |
  | Sound | `:98` | `:136` | `:138` | |
  | Screen Saver | `:129` | `:112` | `:114` | |
  | HyperCard | `:656` | `:990-994` | | answer dialog `HyperCardDialog.tsx:65` |

  The rule stays that `useClassicyAboutMenu`'s item is titled `"About"` (I11).
- Produces:
  - In each control panel: `const identity = useClassicyAppIdentity(APP_ID, { name: APP_NAME, icon: appIcon });`, then `title={identity.name}`, `icon={identity.icon}` on its `ClassicyWindow`, and `` { ...aboutMenuItem, title: `About ${identity.name}` } ``. Add `identity.name` to that menu memo's deps.
  - `ClassicyApp name={APP_NAME} icon={appIcon}` and every `quitAppHelper`/`quitMenuItemHelper(APP_ID, APP_NAME, appIcon)` stay internal.
  - HyperCard: the same hook. `windowTitle`'s no-stack fallback is `identity.name`, and the About title uses it too.
  - `HyperCardDialog`: `useClassicyAppIdentity(HyperCardAppInfo.id, { name: HyperCardAppInfo.name, icon: "" }).name` for the non-"ask" title.

- [ ] **Step 1: Write the failing tests.** `ClassicyBundledAppIdentity.test.tsx` uses a local fixture package renaming each control panel id plus `HyperCard.app`. For each panel: open it (`ClassicyAppOpen`), assert its window title text is the display name and the proxy `<img>` src is the override icon, then switch to Platinum and assert the originals. For HyperCard: open it with no stack and assert the title. Use `it.each` over `[APP_ID, APP_NAME, Component]`.
- [ ] **Step 2: Run them to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement per Interfaces.**
- [ ] **Step 4: Run the tests, then the parity check.** `pnpm exec vitest run src/SystemFolder/ControlPanels src/SystemFolder/HyperCard src/SystemFolder/SystemResources/App`. Expected: PASS. Re-shoot `system-appearancemanager--*` and `desktop-app--*`. Expected: AE `0`.
- [ ] **Step 5: Lint, type-check, commit.** `git commit -m "feat(apps): control panels and HyperCard title their windows with the display name"`.

**Validation:** `pnpm exec vitest run src/SystemFolder/SystemResources/App/ClassicyBundledAppIdentity.test.tsx`

## Phase 5: Storybook proof

### 5.1: The `renamed` test package, a story, Playwright checks, final parity

**Files:**
- Create:
  - `storybook/.storybook/RenamedPackage.ts`
  - `storybook/.storybook/renamed.ts`
  - `storybook/.storybook/renamed-media-player.svg`
  - `storybook/.storybook/renamed-television.svg`
  - `storybook/.storybook/RenamedPackage.test.ts`
  - `src/SystemFolder/ControlPanels/AppManager/ClassicyAppIdentityPersistence.test.ts`
- Modify: `src/SystemFolder/SystemResources/App/ClassicyApp.stories.tsx`

**Depends on:** 3.1, 3.2, 3.3, 3.4, 4.1

**Interfaces:**
- Consumes the pattern of `MirroredPackage.ts` and `mirrored.ts` (lazy registration; ruling F-R6), `ClassicyDecorators.tsx:28-70` (`parameters.classicy.appearancePackage`), `desktopParameters` (`helpers.tsx:11-15`), the Platinum package's `css` (`getClassicyAppearancePackage("platinum")!.css`) and `sanitizeStateForPersistence` (`ClassicyAppManagerUtils.tsx:172`).
- Produces:
  - **`RenamedPackage.ts`:**
    - Imports `@/Appearance/Platinum` first.
    - Registers `{ id: "renamed", name: "Renamed (Storybook test)", css: platinum.css.replace(/(data-classicy-appearance=)(["']?)platinum\2/g, "$1$2renamed$2"), defaults: { ...getTheme("default"), id: "renamed-default", name: "Renamed", package: "renamed" }, layout: platinum.layout, apps: { "MoviePlayer.app": { name: "Media Player", icon: mediaPlayerIcon, description: "Plays movies and sound." }, "TV.app": { name: "Television", icon: televisionIcon } } }`. The icons are imported SVG URLs.
    - `css` is Platinum's look rescoped, so the story differs from Platinum only in names and icons (decision K-D8).
  - **`renamed.ts`:** `import "./RenamedPackage"`; `export const renamedParameters = { ...desktopParameters, classicy: { ...desktopParameters.classicy, appearancePackage: "renamed" } }`.
  - **Story `RenamedByPackage`** (id `desktop-app--renamed-by-package`):
    - Renders `<StoryApp id="TV.app" name="TV" icon={SB_ICON} showDesktopIcon>` with one window.
    - In an effect, dispatches `ClassicyAppOpen` for `MoviePlayerAppInfo` (focusing Movie Player) and `ClassicyAppFinderOpenFolder { path: "Macintosh HD:Applications" }`.
    - JSDoc: "Under the Storybook-only `renamed` package, Movie Player is 'Media Player' with its own icon (menu bar, App Switcher, Applications) and the host app TV.app is 'Television' on the desktop. Switch the package back in the Appearance control panel and every name and icon returns."
    - If `StoryApp` does not forward `showDesktopIcon`, render `ClassicyApp` directly.
  - **`RenamedPackage.test.ts`:** asserts the package registers with `apps` exactly as above, and that its `css` equals Platinum's with only the scope attribute value changed. Use `sass.compile` as `MirroredPackage.test.ts` does, since `?inline` is `""` under vitest; compare the compiled Platinum body against the regex result.
  - **`ClassicyAppIdentityPersistence.test.ts` (I13):**
    1. Under `test-rename`, mount `<ClassicyDesktop>` with a host `TV.app` (desktop icon, `addSystemMenu`, `bootIcon`) and open MoviePlayer.
    2. Switch to `test-rename`, then run timers.
    3. Expect `JSON.stringify(sanitizeStateForPersistence(useAppManager.getState()))` not to contain `"Media Player"`, `"Television"` or `TEST_RENAMED_ICON`.
    4. Switch back to `platinum` and expect the rendered labels to be "TV" / "Movie Player".

- [ ] **Step 1: Write the failing tests** (`RenamedPackage.test.ts`, `ClassicyAppIdentityPersistence.test.ts`). Run `pnpm exec vitest run storybook/.storybook/RenamedPackage.test.ts src/SystemFolder/ControlPanels/AppManager/ClassicyAppIdentityPersistence.test.ts`. Expected: FAIL (module missing). The persistence test should PASS once the module exists. If it fails, that is a real write of display data: fix the writer, not the test.
- [ ] **Step 2: Implement** `RenamedPackage.ts`, `renamed.ts`, the two SVGs (distinct 32×32 art: a filmstrip and a TV) and the story.
- [ ] **Step 3: Run the tests.** Expected: PASS. Also run `pnpm storybook:typecheck`. Expected: PASS.
- [ ] **Step 4: Shoot and check with Playwright MCP.**
  1. Open `iframe.html?id=desktop-app--renamed-by-package&viewMode=story` at 1024×768, wait for networkidle + 500 ms, and save `.playwright-mcp/parity/part-K/after/desktop-app--renamed-by-package.png`.
  2. With `browser_evaluate`, record each expression's result in `.playwright-mcp/parity/part-K/renamed.txt`:
     - Switcher title: `document.querySelector('[data-classicy-part="switcher"]').textContent.includes("Media Player")`.
     - Switcher icon: `document.querySelector('[data-classicy-part="switcher"] img').src.endsWith("renamed-media-player.svg")` (or the hashed name: match `/renamed-media-player/`).
     - Desktop label: `[...document.querySelectorAll('.classicyDesktopIcon p')].some(p => p.textContent === "Television")`.
     - Applications entry: `[...document.querySelectorAll('.classicyWindow .classicyIcon p, .classicyWindow .classicyIcon span')].some(e => e.textContent === "Media Player")`. Read the exact label selector off `ClassicyFileBrowserViewIcons.tsx:291` / `ClassicyIcon`.
     - No original names: `!document.body.textContent.includes("Movie Player")`.
  3. Then click the Apple menu (`[data-classicy-part="apple"]`) and evaluate `[...document.querySelectorAll('.classicyMenuItem')].some(e => e.textContent.trim() === "About Media Player")`.
  4. Then click the switcher and evaluate that its open list contains "Media Player" and "Television".
  5. Then dispatch, from the iframe through the exposed store (as Part F's checks did): `ClassicyDesktopChangeAppearancePackage { packageId: "platinum" }`. Evaluate that the switcher reads "Movie Player", the desktop label reads "TV", and the Applications window lists "Movie Player".

  A `false` is a broken surface: fix the code, not the expression.
- [ ] **Step 5: Final parity.** Re-shoot every id in `stories.txt` into `after/` and run `for f in before/*.png; do printf '%s ' "$(compare -metric AE "$f" "after/$(basename "$f")" null: 2>&1)"; echo "$f"; done`. Expected: `0` for every story. `desktop-app--renamed-by-package` is new and has no `before/`.
- [ ] **Step 6: Lint, type-check, commit, verify.** `git add storybook/.storybook src && git commit -m "test(storybook): renamed appearance package proves per-app display overrides"`. Then `pnpm build:source` → PASS and `pnpm build:storybook` → PASS. Stop the background dev servers.

**Validation:** `cat .playwright-mcp/parity/part-K/renamed.txt  # every entry true`

## Phase 6: Documentation

### 6.1: AGENT-REFERENCE, CLAUDE.md, BUILDING-APPS **[E]**

**Files:**
- Modify: `docs/AGENT-REFERENCE.md` **[E]**, `CLAUDE.md` **[E]**, `docs/BUILDING-APPS.md`

**Depends on:** 5.1

**Interfaces:**
- Consumes:
  - AGENT-REFERENCE:
    - §3 "ClassicyApp (app container)": `:405`, **[E: same section, shifted]**.
    - §4.10 "Built-in apps": `:1033`, **[E: :1083]**.
    - §8 "Appearance Packages" field table: `:1888-1960`, **[E: :1985…]**.
    - §14 "Rules & Gotchas": `:3333`, shifted on E.
  - CLAUDE.md "Creating Apps" and "Theming".
  - BUILDING-APPS:
    - §2 "App id and app name": `:100-109`.
    - §4 "`ClassicyApp` reference": `:137`.
    - §10 "Icons": `:867`.
    - §11 "Files": `:906-945`.
- Produces:
  - **AGENT-REFERENCE.**
    - §8 table: a new row, `apps`: "`Record<appId, { name?, icon?, description? }>`: display overrides per app; read with `useClassicyAppIdentity` / `resolveClassicyAppIdentity`".
    - A subsection "App display overrides" covering:
      - the declaration example (Movie Player → Media Player);
      - the surface list D1–D17;
      - what never changes (ids, action types, routing, records, persisted state, analytics);
      - the Applications/Extensions keying and collision rule;
      - the `name` validation rules;
      - precedence: the package beats the `ClassicyApp name` prop for display, and the prop stays the internal name;
      - the hooks and store-free resolver, with signatures.
    - §3 `name`/`icon` prop rows reworded (internal vs display).
    - §4.10: "a package may rename any built-in app by id".
    - §14: a gotcha: "never build an action type, path or lookup from a display name; UI text naming an app reads `useClassicyAppIdentity`".
  - **CLAUDE.md.**
    - Theming: one paragraph, "App display overrides (`apps` on a package)", with its constraints. The resolver is store-free, kind-gated on `app_shortcut` for desktop icons, and the derived folders key by display name.
    - Creating Apps: one sentence after the `ClassicyApp` example: "`name` is the internal name; for text that names your app, use `useClassicyAppIdentity(id, { name, icon }).name`".
  - **BUILDING-APPS.**
    - §2 rewritten: "The name is the internal name … A package may display another name; your action types, Finder's OpenFile routing and records keep this one."
    - §4: a row on display overrides.
    - §10: "a package can replace your app's icon by id (`apps[id].icon`), separate from the icon registry".
    - §11: note that `ClassicyApp${name}OpenFile` uses the internal name.

- [ ] **Step 1: Write the docs per Interfaces.** Use American English.
- [ ] **Step 2: Check the docs against the code.** `git grep -n 'useClassicyAppIdentity\|resolveClassicyAppIdentity\|ClassicyAppIdentityOverride' docs CLAUDE.md`: every named export exists in `src/index.ts`.
- [ ] **Step 3: Commit.** `git commit -m "docs(appearance): app display overrides"`.

**Validation:** `grep -c 'apps' docs/AGENT-REFERENCE.md && pnpm lint`

## Acceptance Criteria

- [ ] **Declaration.** `ClassicyAppearancePackage.apps` exists, is validated by `ClassicyAppIdentityOverrideSchema` (with `.describe()`), and refuses bad names, script icons, unknown keys and forbidden ids.
- [ ] **Live switching.** Under a package renaming `MoviePlayer.app` to "Media Player" with another icon, every surface D1–D17 shows the override, live on `ClassicyDesktopChangeAppearancePackage`. Switching back restores the originals. Covered by the vitest suites plus `renamed.txt` all `true`.
- [ ] **Host apps.** A host app (`TV.app`) is renamed and re-iconed the same way, including its desktop icon and balloon title.
- [ ] **Identity untouched.** No action type, record (`apps[id]`, desktop icons, `systemMenu`), routing path or persisted byte changes under an override:
  - `ClassicyAppIdentityPersistence.test.ts` passes;
  - `ClassicyAppIdentity.routing.test.tsx` passes;
  - `git grep 'ClassicyApp\${' src/SystemFolder --include=*.tsx` lists only `ClassicyApp.tsx` and `FinderContext.tsx`.
- [ ] **Drive icons.** They keep their labels under a package that renames `Finder.app`.
- [ ] **Applications and Extensions.** Both list renamed apps by display name and open them by `_creator`. Collisions fall back to the original name with a warning.
- [ ] **Parity.** Platinum is AE 0 for every story in `stories.txt`.
- [ ] **Docs.** AGENT-REFERENCE, CLAUDE.md and BUILDING-APPS document the feature.
- [ ] **Checks.** `pnpm lint`, `pnpm exec tsc --noEmit -p .`, `pnpm test`, `pnpm build:source`, `pnpm build:storybook` and `pnpm storybook:typecheck` all pass.

## Self-Review

| Requirement | Delivered by |
|---|---|
| Ruling 1: any app by id, bundled and host | 1.1, 1.2; host proof in 3.1 Step 1, 3.2 Step 1, 5.1 |
| Ruling 2: name everywhere it is displayed (desktop icon, Applications, app menu/switcher, About/Quit, About box, balloon help, window titles) | 3.1 (D1–D5), 3.3 (D6–D7), 3.2 (D8–D10), 4.1 (D11, D13, D14), 3.4 (D12, D15–D17); Quit: N1, decision K-D6 |
| Ruling 2: ids, action types, routing, saved state keep the original | 2.1, 2.2, 5.1 persistence test |
| Live package switches | 1.2 hook tests; 3.2, 3.3 switch-back cases; 5.1 Step 4 |
| Platinum pixel-identical | Phase 0; parity in 3.1–5.1 |
| Storybook story under a test package; Playwright checks of menu text, desktop label, Applications entry, switcher | 5.1 |
| Docs | 6.1 |
| Work starts after Part E | Phase 0 Step 1; **[E]** tasks 3.4, 6.1 |

**Placeholder scan:** none. One selector in 5.1 Step 4 (the Applications entry label) is read off the icon view's markup at execution time; the asserted text is the contract.

**Residual risk:**
1. **Clean Up depends on the package.** Desktop Clean Up / Arrange by Name now sorts by display names, so a Clean Up under a package orders icons differently from Platinum. Positions are user state and are not re-laid-out on a switch.
2. **Adapter snapshots carry display names.** A snapshot taken while a package is active carries display-named derived entries (as derived entries already appear today). They are `_derived`, so a reload or rebuild replaces them. Adapters that persist remotely see the names change.
3. **`loadApp` behavior change.** It now refreshes `name`/`icon`. A host that changes its `name` prop between releases sees the record follow, which is the same code-derived rule desktop icons already use.
4. **Manifest balloon moves to render time.** The balloon now comes from `getAppManifest` at render, not from the persisted record. Records from older sessions keep their baked balloon until the app mounts once.

## Next Steps

1. Controller: amend 0002-ldj's contract with `ClassicyAppearancePackage.apps` and `ClassicyAppIdentityOverride`, and assign the part letter and plan id.
2. Owner rulings in `plan-app-identity-decisions.md`.
3. A real second package (Windows 3.11) starts from `RenamedPackage.ts` for its `apps` block.
