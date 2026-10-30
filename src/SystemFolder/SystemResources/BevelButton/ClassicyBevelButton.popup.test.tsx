import { describe, expect, it, vi } from "vitest";
import { dispatchAnimationEnd } from "@/__tests__/animationEnd";
import {
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
} from "@/__tests__/test-utils";
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => vi.fn(),
	}),
);

// ClassicyMenu runs a leaf item's action only once its click-flash animation
// ends.
const completeMenuItemFlash = (id: string) =>
	dispatchAnimationEnd(document.getElementById(id));

const lassoItems = (onPick: (id: string) => void): ClassicyMenuItem[] => [
	{
		id: "shrink",
		title: "Shrink",
		checked: true,
		onClickFunc: () => onPick("shrink"),
	},
	{
		id: "no-shrink",
		title: "No Shrink",
		checked: false,
		onClickFunc: () => onPick("no-shrink"),
	},
	{ id: "disabled", title: "Unavailable", disabled: true },
];

/** A mouse click: press, release and the click it produces, on one element. */
const quickClick = (el: Element) => {
	fireEvent.mouseDown(el, { button: 0 });
	fireEvent.mouseUp(el, { button: 0 });
	fireEvent.click(el, { detail: 1 });
};

describe("ClassicyBevelButton pop-up menu (HIGOS8 p.32)", () => {
	it("opens a sticky menu on a click, with the current choice checked", () => {
		render(
			<ClassicyBevelButton
				mode="popup"
				aria-label="Marquee"
				menuItems={lassoItems(vi.fn())}
				popupHoldDelayMs={10_000}
			/>,
		);
		const button = screen.getByRole("button", { name: "Marquee" });
		expect(button).toHaveAttribute("aria-haspopup", "menu");
		expect(button).toHaveAttribute("aria-expanded", "false");

		quickClick(button);

		const menu = screen.getByRole("menu", { name: "Marquee" });
		expect(button).toHaveAttribute("aria-expanded", "true");
		expect(button).toHaveAttribute("aria-controls", menu.id);
		// The button reads as pressed while its menu is down.
		expect(button).toHaveClass("open", "pressed");
		expect(button).not.toHaveAttribute("data-state");
		const shrink = screen.getByRole("menuitem", { name: "Shrink" });
		// The ✓ is package CSS on `.classicyMenuItemCheck.checked::before`.
		expect(shrink.querySelector(".classicyMenuItemCheck")).toHaveClass(
			"checked",
		);
	});

	it("keeps describing its own pop-up even when a caller passes disclosure ARIA", () => {
		render(
			<ClassicyBevelButton
				mode="popup"
				aria-label="Marquee"
				aria-expanded={true}
				aria-controls="somewhere-else"
				aria-haspopup="listbox"
				menuItems={lassoItems(vi.fn())}
				popupHoldDelayMs={10_000}
			/>,
		);
		const button = screen.getByRole("button", { name: "Marquee" });
		// The button owns this menu, so its real state wins over the caller's.
		expect(button).toHaveAttribute("aria-haspopup", "menu");
		expect(button).toHaveAttribute("aria-expanded", "false");
		expect(button).not.toHaveAttribute("aria-controls");

		quickClick(button);

		const menu = screen.getByRole("menu", { name: "Marquee" });
		expect(button).toHaveAttribute("aria-expanded", "true");
		expect(button).toHaveAttribute("aria-controls", menu.id);
	});

	it("runs the chosen item and closes", async () => {
		const onPick = vi.fn();
		render(
			<ClassicyBevelButton
				mode="popup"
				aria-label="Marquee"
				menuItems={lassoItems(onPick)}
				popupHoldDelayMs={10_000}
			/>,
		);
		quickClick(screen.getByRole("button", { name: "Marquee" }));
		await userEvent.setup().click(screen.getByText("No Shrink"));
		completeMenuItemFlash("no-shrink");
		await waitFor(() => expect(onPick).toHaveBeenCalledWith("no-shrink"));
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});

	it("chooses the item a held press is released over (standard menu)", async () => {
		const onPick = vi.fn();
		render(
			<ClassicyBevelButton
				mode="popup"
				aria-label="Marquee"
				menuItems={lassoItems(onPick)}
				popupHoldDelayMs={0}
			/>,
		);
		fireEvent.mouseDown(screen.getByRole("button", { name: "Marquee" }), {
			button: 0,
		});
		// Dragged down onto "No Shrink" and released there.
		fireEvent.mouseUp(screen.getByText("No Shrink"));
		completeMenuItemFlash("no-shrink");
		await waitFor(() => expect(onPick).toHaveBeenCalledWith("no-shrink"));
	});

	it("closes without choosing when a held press is released elsewhere", () => {
		const onPick = vi.fn();
		render(
			<ClassicyBevelButton
				mode="popup"
				aria-label="Marquee"
				menuItems={lassoItems(onPick)}
				popupHoldDelayMs={0}
			/>,
		);
		fireEvent.mouseDown(screen.getByRole("button", { name: "Marquee" }), {
			button: 0,
		});
		fireEvent.mouseUp(document.body);
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		expect(onPick).not.toHaveBeenCalled();
	});

	it("ignores a release over a disabled item", () => {
		render(
			<ClassicyBevelButton
				mode="popup"
				aria-label="Marquee"
				menuItems={lassoItems(vi.fn())}
				popupHoldDelayMs={0}
			/>,
		);
		fireEvent.mouseDown(screen.getByRole("button", { name: "Marquee" }), {
			button: 0,
		});
		fireEvent.mouseUp(screen.getByText("Unavailable"));
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});

	it("closes a sticky menu on a second press of the button, a press outside, or Escape", () => {
		render(
			<>
				<ClassicyBevelButton
					mode="popup"
					aria-label="Marquee"
					menuItems={lassoItems(vi.fn())}
					popupHoldDelayMs={10_000}
				/>
				<p>elsewhere</p>
			</>,
		);
		const button = screen.getByRole("button", { name: "Marquee" });

		quickClick(button);
		expect(screen.getByRole("menu")).toBeInTheDocument();
		quickClick(button);
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();

		quickClick(button);
		fireEvent.mouseDown(screen.getByText("elsewhere"));
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();

		quickClick(button);
		fireEvent.keyDown(document, { key: "Escape" });
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});

	it("opens from the keyboard with the first item focused, and arrows walk the items", () => {
		render(
			<ClassicyBevelButton
				mode="popup"
				aria-label="Marquee"
				menuItems={lassoItems(vi.fn())}
			/>,
		);
		const button = screen.getByRole("button", { name: "Marquee" });
		button.focus();
		// Enter/Space produce a click with no pointer behind it (detail 0).
		fireEvent.click(button, { detail: 0 });
		const [shrink, noShrink] = screen.getAllByRole("menuitem");
		expect(shrink).toHaveFocus();
		fireEvent.keyDown(shrink, { key: "ArrowDown" });
		expect(noShrink).toHaveFocus();
		// The disabled item is skipped: Down from the last enabled item wraps.
		fireEvent.keyDown(noShrink, { key: "ArrowDown" });
		expect(shrink).toHaveFocus();

		fireEvent.keyDown(document, { key: "Escape" });
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		expect(button).toHaveFocus();
	});

	it("opens with Down Arrow", () => {
		render(
			<ClassicyBevelButton
				mode="popup"
				aria-label="Marquee"
				menuItems={lassoItems(vi.fn())}
			/>,
		);
		fireEvent.keyDown(screen.getByRole("button", { name: "Marquee" }), {
			key: "ArrowDown",
		});
		expect(screen.getByRole("menu")).toBeInTheDocument();
	});

	it("reveals arbitrary content instead of a menu (Figure 2-16)", () => {
		render(
			<ClassicyBevelButton
				mode="popup"
				aria-label="Volume"
				popupDirection="horizontal"
				popupContent={<input type="range" aria-label="Level" />}
				popupHoldDelayMs={10_000}
			/>,
		);
		const button = screen.getByRole("button", { name: "Volume" });
		expect(button).toHaveAttribute("aria-haspopup", "dialog");
		quickClick(button);
		const panel = screen.getByRole("dialog", { name: "Volume" });
		expect(panel).toHaveClass("classicyBevelButtonPopupPanel");
		expect(screen.getByRole("slider", { name: "Level" })).toBeInTheDocument();
	});

	it("does nothing while disabled", () => {
		render(
			<ClassicyBevelButton
				mode="popup"
				aria-label="Marquee"
				disabled
				menuItems={lassoItems(vi.fn())}
			/>,
		);
		const button = screen.getByRole("button", { name: "Marquee" });
		quickClick(button);
		fireEvent.keyDown(button, { key: "ArrowDown" });
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});
});

