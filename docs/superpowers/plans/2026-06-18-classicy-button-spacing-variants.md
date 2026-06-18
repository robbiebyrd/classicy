# ClassicyButton Spacing Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional `padding` and `margin` props to `ClassicyButton` using a theme-aware `sm | md | lg | xl` scale, with `md` reproducing today's exact spacing.

**Architecture:** Replace the hardcoded `margin`/`padding` in `ClassicyButton.scss` with a generated set of `classicyButtonPadding{Sm,Md,Lg,Xl}` / `classicyButtonMargin{Sm,Md,Lg,Xl}` classes (one SCSS `@each` loop over a name→multiplier map, all derived from `--window-padding-size`). The TSX defaults both props to `"md"` and appends the matching classes via lookup objects, omitting the padding class for square buttons so existing icon-button geometry is preserved.

**Tech Stack:** React + TypeScript, SCSS (Dart Sass via Vite), Vitest + Testing Library, Biome (lint/format), `classnames`.

## Global Constraints

- Indentation is **tabs**, not spaces (matches existing `ClassicyButton.tsx`/`.scss`/`.test.tsx`). Biome enforces this — run `npm run lint` before committing.
- All spacing MUST derive from the CSS variable `var(--window-padding-size)` — no literal pixel values.
- No new runtime dependencies.
- Existing buttons (no new props) MUST render byte-for-byte identical spacing: `md` = margin `var(--window-padding-size)`, padding `calc(var(--window-padding-size)/2) var(--window-padding-size)`.
- The `sm | md | lg | xl` multipliers are exactly: `sm=0.5×`, `md=1×`, `lg=1.5×`, `xl=2×`.
- Run the test suite with `npm run test` (alias for `vitest run`); a single file with `npx vitest run <path>`.

---

### Task 1: Add spacing variant classes to SCSS

**Files:**
- Modify: `src/SystemFolder/SystemResources/Button/ClassicyButton.scss`

**Interfaces:**
- Consumes: existing CSS custom property `--window-padding-size`.
- Produces: CSS classes `classicyButtonPaddingSm|Md|Lg|Xl` and `classicyButtonMarginSm|Md|Lg|Xl`. `Md` padding = `calc(var(--window-padding-size)/2) var(--window-padding-size)`, `Md` margin = `var(--window-padding-size)`.

- [ ] **Step 1: Remove the hardcoded margin/padding from `.classicyButton`**

In `.classicyButton`, delete these two lines (lines 9-10):

```scss
  margin: calc(var(--window-padding-size));
  padding: calc(var(--window-padding-size) / 2) var(--window-padding-size);
```

Leave the rest of the `.classicyButton` rule (font, border-radius, user-select, `:focus`, mixin) untouched.

- [ ] **Step 2: Remove the hardcoded margin/padding from `.classicyButtonDefault`**

In `.classicyButtonDefault`, delete these two lines (the duplicate spacing declarations):

```scss
  margin: calc(var(--window-padding-size));
  padding: calc(var(--window-padding-size) / 2) var(--window-padding-size);
```

Leave the font, user-select, mixin, and `&:active:disabled` rule untouched.

- [ ] **Step 3: Add the spacing scale generator**

Append to the end of `src/SystemFolder/SystemResources/Button/ClassicyButton.scss`:

```scss
// Spacing scale — all derived from --window-padding-size so it tracks the theme.
// Keys are the class-name suffix; values are the multiplier. Md (1x) reproduces
// the historical default spacing.
$classicy-button-spacing: (
  Sm: 0.5,
  Md: 1,
  Lg: 1.5,
  Xl: 2,
);

@each $suffix, $mult in $classicy-button-spacing {
  .classicyButtonPadding#{$suffix} {
    padding: calc(var(--window-padding-size) / 2 * #{$mult})
      calc(var(--window-padding-size) * #{$mult});
  }

  .classicyButtonMargin#{$suffix} {
    margin: calc(var(--window-padding-size) * #{$mult});
  }
}
```

