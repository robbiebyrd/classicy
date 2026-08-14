import { describe, expect, it } from "vitest";
import { render, screen, userEvent, waitFor } from "@/__tests__/test-utils";
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";
import {
	ClassicyButtonToolbar,
	ClassicyButtonToolbarGroup,
} from "@/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar";

const separators = (container: HTMLElement) =>
	container.querySelectorAll(".classicySeparatorVertical");

describe("ClassicyButtonToolbar", () => {
	it("renders no separator for a single group", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<button type="button">A</button>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(separators(container)).toHaveLength(0);
	});

	it("renders one separator between two groups", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<button type="button">A</button>
				</ClassicyButtonToolbarGroup>
				<ClassicyButtonToolbarGroup>
					<button type="button">B</button>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(separators(container)).toHaveLength(1);
	});

	it("renders N-1 separators for N groups", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<button type="button">A</button>
				</ClassicyButtonToolbarGroup>
				<ClassicyButtonToolbarGroup>
					<button type="button">B</button>
				</ClassicyButtonToolbarGroup>
				<ClassicyButtonToolbarGroup>
					<button type="button">C</button>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(separators(container)).toHaveLength(2);
	});

	it("renders nothing but the container when empty", () => {
		const { container } = render(
			<ClassicyButtonToolbar>{null}</ClassicyButtonToolbar>,
		);
		expect(
			container.querySelector(".classicyButtonToolbar"),
		).toBeInTheDocument();
		expect(separators(container)).toHaveLength(0);
	});

	it("ignores a falsy conditional group when counting separators", () => {
		const show = false;
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<button type="button">A</button>
				</ClassicyButtonToolbarGroup>
				{show && (
					<ClassicyButtonToolbarGroup>
						<button type="button">B</button>
					</ClassicyButtonToolbarGroup>
				)}
			</ClassicyButtonToolbar>,
		);
		expect(separators(container)).toHaveLength(0);
	});

	it("renders a non-button child inside a group without error", () => {
		const { getByText } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<span>label</span>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(getByText("label")).toBeInTheDocument();
	});

	it("exposes role=toolbar on the root element", () => {
		render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<button type="button">A</button>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(screen.getByRole("toolbar")).toBeInTheDocument();
	});

	it("merges an extra className onto the toolbar", () => {
		const { container } = render(
			<ClassicyButtonToolbar className="extraBar">
				<ClassicyButtonToolbarGroup>
					<button type="button">A</button>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(container.querySelector(".classicyButtonToolbar")).toHaveClass(
			"extraBar",
		);
	});
});

describe("ClassicyBevelButton square defaults inside a toolbar", () => {
	const squareButtons = (container: HTMLElement) =>
		container.querySelectorAll(".classicyBevelButtonSquare");

	it("makes an icon-only button square inside a toolbar", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<ClassicyBevelButton icon="/i.png" iconAlt="Back" />
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(squareButtons(container)).toHaveLength(1);
	});

	it("leaves a text button rectangular inside a toolbar", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<ClassicyBevelButton>Open</ClassicyBevelButton>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(squareButtons(container)).toHaveLength(0);
	});

	it("leaves an icon button WITH text rectangular inside a toolbar", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<ClassicyBevelButton icon="/i.png" iconAlt="Back">
						Back
					</ClassicyBevelButton>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(squareButtons(container)).toHaveLength(0);
	});

	it("honors an explicit square={false} on an icon-only toolbar button", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<ClassicyBevelButton icon="/i.png" iconAlt="Back" square={false} />
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(squareButtons(container)).toHaveLength(0);
	});

	it("honors an explicit square on a text toolbar button", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<ClassicyBevelButton square>Go</ClassicyBevelButton>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(squareButtons(container)).toHaveLength(1);
	});

	it("does not make an icon-only button square outside a toolbar", () => {
		const { container } = render(
			<ClassicyBevelButton icon="/i.png" iconAlt="Back" />,
		);
		expect(squareButtons(container)).toHaveLength(0);
	});
});

