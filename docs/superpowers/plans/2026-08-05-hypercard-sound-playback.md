# HyperCard Sound Playback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make HyperCard's `beep` and `play` script effects audible, and let stack authors pick a sound from a menu instead of typing a sprite id.

**Architecture:** Two independent changes. HyperCard's effect consumer switches from `ClassicySoundPlay` (which is silently dropped whenever any other sound is playing) to `ClassicySoundPlayInterrupt`. Separately, a new `sound` kind is added to the public `HCOptionField` union so the visual script builder renders a `ClassicyPopUpMenu` of registered sounds for the `play` verb.

**Tech Stack:** React 19, TypeScript, Howler, Vitest + Testing Library, Biome.

**Spec:** `docs/superpowers/specs/2026-08-05-hypercard-sound-playback-design.md`
**Issues:** #220, #235

## Global Constraints

- Package manager is **pnpm**. Full suite: `pnpm test`. Single file: `pnpm vitest run <path>`.
- `pnpm test` (vitest) **does not type-check**. Run `pnpm build:source` before considering the work done.
- Lint with `biome check <specific paths>`. **Do not run `pnpm lint:fix` repo-wide** — it reformats ~70 untouched files.
- Tabs for indentation.
- Do not edit `index.ts` barrel files — they are generated.
- `ClassicySoundPlay` semantics must not change for any non-HyperCard caller. The fix is confined to HyperCard's effect consumer.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/SystemFolder/HyperCard/HyperCard.tsx` | Effect consumer | Modify `:158-161` |
| `src/SystemFolder/HyperCard/HyperCard.sound.test.tsx` | Effect consumer tests | Create |
| `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundStateEventReducer.test.ts` | Reducer tests | Add `PlayInterrupt`-while-playing coverage |
| `src/SystemFolder/HyperCard/HyperCardPlugins.ts` | Public option-field type | Modify `:186` |
| `src/SystemFolder/HyperCard/Editor/HyperCardScriptBuilder.tsx` | Script builder | Add `sound` helper (~:36), change `play` spec (`:50`), add renderer branch (~:308) |
| `src/SystemFolder/HyperCard/Editor/HyperCardScriptBuilder.sound.test.tsx` | Builder tests | Create |

Tasks 1 and 2 are independent and may be done in either order.

---

### Task 1: Unmask HyperCard's `beep` and `play` effects (#220)

**Files:**
- Modify: `src/SystemFolder/HyperCard/HyperCard.tsx:158-161`
- Modify: `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundStateEventReducer.test.ts`
- Create: `src/SystemFolder/HyperCard/HyperCard.sound.test.tsx`

**Interfaces:**
- Consumes: `useSoundDispatch()` returning `Dispatch<ClassicySoundAction>`; action `{ type: "ClassicySoundPlayInterrupt", sound: string }`.
- Produces: nothing later tasks consume.

**Background the implementer needs:**

All audio runs through a **single `Howl`** holding a 41-sprite map. Howler's `playing()` with no arguments reports whether *any* sprite is sounding. The play predicate is:

```ts
const playerCanPlay = (ss, sound) =>
	playerCanPlayInterrupt(ss, sound) && !ss.soundPlayer?.playing();
```
— `ClassicySoundManagerUtils.tsx:140-142`

So `ClassicySoundPlay` means "play only if the system is silent." `ClassicyButton` plays `ClassicyButtonClickUp` on mouse-up (`ClassicyButton.tsx:121`) and HyperCard consumes the queued `beep` in the same tick — the click sound is still playing, so the beep is dropped without error.

There is already a test documenting this gate: `ClassicySoundStateEventReducer.test.ts` → `"does NOT play when already playing"`. **Do not change it** — it describes correct, intended `ClassicySoundPlay` behavior.

`ClassicySoundPlayInterrupt` gates only on `playerCanPlayInterrupt` (disabled list + player presence), so it is never masked. It calls `stop()` with no arguments first, which halts every sounding sprite. That trade-off is accepted in the spec.

- [ ] **Step 1: Write the failing reducer test**

Append to `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundStateEventReducer.test.ts` (there is an existing `ClassicySoundPlayInterrupt` section — add these there, or append a new describe block):