- [ ] **Step 4: Verify the SCSS compiles**

Run: `npx vite build --config vite.config.ts 2>&1 | tail -20`
Expected: build completes without Sass errors. (If `build:source` is faster to reason about, `npm run build:source` also compiles the SCSS; either is acceptable — you only need to confirm no Sass compilation error in `ClassicyButton.scss`.)

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/Button/ClassicyButton.scss
git commit -m "✨ Add spacing scale classes to ClassicyButton SCSS"
```

---

### Task 2: Wire `padding`/`margin` props into ClassicyButton (TDD)

**Files:**
- Modify: `src/SystemFolder/SystemResources/Button/ClassicyButton.tsx`
- Test: `src/SystemFolder/SystemResources/Button/ClassicyButton.test.tsx`

**Interfaces:**
- Consumes: SCSS classes from Task 1 (`classicyButtonPadding{Sm,Md,Lg,Xl}`, `classicyButtonMargin{Sm,Md,Lg,Xl}`).
- Produces: extended `ClassicyButtonProps` with `padding?: "sm" | "md" | "lg" | "xl"` and `margin?: "sm" | "md" | "lg" | "xl"`, both defaulting to `"md"`.

- [ ] **Step 1: Write the failing tests**

Add these tests inside the existing `describe("ClassicyButton", ...)` block in `src/SystemFolder/SystemResources/Button/ClassicyButton.test.tsx`:

```tsx
it("defaults to md padding and margin classes", () => {
	render(<ClassicyButton>Default</ClassicyButton>);
	const btn = screen.getByRole("button", { name: "Default" });
	expect(btn).toHaveClass("classicyButtonPaddingMd");
	expect(btn).toHaveClass("classicyButtonMarginMd");
});

it("applies the requested padding variant", () => {
	render(<ClassicyButton padding="lg">Pad</ClassicyButton>);
	const btn = screen.getByRole("button", { name: "Pad" });
	expect(btn).toHaveClass("classicyButtonPaddingLg");
	expect(btn).not.toHaveClass("classicyButtonPaddingMd");
});

it("applies the requested margin variant", () => {
	render(<ClassicyButton margin="xl">Marg</ClassicyButton>);
	const btn = screen.getByRole("button", { name: "Marg" });
	expect(btn).toHaveClass("classicyButtonMarginXl");
	expect(btn).not.toHaveClass("classicyButtonMarginMd");
});

