import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HyperCardSavedStacks } from "@/SystemFolder/HyperCard/Editor/HyperCardSavedStacks";
import { registerHyperCardSaveProvider } from "@/SystemFolder/HyperCard/HyperCardPlugins";

const dispatch = vi.fn();
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManagerDispatch: () => dispatch,
		useAppManager: Object.assign((sel: (s: unknown) => unknown) => sel({}), {
			getState: () => ({}),
		}),
	}),
);

afterEach(cleanup);

describe("HyperCardSavedStacks", () => {
	it("lists provider entries and opens a loaded stack", async () => {
		const stack = { name: "Server Stack", cards: [{ id: "c1" }] };
		registerHyperCardSaveProvider({
			id: "test-remote",
			label: "Test Remote",
			canSave: () => true,
			save: async () => ({ ok: true }),
			list: async () => [{ id: "42", name: "Server Stack" }],
			load: async () => stack,
		});
		const onOpen = vi.fn();
		render(<HyperCardSavedStacks onOpen={onOpen} />);
		expect(await screen.findByText("Server Stack")).toBeTruthy();
		fireEvent.click(screen.getByText("Open"));
		await waitFor(() =>
			expect(onOpen).toHaveBeenCalledWith(
				stack,
				{ id: "42", name: "Server Stack" },
				"test-remote",
			),
		);
	});

	it("renders a list error inline", async () => {
		registerHyperCardSaveProvider({
			id: "test-broken",
			label: "Broken",
			canSave: () => true,
			save: async () => ({ ok: true }),
			list: async () => {
				throw new Error("nope");
			},
		});
		render(<HyperCardSavedStacks onOpen={vi.fn()} />);
		expect(await screen.findByText(/nope/)).toBeTruthy();
	});
});
