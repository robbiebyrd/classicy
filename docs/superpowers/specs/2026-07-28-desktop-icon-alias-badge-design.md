# Desktop Icon Alias Badge

**Date:** 2026-07-28
**Status:** Approved

## Problem

Mac OS 8 marks an alias two ways: a small curved arrow badged over the
bottom-left corner of the icon, and an italic label. `ClassicyDesktopIcon`
renders every icon identically, so an app shortcut on the desktop is
indistinguishable from a disk or a folder.

## Goal

Desktop icons that represent aliases render `assets/img/icons/system/alias.png`
over the bottom-left corner of the icon artwork, with an italic label. System
icons — Trash, drives, folders, plain files — get neither treatment.

## What Makes an Icon an Alias

Alias-ness is derived from the icon's existing `kind` field. No new prop, no new
persisted field, no store migration.

| kind | Alias? |
| --- | --- |
| `app_shortcut` | yes |
| `shortcut` | yes |
| `drive` | no |
| `trash` | no |
| `directory` | no |
| `file` | no |
| `icon` | no |
| anything else | no |

`kind` already persists to localStorage and already drives desktop sort order
(`ClassicyDesktopIconContext.tsx`) and stock balloon copy
(`ClassicyDesktopIconBalloons.ts`), so it is the established discriminator for
per-kind behavior. Every icon `ClassicyApp` registers is an `app_shortcut`,
which is exactly the set that should be badged: the app itself lives in the
Applications folder, and the desktop icon points at it.

The badge and the italic label are gated on the same single condition. They are
never applied independently.

## Components

### `ClassicyDesktopIconKinds.ts` (new)

```ts
const ALIAS_KINDS = new Set(["app_shortcut", "shortcut"]);

export const isAliasKind = (kind: string): boolean =>
    ALIAS_KINDS.has(kind?.toLowerCase());
```

Lowercase-normalized and null-safe, matching how `getKindPriority` and
`defaultBalloonForKind` already handle `kind`. Single purpose, no imports,
testable in isolation.

### `ClassicyIcons.ts`

Add `alias: icon("system/alias.png")` to the `system` namespace. The icon glob
already bundles the file; this gives it a name. Consumers can substitute their
own badge through `registerClassicyIcons`. At 155 bytes the PNG falls under
Vite's 4 KB inline limit and ships as a data URI.

### `ClassicyDesktopIcon.tsx`

Compute `const isAlias = isAliasKind(kind)`.

Wrap the existing mask pair in a `classicyDesktopIconImage` div — the mask is
currently centered with `margin: 0 auto` inside a cell twice its width, so there
is no element to anchor the badge against. The wrapper shrinks to the icon's
box and becomes the positioning context.

Render the badge as a **second mask pair reusing the same class names**, with a
modifier for size and position:

```tsx
<div className={"classicyDesktopIconImage"}>
    <div
        className={"classicyDesktopIconMaskOuter"}
        style={{ "--classicy-icon-mask": `url(${icon})` } as CSSProperties}
    >
        <div className={"classicyDesktopIconMask"}>
            <img src={icon} alt={appName} />
        </div>
    </div>
    {isAlias && (
        <div
            className={"classicyDesktopIconMaskOuter classicyDesktopIconAliasBadge"}
            style={
                { "--classicy-icon-mask": `url(${ClassicyIcons.system.alias})` } as CSSProperties
            }
        >
            <div className={"classicyDesktopIconMask"}>
                <img src={ClassicyIcons.system.alias} alt="" aria-hidden="true" />
            </div>
        </div>
    )}
</div>
```

Sharing `classicyDesktopIconMaskOuter` / `classicyDesktopIconMask` is the load-
bearing decision: every existing state rule already selects those classes, so
the badge inherits selected, open, and selected+open treatment with no new state
CSS and no possibility of the two drifting apart.

The root element also gains `classicyDesktopIconAlias` when `isAlias`, via the
existing `classNames(...)` call, for the label rule.

The badge is decorative (`alt=""`, `aria-hidden="true"`). Icon `kind` is not
announced to assistive technology today, so this removes no information.

### `ClassicyDesktopIcon.scss`

```scss
.classicyDesktopIconImage {
  position: relative;
  width: fit-content;
  margin: 0 auto;
}

.classicyDesktopIconAliasBadge {
  --alias-badge-size: calc(var(--desktop-icon-size) / 4);
  position: absolute;
  bottom: 0;
  left: 0;
  width: var(--alias-badge-size);
  height: var(--alias-badge-size);
  margin: 0;

  .classicyDesktopIconMask {
    width: 100%;
    height: 100%;
    margin: 0;
    mask-size: 100% !important;
  }

  img {
    width: 100%;
    height: 100%;
    margin: 0;
  }
}

.classicyDesktopIconAlias > p {
  font-style: italic;
}
```

The badge modifier must override the fixed `width`/`height` on
`.classicyDesktopIconMaskOuter` and `.classicyDesktopIconMask`, the
`width: var(--desktop-icon-size)` on `.classicyDesktopIcon img`, and
`.classicyDesktopIconMask`'s `mask-size`, which is declared `!important` and so
cannot be beaten by specificity alone.

No state CSS is added. The selected rule already reads
`.classicyDesktopIconActive .classicyDesktopIconMaskOuter img`, and the open and
selected+open rules already read `.classicyDesktopIcon{Open,ActiveAndOpen}
.classicyDesktopIconMaskOuter .classicyDesktopIconMask` — the badge matches all
three by construction, because it *is* a mask pair.

Size and placement are measured from the reference screenshot: a ~15 px badge on
a 64 px icon (≈ 1/4), with its left and bottom edges flush to the icon's box,
overlapping the artwork.

## Visual States

The badge follows the icon through every state, as if it were part of the icon
bitmap:

| State | Icon | Badge |
| --- | --- | --- |
| idle | full color | crisp arrow |
| selected | `brightness(50%)` | `brightness(50%)` |
| open | halftone ghost | halftone ghost |
| selected + open | dimmed ghost | dimmed ghost |

The open state works because `.classicyDesktopIconOpen` inverts a
`backdrop-filter` through the element's own alpha mask and zeroes the opacity of
its children. Since the badge is its own mask pair with
`--classicy-icon-mask: url(alias.png)`, it ghosts to the arrow's silhouette
rather than disappearing.

## Testing

Test-driven, in this order:

1. `ClassicyDesktopIconKinds.test.ts` — `isAliasKind` returns true for
   `app_shortcut` and `shortcut`, false for `drive`, `trash`, `directory`,
   `file`, `icon`, an unknown string, and `undefined`; is case-insensitive.
2. `ClassicyDesktopIcon.test.tsx` — the badge image renders for `app_shortcut`
   and `shortcut`; is absent for `trash`, `drive`, `file`, `directory`, `icon`;
   the root carries `classicyDesktopIconAlias` only for alias kinds. jsdom does
   not evaluate SCSS, so the italic label is asserted through the class, not
   computed style.
3. `ClassicyDesktopIcon.stories.tsx` — an alias variant alongside the existing
   stories, for visual review in Storybook.

Existing `ClassicyDesktopIcon` tests must keep passing unchanged; the new
wrapper div introduces no new roles, labels, or text.

## Out of Scope

- `ClassicyIcon.tsx`, the in-window icon used by Finder and file lists, keeps
  its current appearance.
- File-system entries of type `Shortcut` (`ClassicyFileSystemModel.ts`) are
  unaffected.
- No per-icon opt-out. If one is needed later, an `isAlias?: boolean` prop can
  override the kind-derived default without breaking anything here.