it("omits any padding class on square buttons but keeps the margin class", () => {
	render(
		<ClassicyButton buttonShape="square" padding="lg" margin="lg">
			Sq
		</ClassicyButton>,
	);
	const btn = screen.getByRole("button", { name: "Sq" });
	expect(btn.className).not.toMatch(/classicyButtonPadding/);
	expect(btn).toHaveClass("classicyButtonMarginLg");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/SystemFolder/SystemResources/Button/ClassicyButton.test.tsx`
Expected: the four new tests FAIL (button does not yet have `classicyButtonPaddingMd` / `classicyButtonMarginMd` etc.). The pre-existing tests still PASS.

- [ ] **Step 3: Extend the prop type**

In `src/SystemFolder/SystemResources/Button/ClassicyButton.tsx`, add the two props to the `ClassicyButtonProps` type (after the `depressed` field, before the closing `}>`):

```tsx
	/** Holds the button in its pressed/active visual state. */
	depressed?: boolean;
	/** Inner spacing variant; scales off --window-padding-size. Ignored for square buttons. */
	padding?: "sm" | "md" | "lg" | "xl";
	/** Outer spacing variant; scales off --window-padding-size. */
	margin?: "sm" | "md" | "lg" | "xl";
```

(Keep the existing `depressed` JSDoc line — shown here for placement only; do not duplicate it.)

- [ ] **Step 4: Add lookup maps and destructure the new props with `md` defaults**

In the same file, add these two lookup objects just above the `ClassicyButton` component declaration (after the `type ClassicyButtonProps = ...` block):

```tsx
const paddingVariantClass = {
	sm: "classicyButtonPaddingSm",
	md: "classicyButtonPaddingMd",
	lg: "classicyButtonPaddingLg",
	xl: "classicyButtonPaddingXl",
} as const;

const marginVariantClass = {
	sm: "classicyButtonMarginSm",
	md: "classicyButtonMarginMd",
	lg: "classicyButtonMarginLg",
	xl: "classicyButtonMarginXl",
} as const;
```

Then add `padding = "md"` and `margin = "md"` to the destructured props. The destructuring block becomes:

```tsx
}) => {
```

is preceded by:

```tsx
	disabled = false,
	depressed = false,
	padding = "md",
	margin = "md",
	onClickFunc,
	children,
```

- [ ] **Step 5: Append the variant classes in the `classNames(...)` call**

Update the `classNames(...)` call so it includes the margin class always and the padding class only for non-square buttons. The full call becomes:

```tsx
			className={classNames(
				"classicyButton",
				isDefault ? "classicyButtonDefault" : "",
				buttonShape === "square" ? "classicyButtonShapeSquare" : "",
				buttonSize === "small" ? "classicyButtonSmall" : "",
				depressed ? "classicyButtonDepressed" : "",
				buttonShape !== "square" ? paddingVariantClass[padding] : "",
				marginVariantClass[margin],
			)}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/SystemFolder/SystemResources/Button/ClassicyButton.test.tsx`
Expected: all tests PASS (the four new ones plus the eight pre-existing ones).

- [ ] **Step 7: Lint**

Run: `npm run lint`
Expected: no errors for `ClassicyButton.tsx` / `ClassicyButton.test.tsx`. If Biome reports formatting diffs, run `npx biome check --write src/SystemFolder/SystemResources/Button/` and re-run `npm run lint`.

- [ ] **Step 8: Commit**

```bash
git add src/SystemFolder/SystemResources/Button/ClassicyButton.tsx src/SystemFolder/SystemResources/Button/ClassicyButton.test.tsx
git commit -m "✨ Add padding/margin spacing variant props to ClassicyButton"
```

---

### Task 3: Full build + suite verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all tests PASS, no regressions in other components.

- [ ] **Step 2: Run the source build**

Run: `npm run build:source`
Expected: `generate-barrels` + `tsc -b` + `vite build` all succeed (no TypeScript errors from the new prop types, no Sass errors).

- [ ] **Step 3: Confirm clean lint**

Run: `npm run lint`
Expected: clean (no errors).

- [ ] **Step 4: Commit (only if Steps 1-3 surfaced fixable changes)**

If any auto-formatting or barrel regeneration changed files:

```bash
git add -A
git commit -m "🔧 Regenerate barrels / formatting after spacing variants"
```

If nothing changed, skip this commit.

---

## Self-Review

- **Spec coverage:** Two props (Task 2) ✓; `sm/md/lg/xl` scale off `--window-padding-size` (Task 1) ✓; `md` = current default, hardcoded values removed (Task 1 Steps 1-3) ✓; square ignores padding but keeps margin (Task 2 Steps 1, 5) ✓; backward-compat default `"md"` (Task 2 Step 4) ✓; tests for default/lg/xl/square (Task 2 Step 1) ✓.
- **Placeholders:** none — every code and command step shows concrete content.
- **Type consistency:** class names `classicyButtonPadding{Sm,Md,Lg,Xl}` / `classicyButtonMargin{Sm,Md,Lg,Xl}` are identical across the SCSS generator (Task 1 Step 3), the TSX lookup maps (Task 2 Step 4), and the assertions (Task 2 Step 1). Prop union `"sm" | "md" | "lg" | "xl"` matches the lookup-map keys.
