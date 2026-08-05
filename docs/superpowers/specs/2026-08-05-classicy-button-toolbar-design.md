# ClassicyButtonToolbar — Grouped Bevel Button Bar

**Status:** Approved (design)
**Date:** 2026-08-05
**Issue:** #170

## Goal

A container that packs `ClassicyBevelButton`s into a Mac OS 8 control bar:
buttons flush against each other with no gaps, arranged into groups separated
by a vertical divider line — the pattern used by Newsgroups' button bar and the
Flight Tracker control bar in `keeping-history/rt911`.

## Background

Both building blocks already exist and need no behavioral changes:

- **`ClassicyBevelButton`** (`SystemResources/BevelButton/`) — HIG bevel widths
  (`small`/`medium`/`large`), four modes (`push`/`toggle`/`radio`/`popup`), an
  `icon` prop, and a `square` prop that "forces a fixed square box for icon-only
  controls, sized to match `ClassicyButton`'s square shape." `square` is
  destructured **without a default** (`ClassicyBevelButton.tsx:95`), so it stays
  `undefined` when unset — which lets a fallback distinguish "not specified"
  from an explicit `false`.
- **`ClassicySeparator`** (`SystemResources/Separator/`) — a 2px engraved
  Platinum divider rendered as a semantic `<hr role="separator">` with
  `aria-orientation`, already supporting `orientation="vertical"`.

The repo convention for container components is children-based composition with
prop-driven configuration; `ClassicyControlGroup` is the reference example.

## Requirements

- **R1** — Buttons render in a horizontal row with **no spacing between
  adjacent buttons** in the same group.
- **R2** — Buttons can be arranged into **groups**, with a vertical divider
  drawn between adjacent groups.
- **R3** — A divider appears **only between** groups: never leading, never
  trailing, and not at all for a single group.
- **R4** — An **icon-only** button in a toolbar defaults to **square**; a
  button with text content defaults to its normal rectangular shape.
- **R5** — Any explicitly passed prop **always wins** over a toolbar-supplied
  default, including `square={false}`.
- **R6** — A `ClassicyBevelButton` used **outside** a toolbar behaves exactly as
  it does today.
- **R7** — A group can hold controls other than bevel buttons (a pop-up menu, a
  spacer, a label) without the toolbar breaking.

## Design

### Components

Two new components in `src/SystemFolder/SystemResources/ButtonToolbar/`:

```tsx
<ClassicyButtonToolbar>
    <ClassicyButtonToolbarGroup>
        <ClassicyBevelButton icon={back} iconAlt="Back" onClickFunc={goBack} />
        <ClassicyBevelButton icon={fwd} iconAlt="Forward" onClickFunc={goFwd} />
    </ClassicyButtonToolbarGroup>
    <ClassicyButtonToolbarGroup>
        <ClassicyBevelButton icon={zoom} iconAlt="Zoom" onClickFunc={zoomIn} />
    </ClassicyButtonToolbarGroup>
</ClassicyButtonToolbar>
```

renders `[◀][▶] │ [⌕]`.

**`ClassicyButtonToolbar`** — a flex row. It maps over its children with
`Children.toArray()` and interleaves a `<ClassicySeparator orientation="vertical" />`
between adjacent entries, so consumers never place dividers by hand (**R2**,
**R3**). Interleaving between rendered children — rather than appending a
divider inside each group — is what makes the leading/trailing cases fall out
for free. It also provides `ClassicyButtonToolbarContext`.

**`ClassicyButtonToolbarGroup`** — a zero-gap flex run (**R1**). It carries no
logic; it is the structural unit the toolbar counts for separator placement.

Composition (rather than a `groups={[[...]]}` data prop) keeps a group open to
arbitrary children (**R7**) and matches how every other Classicy container
works.

### Child defaults via context

`ClassicyButtonToolbar` publishes a context. `ClassicyBevelButton` consumes it
and resolves its own shape:

```ts
const inToolbar = useContext(ClassicyButtonToolbarContext);
const isSquare = square ?? (inToolbar && !!icon && !children);
```

- `square` passed explicitly → used verbatim, including `false` (**R5**).
- Not passed, inside a toolbar, has an `icon` and no text children → square
  (**R4**).
- Not passed, outside a toolbar → `undefined`, which is falsy exactly as today
  (**R6**).

The existing class application at `ClassicyBevelButton.tsx:152` switches from
`square &&` to `isSquare &&`.

**Why context rather than CSS or cloning.** CSS cannot see props, so it cannot
honor an explicit `square={false}` opt-out. `cloneElement` would only reach
direct children and would break the moment a consumer wraps a button in a
`ClassicyBalloonHelp` or a fragment. Context works at any nesting depth and
leaves the override precedence in one readable expression.

Deriving square-ness inside the button — rather than having the toolbar decide —
matters because only the button knows whether it has an icon and whether it has
text children.

### Styling

A co-located `ClassicyButtonToolbar.scss`, per the project's SCSS convention
(no inline styles for layout or presentation):

- `.classicyButtonToolbar` — `display: flex`, row, vertically centered items.
  It deliberately sets no separator spacing itself: the vertical
  `ClassicySeparator` already carries its own horizontal margins and stretch
  behavior (`ClassicySeparator`'s own styles), so groups read as distinct
  without the toolbar duplicating that spacing. See
  `ClassicyButtonToolbar.scss:3-5`.
- `.classicyButtonToolbarGroup` — `display: flex`, `gap: 0` (**R1**).

Existing theme CSS variables carry the colors; the toolbar introduces no new
palette entries.

## Data Flow

```
ClassicyButtonToolbar
  ├─ provides ClassicyButtonToolbarContext = true
  └─ Children.toArray(children)
       └─ interleave <ClassicySeparator orientation="vertical" />
            └─ ClassicyButtonToolbarGroup (flex, gap 0)
                 └─ ClassicyBevelButton
                      └─ useContext → square ?? (inToolbar && !!icon && !children)
```

## Error Handling

There is no runtime failure mode here — no async work, no store interaction, no
user input to validate. The degenerate cases are structural and all resolve to
sensible output:

- **No children** — renders an empty flex row, no separators.
- **One group** — no separator (**R3**).
- **Buttons placed directly in the toolbar**, skipping a group — each direct
  child is treated as a group, so separators appear between individual buttons.
  This is the honest reading of the markup rather than an error; documented in
  the component's TSDoc.
- **A non-button child in a group** (**R7**) — laid out normally; the context
  default only affects components that read it.

## Testing

Co-located `ClassicyButtonToolbar.test.tsx`:

- N groups render N−1 separators; a single group renders none (**R3**).
- An icon-only button inside a toolbar gets the square class (**R4**).
- A button with text children inside a toolbar does **not** get it (**R4**).
- `square={false}` on an icon-only toolbar button suppresses it (**R5**).
- `square` on a button outside a toolbar behaves as before (**R6**).
- A non-button child renders without error (**R7**).

Plus a `ClassicyButtonToolbar.stories.tsx` showcase, matching the pattern of
the other `SystemResources` components: a single group, multiple groups, mixed
icon and text buttons, and a toggle/radio group.

## Out of Scope

- Vertical (column) toolbars.
- Overflow handling for toolbars wider than their container.
- A data-driven `groups` prop.
- Changes to `ClassicyBevelButton` beyond the `isSquare` resolution and its
  class application.
