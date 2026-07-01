# System File Protection — Design Spec

**Date:** 2026-07-01
**Status:** Approved

## Problem

`ClassicyFileSystemEntryMetadata` already defines a `_system?: boolean` flag
(`ClassicyFileSystemModel.ts:43`) intended to mark files owned by the system
software, but nothing in the codebase sets or reads it. Double-clicking any
file — including OS-owned entries like `System Folder/Finder` or
`System Folder/System` — routes through the normal file-open logic and either
launches a handler app or shows a generic "cannot open file type" error. There
is no way to prevent a user from attempting to open a system file, and no
feedback that distinguishes "unknown file type" from "this file is
system-owned and off-limits."

## Solution — Guard in the Finder Open-File Reducer

Add a check at the top of the `ClassicyAppFinderOpenFile` case in
`FinderContext.tsx` (line 102), before the legacy QuickTime `_creator` branch
and the type-based app-routing branch:

```ts
case "ClassicyAppFinderOpenFile": {
    const file = hasFinderFile(action) ? action.file : undefined;
    if (file?._system) {
        ds.System.Manager.Desktop.errorDialog = {
            message: "This file is used by the system software. It cannot be opened.",
        };
        break;
    }
    // ...existing QuickTime / type-routing logic, unchanged
```

This check is unconditional: a `_system: true` file is blocked even if a
handler app is registered for its file type. It reuses the existing
`errorDialog` state and rendering path (`ClassicyDesktopManager.tsx:54`,
`ClassicyDesktop.tsx:528+`), the same mechanism already used for the
"Finder cannot open the file type you requested" fallback
(`FinderContext.tsx:158-160`). No new dialog component, no title (matches the
existing error dialog's untitled style).

No schema change is required — `_system` already exists on
`ClassicyFileSystemEntryMetadata`.

## Seed Data

Mark the two OS-owned entries in `DefaultClassicyFileSystem.ts` (inside
`System Folder`, lines 42-50) as `_system: true`:

- `System Folder/Finder`
- `System Folder/System`

This makes the behavior observable out of the box for anyone using the
default filesystem, without requiring consumers to configure the flag
themselves.

## Files Changed

| File | Change |
|---|---|
| `src/SystemFolder/Finder/FinderContext.tsx` | Add `_system` guard as the first check in the `ClassicyAppFinderOpenFile` case |
| `src/SystemFolder/SystemResources/File/DefaultClassicyFileSystem.ts` | Set `_system: true` on `System Folder/Finder` and `System Folder/System` |
| `src/SystemFolder/Finder/ClassicyFinderEventHandler.test.ts` | New test cases (below) |

## Store / API Changes

**Store:** None new — reuses existing `Desktop.errorDialog` state.

**Public API:** None changed. `_system` was already part of the public
`ClassicyFileSystemEntryMetadata` type; this only makes it functional.

## Testing

Extend `ClassicyFinderEventHandler.test.ts` with:

1. **System file blocked** — dispatching `ClassicyAppFinderOpenFile` with a
   file that has `_system: true` sets `Desktop.errorDialog` to
   `{ message: "This file is used by the system software. It cannot be opened." }`
   and does not dispatch any `ClassicyApp*OpenFile` action.
2. **System file blocked even with a registered handler** — same as above,
   but for a file type that has an entry in `fileTypeHandlers` — the block
   still takes priority over routing to that handler.
3. **Non-system regression check** — a normal (non-`_system`) file of a type
   with no registered handler still produces the existing
   "Finder cannot open the file type you requested." message, confirming the
   new guard doesn't change unrelated behavior.

## Out of Scope

- UI affordances for system files (e.g. lock badge icon, disabled rename) —
  covered conceptually by the existing `_readOnly`/`_nameLocked` flags, not by
  this change.
- Marking any entries beyond `System Folder/Finder` and `System Folder/System`
  as `_system` (e.g. `Applications`, `Library`) — left for a future pass if
  needed.
- Desktop-icon double-click handling (`ClassicyDesktopIcon.tsx`) — that path
  launches app shortcuts, not `ClassicyFileSystemEntry` tree nodes, so it's
  unrelated to this guard.
