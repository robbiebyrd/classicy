import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const dispatch = vi.fn();
let mockState: Record<string, unknown> = {};
let capturedOnCloseFunc: (() => void) | undefined;

// Spread the real module and override only the two hooks under test, so any
// other export a subcomponent reaches for still works. Mirrors
// HyperCard.sound.test.tsx.
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	async (importOriginal) => ({
		...(await importOriginal<
			typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils")
		>()),
		useAppManagerDispatch: () => dispatch,
		useAppManager: Object.assign(
			(sel: (s: unknown) => unknown): unknown => sel(mockState),
			{ getState: (): unknown => mockState },
		),
	}),
);
vi.mock("@/SystemFolder/SystemResources/Window/ClassicyWindow", () => ({
	ClassicyWindow: ({
		children,
		onCloseFunc,
	}: {
		children: React.ReactNode;
		onCloseFunc?: () => void;
	}) => {
		capturedOnCloseFunc = onCloseFunc;
		return <div>{children}</div>;
	},
}));

import { FinderPreferences } from "@/SystemFolder/Finder/FinderPreferences";

const withFinderData = (data: Record<string, unknown>) => {
	mockState = {
		System: {
			Manager: {
				Applications: { apps: { "Finder.app": { data } } },
				Appearance: { activeTheme: { desktop: { iconSize: 48 } } },
			},
		},
	};
};

afterEach(() => {
	dispatch.mockClear();
	capturedOnCloseFunc = undefined;
});

describe("FinderPreferences", () => {
	it("renders exactly one tab, titled Views", () => {
		withFinderData({});
		render(<FinderPreferences />);
		const tabs = screen.getAllByRole("tab");
		expect(tabs).toHaveLength(1);
		expect(tabs[0]).toHaveTextContent("Views");
	});

	it("labels the control group View Options", () => {
		withFinderData({});
		const { container } = render(<FinderPreferences />);
		expect(container.querySelector("legend")).toHaveTextContent("View Options");
	});

	it("offers exactly Icons and List as view types", async () => {
		withFinderData({});
		const { default: userEvent } = await import("@testing-library/user-event");
		render(<FinderPreferences />);
		const combo = screen.getByRole("combobox", { name: "View type:" });
		await userEvent.click(combo);
		// Accessible-name query rather than textContent: the selected option's
		// checkmark glyph is aria-hidden, so it's excluded from the computed
		// name but would otherwise pollute a raw textContent comparison.
		const options = screen.getAllByRole("option");
		expect(options).toHaveLength(2);
		expect(screen.getByRole("option", { name: "Icons" })).toBeInTheDocument();
		expect(screen.getByRole("option", { name: "List" })).toBeInTheDocument();
	});

	it("shows the icons pane first and swaps to the list pane on selection", async () => {
		withFinderData({});
		const { default: userEvent } = await import("@testing-library/user-event");
		render(<FinderPreferences />);

		expect(screen.getByText("Icon Arrangement:")).toBeInTheDocument();
		expect(
			screen.queryByLabelText("Use relative date"),
		).not.toBeInTheDocument();

		const combo = screen.getByRole("combobox", { name: "View type:" });
		await userEvent.click(combo);
		await userEvent.click(screen.getByRole("option", { name: "List" }));

		expect(screen.getByLabelText("Use relative date")).toBeInTheDocument();
		expect(screen.queryByText("Icon Arrangement:")).not.toBeInTheDocument();
	});

	it("dispatches a nested column write with a dotted path", async () => {
		withFinderData({});
		const { default: userEvent } = await import("@testing-library/user-event");
		render(<FinderPreferences />);
		const combo = screen.getByRole("combobox", { name: "View type:" });
		await userEvent.click(combo);
		await userEvent.click(screen.getByRole("option", { name: "List" }));
		await userEvent.click(screen.getByLabelText("Date Created"));

		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppFinderSetStandardViewOption",
			view: "list",
			option: "columns.created",
			value: true,
		});
	});

	it("dispatches the arrangement radio as a top-level option", async () => {
		withFinderData({});
		const { default: userEvent } = await import("@testing-library/user-event");
		render(<FinderPreferences />);
		await userEvent.click(screen.getByLabelText("Always snap to grid"));

		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppFinderSetStandardViewOption",
			view: "icons",
			option: "arrangement",
			value: "grid",
		});
	});

	// The sort pop-up carries no `label` of its own (the adjacent radio item
	// already says "Keep arranged:"; a second copy would collide as an
	// accessible name). Its aria-label falls back to the current selection's
	// label instead — "by Name" in both cases below, since neither test
	// changes `keepArrangedBy` from its default.
	it("disables the sort pop-up unless Keep arranged is chosen", () => {
		withFinderData({});
		render(<FinderPreferences />);
		expect(screen.getByRole("combobox", { name: "by Name" })).toBeDisabled();
	});

	it("enables the sort pop-up when the arrangement is sorted", () => {
		withFinderData({ standardViews: { icons: { arrangement: "sorted" } } });
		render(<FinderPreferences />);
		expect(
			screen.getByRole("combobox", { name: "by Name" }),
		).not.toBeDisabled();
	});

	it("renders the footer note beside a help icon", () => {
		withFinderData({});
		render(<FinderPreferences />);
		expect(
			screen.getByText(/Changes are applied to all folders/),
		).toBeInTheDocument();
		const help = screen.getByAltText("Help");
		expect(help).toBeInTheDocument();
		// Static badge, not a control — the dialog wires nothing to it.
		expect(help.closest("button")).toBeNull();
	});

	it("dispatches Close when the window closes", () => {
		withFinderData({});
		render(<FinderPreferences />);
		expect(capturedOnCloseFunc).toBeInstanceOf(Function);
		capturedOnCloseFunc?.();
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppFinderPreferencesClose",
		});
	});
});
