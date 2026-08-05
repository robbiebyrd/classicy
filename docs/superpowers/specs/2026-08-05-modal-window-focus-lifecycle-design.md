# Modal Window Focus Lifecycle — Destroy on Unmount

**Status:** Approved (design)
**Date:** 2026-08-05
**Issues:** #222 (modal doesn't take focus from its window), #223 (focus doesn't return on close)

## Goal

Give modal windows a complete lifecycle: opening one takes focus from the
window behind it, and dismissing one returns focus to a surviving sibling.

## Background

Both issues are surface symptoms of a single gap in `ClassicyWindow`'s
lifecycle. It is **not** HyperCard-specific.

### Registration happens once; unregistration never happens

`ClassicyWindow` dispatches `ClassicyWindowOpen` exactly once, behind a ref
guard (`ClassicyWindow.tsx:417-433`):

```ts
const windowRegistered = useRef(false);
useEffect(() => {
    if (!windowRegistered.current) {
        windowRegistered.current = true;
        desktopEventDispatch({ type: "ClassicyWindowOpen", window: ws, app: { id: appId } });
    }
}, [appId, ws, desktopEventDispatch]);
```

There is **no cleanup function**. Nothing is dispatched when the component
unmounts.

### The reducer only focuses ids it has not seen

`ClassicyWindowOpen` (`ClassicyDesktopWindowManagerContext.tsx:151-175`)
branches on whether the window id already exists in the app's `windows` array:

```ts
if (window < 0) {
    ds.System.Manager.Applications.apps[action.app.id].windows.push({ ... });
    // A genuinely new window opens focused (Mac behavior); re-registered
    // persisted windows must not steal focus.
    ds = focusWindow(ds, action.app.id, win.id);
} else {
    ds = updateWindow(action.app.id, win.id, { closed: false });
}
```

The `else` branch deliberately does not focus — correct for persisted document
windows re-registering after a reload, wrong for a modal reopening.

### How that produces both bugs

`HyperCardDialog` renders a `ClassicyWindow` with the **constant** id
`"hypercard_dialog"` (`HyperCardDialog.tsx:54`), mounted conditionally on
`runtime.dialog` (`HyperCard.tsx:861-862`). So:

1. **First dialog** — id is new, `focusWindow` runs, the main window correctly
   dims. This is why the bug is not visible immediately.
2. **Dismissal** — `runtime.dialog` clears, `HyperCardDialog` unmounts, and
   nothing is dispatched. The store keeps a record that is still
   `closed: false, focused: true` for a window that no longer exists on screen.
   The main window never regains focus → **#223**.
3. **Second dialog** — the id is now known to the store, so `ClassicyWindowOpen`
   takes the `else` branch and skips `focusWindow`. The HyperCard window keeps
   its focus while the modal is up → **#222**.

### Scope of the gap

No component using `modal={true}` dispatches a close or destroy on unmount:

- `ClassicyAlert`
- `ClassicyFileDialog`
- `ClassicyColorPickerDialog`
- `ClassicyAboutWindow`
- `MoviePlayer`
- `HyperCardDialog`

HyperCard is simply where it is most visible, because its dialog opens
repeatedly within one session.

### `ClassicyWindowDestroy` does not reassign focus

The existing handler (`ClassicyDesktopWindowManagerContext.tsx:221-230`) marks
the window closed and filters it out of the array. It has no focus succession —
unlike `ClassicyWindowClose` (`:195-219`), which promotes the highest-`zOrder`
sibling.

## Requirements

- **R1** — Opening a modal window moves focus to it, on every open, not only
  the first.
- **R2** — Dismissing a modal window returns focus to a surviving window of the
  same app.
- **R3** — Document (non-modal) windows keep their current lifecycle exactly.
  Persisted position, size, `zOrder`, and localStorage session restore must not
  regress.
- **R4** — Destroying a window that did **not** hold focus must not steal focus
  from whatever does.
