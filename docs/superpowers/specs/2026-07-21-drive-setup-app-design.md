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
- **"Logged in" = adapter registered.** Sync uses `reconcile`-capable behavior
  (`fs.reconcileWithAdapters()`); Backup uses `fs.flushNow()`. Both buttons are
  enabled only when `getClassicyFileSystemAdapters().length > 0`.

## Architecture

### New files (`src/SystemFolder/ControlPanels/DriveSetup/`)

- **`ClassicyDriveSetup.tsx`** — the app component.
  - App id `DriveSetup.app`, name `"Drive Setup"`, `addSystemMenu` (so it shows
    in the Apple menu and can be opened).
  - Icon: `ClassicyIcons.system.drives.disk` for v1 (a dedicated `resources/app.png`
    can be dropped in later, following the other control panels' convention).
  - Structure mirrors `ClassicyAppearanceManager`: uses `useClassicyAboutMenu`,
    `useClassicyWindowClose`, and the quit helpers from `ClassicyAppUtils`.
  - Holds the selected-drive state in local `useState` — selection is
    window-local, so no Zustand store field and **no new event-reducer handler**
    are required.
  - Renders the drive list, the button row, the "Functions" app menu, and the
    Initialize caution `ClassicyAlert`.

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

### Mounting

Add `<ClassicyDriveSetup />` to `ClassicyControlPanels.tsx`, alongside the other
always-on system managers (Appearance, Sound, Date & Time).

## Data Flow

### Initialize (selected drive)

1. User selects a drive row → `Initialize…` enables.
2. Click → caution `ClassicyAlert` (`alertType="caution"`), message names the
   drive and warns the action erases it and cannot be undone. Buttons:
   `Cancel` (default) / `Initialize`.
3. On confirm:
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

- Enabled only when an adapter is registered.
- `const replaced = await fs.reconcileWithAdapters();`
- If `replaced`, dispatch `{ type: "ClassicyDesktopFileSystemVersionBump" }`
  (same as the boot reconcile path in `ClassicyFileSystemContext`) so the fs
  rebuilds from the adopted tree — no reload needed.
- Show brief success/error feedback via a `ClassicyAlert`.

### Backup

- Enabled only when an adapter is registered.
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

Unit tests (no reducer, so mostly pure-function tests):

- `resetDriveInTree`: selected drive resets to default subtree; other drives'
  data preserved; drive absent from defaults → bare drive entry.
- `resolveDefaultFileSystem`: `merge` mode merges `DefaultFSContent` with the
  override; `exclusive` mode returns the override; `undefined` override →
  `DefaultFSContent`.
- `getDriveRows`: derives rows from `filterByType("", "drive")`; uses metadata
  overrides when present, synthesized defaults otherwise.
- Sync/Backup enablement: derived from `getClassicyFileSystemAdapters()`.

Component tests (render): list renders one selectable row per drive; selecting a
row enables `Initialize…`; clicking `Initialize…` shows the caution alert.

## Out of Scope (YAGNI)

- Partition / format / filesystem-type options.
- Editing real drive metadata (Bus/ID/LUN) from the UI.
- Multi-select or drag-reorder of drives.
- A dedicated custom app icon (reuse the disk icon for v1).
- A consumer disable flag (mounted always-on like the other system managers;
  can be added to `ClassicyDefaultAppsContext` later if needed).
