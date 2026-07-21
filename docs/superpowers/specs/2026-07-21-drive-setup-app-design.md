# Drive Setup App — Design

**Date:** 2026-07-21
**Status:** Approved (design phase)

## Overview

Drive Setup is a new `ClassicyApp` that replicates the classic Apple "Drive
Setup" utility. It is the single place in Classicy that lists the top-level
`ClassicyFileSystem` **drive**-type entries, and it exposes three filesystem
operations against them:

1. **Initialize** — reset the *selected* drive back to its default, original
   contents. Shows a caution dialog first (modeled on today's Empty Trash), then
   forces a full app reload.
2. **Sync** — resync the filesystem from the remote server when connected
   (`fs.reconcileWithAdapters()`).
3. **Backup** — force an update/push of the filesystem to the remote
   (`fs.flushNow()`).

Sync and Backup are only enabled when a filesystem sync adapter is registered
("logged in"). There is no real auth in the codebase; "logged in" is defined as
"at least one `ClassicyFileSystemAdapter` is registered."

The same three commands are also reachable by right-clicking a desktop icon of
`kind: "drive"` — a contextual menu with **Initialize…**, **Sync**, and
**Backup** (Sync/Backup disabled when not connected). These menu items dispatch
the same store events the in-window buttons do, so both entry points share one
handler and one caution dialog.

## UI Reference

Matches the classic Drive Setup window (see `drive-setup.png`):

- Title bar: "Drive Setup".
- Bold section header: "List of Drives".
- An inset, scrollable table with columns:
  **Volume Name(s) · Type · Bus · ID · LUN**.
- Rows are click-to-select (single selection, highlighted).
- Action buttons bottom-aligned. `Initialize…` (ellipsis = opens a confirm
  dialog) is disabled until a row is selected.

## Behavior Decisions

These were resolved during brainstorming:

- **Desktop drives unchanged.** The Finder keeps injecting a desktop icon per
  top-level drive (`Finder.tsx:321`). Drive Setup *additionally* lists and
  manages them. Drives remain visible on the desktop.
- **Initialize scope: selected drive only.** Resetting reinitializes just the
  selected top-level drive's subtree back to the resolved default; other drives'
  persisted data is preserved. Desktop preferences (theme, etc., stored under
  `classicyDesktopState`) are untouched.
- **Sync/Backup placement: buttons + Functions menu.** Both a button row in the
  window and mirrored items in a "Functions" menu in the menu bar.
- **Drive-icon context menu.** Desktop icons of `kind: "drive"` get a
  right-click menu (Initialize… / Sync / Backup) that triggers the identical
  operations via store events. Works whether or not the Drive Setup window is
  open.
- **"Logged in" = adapter registered.** Sync uses `reconcile`-capable behavior
  (`fs.reconcileWithAdapters()`); Backup uses `fs.flushNow()`. Both buttons are
  enabled only when `getClassicyFileSystemAdapters().length > 0`.

## Architecture

### New files (`src/SystemFolder/ControlPanels/DriveSetup/`)

- **`ClassicyDriveSetup.tsx`** — the top-level component. Renders **two**
  siblings so the operations survive the window being closed:

  ```tsx
  <>
    <DriveSetupController />        {/* always mounted */}
    <ClassicyApp id="DriveSetup.app" …>{/* window UI, gated by open */}</ClassicyApp>
  </>
  ```

  - App id `DriveSetup.app`, name `"Drive Setup"`, `addSystemMenu` (so it shows
    in the Apple menu and can be opened).
  - Icon: `ClassicyIcons.system.drives.disk` for v1 (a dedicated `resources/app.png`
    can be dropped in later, following the other control panels' convention).
  - Structure mirrors `ClassicyAppearanceManager`: uses `useClassicyAboutMenu`,
    `useClassicyWindowClose`, and the quit helpers from `ClassicyAppUtils`.
  - The window holds the selected-drive **row highlight** in local `useState`;
    clicking a button dispatches a `ClassicyDriveSetup*` event with that drive.

- **`DriveSetupController.tsx`** — always-mounted (not gated by `isAppOpen`), so
  a right-click on a desktop drive icon works even when the window is closed.
  - Owns the `fs` instance (`useClassicyFileSystem()`) and `dispatch`.
  - Watches `System.Manager.Desktop.driveSetupRequest` (see store additions).
    When a new request appears it runs the matching operation and then clears
    the request. `initialize` opens the caution dialog; `sync`/`backup` run
    immediately (guarded by the connected check).
  - Renders the caution `ClassicyAlert` and the success/error feedback alert —
    at this always-mounted level so they appear regardless of window state.

  Both entry points (window buttons and desktop-icon menu) dispatch the same
  three events, so the controller is the single place the operations and dialogs
  live.

- **`DriveSetupList.tsx`** + **`DriveSetupList.scss`** — the drive table.
  - Purpose-built (not `ClassicyFileBrowserViewTable`, which carries file-entry
    semantics). Renders the inset bordered box, the column header row, and one
    selectable row per drive.
  - Props: `drives: DriveRow[]`, `selected: string | null`,
    `onSelect(name: string)`.

- **`ClassicyDriveSetupUtils.ts`** — pure logic (unit-tested):
  - `getDriveRows(fs): DriveRow[]` — derives table rows from
    `fs.filterByType("", "drive")`.
  - `resetDriveInTree(currentTree, driveName, resolvedDefault)` — returns a new
    tree with only `driveName` replaced by its default subtree (deep-copied),
    all other drives preserved. If the drive is absent from the resolved default
    it is reinitialized to a bare drive entry (metadata retained, children
    dropped).
  - `isDriveSyncConnected(): boolean` — `getClassicyFileSystemAdapters().length > 0`.
  - `buildDriveContextMenu(drive, isConnected): ClassicyMenuItem[]` — the shared
    right-click menu, imported by both Drive Setup and Finder. Each item carries
    `event` + `eventData: { drive }` (serializable — required for stored icons):
    Initialize… → `ClassicyDriveSetupInitialize`, Sync → `ClassicyDriveSetupSync`
    (`disabled: !isConnected`), Backup → `ClassicyDriveSetupBackup`
    (`disabled: !isConnected`).

### DriveRow shape

```ts
type DriveRow = {
  name: string;   // volume name (the top-level fs key)
  type: string;   // friendly volume type
  bus: string;    // _bus metadata, else "ATA"
  id: string;     // _scsiId metadata, else the row index
  lun: string;    // _lun metadata, else "0"
};
```

`Bus`/`ID`/`LUN` are SCSI-era fields `ClassicyFileSystem` does not model. They
are read from optional `_bus` / `_scsiId` / `_lun` entry metadata when present,
otherwise synthesized as stable defaults so the display is deterministic.

### Shared refactor (DRY)

Extract the default-tree resolution currently inlined in `useClassicyFileSystem`
(`ClassicyFileSystemContext.tsx`) into an exported helper:

```ts
export function resolveDefaultFileSystem(
  defaultFileSystem: ClassicyFileSystemTree | undefined,
  mode: ClassicyDefaultFileSystemMode,
): ClassicyFileSystemTree
```

`useClassicyFileSystem` calls it, and Drive Setup's `resetDriveInTree` uses the
same resolved default — so "default" means exactly the same thing in both
places (respecting merge vs exclusive mode).

### Store additions + events

Because a stored desktop-icon menu can only *dispatch events* (its items are
serialized to localStorage and cannot hold closures — see the existing TODO in
`ClassicyDesktopIconContext.tsx`), the three commands are modeled as events plus
a small pending-request field the controller observes:

- New store field `System.Manager.Desktop.driveSetupRequest?: { action:
  "initialize" | "sync" | "backup"; drive: string }`, paired with a
  monotonically incremented `driveSetupRequestId: number` so the controller's
  effect re-fires even for a repeated identical request.
- New event-reducer cases (prefix `ClassicyDriveSetup*`, routed via a small new
  handler consistent with the existing prefix-routing table). These are pure
  state writes — **no** side effects (no reload / async) in the reducer:
  - `ClassicyDriveSetupInitialize` → set request `{ action: "initialize", drive }`.
  - `ClassicyDriveSetupSync` → set request `{ action: "sync", drive }`.
  - `ClassicyDriveSetupBackup` → set request `{ action: "backup", drive }`.
  - `ClassicyDriveSetupClearRequest` → clear the field (dispatched by the
    controller once it has handled a request).

All side effects (reload, async reconcile, flush, dialogs) live in the
`DriveSetupController`, never in the reducer.

### Finder change

Where Finder injects drive icons (`Finder.tsx:321`), attach the shared menu:

```ts
contextMenu: buildDriveContextMenu(path, isDriveSyncConnected()),
```

`isDriveSyncConnected()` is evaluated at icon-add time. Adapters register at app
entry before render, so this is stable in practice; a runtime adapter
registration would not retro-update an already-added icon's menu (acceptable
limitation, noted here). Finder's only new coupling is importing one menu-builder
helper — it stays ignorant of the operations' semantics.

### Mounting

Add `<ClassicyDriveSetup />` to `ClassicyControlPanels.tsx`, alongside the other
always-on system managers (Appearance, Sound, Date & Time). Its
`DriveSetupController` is always mounted; the window UI renders only when open.

## Data Flow

Every action starts by dispatching a `ClassicyDriveSetup*` event carrying the
target `drive`:

- **In-window buttons** dispatch with the currently highlighted row's drive.
- **Desktop-icon right-click** dispatches with that icon's drive (via
  `buildDriveContextMenu`).

