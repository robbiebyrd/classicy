# ClassicyPopUpMenu Keyboard Nav, A11y & Unclipped Dropdown — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `ClassicyPopUpMenu` fully keyboard-navigable and accessible, and render its open dropdown in a portal so it is never clipped by a containing `ClassicyWindow` and always stacks on top.

**Architecture:** Keep the existing custom `<button>` + `role="listbox"` structure and the single keydown handler. Use the `aria-activedescendant` pattern (DOM focus stays on the button; the highlighted option is exposed to AT). Fix the cross-browser focus bug with an explicit `focus()` on open. Add native-`<select>`-style type-ahead. Portal the open list into `#classicyDesktop` (mirroring `ClassicyBalloonHelp`), positioned from the button's rect, at z-index 5000, dismissed on scroll/resize/outside-click.

**Tech Stack:** React 18 (function components, hooks), TypeScript, `react-dom` `createPortal`, Vitest + `@testing-library/react` / `user-event`, Biome (lint), SCSS.

## Global Constraints

- Package manager is **pnpm**. Run tests with `pnpm test <file>` (alias for `vitest run <file>`); a single test with `-t "<name>"`.
- **Lint scoped to touched paths only:** `pnpm exec biome check src/SystemFolder/SystemResources/PopUpMenu/`. Never run `biome check .` — it reformats ~70 untouched files.
- Test helpers come from `@/__tests__/test-utils` (re-exports all of `@testing-library/react` plus `userEvent`): `render, screen, within, fireEvent, act, userEvent`.
- Portal target is always `document.getElementById("classicyDesktop") ?? document.body` (the `?? document.body` fallback covers tests/Storybook where the desktop isn't mounted).
- Do **not** change the public props (`onChangeFunc`/`selected`/`placeholder`/`options`/`size`/etc.) or the visual appearance. SCSS edits are limited to portal-positioning of `.classicyPopUpMenuList`.
- All existing tests in `ClassicyPopUpMenu.test.tsx` must stay green.
- jsdom has no layout: `getBoundingClientRect()` returns a zero-valued `DOMRect` (non-null). Tests assert DOM location and dismissal behavior, not pixel coordinates.

**Component under change:** `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx`
**Test file:** `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx`
**Styles:** `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss`

Reference for the portal pattern: `src/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.tsx` (uses `createPortal`, `getBoundingClientRect`, `position: fixed`).

---

### Task 1: Focus the trigger button on open (cross-browser arrow-key fix)

Firefox/Safari don't focus a `<button>` on mouse click, so after a mouse-open the keydown handler never runs. Explicitly focus the button in `openMenu()`.

**Files:**
- Modify: `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx` (`openMenu`, lines 119-123)
- Test: `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx`

**Interfaces:**
- Consumes: existing `buttonRef` (`useRef<HTMLButtonElement>`), `openMenu` useCallback, `disabled`, `currentIndex`.
- Produces: `openMenu()` now focuses `buttonRef.current` as a side effect. No signature change.

> **Testing note (read before Step 1):** This specific quirk (button not focused on click) exists only in real Firefox/Safari; **jsdom focuses buttons on click just like Chromium**, and `user-event` calls `focus()` during `click()`. So a unit test cannot reproduce the bug as a fail-first. The test below is a **contract guard** — it may already pass before the change. The real cross-browser fix is verified in Task 6 (in-browser). Add the guard anyway to lock the contract, and in Step 2 expect PASS (documented exception to fail-first).

- [ ] **Step 1: Write the contract-guard test**

Add to `ClassicyPopUpMenu.test.tsx` (inside the existing `describe`):

```tsx
it("keeps DOM focus on the trigger button after opening (so keys reach the handler)", async () => {
	const user = userEvent.setup();
	render(<ClassicyPopUpMenu id="fruit" options={options} selected="apple" />);
	const btn = screen.getByRole("button");
	await user.click(btn); // open via mouse
	expect(screen.getByRole("listbox")).toBeInTheDocument();
	expect(btn).toHaveFocus();
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm test src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx -t "keeps DOM focus"`
Expected: PASS (see Testing note — jsdom already focuses on click; this guard locks the contract the real-browser fix depends on).

- [ ] **Step 3: Add the explicit focus() to `openMenu`**

Replace the `openMenu` callback (currently lines 119-123):

```tsx
	const openMenu = useCallback(() => {
		if (disabled) return;
		setHighlight(currentIndex >= 0 ? currentIndex : 0);
		setOpen(true);
		// Firefox/Safari don't focus a <button> on click (only Chromium does),
		// so without this the keydown handler never runs after a mouse-open.
		buttonRef.current?.focus();
	}, [disabled, currentIndex]);
```

- [ ] **Step 4: Run the full file to confirm nothing regressed**

Run: `pnpm test src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx`
Expected: PASS (all existing tests + the new guard).

- [ ] **Step 5: Lint + commit**

```bash
pnpm exec biome check src/SystemFolder/SystemResources/PopUpMenu/
git add src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx
git commit -m "fix(popupmenu): focus trigger on open so arrow keys work in Firefox/Safari"
```

---

### Task 2: ARIA wiring — `aria-controls` + `aria-activedescendant`

Expose the highlighted option to assistive tech while focus stays on the button.

**Files:**
- Modify: `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx` (add `listId`; `<button>` attrs lines 230-247; `<div role="listbox">` line 250)
- Test: `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx`

**Interfaces:**
- Consumes: existing `reactId` (`useId()`), `optionId(index)`, `open`, `highlight`, `label`, `currentLabel`.
- Produces: `const listId = \`${reactId}-list\`;` — the listbox id; used again in Task 4's portal.

- [ ] **Step 1: Write the failing test**

```tsx
it("wires aria-controls and aria-activedescendant to the highlighted option", async () => {
	const user = userEvent.setup();
	render(<ClassicyPopUpMenu id="fruit" options={options} selected="apple" />);
	const btn = screen.getByRole("button");
	await user.click(btn);
	const listbox = screen.getByRole("listbox");
	expect(listbox.id).toBeTruthy();
	expect(btn).toHaveAttribute("aria-controls", listbox.id);
	// highlight starts on the current selection (Apple, index 0)
	const apple = within(listbox).getByRole("option", { name: "Apple" });
	expect(btn).toHaveAttribute("aria-activedescendant", apple.id);
	await user.keyboard("{ArrowDown}"); // -> Banana
	const banana = within(listbox).getByRole("option", { name: "Banana" });
	expect(btn).toHaveAttribute("aria-activedescendant", banana.id);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx -t "wires aria-controls"`
Expected: FAIL — button has no `aria-controls`/`aria-activedescendant`; listbox has no `id`.

- [ ] **Step 3: Add the `listId` and wire the attributes**

Immediately after the existing `const optionId = (index: number) => ...;` line (line 87), add:

```tsx
	const listId = `${reactId}-list`;
```

On the `<button>` (after the existing `aria-expanded={open}` attribute, line 241), add:

```tsx
					aria-controls={open ? listId : undefined}
					aria-activedescendant={
						open && highlight >= 0 ? optionId(highlight) : undefined
					}
```

On the `<div role="listbox" ...>` (line 250), add `id` and an accessible name:

```tsx
					<div
						id={listId}
						role="listbox"
						aria-label={label ?? currentLabel}
						className="classicyPopUpMenuList"
					>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx -t "wires aria-controls"`
Expected: PASS.

- [ ] **Step 5: Run full file, lint, commit**

```bash
pnpm test src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx
pnpm exec biome check src/SystemFolder/SystemResources/PopUpMenu/
git add src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx
git commit -m "feat(popupmenu): expose highlighted option via aria-activedescendant/aria-controls"
```

---

### Task 3: Type-ahead (jump to option by typed characters)

Mirror native `<select>`: typing accumulates a buffer (reset after 250ms); the highlight jumps to the first option whose label matches. Typing while closed opens the menu first (never a silent value change); commit stays an explicit Enter/click.

**Files:**
- Modify: `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx` (add refs + `handleTypeahead`; add a `default` branch to `onButtonKeyDown`, lines 150-198; add cleanup effect)
- Test: `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx`

**Interfaces:**
- Consumes: `options`, `open`, `openMenu`, `setHighlight`.
- Produces: `handleTypeahead(char: string): boolean` (returns whether a match was found, so the caller can `preventDefault` only on a match).

- [ ] **Step 1: Write the failing tests**

```tsx
it("type-ahead while open moves the highlight to the matching option", async () => {
	const user = userEvent.setup();
	const onChangeFunc = vi.fn();
	render(
		<ClassicyPopUpMenu id="fruit" options={options} selected="apple" onChangeFunc={onChangeFunc} />,
	);
	await user.click(screen.getByRole("button"));
	await user.keyboard("b"); // -> Banana
	const listbox = screen.getByRole("listbox");
	const banana = within(listbox).getByRole("option", { name: "Banana" });
	expect(screen.getByRole("button")).toHaveAttribute("aria-activedescendant", banana.id);
	await user.keyboard("{Enter}");
	expect(onChangeFunc.mock.calls[0][0].target.value).toBe("banana");
});

it("type-ahead while closed opens the menu and highlights the match (no silent change)", async () => {
	const user = userEvent.setup();
	const onChangeFunc = vi.fn();
	render(
		<ClassicyPopUpMenu id="fruit" options={options} selected="apple" onChangeFunc={onChangeFunc} />,
	);
	screen.getByRole("button").focus();
	await user.keyboard("c"); // opens, highlights Cherry
	const listbox = screen.getByRole("listbox");
	expect(listbox).toBeInTheDocument();
	const cherry = within(listbox).getByRole("option", { name: "Cherry" });
	expect(screen.getByRole("button")).toHaveAttribute("aria-activedescendant", cherry.id);
	expect(onChangeFunc).not.toHaveBeenCalled(); // typing did not commit
	await user.keyboard("{Enter}");
	expect(onChangeFunc.mock.calls[0][0].target.value).toBe("cherry");
});

it("type-ahead buffers characters typed within the reset window", async () => {
	const user = userEvent.setup();
	const local = [
		{ value: "apple", label: "Apple" },
		{ value: "apricot", label: "Apricot" },
		{ value: "banana", label: "Banana" },
	];
	render(<ClassicyPopUpMenu id="fruit" options={local} selected="banana" />);
	await user.click(screen.getByRole("button"));
	await user.keyboard("apr"); // buffer "apr" -> Apricot, not first-"a" Apple
	const listbox = screen.getByRole("listbox");
	const apricot = within(listbox).getByRole("option", { name: "Apricot" });
	expect(screen.getByRole("button")).toHaveAttribute("aria-activedescendant", apricot.id);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx -t "type-ahead"`
Expected: FAIL — typing does nothing; no `aria-activedescendant` change / menu stays closed.

- [ ] **Step 3: Add the type-ahead refs, helper, cleanup, and keydown branch**

Add refs near the other refs (after `const buttonRef = useRef<HTMLButtonElement>(null);`, line 76):

```tsx
	const typeaheadBufferRef = useRef("");
	const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

Add the helper (after `openMenu`, around line 123). Returns whether a match was found:

```tsx
	// Native-<select>-style type-ahead: accumulate typed chars (reset after
	// 250ms idle) and jump the highlight to the first matching option label.
	const handleTypeahead = useCallback(
		(char: string): boolean => {
			if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
			typeaheadBufferRef.current += char;
			typeaheadTimerRef.current = setTimeout(() => {
				typeaheadBufferRef.current = "";
			}, 250);

			const buffer = typeaheadBufferRef.current.toLowerCase();
			let index = options.findIndex((o) =>
				o.label.toLowerCase().startsWith(buffer),
			);
			// If the accumulated buffer no longer matches, fall back to the
			// latest char alone (re-locates the first option with that initial).
			if (index < 0) {
				const last = char.toLowerCase();
				index = options.findIndex((o) =>
					o.label.toLowerCase().startsWith(last),
				);
			}
			if (index < 0) return false;

			if (!open) openMenu(); // typing surfaces the menu; never a silent change
			setHighlight(index);
			return true;
		},
		[options, open, openMenu],
	);
```

Add a cleanup effect (after the outside-pointer-down effect, around line 148) so the timer never leaks:

```tsx
	useEffect(
		() => () => {
			if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
		},
		[],
	);
```

Add a `default` branch at the end of the `switch (e.key)` in `onButtonKeyDown` (after the `case "End":` block, before the closing `}` of the switch, line 196):

```tsx
			default: {
				// Single printable char (not Space, not a modifier combo) -> type-ahead.
				const isPrintable =
					e.key.length === 1 &&
					e.key !== " " &&
					!e.altKey &&
					!e.ctrlKey &&
					!e.metaKey;
				if (isPrintable && handleTypeahead(e.key)) {
					e.preventDefault();
				}
				break;
			}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx -t "type-ahead"`
Expected: PASS (all three).

- [ ] **Step 5: Run full file, lint, commit**

```bash
pnpm test src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx
pnpm exec biome check src/SystemFolder/SystemResources/PopUpMenu/
git add src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx
git commit -m "feat(popupmenu): native-select-style type-ahead (250ms buffer)"
```

---

### Task 4: Portal the dropdown so it is unclipped and on top

Render the open list through `createPortal` into `#classicyDesktop`, positioned from the button's rect (`position: fixed`), at z-index 5000. Fix the outside-click check so clicks on the now-portaled options don't close the menu before they commit.

