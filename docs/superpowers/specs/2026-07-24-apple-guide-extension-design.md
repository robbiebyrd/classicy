# Apple Guide Extension — Design

**Date:** 2026-07-24
**Status:** Approved for planning

## Summary

Add a system extension named **Apple Guide** that presents informational help
windows. Its first topic, *About Balloon Help*, opens from the existing Help
menu item and reproduces the Mac OS 8 "About Help" window pixel-for-pixel.

The window is a reusable, paged help-topic viewer rather than a one-off. Topics
are registered through a module-level registry, so consumers can add their own
without forking the extension.

## Motivation

`ClassicyDesktopMenuBar.tsx:178` ships a Help menu whose first item,
"About Balloon Help…", is a deliberate stub (`onClickFunc: () => {}`). Nothing
in the framework currently renders informational help content. Apple Guide was
the real Mac OS help engine, and `assets/img/icons/system/extensions/apple-guide.png`
already exists in the asset set, so the historically accurate name comes with a
matching icon.

## Reference

`1.png` — a 1:1 capture of the Mac OS 8 *About Help* window. Pixel sampling
confirms:

| Property | Measured |
|---|---|
| Capture scale | 1x (2px title-bar stripe period, 2px black frame) |
| Window size | 700 × 322 (x 12–711, y 13–334) |
| Title bar interior | 20px (y 17–36) — matches `--hig-titlebar-height` (`ClassicyWindow.scss:498`) |
| Header band | 42px (y 43–84), `#F3F3F3`, bottom rule `#969696` |
| Content band | white, fills remaining height (y 87–280 here) |
| Footer band | 48px (y 285–332), `#E7E7E7`, full window width |
| Pager group | ~120px wide, right-aligned (x 580–701) |
| Page cell | recessed, `#CDCDCD`, ~32px wide (x 622–653) |
| Arrow hue | `#B3B3D7` — the standard Platinum scroll-arrow lavender |
| Title text | **none** — the title bar carries only the active stripe pattern |
| Title-bar widgets | close box (left); zoom + collapse (right) |
| Header band | bold serif "About Help" on the standard grey |
| Content band | white, serif body copy, bulleted list, `- End -` |
| Footer band | three-cell pager: `◁` / recessed "1" / `▷`, **both arrows disabled** |

Because the topic is a single page, both arrows render disabled and the content
ends with `- End -`. This is the natural output of a real pager at
`pages.length === 1`, not special-cased chrome.

## Architecture

New directory `src/SystemFolder/Extensions/AppleGuide/`:

| File | Purpose |
|---|---|
| `AppleGuide.tsx` | The `ClassicyApp` extension shell; renders one window per open topic |
| `AppleGuideContext.tsx` | Reducer for the `ClassicyAppAppleGuide` prefix + `registerAppEventHandler` call |
| `AppleGuideTopics.tsx` | `HelpTopic` type, topic registry, built-in `about-balloon-help` topic |
| `AppleGuideWindow.tsx` | Generic paged topic window |
| `AppleGuide.scss` | Serif body type, bullet metrics, pager placard |

This mirrors the established `src/SystemFolder/Finder/` layout
(`Finder.tsx` + `FinderContext.tsx` + `FinderAboutThisComputer.tsx`), which is
the closest existing analogue: a menu-triggered informational window backed by
app state.

### Extension shell

```tsx
<ClassicyApp
  id="AppleGuide.app"
  name="Apple Guide"
  icon={ClassicyIcons.system.extensions.appleGuide}
  extension
>
  {openTopics.map((t) => <AppleGuideWindow key={t} topicId={t} />)}
</ClassicyApp>
```

`extension` makes the app headless per `ClassicyApp.tsx:37` — no desktop icon,
no Apple-menu entry, no Applications-folder entry — while still appearing in the
startup parade and in `Macintosh HD:System Folder:Extensions`.

### Mounting

`ClassicyDesktop.tsx` renders `<AppleGuide />` unconditionally, beside
`<Finder />`. There is **no** `disableAppleGuide` prop: the Help menu is a
standard, always-present part of the menu bar, so gating the extension would
leave "About Balloon Help…" as a dead item.

## Data model

```ts
export type HelpTopic = {
  /** Stable id used in events and registry lookups. */
  id: string;
  /** Bold header text shown in the window's header band, e.g. "About Help". */
  title: string;
  /** One entry per page. */
  pages: ReactNode[];
};
```

Pages are `ReactNode` rather than a structured block union or markdown: built-in
topics are small JSX fragments, and consumers get full freedom (images, links,
nested Classicy components) with no schema to extend. Help-specific SCSS classes
carry the serif body and bullet metrics.

### Registry

A module-level `Map<string, HelpTopic>`, following the
`registerClassicyFileSystemAdapter` convention:

```ts
export function registerAppleGuideTopic(topic: HelpTopic): void;
export function getAppleGuideTopic(id: string): HelpTopic | undefined;
```

Re-registering an existing id overwrites it (last-wins) and warns in
development, so consumers may replace a built-in topic. Lookup of an unknown id
returns `undefined`.

The built-in topic registers itself at module load:

```tsx
registerAppleGuideTopic({
  id: "about-balloon-help",
  title: "About Help",
  pages: [
    <>
      <p>The Help menu includes:</p>
      <ul>
        <li>Balloons&mdash;to help you identify items on the screen.</li>
        <li>Help&mdash;to guide you step-by-step through tasks.</li>
      </ul>
    </>,
  ],
});
```

## Window composition

`AppleGuideWindow` composes `ClassicyWindow`. No new window chrome is
introduced.

