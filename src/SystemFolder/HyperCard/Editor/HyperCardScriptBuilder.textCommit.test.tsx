/**
 * Regression test for a silent-data-loss bug: `ActionField` used to call
 * `useSound()` unconditionally (for every field kind, not just `sound`
 * fields), which subscribed text/number/choices fields to sound-state
 * churn. `ClassicySoundStateEventReducer` returns a fresh object for every
 * dispatch — including a play the player refuses — so ANY sound dispatch
 * anywhere re-rendered every `useSound()` consumer.
 *
 * Text/number/choices fields are uncontrolled: a per-render closure local
 * (`latest`) tracks the typed value until blur commits it. A re-render
 * between typing and blur resets that local to the seeded value, so the
 * commit on blur was silently skipped — while `ClassicyInput` kept its own
 * DOM value, so the typed text stayed visible on screen but was never saved.
 *
 * The trigger is ordinary: `ClassicyButton` plays a sound on mousedown,
 * which — in a real browser, and as simulated by `userEvent.click` — fires
 * before the browser moves focus and blurs the previously focused input.
 * Typing into a field, then clicking any button (including the row's own
 * reorder/delete controls) reproduced the loss.
 *
 * This test renders the script builder inside the REAL
 * `ClassicySoundManagerProvider` (not a mock) so the sound-state churn is
 * genuine, types into a `go` action's `to` text field, clicks the row's
 * "Delete" button (which plays `ClassicyButtonClickDown` on mousedown), and
 * asserts the edit still commits. It fails if `useSound()` is moved back
 * into `ActionField` above the field-kind branches.
 */
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, userEvent } from "@/__tests__/test-utils";
import { ClassicySoundManagerProvider } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider";
import { HyperCardScriptBuilder } from "@/SystemFolder/HyperCard/Editor/HyperCardScriptBuilder";
import type { HCEventHandlers } from "@/SystemFolder/HyperCard/HyperCardModel";

vi.mock("howler", () => ({
	Howl: class {
		play = vi.fn();
		stop = vi.fn();
		volume = vi.fn();
		playing = vi.fn().mockReturnValue(false);
	},
}));

const dispatch = vi.fn();
const fakeStoreState: {
	System: { Manager: { Appearance: { alertSound: string | undefined } } };
} = {
	System: { Manager: { Appearance: { alertSound: undefined } } },
};
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManagerDispatch: () => dispatch,
		useAppManager: (selector: (s: unknown) => unknown): unknown =>
			selector(fakeStoreState),
	}),
);

afterEach(cleanup);
beforeEach(() => {
	dispatch.mockClear();
});

const target = { kind: "card", cardId: "c1" } as never;

function renderGoAction() {
	const handlers = {
		onMouseUp: [{ do: "go", to: "" }],
	} as unknown as HCEventHandlers;
	return render(
		<ClassicySoundManagerProvider>
			<HyperCardScriptBuilder
				target={target}
				handlers={handlers}
				stackId="demo"
			/>
		</ClassicySoundManagerProvider>,
	);
}

describe("script builder text field commit survives sound-state churn", () => {
	it("commits a typed edit even when a button plays a sound before blur", async () => {
		const user = userEvent.setup();
		const { container } = renderGoAction();

		const input = container.querySelector(
			'input[id$=":to"]',
		) as HTMLInputElement;
		expect(input).toBeInTheDocument();

		await user.type(input, "second card");

		// The row's "Delete" button plays ClassicyButtonClickDown on mousedown —
		// which, via the real ClassicySoundManagerProvider, updates sound state
		// and previously re-rendered ActionField (and reset its uncommitted
		// closure) before the input's own blur could commit the typed value.
		const deleteButton = Array.from(container.querySelectorAll("button")).find(
			(b) => b.textContent === "Delete",
		) as HTMLButtonElement;
		expect(deleteButton).toBeInTheDocument();

		await user.click(deleteButton);

		const setScriptCalls = dispatch.mock.calls.filter(
			(c) => (c[0] as { type: string }).type === "ClassicyAppHCEditSetScript",
		);
		const committedGo = setScriptCalls.find((c) => {
			const handlers = (c[0] as { handlers: HCEventHandlers }).handlers;
			const actions = handlers.onMouseUp as unknown as
				| { do: string; to?: string }[]
				| undefined;
			return actions?.some((a) => a.do === "go" && a.to === "second card");
		});
		expect(committedGo).toBeDefined();
	});
});