describe("ClassicyBevelButton press-and-hold options (HIGOS8 p.33)", () => {
	it("a click turns the tool on and opens nothing", () => {
		const onChange = vi.fn();
		render(
			<ClassicyBevelButton
				mode="radio"
				aria-label="Lasso"
				popupArrow="small"
				menuItems={lassoItems(vi.fn())}
				popupHoldDelayMs={10_000}
				onChangeFunc={onChange}
			/>,
		);
		const tool = screen.getByRole("radio", { name: "Lasso" });
		// The arrow advertises the options even on a radio-mode tool.
		expect(tool.querySelector(".classicyBevelButtonArrow")).not.toBeNull();
		quickClick(tool);
		expect(onChange).toHaveBeenCalledWith(true);
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});

	it("holding past the double-click interval opens the options and swallows the click", async () => {
		const onClick = vi.fn();
		render(
			<ClassicyBevelButton
				mode="push"
				aria-label="Lasso"
				menuItems={lassoItems(vi.fn())}
				popupHoldDelayMs={20}
				onClickFunc={onClick}
			/>,
		);
		const tool = screen.getByRole("button", { name: "Lasso" });
		fireEvent.mouseDown(tool, { button: 0 });
		await screen.findByRole("menu");
		// Released back over the button: the click that follows is part of the
		// hold gesture, not a use of the tool.
		fireEvent.mouseUp(tool);
		fireEvent.click(tool, { detail: 1 });
		expect(onClick).not.toHaveBeenCalled();
		// A later keyboard press of the button is not swallowed.
		fireEvent.click(tool, { detail: 0 });
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("does not swallow a later click after a hold released over a menu item", async () => {
		const onClick = vi.fn();
		render(
			<ClassicyBevelButton
				mode="push"
				aria-label="Lasso"
				menuItems={lassoItems(vi.fn())}
				popupHoldDelayMs={20}
				onClickFunc={onClick}
			/>,
		);
		const tool = screen.getByRole("button", { name: "Lasso" });
		fireEvent.mouseDown(tool, { button: 0 });
		await screen.findByRole("menu");
		fireEvent.mouseUp(screen.getByText("No Shrink"));
		fireEvent.click(tool, { detail: 0 });
		expect(onClick).toHaveBeenCalledTimes(1);
	});
});

describe("ClassicyBevelButton pop-up placement", () => {
	const at = { top: 100, bottom: 120, left: 50, right: 90 };
	const mockButtonRect = () =>
		vi
			.spyOn(HTMLButtonElement.prototype, "getBoundingClientRect")
			.mockReturnValue({
				...at,
				width: 40,
				height: 20,
				x: at.left,
				y: at.top,
				toJSON: () => ({}),
			} as DOMRect);

	it("opens where the arrow points by default", () => {
		const spy = mockButtonRect();
		render(
			<ClassicyBevelButton
				mode="popup"
				aria-label="More"
				popupDirection="horizontal"
				menuItems={lassoItems(vi.fn())}
				popupHoldDelayMs={10_000}
			/>,
		);
		quickClick(screen.getByRole("button", { name: "More" }));
		const menu = screen.getByRole("menu");
		expect(menu.style.left).toBe("90px"); // to the right
		expect(menu.style.top).toBe("100px");
		spy.mockRestore();
	});

	it("popupPlacement overrides it — a right arrow can open below", () => {
		const spy = mockButtonRect();
		render(
			<ClassicyBevelButton
				mode="popup"
				aria-label="Module"
				popupDirection="horizontal"
				popupPlacement="below"
				menuItems={lassoItems(vi.fn())}
				popupHoldDelayMs={10_000}
			/>,
		);
		quickClick(screen.getByRole("button", { name: "Module" }));
		const menu = screen.getByRole("menu");
		expect(menu.style.left).toBe("50px"); // left edges aligned
		expect(menu.style.top).toBe("120px"); // under the button
		spy.mockRestore();
	});

	it("popupAnchorInset moves the edges the surface is placed against", () => {
		const spy = mockButtonRect();
		render(
			<ClassicyBevelButton
				mode="popup"
				aria-label="Module"
				popupPlacement="below"
				popupAnchorInset={{ top: 3, left: -1 }}
				menuItems={lassoItems(vi.fn())}
				popupHoldDelayMs={10_000}
			/>,
		);
		quickClick(screen.getByRole("button", { name: "Module" }));
		const menu = screen.getByRole("menu");
		expect(menu.style.left).toBe("49px"); // onto the left separator
		expect(menu.style.top).toBe("120px"); // the bottom edge is unchanged
		spy.mockRestore();
	});

	it("popupAlign centres a surface on the button", () => {
		const spy = mockButtonRect();
		// The panel measures itself: 20 x 10.
		const panelRect = vi
			.spyOn(HTMLDivElement.prototype, "getBoundingClientRect")
			.mockReturnValue({
				top: 0,
				bottom: 10,
				left: 0,
				right: 20,
				width: 20,
				height: 10,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			} as DOMRect);
		render(
			<ClassicyBevelButton
				mode="popup"
				aria-label="Volume"
				popupPlacement="below"
				popupAlign="center"
				popupContent={<span>slider</span>}
				popupHoldDelayMs={10_000}
			/>,
		);
		quickClick(screen.getByRole("button", { name: "Volume" }));
		const panel = screen.getByRole("dialog");
		expect(panel.style.left).toBe("60px"); // 50 + (40 - 20) / 2
		panelRect.mockRestore();
		spy.mockRestore();
	});
});
