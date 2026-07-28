# Desktop Icon Alias Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Desktop icons representing aliases render a small arrow badge over the bottom-left corner of the icon artwork and italicize their label; system icons are unchanged.

**Architecture:** Alias-ness is derived from the icon record's existing `kind` field (`app_shortcut` and `shortcut`) by a new one-function module — no new prop, no new persisted field, no store migration. The badge renders as a *second* mask pair reusing the existing `classicyDesktopIconMaskOuter` / `classicyDesktopIconMask` class names, so every current selected/open/selected+open state rule applies to it with zero new state CSS. A new `classicyDesktopIconImage` wrapper gives the absolutely-positioned badge something to anchor to.

**Tech Stack:** React 19 + TypeScript, Zustand store, SCSS modules co-located with components, Vitest + Testing Library (jsdom), Storybook, Biome for lint/format.

## Global Constraints

- Design spec: `docs/superpowers/specs/2026-07-28-desktop-icon-alias-badge-design.md`. Read it before starting.
- Alias kinds are exactly `app_shortcut` and `shortcut`, compared lowercase. Every other kind — `drive`, `trash`, `directory`, `file`, `icon`, unknown strings, `undefined` — is not an alias.
- The badge and the italic label are gated on the same single condition and are never applied independently.
- All styling goes in the co-located SCSS file. No Tailwind, no inline styles for layout or presentation. The only inline style is the existing `--classicy-icon-mask` CSS custom property, which must carry a `url()` value.
- Never hand-edit `index.ts` barrel files. `pnpm build:source` runs `generate-barrels` (barrelsby) first and regenerates them.
- Run `pnpm exec biome check --write <paths>` scoped to the files you touched. Do **not** run repo-wide `pnpm lint:fix` — it reformats ~70 untouched files.
- `pnpm test` does not type-check. Run `pnpm build:source` before the final commit.
- Path aliases: `@/` → `./src/`, `@img/` → `./assets/img/`.
- Existing `ClassicyDesktopIcon` tests must keep passing unchanged.

---

### Task 1: `isAliasKind` predicate

**Files:**
- Create: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconKinds.ts`
- Test: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconKinds.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `isAliasKind(kind: string): boolean` — exported from `@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconKinds`. Task 2 imports it.

- [ ] **Step 1: Write the failing test**

Create `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconKinds.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isAliasKind } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconKinds";

