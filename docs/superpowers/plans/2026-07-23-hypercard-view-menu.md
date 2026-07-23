# HyperCard View Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a **View** menu to HyperCard.app that shows/hides its two utility palettes (Tools ⌘T, Info ⌘I) via checkmark menu items whose state mirrors each window's live `closed` flag.

**Architecture:** Two changes. (1) A reusable `checked?: boolean` field on `ClassicyMenuItem` that renders a Mac OS 8 checkmark in the item's left icon gutter — and, per the HIG, an item never shows both an icon and a checkmark (the checkmark wins). (2) A `View` menu in `HyperCard.tsx` that reads the two palettes' `closed` flags from the store and toggles them with the existing `ClassicyWindowClose` / `ClassicyWindowOpen` events — no new window-reducer events or store state. A final task surveys the repo's existing checkmark literals and reports whether any can adopt the new field.

**Tech Stack:** React + TypeScript, SCSS, Vitest + React Testing Library, Biome.

## Global Constraints

- Test runner: `pnpm test` (`vitest run`); single file: `pnpm test <path>`.
- Lint: **Biome scoped to touched files only** — `pnpm exec biome check --write <paths>` (repo-wide `biome check .` reformats ~70 untouched files; never run it).
- Vitest does **not** type-check. Run `pnpm build:source` (tsc -b) before declaring done to catch type errors.
- The checkmark glyph is the literal `✓` (U+2713), matching `ClassicyPopUpMenu`'s existing `CHECKMARK`.
- An item with `checked` defined (true **or** false) reserves the check gutter and renders **no** icon/image; an item with `checked` omitted behaves exactly as today. This keeps checked/unchecked items in the same menu text-aligned.
- View menu is **always present**, placed **immediately after `Go`**. Its two items are `disabled` (greyed) when not editing; the existing `findMenuItemByShortcut` already skips disabled items, so ⌘T/⌘I are inert outside edit mode.
- Out of scope: the Script editor window (`hypercard_script`, a document window); any new events or store fields.
- The two palettes: `hypercard_tools` (title "Tools", initialSize `[130,0]`, initialPosition `[8,100]`) and `hypercard_inspector` (title "Info", initialSize `[240,0]`, initialPosition `[8,360]`).

---

## File Structure

- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx` — add `checked?: boolean` to `ClassicyMenuItem`; render the checkmark span (suppressing icon/image).
- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss` — `.classicyMenuItemCheck` gutter rule.
- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.test.tsx` — checkmark render + icon-suppression coverage.
- `src/SystemFolder/HyperCard/HyperCard.tsx` — `toolsClosed`/`infoClosed` selectors; the `View` menu; updated `useMemo` deps.
- `src/SystemFolder/HyperCard/HyperCard.editor.test.tsx` — View menu presence, disabled/checked state, toggle dispatches, shortcuts (extend `stateWith`/`menuItem` helpers).

---

## Task 1: Reusable `checked` support in ClassicyMenu

**Files:**
- Modify: `src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx` (interface ~line 31-56; render ~line 285-301)
- Modify: `src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss` (near `.classicyMenuItemNoImage`, line 154)
- Test: `src/SystemFolder/SystemResources/Menu/ClassicyMenu.test.tsx`

**Interfaces:**
- Consumes: existing `ClassicyMenuItem` interface and `ClassicyMenuItemComponent` render (`<p>` with optional `image`/`icon`/`title`).
- Produces: `ClassicyMenuItem.checked?: boolean`. When `checked !== undefined`, the item renders a `<span class="classicyMenuItemCheck">` (containing `✓` when true, empty string when false) and renders **no** `<img>`. When `checked` is undefined, rendering is unchanged.

- [ ] **Step 1: Write the failing tests**

Append these to the `describe("ClassicyMenu", ...)` block in `src/SystemFolder/SystemResources/Menu/ClassicyMenu.test.tsx`:

```tsx
it("renders a checkmark for a checked item", () => {
	const items = [{ id: "tools", title: "Tools", checked: true }];
	const { container } = render(
		<ClassicyMenu name="test-menu" menuItems={items} />,
	);
	const check = container.querySelector(".classicyMenuItemCheck");
	expect(check).not.toBeNull();
	expect(check).toHaveTextContent("✓");
});