**Files:**
- Modify: `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx` (imports; add `menuRect` state + `listRef`; update `openMenu`, `closeMenu`, outside-click effect; wrap the listbox in `createPortal`)
- Modify: `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss` (`.classicyPopUpMenuList`, lines 125-146)
- Test: `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx`

**Interfaces:**
- Consumes: `buttonRef`, `wrapperRef`, `listId` (Task 2), the existing listbox JSX.
- Produces: `listRef` (`useRef<HTMLDivElement>`) on the portaled list; `menuRect` state (`DOMRect | null`) captured on open.

- [ ] **Step 1: Write the failing tests**

```tsx
it("renders the open list outside a clipping ancestor (portaled to the body)", async () => {
	const user = userEvent.setup();
	render(
		<div style={{ overflow: "hidden" }} data-testid="clip">
			<ClassicyPopUpMenu id="fruit" options={options} selected="apple" />
		</div>,
	);
	await user.click(screen.getByRole("button"));
	const listbox = screen.getByRole("listbox");
	// Portaled: present in the document but NOT nested in the clipping wrapper.
	expect(document.body).toContainElement(listbox);
	expect(screen.getByTestId("clip")).not.toContainElement(listbox);
});

it("commits an option click even when portaled out of a clipping wrapper", async () => {
	const user = userEvent.setup();
	const onChangeFunc = vi.fn();
	render(
		<div style={{ overflow: "hidden" }}>
			<ClassicyPopUpMenu id="fruit" options={options} selected="apple" onChangeFunc={onChangeFunc} />
		</div>,
	);
	await user.click(screen.getByRole("button"));
	await user.click(screen.getByRole("option", { name: "Cherry" }));
	expect(onChangeFunc.mock.calls[0][0].target.value).toBe("cherry");
	expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx -t "portaled"`