describe("isAliasKind", () => {
	it("treats app shortcuts as aliases", () => {
		expect(isAliasKind("app_shortcut")).toBe(true);
	});

	it("treats plain shortcuts as aliases", () => {
		expect(isAliasKind("shortcut")).toBe(true);
	});

	it.each(["drive", "trash", "directory", "file", "icon"])(
		"does not treat the system kind %s as an alias",
		(kind) => {
			expect(isAliasKind(kind)).toBe(false);
		},
	);

	it("does not treat an unrecognized kind as an alias", () => {
		expect(isAliasKind("widget")).toBe(false);
	});

	it("ignores case, matching how kind is compared elsewhere", () => {
		expect(isAliasKind("App_Shortcut")).toBe(true);
		expect(isAliasKind("SHORTCUT")).toBe(true);
	});

	it("survives a missing kind", () => {
		expect(isAliasKind(undefined as unknown as string)).toBe(false);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconKinds.test.ts`

Expected: FAIL — the module does not exist ("Failed to resolve import ... ClassicyDesktopIconKinds").

- [ ] **Step 3: Write the minimal implementation**

Create `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconKinds.ts`:

```ts
/**
 * Icon kinds that stand in for something stored elsewhere. Mac OS 8 badges
 * these with an arrow and italicizes the label; system kinds (drive, trash,
 * directory, file) get neither treatment.
 */
const ALIAS_KINDS = new Set(["app_shortcut", "shortcut"]);

export const isAliasKind = (kind: string): boolean =>
	ALIAS_KINDS.has(kind?.toLowerCase());
```

Note the `?.` — `kind` is typed as required but arrives from persisted store records that predate this field, exactly as `getKindPriority` in `ClassicyDesktopIconContext.tsx:60` guards it.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconKinds.test.ts`

Expected: PASS — 9 tests (the `it.each` expands to 5).

- [ ] **Step 5: Lint the touched files**

Run: `pnpm exec biome check --write src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconKinds.ts src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconKinds.test.ts`

Expected: "Checked 2 files" with no remaining diagnostics.

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconKinds.ts \
        src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconKinds.test.ts
git commit -m "feat(desktop): derive alias-ness from desktop icon kind"
```

---

### Task 2: Render the badge

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons.ts:253` (add one entry to the `system` namespace)
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.tsx:244-252` (the returned markup) and its import block
- Test: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.test.tsx` (append a new `describe`)

**Interfaces:**
- Consumes: `isAliasKind(kind: string): boolean` from Task 1.
- Produces: DOM contract relied on by Task 3's stylesheet — a `div.classicyDesktopIconImage` wrapping the icon's mask pair, an optional sibling `div.classicyDesktopIconMaskOuter.classicyDesktopIconAliasBadge` containing `div.classicyDesktopIconMask > img`, and the class `classicyDesktopIconAlias` on the component root.

- [ ] **Step 1: Write the failing tests**

Append to `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.test.tsx` (after the existing `ClassicyDesktopIcon contextual menu` describe block):

```tsx
describe("ClassicyDesktopIcon alias badging", () => {
	const badge = (container: HTMLElement) =>
		container.querySelector(".classicyDesktopIconAliasBadge");

	it.each(["app_shortcut", "shortcut"])(
		"badges the %s kind and marks the icon as an alias",
		(kind) => {
			const { container } = render(
				<ClassicyDesktopIcon {...defaultProps} kind={kind} />,
			);
			expect(badge(container)).toBeInTheDocument();
			expect(
				container.querySelector(".classicyDesktopIconAlias"),
			).toBeInTheDocument();
		},
	);

	it.each(["trash", "drive", "directory", "file", "icon"])(
		"leaves the system kind %s unbadged and unitalicized",
		(kind) => {
			const { container } = render(
				<ClassicyDesktopIcon {...defaultProps} kind={kind} />,
			);
			expect(badge(container)).not.toBeInTheDocument();
			expect(
				container.querySelector(".classicyDesktopIconAlias"),
			).not.toBeInTheDocument();
		},
	);

	it("gives the badge its own mask pair so it inherits the icon's state styling", () => {
		const { container } = render(<ClassicyDesktopIcon {...defaultProps} />);
		const badgeEl = badge(container) as HTMLElement;
		expect(badgeEl).toHaveClass("classicyDesktopIconMaskOuter");
		expect(
			badgeEl.querySelector(".classicyDesktopIconMask > img"),
		).toBeInTheDocument();
		expect(badgeEl.style.getPropertyValue("--classicy-icon-mask")).toMatch(
			/^url\(.+\)$/,
		);
	});

	it("hides the badge from assistive technology", () => {
		const { container } = render(<ClassicyDesktopIcon {...defaultProps} />);
		const badgeImg = container.querySelector(
			".classicyDesktopIconAliasBadge img",
		) as HTMLImageElement;
		expect(badgeImg).toHaveAttribute("alt", "");
		expect(badgeImg).toHaveAttribute("aria-hidden", "true");
	});

	it("keeps the icon artwork inside its own wrapper", () => {
		const { container } = render(<ClassicyDesktopIcon {...defaultProps} />);
		const wrapper = container.querySelector(".classicyDesktopIconImage");
		expect(wrapper).toBeInTheDocument();
		expect(
			wrapper?.querySelector(".classicyDesktopIconMask > img"),
		).toBeInTheDocument();
	});
});
```

`defaultProps.kind` is already `"app_shortcut"`, so the last three tests exercise the alias path without passing `kind`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.test.tsx`

Expected: the 8 existing tests PASS; the new ones FAIL — `expect(null).toBeInTheDocument()` because no `.classicyDesktopIconAliasBadge` exists. The five "system kind" cases will pass vacuously; that is fine, they guard against a future regression rather than driving this change.

- [ ] **Step 3: Name the badge asset**

In `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons.ts`, add `alias` as the first entry of the `system` namespace, immediately above `appleBlackOnWhite: icon("system/apple-black-on-white.png"),` (line 253) so the block stays alphabetical:

```ts
		alias: icon("system/alias.png"),
```

The `import.meta.glob` at the top of the file already bundles every PNG under `assets/img/icons/**`; this only gives the file a name and lets consumers swap it via `registerClassicyIcons`.

- [ ] **Step 4: Render the badge**

In `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.tsx`, add two imports alongside the existing ones:

```tsx
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { isAliasKind } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconKinds";
```

Just above the `return (`, add:

```tsx
			const isAlias = isAliasKind(kind);
```

Add the alias class to the existing `classNames(...)` call (line 236-240), as a new final argument:

```tsx
					className={classNames(
						"classicyDesktopIcon",
						dragging ? "classicyDesktopIconDragging" : "",
						getClass(),
						isAlias ? "classicyDesktopIconAlias" : "",
					)}
```

Replace the icon markup (lines 244-251, the `classicyDesktopIconMaskOuter` div through its closing tag) with:

```tsx
					<div className={"classicyDesktopIconImage"}>
						<div
							className={"classicyDesktopIconMaskOuter"}
							style={
								{ "--classicy-icon-mask": `url(${icon})` } as CSSProperties
							}
						>
							<div className={"classicyDesktopIconMask"}>
								<img src={icon} alt={appName} />
							</div>
						</div>
						{isAlias && (
							<div
								className={
									"classicyDesktopIconMaskOuter classicyDesktopIconAliasBadge"
								}
								style={
									{
										"--classicy-icon-mask": `url(${ClassicyIcons.system.alias})`,
									} as CSSProperties
								}
							>
								<div className={"classicyDesktopIconMask"}>
									<img
										src={ClassicyIcons.system.alias}
										alt=""
										aria-hidden="true"
									/>
								</div>
							</div>
						)}
					</div>
```

Leave `<p>{label ? label : appName}</p>` and `{balloon}` as direct children of the root, outside the new wrapper — the label must stay a sibling for the flex column layout and for the `> p` italic rule in Task 3.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.test.tsx`

Expected: PASS, all tests including the 8 pre-existing ones.

- [ ] **Step 6: Run the neighboring suites that render this component**

Run: `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/`

Expected: PASS. `ClassicyDesktopIcon.balloonhelp.test.tsx` in particular renders the same markup; the new wrapper adds no roles, labels, or text, so it must not disturb any query.

- [ ] **Step 7: Lint the touched files**

Run: `pnpm exec biome check --write src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.tsx src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.test.tsx src/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons.ts`

Expected: no remaining diagnostics.

- [ ] **Step 8: Commit**

```bash
git add src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.tsx \
        src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.test.tsx \
        src/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons.ts
git commit -m "feat(desktop): badge alias icons with the alias arrow"
```

---

### Task 3: Style the badge and the italic label

**Files:**
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss` (append after line 118)
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.stories.tsx` (append a story)
- Modify: `CLAUDE.md` (one paragraph under "App Icon Visibility")

**Interfaces:**
- Consumes: the DOM contract produced by Task 2 — `.classicyDesktopIconImage`, `.classicyDesktopIconAliasBadge`, `.classicyDesktopIconAlias`.
- Produces: nothing consumed by later tasks.

There is no unit test for this task — jsdom does not evaluate SCSS. Verification is visual, in Storybook, and it is a required step, not optional.

- [ ] **Step 1: Add the styles**

Append to the end of `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss`:

```scss
.classicyDesktopIconImage {
  position: relative;
  width: fit-content;
  margin: 0 auto;
}

.classicyDesktopIconAliasBadge {
  // Measured off Mac OS 8: roughly a quarter of the icon, flush to the
  // bottom-left of the icon's box and overlapping the artwork.
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

Three overrides are load-bearing and easy to drop by accident:
- `width`/`height` on the badge itself beat `.classicyDesktopIconMaskOuter`'s fixed `calc(var(--desktop-icon-size) + var(--window-border-size))`.
- `mask-size: 100% !important` is needed because `.classicyDesktopIconMask` sets `mask-size` with `!important` (line 53); a plain override would lose regardless of specificity.
- `img { width: 100% }` beats `.classicyDesktopIcon img { width: var(--desktop-icon-size) }` (line 20). Both are specificity `0,1,1`, so this rule wins only by appearing later in the file — keep it at the end.

Add **no** state rules. `.classicyDesktopIconActive .classicyDesktopIconMaskOuter img`, `.classicyDesktopIconOpen .classicyDesktopIconMaskOuter .classicyDesktopIconMask`, and `.classicyDesktopIconActiveAndOpen ...` already match the badge, because the badge *is* a `classicyDesktopIconMaskOuter` containing a `classicyDesktopIconMask` and an `img`. That is the whole point of reusing the class names.

- [ ] **Step 2: Add a Storybook story**

Append to `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.stories.tsx`:

```tsx
const AddAliasIcon = () => {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({
			type: "ClassicyDesktopIconAdd",
			app: { id: "storybook.app", name: "Storybook", icon: SB_ICON },
			kind: "app_shortcut",
		});
	}, [dispatch]);
	return null;
};

export const Alias: Story = {
	render: () => <AddAliasIcon />,
};
```

- [ ] **Step 3: Verify visually**

Run: `pnpm storybook`, then open **Desktop/DesktopIcon/Alias**.

Confirm all four states against `docs/superpowers/specs/2026-07-28-desktop-icon-alias-badge-design.md`:
1. **Idle** — a crisp arrow at the icon's bottom-left corner, about a quarter of the icon's width, overlapping the artwork; label in italics.
2. **Selected** (single-click) — the arrow darkens along with the icon, not just the icon.
3. **Open** (double-click) — the arrow ghosts to a halftone silhouette along with the icon, rather than staying solid black.
4. **Default / WithBalloonHelp stories** — `Default` uses `kind: "app"` and must stay unbadged with an upright label; `WithBalloonHelp` uses `kind: "app_shortcut"` and is expected to gain the badge.

Compare against the reference screenshot the feature was specified from. If the badge is clipped, oversized, or sitting outside the icon, the cause is almost certainly one of the three overrides in Step 1.

- [ ] **Step 4: Document the behavior**

In `CLAUDE.md`, after the "App Icon Visibility" section (immediately before "### Balloon Help"), add:

```markdown
#### Alias Badging

Desktop icons whose `kind` is `app_shortcut` or `shortcut` — every icon
`ClassicyApp` registers — render the Mac OS 8 alias arrow over the icon's
bottom-left corner and italicize their label. System kinds (`drive`, `trash`,
`directory`, `file`, `icon`) get neither. The predicate lives in
`ClassicyDesktopIconKinds.ts`; the badge is a second mask pair reusing
`classicyDesktopIconMaskOuter`/`classicyDesktopIconMask`, so it inherits the
selected and open state styling automatically. Swap the artwork by
registering your own `system.alias` entry via `registerClassicyIcons`.
```

- [ ] **Step 5: Type-check and run the full suite**

Run: `pnpm build:source`

Expected: barrels regenerate (picking up `ClassicyDesktopIconKinds.ts`), `tsc -b` reports no errors, and `vite build` writes `dist/classicy.es.js` and `dist/classicy.umd.js`.

Run: `pnpm test`

Expected: the full suite passes, with the new tests added to the count.

- [ ] **Step 6: Lint the touched files**

Run: `pnpm exec biome check --write src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.stories.tsx CLAUDE.md`

Expected: no remaining diagnostics.

- [ ] **Step 7: Commit**

```bash
git add src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss \
        src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.stories.tsx \
        CLAUDE.md
git commit -m "feat(desktop): style the alias badge and italicize alias labels"
```

Do not commit regenerated `index.ts` barrels unless `git status` shows the new module actually changed one; if it did, include it in this commit.

---

## Out of Scope

Do not touch these; they are deliberately excluded by the spec:
- `src/SystemFolder/SystemResources/Icon/ClassicyIcon.tsx` — the in-window icon used by Finder keeps its current appearance.
- `ClassicyFileSystemModel.ts` `Shortcut` entries.
- Any per-icon opt-out prop. The kind-derived rule is the whole API.