it("reserves the check gutter but shows no glyph for a checked:false item", () => {
	const items = [{ id: "info", title: "Info", checked: false }];
	const { container } = render(
		<ClassicyMenu name="test-menu" menuItems={items} />,
	);
	const check = container.querySelector(".classicyMenuItemCheck");
	expect(check).not.toBeNull();
	expect(check?.textContent).toBe("");
});

it("renders no check gutter for an item without a checked prop", () => {
	const items = [{ id: "plain", title: "Plain" }];
	const { container } = render(
		<ClassicyMenu name="test-menu" menuItems={items} />,
	);
	expect(container.querySelector(".classicyMenuItemCheck")).toBeNull();
});

it("never renders both an icon and a checkmark (checkmark wins)", () => {
	const items = [
		{ id: "tools", title: "Tools", checked: true, icon: "tool.png" },
	];
	const { container } = render(
		<ClassicyMenu name="test-menu" menuItems={items} />,
	);
	expect(container.querySelector(".classicyMenuItemCheck")).not.toBeNull();
	expect(container.querySelector("img")).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/SystemFolder/SystemResources/Menu/ClassicyMenu.test.tsx`
Expected: the four new cases FAIL (no `.classicyMenuItemCheck` element is rendered yet). Existing cases PASS.

- [ ] **Step 3: Add the `checked` field to the interface**

In `src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx`, the interface currently has:

```ts
	disabled?: boolean;
	icon?: string;
```

Add the `checked` field immediately after `disabled?: boolean;`:

```ts
	disabled?: boolean;
	/**
	 * When defined, this item is a checkable menu item: it renders a Mac OS 8
	 * checkmark (✓) in the left icon gutter when true, and an empty (but
	 * reserved) gutter when false — keeping checked/unchecked siblings aligned.
	 * A checkable item never also shows an icon/image (the checkmark wins).
	 */
	checked?: boolean;
	icon?: string;
```

- [ ] **Step 4: Render the checkmark (and suppress the icon when checkable)**

In the same file, the render currently is:

```tsx
				className={classNames(
					"classicyMenuItem",
					menuItem.icon ? "" : "classicyMenuItemNoImage",
					menuItem.className,
					menuItem.disabled ? "classicyMenuItemDisabled" : "",
					hasChildren ? "classicyMenuItemChildMenuIndicator" : "",
					isOpen ? "classicyMenuItemOpen" : "",
					isFlashing ? "classicyMenuItemFlash" : "",
				)}
			>
				<p>
					{menuItem.image && <img src={menuItem.image} alt={menuItem.title} />}
					{!menuItem.image && menuItem.icon && (
						<img src={menuItem.icon} alt={menuItem.title} />
					)}
					{menuItem.title && he.decode(menuItem.title)}
				</p>
```

Replace it with (adds the `classicyMenuItemChecked` marker class and a checkmark-first `<p>` that suppresses the icon when the item is checkable):

```tsx
				className={classNames(
					"classicyMenuItem",
					menuItem.icon ? "" : "classicyMenuItemNoImage",
					menuItem.className,
					menuItem.checked ? "classicyMenuItemChecked" : "",
					menuItem.disabled ? "classicyMenuItemDisabled" : "",
					hasChildren ? "classicyMenuItemChildMenuIndicator" : "",
					isOpen ? "classicyMenuItemOpen" : "",
					isFlashing ? "classicyMenuItemFlash" : "",
				)}
			>
				<p>
					{menuItem.checked !== undefined ? (
						<span className={"classicyMenuItemCheck"} aria-hidden={"true"}>
							{menuItem.checked ? "✓" : ""}
						</span>
					) : menuItem.image ? (
						<img src={menuItem.image} alt={menuItem.title} />
					) : menuItem.icon ? (
						<img src={menuItem.icon} alt={menuItem.title} />
					) : null}
					{menuItem.title && he.decode(menuItem.title)}
				</p>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test src/SystemFolder/SystemResources/Menu/ClassicyMenu.test.tsx`
Expected: PASS — all four new cases plus every pre-existing case.

- [ ] **Step 6: Add the checkmark gutter SCSS**

In `src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss`, the empty placeholder is:

```scss
.classicyMenuItemNoImage {
}
```

Add a `.classicyMenuItemCheck` rule immediately after it (the gutter width/margin mirror the item `img` rule so titles stay aligned):

```scss
.classicyMenuItemNoImage {
}

.classicyMenuItemCheck {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  // Reserve the same left gutter an item icon uses, so checked and unchecked
  // items in the same menu keep their titles aligned; the ✓ sits centered in it.
  width: calc(var(--window-control-size) * 1.25);
  margin-right: calc(var(--window-control-size) * 0.5);
  user-select: none;
}
```

- [ ] **Step 7: Lint the touched files**

Run: `pnpm exec biome check --write src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx src/SystemFolder/SystemResources/Menu/ClassicyMenu.test.tsx`
Expected: no errors (Biome may reformat the new JSX — that is fine). SCSS is not covered by Biome.

- [ ] **Step 8: Commit**

```bash
git add src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx \
        src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss \
        src/SystemFolder/SystemResources/Menu/ClassicyMenu.test.tsx
git commit -m "feat(menu): checkable menu items (checked field renders ✓, suppresses icon)"
```

---

## Task 2: HyperCard View menu

**Files:**
- Modify: `src/SystemFolder/HyperCard/HyperCard.tsx` (selectors after line 104; `View` menu after the `go` object ~line 469; `useMemo` deps line 583)
- Test: `src/SystemFolder/HyperCard/HyperCard.editor.test.tsx` (extend `stateWith` and `menuItem` helpers; new tests)

**Interfaces:**
- Consumes: `ClassicyMenuItem.checked` (Task 1); existing `useAppManager` selector hook, `useAppManagerDispatch`, `appId`, `edit`, `editingActive`, and the `appMenu` `useMemo`; the `ClassicyWindowClose` action `{ type, app:{id}, window:{id} }` and `ClassicyWindowOpen` action `{ type, app:{id}, window:{id,size,position,minimumSize,windowType} }`.
- Produces: a top-level menu `{ id: "view", title: "View", menuChildren: [...] }` with items `view_hypercard_tools` (⌘T) and `view_hypercard_inspector` (⌘I), placed right after `go`.

- [ ] **Step 1: Extend the test helpers**

In `src/SystemFolder/HyperCard/HyperCard.editor.test.tsx`, update `stateWith` to accept window records (default empty, so existing callers are unaffected). Change its signature and the `windows` line:

```ts
function stateWith(edit?: HCEditState, windows: unknown[] = []) {
```

and in the returned app object replace:

```ts
								windows: [] as unknown[],
```

with:

```ts
								windows: windows,
```

Then widen the `menuItem` helper so callers can read `checked` / `disabled` / `keyboardShortcut`. Replace the child type in both the return annotation and the `menuChildren` field (two occurrences) so each child is:

```ts
				{
					id: string;
					title?: string;
					disabled?: boolean;
					checked?: boolean;
					keyboardShortcut?: string;
					onClickFunc?: () => void;
				}
```

- [ ] **Step 2: Write the failing tests**

Add these to the `describe("HyperCard editor integration", ...)` block:

```tsx
it("has a View menu placed immediately after Go", () => {
	mockState = stateWith(makeEdit(), [
		{ id: "hypercard_tools", closed: false },
		{ id: "hypercard_inspector", closed: false },
	]);
	render(<HyperCard />);
	const menus = capturedMenus.hypercard_main as { id: string }[];
	const ids = menus.map((m) => m.id);
	expect(ids).toContain("view");
	expect(ids.indexOf("view")).toBe(ids.indexOf("go") + 1);
	expect(menuItem(menus, "view", "view_hypercard_tools")).toBeDefined();
	expect(menuItem(menus, "view", "view_hypercard_inspector")).toBeDefined();
});

it("View items are disabled and unchecked outside edit mode", () => {
	mockState = stateWith();
	render(<HyperCard />);
	const tools = menuItem(capturedMenus.hypercard_main, "view", "view_hypercard_tools");
	expect(tools?.disabled).toBe(true);
	expect(tools?.checked).toBe(false);
});

it("View items are enabled and checked when both palettes are open while editing", () => {
	mockState = stateWith(makeEdit(), [
		{ id: "hypercard_tools", closed: false },
		{ id: "hypercard_inspector", closed: false },
	]);
	render(<HyperCard />);
	const tools = menuItem(capturedMenus.hypercard_main, "view", "view_hypercard_tools");
	expect(tools?.disabled).toBe(false);
	expect(tools?.checked).toBe(true);
	expect(
		menuItem(capturedMenus.hypercard_main, "view", "view_hypercard_inspector")?.checked,
	).toBe(true);
});

it("a closed palette is unchecked in the View menu", () => {
	mockState = stateWith(makeEdit(), [
		{ id: "hypercard_tools", closed: true },
		{ id: "hypercard_inspector", closed: false },
	]);
	render(<HyperCard />);
	expect(
		menuItem(capturedMenus.hypercard_main, "view", "view_hypercard_tools")?.checked,
	).toBe(false);
	expect(
		menuItem(capturedMenus.hypercard_main, "view", "view_hypercard_inspector")?.checked,
	).toBe(true);
});

it("clicking a visible palette's View item dispatches ClassicyWindowClose", () => {
	mockState = stateWith(makeEdit(), [
		{ id: "hypercard_tools", closed: false },
		{ id: "hypercard_inspector", closed: false },
	]);
	render(<HyperCard />);
	menuItem(capturedMenus.hypercard_main, "view", "view_hypercard_tools")?.onClickFunc?.();
	expect(dispatch).toHaveBeenCalledWith({
		type: "ClassicyWindowClose",
		app: { id: "HyperCard.app" },
		window: { id: "hypercard_tools" },
	});
});

it("clicking a hidden palette's View item dispatches ClassicyWindowOpen", () => {
	mockState = stateWith(makeEdit(), [
		{ id: "hypercard_inspector", closed: true },
	]);
	render(<HyperCard />);
	menuItem(capturedMenus.hypercard_main, "view", "view_hypercard_inspector")?.onClickFunc?.();
	expect(dispatch).toHaveBeenCalledWith(
		expect.objectContaining({
			type: "ClassicyWindowOpen",
			app: { id: "HyperCard.app" },
			window: expect.objectContaining({
				id: "hypercard_inspector",
				windowType: "utility",
			}),
		}),
	);
});

it("View items carry the ⌘T / ⌘I keyboard equivalents", () => {
	mockState = stateWith(makeEdit(), [
		{ id: "hypercard_tools", closed: false },
		{ id: "hypercard_inspector", closed: false },
	]);
	render(<HyperCard />);
	expect(
		menuItem(capturedMenus.hypercard_main, "view", "view_hypercard_tools")?.keyboardShortcut,
	).toBe("Cmd+T");
	expect(
		menuItem(capturedMenus.hypercard_main, "view", "view_hypercard_inspector")?.keyboardShortcut,
	).toBe("Cmd+I");
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm test src/SystemFolder/HyperCard/HyperCard.editor.test.tsx`
Expected: the seven new cases FAIL (no `view` menu exists yet). All pre-existing cases still PASS (the `stateWith`/`menuItem` helper changes are backward-compatible).

- [ ] **Step 4: Add the palette `closed` selectors**

In `src/SystemFolder/HyperCard/HyperCard.tsx`, immediately after this line (currently ~line 104):

```tsx
	const editingActive = Boolean(edit) && edit?.tool !== "browse";
```

add:

```tsx
	// The two utility palettes' live visibility. `closed` is the store's single
	// source of truth (their title-bar close boxes flip it), so the View menu's
	// checkmarks stay in sync no matter how a palette was hidden.
	const toolsClosed = useAppManager(
		(s) =>
			s.System.Manager.Applications.apps[appId]?.windows.find(
				(w) => w.id === "hypercard_tools",
			)?.closed ?? false,
	);
	const infoClosed = useAppManager(
		(s) =>
			s.System.Manager.Applications.apps[appId]?.windows.find(
				(w) => w.id === "hypercard_inspector",
			)?.closed ?? false,
	);
```

- [ ] **Step 5: Add the View menu to `appMenu`**

In the `appMenu` `useMemo`, the `go` menu object ends like this (currently ~line 466-469), immediately followed by the edit-only block:

```tsx
					{ id: "go_sep", title: "-" },
					{ id: "go_back", title: "Back", onClickFunc: () => navigate("back") },
				],
			},
			...(activeStackId && edit
```

Insert the `View` menu object between the closed `go` object and the `...(activeStackId && edit` spread:

```tsx
					{ id: "go_sep", title: "-" },
					{ id: "go_back", title: "Back", onClickFunc: () => navigate("back") },
				],
			},
			{
				id: "view",
				title: "View",
				menuChildren: [
					{
						id: "view_hypercard_tools",
						title: "Tools",
						keyboardShortcut: "Cmd+T",
						disabled: !editingActive,
						checked: editingActive && !toolsClosed,
						onClickFunc: () => {
							if (!edit) return;
							dispatch(
								toolsClosed
									? {
											type: "ClassicyWindowOpen",
											app: { id: appId },
											window: {
												id: "hypercard_tools",
												size: [130, 0],
												position: [8, 100],
												minimumSize: [0, 0],
												windowType: "utility",
											},
										}
									: {
											type: "ClassicyWindowClose",
											app: { id: appId },
											window: { id: "hypercard_tools" },
										},
							);
						},
					},
					{
						id: "view_hypercard_inspector",
						title: "Info",
						keyboardShortcut: "Cmd+I",
						disabled: !editingActive,
						checked: editingActive && !infoClosed,
						onClickFunc: () => {
							if (!edit) return;
							dispatch(
								infoClosed
									? {
											type: "ClassicyWindowOpen",
											app: { id: appId },
											window: {
												id: "hypercard_inspector",
												size: [240, 0],
												position: [8, 360],
												minimumSize: [0, 0],
												windowType: "utility",
											},
										}
									: {
											type: "ClassicyWindowClose",
											app: { id: appId },
											window: { id: "hypercard_inspector" },
										},
							);
						},
					},
				],
			},
			...(activeStackId && edit
```

- [ ] **Step 6: Add the new values to the `useMemo` dependency array**

The array currently is (line ~583):

```tsx
		[navigate, openStack, stackEntries, activeStackId, edit, dispatch],
```

Add `editingActive`, `toolsClosed`, `infoClosed` so the menu (and its checkmarks) rebuilds when edit state or a palette's visibility changes — the existing "push live menu when focused" effect then re-syncs the bar:

```tsx
		[
			navigate,
			openStack,
			stackEntries,
			activeStackId,
			edit,
			editingActive,
			toolsClosed,
			infoClosed,
			dispatch,
		],
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm test src/SystemFolder/HyperCard/HyperCard.editor.test.tsx`
Expected: PASS — all seven new cases plus every pre-existing case.

- [ ] **Step 8: Type-check and lint**

Run: `pnpm build:source`
Expected: no TypeScript errors (vitest does not type-check, so this catches the selector/dispatch types).

Run: `pnpm exec biome check --write src/SystemFolder/HyperCard/HyperCard.tsx src/SystemFolder/HyperCard/HyperCard.editor.test.tsx`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/SystemFolder/HyperCard/HyperCard.tsx \
        src/SystemFolder/HyperCard/HyperCard.editor.test.tsx
git commit -m "feat(hypercard): View menu to show/hide the Tools and Info palettes"
```

---

## Task 3: Survey existing checkmark literals for adoption

**Files:**
- Read-only survey across `src/`; report findings. Apply the new `checked` field **only** where the literal already lives on a `ClassicyMenu` item; otherwise report and defer to the user.

**Interfaces:**
- Consumes: the `checked` field from Task 1.
- Produces: a short findings report (in the final turn's message to the user) listing each `✓` literal, whether it is a `ClassicyMenuItem` consumer, and a recommendation.

- [ ] **Step 1: Enumerate checkmark literals**

Run: `grep -rnP "[\x{2713}\x{2714}\x{2705}\x{2611}]" src/ --include=*.ts --include=*.tsx`
Expected hits (as of this plan):
- `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx` — `const CHECKMARK = "✓"` (a select/combobox marking the *selected* option; **not** a `ClassicyMenu` item — renders its own markup).
- `src/SystemFolder/HyperCard/Editor/HyperCardToolsPalette.tsx` — `edit.placing === entry.type ? " ✓" : ""` (a custom palette row label; **not** a menu item).
- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx` — the new `✓` from Task 1 (the canonical source going forward).

- [ ] **Step 2: Classify each hit**

For each non-Task-1 hit, decide:
- Is it rendered by `ClassicyMenu` / passed as a `ClassicyMenuItem`? → If yes, it can migrate to `checked`.
- Otherwise (bespoke component like `ClassicyPopUpMenu`, or a plain label) → it cannot adopt `checked` without a larger refactor of that component; leave it and note it.

Expected conclusion: **neither** existing literal is a `ClassicyMenu` item, so there is no drop-in migration. Note the opportunity to later share a single `✓` constant (e.g. exported from a small module) across `ClassicyMenu` and `ClassicyPopUpMenu`, but do not implement it now (YAGNI — separate change, needs its own decision).

- [ ] **Step 3: Report to the user**

Summarize the classification in the final message: which literals exist, that none are `ClassicyMenu` items, and the recommendation (leave as-is; optional future consolidation of the `✓` constant). No commit unless a genuine `ClassicyMenu`-item consumer was found and migrated — in which case add tests first, then commit:

```bash
git add <migrated files>
git commit -m "refactor(menu): adopt checked field for <component> checkmark"
```

---

## Self-Review

**Spec coverage:**
- R1 (View always present, after Go) → Task 2 Step 5 (placement) + Step 2 test "placed immediately after Go".
- R2 (Tools ⌘T, Info ⌘I checkmark items) → Task 2 Step 5 + Step 2 shortcut test.
- R3 (✓ when visible) → Task 1 (render) + Task 2 `checked: editingActive && !closed` + tests.
- R4 (disabled outside edit; shortcuts inert) → Task 2 `disabled: !editingActive` + "disabled and unchecked outside edit mode" test; inertness guaranteed by existing `findMenuItemByShortcut` skipping disabled items (Global Constraints).
- R5 (toggle hide/show, preserve geometry) → Task 2 Step 5 dispatch branches + "dispatches ClassicyWindowClose/Open" tests.
- R6 (checkmark derived from `closed`) → Task 2 Step 4 selectors + "a closed palette is unchecked" test.
- R7 (no new events/state) → only `ClassicyWindowClose`/`ClassicyWindowOpen` used; no reducer files modified.
- Spec §1 menu-component `checked` + "never icon AND checkmark" (user constraint) → Task 1 Steps 3-4 + "never renders both an icon and a checkmark" test.
- Spec §Testing → Tasks 1 & 2 test steps.
- User follow-up (survey checkmark literals) → Task 3.

**Placeholder scan:** none — every code step shows full code and exact commands.

**Type consistency:** `checked?: boolean` defined in Task 1 is read as `.checked` in Task 2 tests and set in Task 2 Step 5. `toolsClosed`/`infoClosed` (booleans, Task 2 Step 4) are used in `checked`/dispatch branches (Step 5) and deps (Step 6). Window ids `hypercard_tools` / `hypercard_inspector` and app id `HyperCard.app` match `HyperCard.tsx` and the test's `stateWith`. `dispatch` is typed `(action: ActionMessage) => void` where `ActionMessage = Record<string, unknown> & { type: string }`, so the untyped tuple literals in the dispatch payloads need no casts. Keyboard shortcut strings `"Cmd+T"`/`"Cmd+I"` parse via the existing `parseKeyboardShortcut` (recognizes `\bcmd\b`).