describe("ClassicyButtonToolbar roving tabindex", () => {
	const threeButtonToolbar = (extra?: { middleDisabled?: boolean }) => (
		<ClassicyButtonToolbar>
			<ClassicyButtonToolbarGroup>
				<button type="button">A</button>
				<button type="button" disabled={extra?.middleDisabled}>
					B
				</button>
				<button type="button">C</button>
			</ClassicyButtonToolbarGroup>
		</ClassicyButtonToolbar>
	);

	const getButtons = (container: HTMLElement) =>
		Array.from(container.querySelectorAll("button"));

	it("puts only the first control in the tab sequence initially", () => {
		const { container } = render(threeButtonToolbar());
		const [a, b, c] = getButtons(container);
		expect(a).toHaveAttribute("tabIndex", "0");
		expect(b).toHaveAttribute("tabIndex", "-1");
		expect(c).toHaveAttribute("tabIndex", "-1");
	});

	it("moves focus and the tabIndex=0 marker with ArrowRight", async () => {
		const user = userEvent.setup();
		const { container } = render(threeButtonToolbar());
		const [a, b] = getButtons(container);
		a.focus();
		await user.keyboard("{ArrowRight}");
		expect(b).toHaveFocus();
		expect(b).toHaveAttribute("tabIndex", "0");
		expect(a).toHaveAttribute("tabIndex", "-1");
	});

	it("moves focus and the tabIndex=0 marker with ArrowLeft", async () => {
		const user = userEvent.setup();
		const { container } = render(threeButtonToolbar());
		const [a, b, c] = getButtons(container);
		c.focus();
		await user.keyboard("{ArrowLeft}");
		expect(b).toHaveFocus();
		expect(b).toHaveAttribute("tabIndex", "0");
		expect(a).toHaveAttribute("tabIndex", "-1");
		expect(c).toHaveAttribute("tabIndex", "-1");
	});

	it("jumps to the first control with Home", async () => {
		const user = userEvent.setup();
		const { container } = render(threeButtonToolbar());
		const [a, , c] = getButtons(container);
		c.focus();
		await user.keyboard("{Home}");
		expect(a).toHaveFocus();
		expect(a).toHaveAttribute("tabIndex", "0");
	});

	it("jumps to the last control with End", async () => {
		const user = userEvent.setup();
		const { container } = render(threeButtonToolbar());
		const [a, , c] = getButtons(container);
		a.focus();
		await user.keyboard("{End}");
		expect(c).toHaveFocus();
		expect(c).toHaveAttribute("tabIndex", "0");
	});

	it("wraps ArrowRight from the last control back to the first", async () => {
		const user = userEvent.setup();
		const { container } = render(threeButtonToolbar());
		const [a, , c] = getButtons(container);
		c.focus();
		await user.keyboard("{ArrowRight}");
		expect(a).toHaveFocus();
		expect(a).toHaveAttribute("tabIndex", "0");
	});

	it("wraps ArrowLeft from the first control back to the last", async () => {
		const user = userEvent.setup();
		const { container } = render(threeButtonToolbar());
		const [a, , c] = getButtons(container);
		a.focus();
		await user.keyboard("{ArrowLeft}");
		expect(c).toHaveFocus();
		expect(c).toHaveAttribute("tabIndex", "0");
	});

	it("skips a disabled button when navigating with ArrowRight", async () => {
		const user = userEvent.setup();
		const { container } = render(threeButtonToolbar({ middleDisabled: true }));
		const [a, b, c] = getButtons(container);
		expect(b).toBeDisabled();
		a.focus();
		await user.keyboard("{ArrowRight}");
		expect(c).toHaveFocus();
		expect(c).toHaveAttribute("tabIndex", "0");
	});

	it("does not intercept arrow keys when focus is outside the toolbar", async () => {
		const user = userEvent.setup();
		const { container, getByTestId } = render(
			<div>
				<button type="button" data-testid="outside">
					Outside
				</button>
				{threeButtonToolbar()}
			</div>,
		);
		const outside = getByTestId("outside");
		const [a] = getButtons(container).filter((btn) => btn !== outside);
		outside.focus();
		await user.keyboard("{ArrowRight}");
		expect(outside).toHaveFocus();
		// The toolbar's own roving tabindex is untouched by the stray key press.
		expect(a).toHaveAttribute("tabIndex", "0");
	});

	// Finding 1: the toolbar's children are arbitrary (R7). handleKeyDown must
	// not claim arrow/Home/End presses that genuinely belong to a nested
	// control — an <input>'s caret navigation, or a control that has already
	// preventDefault()'d the key itself (e.g. an open ClassicyPopUpMenu).
	// Mounting a real ClassicyPopUpMenu here would exercise the same
	// defaultPrevented mechanism as the second test below via a heavier
	// component, so it isn't duplicated separately.
	it("does not steal focus from an input's caret navigation on ArrowLeft", async () => {
		const user = userEvent.setup();
		const { container, getByTestId } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<button type="button">A</button>
					<input data-testid="toolbar-input" defaultValue="hello" />
					<button type="button">C</button>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		const input = getByTestId("toolbar-input") as HTMLInputElement;
		const buttons = getButtons(container);
		input.focus();
		await user.keyboard("{ArrowLeft}");
		expect(input).toHaveFocus();
		expect(buttons.every((b) => !b.matches(":focus"))).toBe(true);
	});

	it("does not steal focus from an input's caret navigation on Home", async () => {
		const user = userEvent.setup();
		const { getByTestId } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<button type="button">A</button>
					<input data-testid="toolbar-input" defaultValue="hello" />
					<button type="button">C</button>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		const input = getByTestId("toolbar-input") as HTMLInputElement;
		input.focus();
		await user.keyboard("{Home}");
		expect(input).toHaveFocus();
	});

	it("does not act on a control that already called preventDefault for the key", async () => {
		const user = userEvent.setup();
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<button type="button">A</button>
					<button
						type="button"
						onKeyDown={(e) => {
							// Mirrors ClassicyPopUpMenu, which preventDefault()s Home/End/
							// ArrowRight while its own listbox is open so the toolbar
							// doesn't move focus out from under it.
							if (e.key === "ArrowRight") e.preventDefault();
						}}
					>
						B
					</button>
					<button type="button">C</button>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		const [, b, c] = getButtons(container);
		b.focus();
		await user.keyboard("{ArrowRight}");
		expect(b).toHaveFocus();
		expect(c).not.toHaveFocus();
	});

	it("does not intercept Cmd/Ctrl+ArrowRight (reserved for browser history nav)", async () => {
		const user = userEvent.setup();
		const { container } = render(threeButtonToolbar());
		const [a, b] = getButtons(container);
		a.focus();
		await user.keyboard("{Control>}{ArrowRight}{/Control}");
		expect(a).toHaveFocus();
		expect(b).not.toHaveFocus();
	});

	// Finding 3: a child that toggles its own `disabled` attribute directly on
	// the DOM (bypassing React, so the toolbar never re-renders) must not be
	// left with two tab stops — the toolbar's real tab stop plus the newly
	// enabled control's implicit tabIndex=0.
	it("keeps exactly one tab stop when a child's disabled toggles without a toolbar re-render", async () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<button type="button">A</button>
					<button type="button" disabled>
						B
					</button>
					<button type="button">C</button>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		// jsdom's `tabIndex` property getter doesn't model "disabled elements
		// are unfocusable" the way real browsers do, so this reads the
		// "tabindex" content attribute directly — a missing attribute on a
		// non-disabled button is the implicit tabIndex=0 the bug produces.
		const isTabStop = (el: HTMLButtonElement) => {
			if (el.disabled) return false;
			const attr = el.getAttribute("tabindex");
			return attr === null || attr === "0";
		};
		const tabStops = () => getButtons(container).filter(isTabStop);
		const [a, b] = getButtons(container);
		expect(tabStops()).toEqual([a]);

		// Flip `disabled` directly on the DOM node — no setState, no re-render —
		// so only a MutationObserver (or equivalent) can catch this.
		b.disabled = false;

		await waitFor(() => {
			expect(tabStops()).toHaveLength(1);
		});
		expect(tabStops()).toEqual([a]);
	});
});