The reducer records the request; the always-mounted `DriveSetupController`'s
effect picks it up, runs the operation below, then dispatches
`ClassicyDriveSetupClearRequest`.

Note: **Initialize is per-drive** (uses `drive`); **Sync and Backup are
filesystem-wide** (`reconcileWithAdapters` / `flushNow` operate on the whole
tree). The `drive` payload is carried uniformly for all three but ignored by
Sync/Backup — invoking them from a specific drive's menu still syncs/backs up
the entire filesystem.

### Initialize (selected drive)

1. Controller receives an `initialize` request → opens the caution
   `ClassicyAlert` (`alertType="caution"`); message names the drive and warns the
   action erases it and cannot be undone. Buttons: `Cancel` (default) /
   `Initialize`.
2. On confirm:
   - Compute `resolved = resolveDefaultFileSystem(defaultFileSystem, mode)`.
   - `newTree = resetDriveInTree(JSON.parse(fs.snapshot()), driveName, resolved)`
     (`fs.snapshot()` returns the serialized current tree). Any live-derived
     Applications/Extensions folders carried in it are harmless — they rebuild
     from the app store on the forced reload.
   - `fs.load(JSON.stringify(newTree))` — sanctioned mutation path; journals a
     `load` op so any remote adapter is informed.
   - `fs.flushNow()` — persist to localStorage + push `onSnapshot`.
   - `window.location.reload()` — full reload; the constructor reseeds and the
     boot overlays (Applications/Extensions) rebuild.