and `... -t "commits an option click even when portaled"`
Expected: FAIL — first because the list is still nested in the clipping wrapper; the second may pass today but MUST stay green after portaling (it guards the outside-click fix).

- [ ] **Step 3: Add the `createPortal` import**

The inline `style` object below is a plain literal, so no extra type import is needed. Add `createPortal` after the existing `react` import block (after line 18):

```tsx
import { createPortal } from "react-dom";
```

- [ ] **Step 4: Add `menuRect` state and `listRef`**

After `const [highlight, setHighlight] = useState<number>(-1);` (line 73) add:

```tsx
	const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
```

After `const buttonRef = useRef<HTMLButtonElement>(null);` (line 76) add:

```tsx
	const listRef = useRef<HTMLDivElement>(null);
```

- [ ] **Step 5: Capture the rect on open; clear it on close**

Update `openMenu` (from Task 1) to capture the button rect before opening:

```tsx
	const openMenu = useCallback(() => {
		if (disabled) return;
		setHighlight(currentIndex >= 0 ? currentIndex : 0);
		if (buttonRef.current) {
			setMenuRect(buttonRef.current.getBoundingClientRect());
		}
		setOpen(true);
		buttonRef.current?.focus();
	}, [disabled, currentIndex]);
```

Update `closeMenu` (lines 114-117) to clear the rect:

```tsx
	const closeMenu = useCallback(() => {
		setOpen(false);
		setHighlight(-1);
		setMenuRect(null);
	}, []);
```

- [ ] **Step 6: Teach the outside-click handler about the portaled list**

In the outside-pointer-down effect (lines 139-148), the list is no longer inside `wrapperRef`. Treat a click as inside when it is in the wrapper **or** the list:

```tsx
	useEffect(() => {
		if (!open) return;
		const onPointerDown = (e: globalThis.MouseEvent) => {
			const target = e.target as Node;
			if (
				!wrapperRef.current?.contains(target) &&
				!listRef.current?.contains(target)
			) {
				closeMenu();
			}
		};
		document.addEventListener("mousedown", onPointerDown);
		return () => document.removeEventListener("mousedown", onPointerDown);
	}, [open, closeMenu]);
```

- [ ] **Step 7: Wrap the listbox in `createPortal` with positioning**

Replace the entire `{open && ( <div role="listbox" ...> ... </div> )}` block (lines 249-290) with the portaled version. Keep the inner `options.map(...)` body **exactly as-is**; only the wrapping `<div>` and the render call change:

```tsx
				{open &&
					menuRect &&
					createPortal(
						<div
							ref={listRef}
							id={listId}
							role="listbox"
							aria-label={label ?? currentLabel}
							className="classicyPopUpMenuList"
							style={{
								position: "fixed",
								top: `${menuRect.top}px`,
								left: `${menuRect.left}px`,
								minWidth: `${menuRect.width}px`,
								zIndex: 5000,
							}}
						>
							{options.map((o, index) => {
								const isSelected = o.value === selectedItem;
								return (
									<div
										key={id + o.value}
										id={optionId(index)}
										role="option"
										tabIndex={-1}
										aria-selected={isSelected}
										className={classNames(
											"classicyPopUpMenuListItem",
											index === highlight && "classicyPopUpMenuListItemHighlight",
										)}
										onMouseEnter={() => setHighlight(index)}
										onClick={() => commitIndex(index)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												commitIndex(index);
											}
										}}
									>
										<span className="classicyPopUpMenuCheck" aria-hidden={true}>
											{isSelected ? CHECKMARK : ""}
										</span>
										{o.icon && (
											<img
												className="classicyPopUpMenuListItemIcon"
												src={o.icon}
												alt=""
											/>
										)}
										<span className="classicyPopUpMenuListItemLabel">
											{o.label}
										</span>
									</div>
								);
							})}
						</div>,
						document.getElementById("classicyDesktop") ?? document.body,
					)}
```