- **R5** — The fix is implemented once, in `ClassicyWindow` itself, gated on
  the `modal` prop — not special-cased to `HyperCardDialog`. It therefore
  applies uniformly to every `modal={true}` call site, though (see
  "Amendments") not every call site's window is actually present in the
  store to begin with, so the destroy dispatch is a no-op for some of them
  regardless of this fix.

## Design

### 1. Modal-scoped unmount cleanup in `ClassicyWindow`

Add a cleanup effect **guarded on `modal`**:

```ts
useEffect(() => {
    if (!modal) return;
    return () => {
        desktopEventDispatch({
            type: "ClassicyWindowDestroy",
            window: { id },
            app: { id: appId },
        });
    };
}, [modal, id, appId, desktopEventDispatch]);
```

Removing the store record makes the next mount a genuinely new id, so
`ClassicyWindowOpen` takes the `window < 0` branch and calls `focusWindow` —
satisfying **R1** without touching the open handler at all.

**Why `modal`-only (R3).** An unconditional cleanup would also fire when an
ordinary document window unmounts — an app being hidden, a desktop remount, a
route change — wiping geometry that persists to localStorage under
`classicyDesktopState`. Modals are inherently ephemeral: they have no persisted
position, size, or z-order worth keeping, so destroying them is always correct.
Restricting the effect to modals fixes every `modal={true}` call site
(**R5**) uniformly, with zero blast radius on document windows — see
"Amendments" for which of those call sites actually have a store record for
the fix to act on.

The shipped code **does** reset the `windowRegistered` ref in this cleanup —
deliberately, for React StrictMode correctness. StrictMode's dev-mode
double-invoke tears the effect down immediately after first mount, reusing
the *same* component instance (refs survive that phantom cycle, they are not
reinitialized). If the ref were left `true` across that phantom teardown, the
registration effect would see it already `true` on the StrictMode re-run and
would decline to re-dispatch `ClassicyWindowOpen` — so the record the phantom
cleanup just destroyed would never come back, even though the window stays
mounted and visible to the user. Resetting the ref keeps the two effects
symmetric: destroying the record un-registers the instance, so registration
is allowed to fire again, whether the remount is a StrictMode phantom or a
genuine one. See `ClassicyWindow.tsx:442-451` for the shipped comment and
`ClassicyWindow.modal.test.tsx`'s "re-registers after StrictMode's phantom
teardown" test for the regression coverage.

### 2. Focus succession in `ClassicyWindowDestroy`

Extend the handler to restore focus, mirroring the structure already proven in
`ClassicyWindowClose`:

- If the destroyed window was not focused, or its app does not hold global
  focus, change nothing (**R4**).
- Otherwise, after removing the record, pick a successor from the same app and
  focus it.

Reuse the existing helpers in `ClassicyAppHelpers.ts` rather than writing new
selection logic: `focusApp(ds, appId)` already calls `pickWindowToRestore`,
which skips closed and `utility` windows, prefers `lastAccessedWindowId`, then
highest `zOrder`, then the `default` window. That gives **R2** with the same
succession rules users already experience elsewhere, including the
tool-palette exclusion.

Order matters: remove the destroyed window from the array **before** choosing a
successor, so it cannot select itself.

## Data Flow

```
runtime.dialog set
  └─ HyperCardDialog mounts
       └─ ClassicyWindow → ClassicyWindowOpen (id unknown → focusWindow)
            └─ main window ws.focused = false   [#222 fixed]

runtime.dialog cleared
  └─ HyperCardDialog unmounts
       └─ cleanup → ClassicyWindowDestroy
            └─ record removed, focusApp(HyperCard.app)
                 └─ pickWindowToRestore → main window focused  [#223 fixed]
```

## Error Handling

- **App already closed.** `focusApp` returns early for a missing or closed app
  (`ClassicyAppHelpers.ts:78`), so a modal unmounting as part of app teardown
  cannot resurrect focus on a dead app.
- **No surviving window.** `pickWindowToRestore` returns `undefined`; `focusApp`
  then keeps the app focused with no focused window — an existing, tested state.
- **Unknown app/window in the action.** The handler's `hasAppAndWindow`
  predicate already guards this and breaks without mutating.