### Sync

- The Sync button / menu item is disabled unless connected, so a request only
  arrives when an adapter is registered (the controller re-checks defensively).
- `const replaced = await fs.reconcileWithAdapters();`
- If `replaced`, dispatch `{ type: "ClassicyDesktopFileSystemVersionBump" }`
  (same as the boot reconcile path in `ClassicyFileSystemContext`) so the fs
  rebuilds from the adopted tree — no reload needed.
- Show brief success/error feedback via a `ClassicyAlert`.

### Backup

- Disabled unless connected (controller re-checks defensively).
- `fs.flushNow()` — forces persist + delivers `onSnapshot` to adapters.
- Show brief success feedback.

## Error Handling

- Sync failures are caught (`reconcileWithAdapters` already degrades to
  local-wins internally and logs); the app surfaces a non-fatal error alert.
- Initialize operates on an in-memory rebuilt tree validated by `fs.load`'s
  existing parse guard; a full reload follows regardless so no partial state
  lingers.
- Sync/Backup buttons that are disabled (no adapter) cannot be invoked.

## Testing (TDD)

Pure-function unit tests:

- `resetDriveInTree`: selected drive resets to default subtree; other drives'
  data preserved; drive absent from defaults → bare drive entry.
- `resolveDefaultFileSystem`: `merge` mode merges `DefaultFSContent` with the
  override; `exclusive` mode returns the override; `undefined` override →
  `DefaultFSContent`.
- `getDriveRows`: derives rows from `filterByType("", "drive")`; uses metadata
  overrides when present, synthesized defaults otherwise.
- `buildDriveContextMenu`: three items with the right `event`/`eventData`;
  Sync/Backup `disabled` when `isConnected` is false, enabled when true.

Reducer tests:

- `ClassicyDriveSetupInitialize/Sync/Backup` set `driveSetupRequest` with the
  right action + drive and bump `driveSetupRequestId`.
- `ClassicyDriveSetupClearRequest` clears the field.

Component tests (render): list renders one selectable row per drive; selecting a
row enables `Initialize…`; the controller shows the caution alert on an
`initialize` request and the disabled-state of Sync/Backup follows connection.

## Out of Scope (YAGNI)

- Partition / format / filesystem-type options.
- Editing real drive metadata (Bus/ID/LUN) from the UI.
- Multi-select or drag-reorder of drives.
- A dedicated custom app icon (reuse the disk icon for v1).
- A consumer disable flag (mounted always-on like the other system managers;
  can be added to `ClassicyDefaultAppsContext` later if needed).