describe("ClassicyButtonToolbar size", () => {
	const toolbar = (container: HTMLElement) =>
		container.querySelector(".classicyButtonToolbar") as HTMLElement;

	it("renders no size modifier class by default (large)", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<button type="button">A</button>
			</ClassicyButtonToolbar>,
		);
		expect(toolbar(container).className).toBe("classicyButtonToolbar");
	});

	it("renders no size modifier class for an explicit size=large", () => {
		const { container } = render(
			<ClassicyButtonToolbar size="large">
				<button type="button">A</button>
			</ClassicyButtonToolbar>,
		);
		expect(toolbar(container).className).toBe("classicyButtonToolbar");
	});

	it("adds the medium modifier class for size=medium", () => {
		const { container } = render(
			<ClassicyButtonToolbar size="medium">
				<button type="button">A</button>
			</ClassicyButtonToolbar>,
		);
		expect(toolbar(container)).toHaveClass(
			"classicyButtonToolbar",
			"classicyButtonToolbarSizeMedium",
		);
	});

	it("adds the small modifier class for size=small", () => {
		const { container } = render(
			<ClassicyButtonToolbar size="small">
				<button type="button">A</button>
			</ClassicyButtonToolbar>,
		);
		expect(toolbar(container)).toHaveClass(
			"classicyButtonToolbar",
			"classicyButtonToolbarSizeSmall",
		);
	});

	it("merges a size modifier with a consumer className", () => {
		const { container } = render(
			<ClassicyButtonToolbar size="small" className="myToolbar">
				<button type="button">A</button>
			</ClassicyButtonToolbar>,
		);
		expect(toolbar(container)).toHaveClass(
			"classicyButtonToolbarSizeSmall",
			"myToolbar",
		);
	});
});