- [ ] **Step 8: Update the SCSS (positioning now inline)**

In `ClassicyPopUpMenu.scss`, edit `.classicyPopUpMenuList` (lines 125-146). Remove the four positioning lines — `position: absolute;`, `top: 0;`, `left: 0;`, `z-index: 1000;` — and the `min-width: 100%;` line (all now supplied by the inline portal style). Leave every other declaration (margin, padding, colors, border, box-shadow, font) untouched. Result:

```scss
.classicyPopUpMenuList {
  // Position, min-width and z-index are applied inline by the portal
  // (see ClassicyPopUpMenu.tsx) so the menu escapes the window's overflow.
  margin: 0;
  padding: var(--window-border-size);
  list-style: none;

  color: var(--color-black);
  background-color: var(--color-system-02);
  border: var(--window-border-size) solid var(--color-black);
  box-shadow:
    inset var(--window-border-size) var(--window-border-size) 0 0 var(--color-white),
    calc(var(--window-border-size) * 2) calc(var(--window-border-size) * 2) 0 0 var(--color-black);

  font: inherit;
}
```

- [ ] **Step 9: Run the full file to verify new + existing tests pass**

Run: `pnpm test src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx`
Expected: PASS — including the pre-existing "selecting an option", "re-selecting current", and "clicking outside closes" tests (they exercise the portaled list + outside-click fix).

- [ ] **Step 10: Lint + commit**

```bash
pnpm exec biome check src/SystemFolder/SystemResources/PopUpMenu/
git add src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx
git commit -m "feat(popupmenu): portal dropdown to desktop (unclipped, z-index 5000)"
```

---

### Task 5: Dismiss on scroll / resize

A `position: fixed` list would drift from its button when the page scrolls or resizes; close the menu instead (chosen behavior).

**Files:**
- Modify: `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx` (add an effect near the other `open`-gated effects)
- Test: `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx`