- **Stacked modals.** Each modal is its own component instance with its own
  cleanup. The inner one destroys first and succession picks the outer modal,
  which is still registered.

## Testing

Reducer (`ClassicyDesktopWindowManagerContext`):

- Destroying a focused window focuses a surviving sibling of the same app.
- Destroying an unfocused window leaves the focused window untouched (**R4**).
- Destroying a window whose app is not the globally focused app does not steal
  focus (**R4**).
- Destroying the last non-utility window leaves the app focused with no focused
  window.
- Utility windows are not chosen as successors.

Component:

- A `modal` `ClassicyWindow` dispatches `ClassicyWindowDestroy` on unmount.
- A non-modal `ClassicyWindow` dispatches nothing on unmount (**R3**).

Integration (HyperCard):

- Across open → dismiss → reopen, the modal holds focus each time it is up and
  the main window holds it each time it is not — covering #222 and #223 in the
  sequence that actually reproduces them.

Because every `modal={true}` call site shares this path, verify in a real
browser before considering the work done — at minimum HyperCard's ask/answer
dialog and one other modal (File Open or the About window).

## Out of Scope

- A first-class modal stack in the store with explicit prior-focus records. It
  is the more architecturally complete model and would make nested-modal focus
  restoration exact rather than heuristic, but it touches the reducer,
  `ClassicyWindow`, and every `modal={true}` call site. Revisit if heuristic
  succession proves insufficient.
- Changing `ClassicyWindowClose` succession.
- Document-window unmount lifecycle.

## Amendments

**2026-08-05, post-implementation review.**

- **MoviePlayer was mislabeled `modal={true}`.** At the time this spec was
  written, `MoviePlayer.tsx` passed `modal={true}` on its document windows —
  resizable, zoomable, draggable, with persisted `initialSize`/
  `initialPosition`, and several rendered at once via `windowEntries.map`.
  That is a document window, not a dialog, and the mislabeling predates this
  spec (a copy-paste error, not something introduced by this design). Once
  the destroy-on-unmount cleanup above shipped, the mislabeling became
  actively harmful: quitting MoviePlayer (or closing a document, which
  unmounts under `ClassicyApp`'s `app.open` gate) started deleting the
  window's store record and losing the user's resized/moved geometry, and
  each movie window also rendered a bogus full-screen input-blocking scrim.
  It has been corrected to `modal={false}`, restoring geometry persistence
  and removing the scrims. This also means the "six `modal={true}`
  components" figure used earlier in this document (R5 and elsewhere)
  included MoviePlayer's bug — with it corrected, five components legitimately
  use `modal={true}`: `ClassicyAboutWindow`, `ClassicyAlert`,
  `ClassicyColorPickerDialog`, `ClassicyFileDialog`, and `HyperCardDialog`.

- **Not every `modal={true}` call site has a store record for this fix to
  act on.** The `windowRegistered` guard note above was updated to describe
  what shipped rather than an unimplemented alternative; this note covers a
  second inaccuracy in the original R5 claim that the fix uniformly applies
  in practice to "all six" components:
  - `ClassicyColorPickerDialog.tsx:94-95` passes `appId={id}`, but its only
    caller (`ClassicyColorPicker.tsx`) supplies `id={`${id}-dialog`}` — a
    different id than any registered app. Both `ClassicyWindowOpen` and
    `ClassicyWindowDestroy` hit the reducer's `!apps[action.app.id]` guard
    and no-op, so this dialog's window is never in the store at all; the
    destroy-on-unmount fix has nothing to destroy (or fail to destroy) for
    it.
  - `ClassicyAlert.tsx:121` defaults `appId = "ClassicyAlert"`, a value with
    no corresponding app in the store, so by default it behaves the same as
    the ColorPicker case above. It only participates in this fix's lifecycle
    when a caller passes a real app id — which the in-repo callers at
    `ClassicyDesktop.tsx:521` and `:545` do (`Finder.app`).
  - This is pre-existing behavior in both components, out of scope for this
    design, and not changed by it.
