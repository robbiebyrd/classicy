# ClassicyFileSystem Save Dialog — Design

**Date:** 2026-07-20
**Status:** Approved

## Problem

Apps can open files from the ClassicyFileSystem through
`ClassicyFileOpenDialog` (used by HyperCard's "Open Saved Stack"), but there is
no counterpart for saving. An app needs to hand the dialog everything required
to create the file — contents, type, icon, extension — so the user is
responsible only for choosing a location and typing a name. The extension must
be non-editable and applied automatically.

## Decisions (from brainstorming)

| Question | Decision |
| --- | --- |
| Who writes the file | The dialog itself, via a new write capability on the volume abstraction |
| Name collision | Confirm-replace alert (classic Mac behavior); Cancel is the default button per HIG data-loss rule |
| New Folder button | Included; creates a folder in the target directory via an alert-with-input prompt |
| Output formats | Multiple: a "Format" pop-up; each format carries its own extension, type, icon, and content provider |
| Structure | One `ClassicyFileDialog` component with a `mode: 'open' \| 'save'` discriminated-union prop; thin back-compat wrappers |

## Design

### 1. Public API & component structure

`ClassicyFileOpenDialog.tsx` is refactored into `ClassicyFileDialog.tsx`
(same folder, `src/SystemFolder/SystemResources/FileDialog/`). Props form a
discriminated union on `mode`, so TypeScript rejects save-only props in open
mode and vice versa:

```ts
type ClassicyFileDialogSharedProps = {
    id: string
    appId: string
    open: boolean
    title?: string                      // default "Open" / "Save"
    volumes: ClassicyFileDialogVolume[]
    onCancelFunc?: () => void
}

type ClassicyFileDialogOpenProps = ClassicyFileDialogSharedProps & {
    mode: 'open'
    selectionMode?: 'single' | 'multi'
    fileTypeFilters?: { label: string; types: string[] | null }[]
    onOpenFunc: (selections: ClassicyFileOpenSelection[]) => void
}

export type ClassicyFileSaveFormat = {
    label: string          // shown in the Format pop-up, e.g. "HyperCard Stack"
    extension: string      // ".stack" — non-editable, auto-appended to the name
    fileType: string       // ClassicyFileSystemEntryFileType value for the new entry
    icon?: string          // icon for the created entry (falls back to iconImageByType)
    data: () => string | Promise<string>   // lazy content provider, called on Save
}

type ClassicyFileDialogSaveProps = ClassicyFileDialogSharedProps & {
    mode: 'save'
    formats: ClassicyFileSaveFormat[]      // ≥1; first is the default selection
    defaultFileName?: string               // pre-filled, extension NOT included
    onSaveFunc: (saved: {
        volumeId: string
        path: string[]
        fileName: string                   // includes the extension
        format: ClassicyFileSaveFormat
    }) => void
    onErrorFunc?: (error: unknown) => void
}

export type ClassicyFileDialogProps =
    | ClassicyFileDialogOpenProps
    | ClassicyFileDialogSaveProps
```

**Back-compat:** `ClassicyFileOpenDialog` remains exported as a thin wrapper
(`<ClassicyFileDialog mode="open" {...props} />`) with its current prop type
unchanged, so HyperCard, tests, and stories keep working. A matching
`ClassicyFileSaveDialog` wrapper is added. Barrel files regenerate via
`generate-barrels`.

`data` is a function rather than a string so the app serializes only when the
user actually commits a save, and per-format, since each format may serialize
differently.

### 2. Save-mode behavior & UX

Layout, top to bottom (mirroring open mode): Volume pop-up → folder tree →
name row → footer (Format pop-up on the left; New Folder, Cancel, Save on the
right).

- **Tree:** folders are navigable and selectable; files render disabled —
  visible for context, never selectable (classic Save-dialog dimming). The
  **target folder** is the selected folder node, or the volume root when
  nothing is selected. Double-clicking a folder toggles it open; there is no
  commit-on-activate in save mode.
- **Name row:** a `ClassicyInput` pre-filled with `defaultFileName`; the
  active format's extension renders as static text immediately after the
  input — visually part of the name, physically uneditable. If the user types
  the extension themselves (`myStack.stack`), it is stripped once on commit so
  the file never becomes `myStack.stack.stack`.
- **Format pop-up:** selecting a format swaps the extension suffix live.
  Hidden entirely when only one format is passed. Label position matches open
  mode's "Show" menu.
- **Save button:** the default button; disabled while the trimmed name is
  empty or contains the volume separator (`:`), while a save is in flight, or
  when the active volume lacks the `write` capability. Enter in the name field
  triggers Save; Escape cancels via the modal window (unchanged).
- **Save flow:** commit → check the target folder's listing for a
  `name + extension` collision (loading it via `volume.list` first if the
  folder was selected without ever being expanded) → on collision, a movable caution
  `ClassicyAlert`: “Replace “Name.ext”?” with Cancel (default) / Replace →
  call `format.data()`, await it → `volume.write(...)` → reload the target
  folder listing → `onSaveFunc(...)` → close.
- **New Folder:** opens a `ClassicyAlert` whose message embeds a name input
  ("Name of new folder:"), with Cancel/Create buttons. Creates via
  `volume.mkDir(targetPath, name)`, reloads that folder's listing, and selects
  the new folder. The button is disabled when the active volume lacks `mkDir`.

### 3. Volume write capability & filesystem changes

**`ClassicyFileSystem.writeFile(path, data, metaData?)` gets fixed
semantics.** Today it sets the tree node to a raw string and ignores its
metadata parameter; it has no production callers (tests only), so its
semantics can be corrected. It now creates (or replaces) a proper file entry:

```ts
{ _type, _icon, _data: data, _createdOn, ...metaData }
```

`_type` defaults to `TextFile` when metadata omits it. The
prototype-pollution guard and the create-missing-parent `mkDir` behavior are
preserved. Replacing an existing file creates a fresh entry (new
`_createdOn`). This method is the centralized mutation choke point the
2026-07-20 filesystem-adapter spec calls for; that work inherits it.

**`ClassicyFileDialogVolume` gains optional write capabilities:**

```ts
write?(path: string[], name: string, file: {
    data: string
    fileType: string
    icon?: string
}): Promise<void>
mkDir?(path: string[], name: string): Promise<void>
```

`desktopVolume` and `fileSystemVolume` implement both on top of
`fs.writeFile` / `fs.mkDir`, then persist with
`localStorage.setItem(fs.storageKey, fs.snapshot())` — the SimpleText
precedent, to be centralized later by the adapter work. A save-mode dialog
pointed at a volume without `write` shows the volume but keeps Save and New
Folder disabled (read-only volume).

**Data flow on Save:**

```
name + format + selected folder
  → collision check (volume.list, cached or fetched)
  → [replace alert if needed]
  → format.data()
  → volume.write(path, fileName, { data, fileType, icon })
  → reload target folder listing
  → onSaveFunc → dialog closes
```

### 4. Error handling

- `format.data()` throwing or `volume.write` rejecting → a stop-type
  `ClassicyAlert` ("The document could not be saved.") plus
  `onErrorFunc?.(error)`. The dialog stays open with state intact so the user
  can retry.
- `volume.mkDir` rejecting → stop alert ("The folder could not be created.");
  dialog stays open.
- Folder-listing errors keep the existing retry-row behavior from open mode.

### 5. Testing

Vitest, co-located, matching `ClassicyFileOpenDialog.test.tsx` patterns:

- Discriminated-union rendering per mode (open mode unchanged; save mode
  shows name row/format/New Folder).
- Extension suffix follows the selected format; typed-extension stripping on
  commit.
- Save disabled on empty names, names containing `:`, read-only volumes, and
  while a save is in flight.
- Collision → replace alert → both Cancel and Replace paths.
- New Folder: create, listing reload, new folder selected; disabled without
  `mkDir`.
- Write failure → stop alert, dialog stays open, `onErrorFunc` called.
- `ClassicyFileSystem.writeFile` creates proper entries (type/icon/data/
  createdOn), honors metadata, preserves the prototype-pollution guard.
- Existing open-mode tests run unchanged against the refactored component
  (via the `ClassicyFileOpenDialog` wrapper).
- Storybook: a save-mode story added alongside the existing open story.