| Screenshot band | Mechanism |
|---|---|
| Bold "About Help" bar | `header` prop |
| White body | `children` — a flex column, body row `flex: 1` |
| Pager strip | last row of that same flex column |

The footer is **not** the `placard` prop. `placard` is the Platinum status
widget: pinned bottom-left and sized to the scrollbar gutter
(`ClassicyWindow.scss:479-492`). The reference's footer is a full-width band
with a right-aligned control, so it is rendered as the final row inside the
window's children instead — no positioning to fight.

Window props: `title` omitted and `hideIcon` set (the reference has no title
text); `closable`, `zoomable`, `collapsable` enabled; `resizable` and
`scrollable` disabled; `initialPosition` `["center", "center"]`.

`initialSize` starts at `[700, 322]` — the measured outer size of the reference
window — and is tuned during implementation until the rendered window matches
`1.png`.

Each topic gets a stable window id via a shared helper so the reducer and the
window agree:

```ts
export const appleGuideWindowId = (topicId: string) => `apple_guide_${topicId}`;
```

### Pager

Rendered into `placard`: a left triangle, a recessed page-number cell, and a
right triangle. Arrow enablement derives from state — `page > 0` and
`page < pages.length - 1` — so a single-page topic yields two disabled arrows,
matching the reference. Clicking an enabled arrow dispatches a page change.

`- End -` is appended automatically below the body on the last page; topic
authors do not write it.

## Event flow

```
Help menu "About Balloon Help…"
  event: "ClassicyAppAppleGuideShowTopic"
  eventData: { topicId: "about-balloon-help" }
    │
    ▼
classicyDesktopStateEventReducer → pluginEventHandlers (prefix "ClassicyAppAppleGuide")
    │
    ▼
classicyAppleGuideEventHandler
  · appData.openTopics += topicId (deduped)
  · appData.pages[topicId] = 0
  · focusWindow(ds, "AppleGuide.app", appleGuideWindowId(topicId))
    │
    ▼
AppleGuide.tsx renders <AppleGuideWindow topicId=… />
```

Events, all under the `ClassicyAppAppleGuide` prefix:

| Type | Payload | Effect |
|---|---|---|
| `…ShowTopic` | `{ topicId }` | Opens the topic, resets to page 0, focuses its window |
| `…CloseTopic` | `{ topicId }` | Removes the topic from `openTopics` |
| `…SetPage` | `{ topicId, page }` | Sets the current page, clamped to `[0, pages.length - 1]` |

A `ShowTopic` for an unregistered id is a no-op — the reducer leaves state
untouched and warns in development, so a consumer typo cannot open an empty
window.

Registration is a module-level side effect in `AppleGuideContext.tsx`:

```ts
registerAppEventHandler("ClassicyAppAppleGuide", classicyAppleGuideEventHandler);
```

This matches `FinderContext.tsx:219`. Because `registerAppEventHandler` checks
the prefix before the generic `ClassicyApp*` handler
(`ClassicyAppManager.ts:447`), no core reducer code changes.

### Menu-bar change

The only edit outside the new directory (besides mounting) replaces the stub at
`ClassicyDesktopMenuBar.tsx:178`:

```diff
 {
   id: "help-about-balloon",
   title: "About Balloon Help…",
-  onClickFunc: () => {},
+  event: "ClassicyAppAppleGuideShowTopic",
+  eventData: { topicId: "about-balloon-help" },
 },
```

This uses the same `event`/`eventData` menu mechanism as the adjacent
Show/Hide Balloons item and the Apple menu's "About This Computer"
(`ClassicyAppManager.ts:516`).

## State shape

Stored on the app's `data` slot, consistent with `FinderData`:

```ts
export type AppleGuideData = {
  openTopics?: string[];
  pages?: Record<string, number>;
};
```

A type guard `isAppleGuideData` validates the slot before use, mirroring
`isFinderData`.

## Testing

Vitest + React Testing Library, co-located `*.test.tsx` files per repo
convention. Written test-first.

**Reducer** (`AppleGuideContext.test.ts`)
- `ShowTopic` adds the topic and sets page 0
- `ShowTopic` on an already-open topic does not duplicate it and resets the page
- `CloseTopic` removes only the named topic
- `SetPage` clamps below 0 and above `pages.length - 1`
- `ShowTopic` with an unregistered id leaves state unchanged

**Registry** (`AppleGuideTopics.test.tsx`)
- Register then retrieve
- Re-registering an id overwrites the previous topic
- Unknown id returns `undefined`
- The built-in `about-balloon-help` topic is registered on import

**Window** (`AppleGuideWindow.test.tsx`)
- Renders the topic title in the header band
- Renders the current page's body content
- `- End -` appears only on the last page
- One-page topic: both arrows disabled
- Three-page topic: arrows enable/disable correctly at each position, and
  clicking dispatches `SetPage`
- Close dispatches `CloseTopic`

**Menu wiring** (`ClassicyDesktopMenuBar` test)
- Clicking "About Balloon Help…" dispatches `ClassicyAppAppleGuideShowTopic`
  with `{ topicId: "about-balloon-help" }`

**Visual fidelity** — verified manually against `1.png` in the example app
using the `verify` skill, not asserted in unit tests.

## Out of scope

- Apple Guide's real coach-mark / step-by-step guidance engine
- Topic search or a topic index window
- The Help menu's second conceptual item ("Help — to guide you step-by-step"),
  which the reference text describes but which has no implementation here
- Any `disableAppleGuide` opt-out prop

## Files touched

**New:** `src/SystemFolder/Extensions/AppleGuide/` (5 source files + 3 test files)

**Modified:**
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx` — mount `<AppleGuide />`
- `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx` — wire the menu item
- Barrel files — regenerated by `pnpm build:source`, not hand-edited