```ts
describe("ClassicySoundPlayInterrupt vs ClassicySoundPlay while sounding", () => {
	it("plays even when another sound is already sounding", () => {
		const player = makePlayer();
		(player.playing as ReturnType<typeof vi.fn>).mockReturnValue(true);
		const ss = makeSoundState({ soundPlayer: player });
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundPlayInterrupt" as ClassicySoundActionTypes,
			sound: "ClassicyBeep",
		});
		expect(ss.soundPlayer?.play).toHaveBeenCalledWith("ClassicyBeep");
	});

	it("is still suppressed when the sound is disabled", () => {
		const player = makePlayer();
		(player.playing as ReturnType<typeof vi.fn>).mockReturnValue(true);
		const ss = makeSoundState({
			soundPlayer: player,
			disabled: ["ClassicyBeep"],
		});
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundPlayInterrupt" as ClassicySoundActionTypes,
			sound: "ClassicyBeep",
		});
		expect(ss.soundPlayer?.play).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run it**

Run: `pnpm vitest run src/SystemFolder/ControlPanels/SoundManager/ClassicySoundStateEventReducer.test.ts -t "while sounding"`

Expected: **PASS** already — this documents existing `PlayInterrupt` behavior and pins the contract HyperCard is about to rely on. If it fails, stop: the assumption behind this whole task is wrong.

- [ ] **Step 3: Write the failing HyperCard test**

Create `src/SystemFolder/HyperCard/HyperCard.sound.test.tsx`:

```tsx
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dispatch = vi.fn();
const player = vi.fn();
let mockState: Record<string, unknown> = {};

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManagerDispatch: () => dispatch,
		useAppManager: Object.assign(
			(sel: (s: unknown) => unknown): unknown => sel(mockState),
			{ getState: (): unknown => mockState },
		),
	}),
);
vi.mock("@/SystemFolder/SystemResources/App/ClassicyApp", () => ({
	ClassicyApp: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));
vi.mock("@/SystemFolder/SystemResources/Window/ClassicyWindow", () => ({
	ClassicyWindow: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => player }),
);
vi.mock(
	"@/SystemFolder/SystemResources/File/ClassicyFileSystemContext",
	() => ({
		useClassicyFileSystem: () => ({ resolve: (): undefined => undefined }),
	}),
);
vi.mock(
	"@/SystemFolder/SystemResources/FileDialog/ClassicyFileOpenDialog",
	() => ({ ClassicyFileOpenDialog: (): null => null }),
);
vi.mock(
	"@/SystemFolder/SystemResources/FileDialog/ClassicyFileSaveDialog",
	() => ({ ClassicyFileSaveDialog: (): null => null }),
);

import { HyperCard } from "@/SystemFolder/HyperCard/HyperCard";

afterEach(cleanup);
beforeEach(() => {
	dispatch.mockClear();
	player.mockClear();
});

function stateWithEffects(pendingEffects: unknown[]) {
	return {
		System: {
			Manager: {
				Desktop: { appMenu: [] as unknown[] },
				Applications: {
					focusedAppId: "HyperCard.app",
					apps: {
						"HyperCard.app": {
							id: "HyperCard.app",
							name: "HyperCard",
							icon: "i.png",
							windows: [] as unknown[],
							open: true,
							data: {
								activeStackId: "demo",
								openStacks: {
									demo: {
										stackSource: "demo",
										stack: {
											name: "Demo",
											cards: [{ id: "c1", parts: [] }],
										},
										currentCardId: "c1",
										history: [] as unknown[],
										variables: {},
										fieldValues: {},
										partVisibility: {},
										fieldRev: {},
										runtime: { pendingEffects },
									},
								},
							},
						},
					},
				},
			},
		},
	};
}

const soundCalls = () =>
	player.mock.calls.map((c) => c[0] as { type: string; sound?: string });

describe("HyperCard sound effects", () => {
	it("plays a beep with PlayInterrupt so a click sound can't mask it", () => {
		mockState = stateWithEffects([{ id: 1, kind: "beep" }]);
		render(<HyperCard />);
		expect(soundCalls()).toContainEqual({
			type: "ClassicySoundPlayInterrupt",
			sound: "ClassicyBeep",
		});
	});

	it("plays a named sound with PlayInterrupt", () => {
		mockState = stateWithEffects([
			{ id: 2, kind: "play", sound: "ClassicyAlertSosumi" },
		]);
		render(<HyperCard />);
		expect(soundCalls()).toContainEqual({
			type: "ClassicySoundPlayInterrupt",
			sound: "ClassicyAlertSosumi",
		});
	});

	it("plays each queued effect id only once", () => {
		mockState = stateWithEffects([{ id: 3, kind: "beep" }]);
		const { rerender } = render(<HyperCard />);
		rerender(<HyperCard />);
		expect(
			soundCalls().filter((c) => c.sound === "ClassicyBeep"),
		).toHaveLength(1);
	});
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `pnpm vitest run src/SystemFolder/HyperCard/HyperCard.sound.test.tsx`

Expected: the first two tests FAIL — the calls carry `type: "ClassicySoundPlay"`, not `"ClassicySoundPlayInterrupt"`. The third passes already (the `playedRef` dedup exists).

If instead you get zero sound calls at all, the mock state shape is wrong: check that `runtime.pendingEffects` is nested under `openStacks.demo` and that `activeStackId` is `"demo"`.

- [ ] **Step 5: Change the effect consumer**

In `src/SystemFolder/HyperCard/HyperCard.tsx:158-161`, replace:

```ts
			if (e.kind === "beep") {
				player({ type: "ClassicySoundPlay", sound: "ClassicyBeep" });
			} else if (e.kind === "play") {
				player({ type: "ClassicySoundPlay", sound: e.sound });
			}
```

with:

```ts
			if (e.kind === "beep") {
				// PlayInterrupt, not Play: ClassicySoundPlay is gated on total
				// silence, and the button's own ClassicyButtonClickUp is still
				// sounding when the script's beep lands in the same tick — so a
				// plain Play is silently dropped (#220). Interrupt stops all
				// audio first, which is the right call for script-driven sound:
				// the most recently requested sound is the intended one.
				player({ type: "ClassicySoundPlayInterrupt", sound: "ClassicyBeep" });
			} else if (e.kind === "play") {
				player({ type: "ClassicySoundPlayInterrupt", sound: e.sound });
			}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/HyperCard/HyperCard.sound.test.tsx`

Expected: PASS, all three.

- [ ] **Step 7: Lint and commit**

```bash
pnpm biome check src/SystemFolder/HyperCard/HyperCard.tsx src/SystemFolder/HyperCard/HyperCard.sound.test.tsx src/SystemFolder/ControlPanels/SoundManager/ClassicySoundStateEventReducer.test.ts
git add src/SystemFolder/HyperCard/HyperCard.tsx src/SystemFolder/HyperCard/HyperCard.sound.test.tsx src/SystemFolder/ControlPanels/SoundManager/ClassicySoundStateEventReducer.test.ts
git commit -m "fix(hypercard): play script beep/play with PlayInterrupt

ClassicySoundPlay is gated on total silence, so a script beep dispatched
while the button's own click sound was still playing was silently
dropped. Scoped to HyperCard's effect consumer; ClassicySoundPlay
semantics are unchanged for every other caller.

Fixes #220"
```

---

### Task 2: A `sound` option-field kind for the script builder (#235)

**Files:**
- Modify: `src/SystemFolder/HyperCard/HyperCardPlugins.ts:186`
- Modify: `src/SystemFolder/HyperCard/Editor/HyperCardScriptBuilder.tsx` (~:36, `:50`, ~:308)
- Create: `src/SystemFolder/HyperCard/Editor/HyperCardScriptBuilder.sound.test.tsx`

**Interfaces:**
- Consumes: `useSound()` from `@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext`, returning `ClassicySoundState` whose `labels` is `ClassicySoundInfo[]` = `{ id: string; group: string; label: string; description: string }[]`.
- Consumes: `ClassicyPopUpMenu` with props `{ id: string; label?: string; options: { value: string; label: string; icon?: string }[]; selected?: string; onChangeFunc?: (e: ChangeEvent<HTMLSelectElement>) => void }`.
- Produces: `HCOptionField["kind"]` gains `"sound"`, and a `sound(key, label?)` helper.

**Background the implementer needs — three things that will bite:**

1. **Rules of hooks.** `ActionField` (`:303`) currently has **no hooks** and returns early for `field.kind === "choices"`. `useSound()` must be called at the **top of the function body, before any conditional return** — otherwise hook order varies by field kind and React throws.

2. **`ClassicyPopUpMenu` has no `optgroup` support.** `options` is a flat `{ value, label, icon? }[]`. Carry the group in the label text (`"System — Beep"`). Do not add grouping to `ClassicyPopUpMenu` — explicitly out of scope.

3. **Options are not in the DOM until the menu is opened.** Per the comment at `HyperCardScriptBuilder.tsx:274-281`, `ClassicyPopUpMenu` no longer renders a hidden native `<select>` mirror. When closed it renders a `role="combobox"` button whose current label sits in `.classicyPopUpMenuValue`; the `role="listbox"` and its `role="option"` children only mount once open. **Tests must either assert on the combobox's displayed value or click it open first.** Querying `role="option"` on a closed menu returns nothing and will read as a false failure.

Commit behavior differs from the text branches too: those wrap an uncontrolled `ClassicyInput` and commit on blur/Enter. A pop-up menu commits directly in `onChangeFunc`.

- [ ] **Step 1: Write the failing tests**

Create `src/SystemFolder/HyperCard/Editor/HyperCardScriptBuilder.sound.test.tsx`:

```tsx
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";

const dispatch = vi.fn();

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({ useAppManagerDispatch: () => dispatch }),
);
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSound: () => ({
			soundPlayer: null,
			disabled: [],
			labels: [
				{ id: "ClassicyBeep", group: "System", label: "Beep", description: "" },
				{
					id: "ClassicyClick",
					group: "General",
					label: "Click",
					description: "",
				},
			],
		}),
	}),
);

import { HyperCardScriptBuilder } from "@/SystemFolder/HyperCard/Editor/HyperCardScriptBuilder";

const target = { kind: "card", cardId: "c1" } as never;

function renderPlay(sound?: string) {
	return render(
		<HyperCardScriptBuilder
			target={target}
			handlers={{ onMouseUp: [{ do: "play", ...(sound ? { sound } : {}) }] }}
			stackId="demo"
		/>,
	);
}

describe("script builder sound field", () => {
	it("renders the play sound parameter as a pop-up menu, not a text box", () => {
		const { container } = renderPlay("ClassicyBeep");
		expect(container.querySelector(".classicyPopUpMenu")).toBeInTheDocument();
	});

	it("shows the group-prefixed label for the current sound", () => {
		const { container } = renderPlay("ClassicyBeep");
		expect(
			container.querySelector(".classicyPopUpMenuValue")?.textContent,
		).toBe("System — Beep");
	});

	it("lists registered sounds sorted by group once opened", () => {
		const { container } = renderPlay("ClassicyBeep");
		const combobox = container.querySelector(
			'[role="combobox"]',
		) as HTMLElement;
		fireEvent.click(combobox);
		const options = screen.getAllByRole("option").map((o) => o.textContent);
		expect(options).toEqual(["General — Click", "System — Beep"]);
	});

	it("keeps an unregistered sound as the selected option", () => {
		const { container } = renderPlay("myPluginSound");
		expect(
			container.querySelector(".classicyPopUpMenuValue")?.textContent,
		).toBe("myPluginSound");
	});
});
```

`HyperCardScriptBuilderProps` is `{ stackId: string; target: HCScriptTarget; handlers: HCEventHandlers }` (`HyperCardScriptBuilder.tsx:114-118`), which is what the helper above passes.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/SystemFolder/HyperCard/Editor/HyperCardScriptBuilder.sound.test.tsx`

Expected: FAIL — `.classicyPopUpMenu` is absent because `play` still renders a `ClassicyInput`.

- [ ] **Step 3: Extend the public field-kind union**

In `src/SystemFolder/HyperCard/HyperCardPlugins.ts:186`:

```ts
	kind: "text" | "number" | "checkbox" | "choices" | "json" | "sound";
```

This is a public exported type, so registered custom commands and parts get the picker for free.

- [ ] **Step 4: Add the `sound` helper and change the `play` spec**

In `HyperCardScriptBuilder.tsx`, after the `num` helper (~:36):

```ts
const sound = (key: string, label?: string): HCOptionField => ({
	key,
	label: label ?? key,
	kind: "sound",
});
```

Then change `:50`:

```ts
	play: [sound("sound")],
```

- [ ] **Step 5: Add the renderer branch**

Add the `useSound` import at the top of the file:

```ts
import { useSound } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
```

In `ActionField` (`:303`), call the hook **first**, then add the branch **before** the `choices` branch:

```tsx
}> = ({ id, field, value, onCommit }) => {
	// Called unconditionally, before any early return: ActionField returns
	// early per field kind, and a hook behind one of those branches would
	// change hook order between renders.
	const { labels } = useSound();

	if (field.kind === "sound") {
		const current = typeof value === "string" ? value : "";
		const registered = [...labels]
			.sort(
				(a, b) =>
					a.group.localeCompare(b.group) || a.label.localeCompare(b.label),
			)
			.map((s) => ({ value: s.id, label: `${s.group} — ${s.label}` }));
		// A sound the stack already names but that isn't registered (a plugin
		// sound, or a hand-authored stack) is appended rather than dropped, so
		// selecting nothing can never silently rewrite authored data.
		const options =
			current && !registered.some((o) => o.value === current)
				? [...registered, { value: current, label: current }]
				: registered;
		return (
			<ClassicyPopUpMenu
				id={id}
				label={field.label}
				options={options}
				selected={current}
				onChangeFunc={(e: ChangeEvent<HTMLSelectElement>) =>
					onCommit(e.target.value || undefined)
				}
			/>
		);
	}

	if (field.kind === "choices") {
```

`ClassicyPopUpMenu` and `ChangeEvent` are already imported in this file (`:25`, `:8`).

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/HyperCard/Editor/HyperCardScriptBuilder.sound.test.tsx`

Expected: PASS, all four.

- [ ] **Step 7: Run the full suite and type-check**

Run: `pnpm test && pnpm build:source`

Expected: PASS with no TypeScript errors. Existing script-editor tests that target the `play` row's text input will need updating to the pop-up menu — that is expected fallout, not a regression.

- [ ] **Step 8: Lint and commit**

```bash
pnpm biome check src/SystemFolder/HyperCard/HyperCardPlugins.ts src/SystemFolder/HyperCard/Editor/HyperCardScriptBuilder.tsx src/SystemFolder/HyperCard/Editor/HyperCardScriptBuilder.sound.test.tsx
git add src/SystemFolder/HyperCard/HyperCardPlugins.ts src/SystemFolder/HyperCard/Editor/HyperCardScriptBuilder.tsx src/SystemFolder/HyperCard/Editor/HyperCardScriptBuilder.sound.test.tsx
git commit -m "feat(hypercard): pick play sounds from a menu

Adds a 'sound' HCOptionField kind rendering a ClassicyPopUpMenu of
registered Classicy sounds, group-prefixed and sorted. A sound not in
the registry is kept as the selected option so authored stacks and
plugin sounds are never silently reset. The kind is on the public
HCOptionField union, so custom commands get it too.

Fixes #235"
```

---

### Task 3: Browser verification

**Files:** none modified.

- [ ] **Step 1: Build and run**

Run: `pnpm build:source` then `pnpm preview`. Or use the `verify` skill.

- [ ] **Step 2: Verify #220**

Open HyperCard with the sample stack (`HyperCardSampleStack.ts` defines a **Beep** button bound to `onMouseUp`). Click it. **A beep must be audible.** Click it rapidly several times — each click should beep, not just the first.

Check the volume is up and no sounds are disabled in the Sound control panel before concluding it failed.

- [ ] **Step 3: Verify #235**

Enter edit mode, select a button, open the script builder, and add a `play` action. Confirm:
- the sound parameter is a pop-up menu, not a text field;
- opening it lists sounds with group-prefixed labels, sorted by group;
- selecting one and running the script plays **that** sound.

- [ ] **Step 4: Confirm no global sound regression**

Click ordinary buttons, open and close menus, focus and close windows. Chrome sounds must behave exactly as before — this change was scoped to HyperCard, so any difference here means something went wrong.

---

## Self-Review

**Spec coverage:**

| Requirement | Task |
|---|---|
| R1 — script `beep` audible over chrome sound | Task 1 |
| R2 — script `play` audible | Task 1 |
| R3 — no change for other callers | Task 1 (HyperCard-only edit); Task 3 Step 4 |
| R4 — `play` row offers registered sounds | Task 2 |
| R5 — unregistered sound preserved | Task 2 Step 5 (`options` append) + its test |
| R6 — available to third-party command authors | Task 2 Step 3 (public union) |

**Placeholder scan:** none — every step has runnable code or an exact command.

**Type consistency:** `ClassicySoundInfo` fields (`id`, `group`, `label`, `description`) match `ClassicySoundManagerUtils.tsx:25-30`. `HCOptionField` shape matches `HyperCardPlugins.ts:183-188`. The `sound()` helper mirrors the existing `text()`/`num()` signatures.

**Known risks flagged in-plan:** hook ordering in `ActionField` (Task 2 Step 5), `ClassicyPopUpMenu` options absent from the DOM until opened (Task 2 background), and existing script-editor tests targeting the old text input (Task 2 Step 7).