**Interfaces:**
- Consumes: `open`, `closeMenu`, `buttonRef`.
- Produces: nothing new (behavioral only).

- [ ] **Step 1: Write the failing test**

```tsx
it("closes on scroll", async () => {
	const user = userEvent.setup();
	render(<ClassicyPopUpMenu id="fruit" options={options} selected="apple" />);
	await user.click(screen.getByRole("button"));
	expect(screen.getByRole("listbox")).toBeInTheDocument();
	act(() => {
		window.dispatchEvent(new Event("scroll"));
	});
	expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
});

it("closes on window resize", async () => {
	const user = userEvent.setup();
	render(<ClassicyPopUpMenu id="fruit" options={options} selected="apple" />);
	await user.click(screen.getByRole("button"));
	expect(screen.getByRole("listbox")).toBeInTheDocument();
	act(() => {
		window.dispatchEvent(new Event("resize"));
	});
	expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx -t "closes on"`
Expected: FAIL — the listbox stays in the document after scroll/resize.

- [ ] **Step 3: Add the dismiss effect**

Add after the outside-pointer-down effect (and near the other `open`-gated effects) in `ClassicyPopUpMenu.tsx`:

```tsx
	// A fixed-position portal can't follow its button, so dismiss on scroll/
	// resize. `capture: true` catches scrolls in any ancestor, not just window.
	useEffect(() => {
		if (!open) return;
		const dismiss = () => {
			closeMenu();
			buttonRef.current?.focus();
		};
		window.addEventListener("scroll", dismiss, true);
		window.addEventListener("resize", dismiss);
		return () => {
			window.removeEventListener("scroll", dismiss, true);
			window.removeEventListener("resize", dismiss);
		};
	}, [open, closeMenu]);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx -t "closes on"`
Expected: PASS (both).

- [ ] **Step 5: Run the full suite, lint, commit**

```bash
pnpm test
pnpm exec biome check src/SystemFolder/SystemResources/PopUpMenu/
git add src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx
git commit -m "feat(popupmenu): dismiss dropdown on scroll/resize"
```

---

### Task 6: In-browser verification (positioning + cross-browser)

jsdom can't verify layout, z-index, or the Firefox/Safari focus quirk. Verify the real behavior end-to-end. Use the `verify` skill (build the library + run the example app + drive it in a browser), or the Storybook showcase, per the repo's cross-browser testing setup (Firefox via the `rt911` Playwright install; measure screenshots with ImageMagick).

- [ ] **Step 1: Build + launch**

Run `pnpm build:source`, then run the example app (`pnpm preview`) or `pnpm storybook`. Open the `ClassicyPopUpMenu` story / a view that places a pop-up menu inside a `ClassicyWindow`.

- [ ] **Step 2: Verify the five behaviors in-browser**

Confirm, in **Firefox** (the browser with the focus quirk) at minimum:
1. **Mouse-open then arrows** — click the control to open, press ↑/↓ without clicking again; the highlight moves and Enter commits. (This is the core cross-browser bug Task 1 fixes.)
2. **Type-ahead** — with focus on the control, type a leading letter; the menu opens/highlights the match; a multi-letter prefix within ~250ms narrows further.
3. **Unclipped** — place the menu near the bottom/edge of a `ClassicyWindow` with `overflow` clipping; the open list renders **in full**, not cut off by the window.
4. **On top** — the open list draws above the window and its neighbors (z-index 5000).
5. **Dismissal** — scrolling, resizing, pressing Escape, or clicking outside all close the menu.

- [ ] **Step 3: Record the result**

Note pass/fail for each behavior (a screenshot per the ImageMagick measurement workflow is ideal for #3/#4). If anything fails, treat it as a new bug (systematic-debugging) rather than editing the plan. No commit for this task unless a screenshot artifact is added to the repo.

---

## Notes for the Implementer

- **Reference implementation of the portal pattern:** `ClassicyBalloonHelp.tsx` (`getBoundingClientRect` on show, `position: fixed`, `createPortal` into `#classicyDesktop ?? document.body`). Follow its shape.
- The Storybook story (`ClassicyPopUpMenu.stories.tsx`) needs no code changes, but is a convenient harness for Task 6.
- Keep commits per-task as written; each task leaves the suite green.
