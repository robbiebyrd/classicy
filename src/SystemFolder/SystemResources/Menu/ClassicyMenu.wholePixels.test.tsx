// Menus land on whole pixels: a frame and its one-pixel shadow placed a
// fraction across blend their columns (Firefox drew a Platinum pull-down at
// x 89.5 a level off). Each host that places a menu rounds where it puts it.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({ useAppManagerDispatch: () => vi.fn() }),
);
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => vi.fn() }),
);
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({ useClassicyAnalytics: () => ({ track: vi.fn() }) }),
);

import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";
import { ClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";

const items = [
	{ id: "a", title: "One" },
	{ id: "b", title: "Two" },
];

afterEach(() => vi.restoreAllMocks());

// The control that anchors a menu sits a fraction across and down.
const fractionalButtons = () =>
	vi
		.spyOn(HTMLButtonElement.prototype, "getBoundingClientRect")
		.mockReturnValue(
			DOMRect.fromRect({ x: 89.5, y: 40.25, width: 120.5, height: 20 }),
		);

describe("menus on whole pixels", () => {
	it("places a contextual menu on whole pixels", () => {
		const { container } = render(
			<ClassicyContextualMenu
				name="ctx"
				menuItems={items}
				position={[89.5, 40.25]}
				onClose={vi.fn()}
			/>,
		);
		const wrapper = container.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		expect(wrapper.style.left).toBe("90px");
		expect(wrapper.style.top).toBe("40px");
	});

	it("places a bevel button's pop-up menu on whole pixels", () => {
		fractionalButtons();
		render(
			<ClassicyBevelButton
				mode="popup"
				aria-label="Marquee"
				menuItems={items}
				popupHoldDelayMs={10_000}
			/>,
		);
		const button = screen.getByRole("button", { name: "Marquee" });
		fireEvent.mouseDown(button, { button: 0 });
		fireEvent.mouseUp(button, { button: 0 });
		fireEvent.click(button, { detail: 1 });
		const popup = document.querySelector(
			".classicyBevelButtonPopup",
		) as HTMLElement;
		expect(Number.isInteger(Number.parseFloat(popup.style.left))).toBe(true);
		expect(Number.isInteger(Number.parseFloat(popup.style.top))).toBe(true);
	});

	it("places a pop-up menu's list on whole pixels", () => {
		fractionalButtons();
		render(
			<ClassicyPopUpMenu
				id="pop"
				options={[
					{ value: "a", label: "One" },
					{ value: "b", label: "Two" },
				]}
				selected="a"
			/>,
		);
		fireEvent.click(screen.getByRole("combobox"));
		const list = screen.getByRole("listbox");
		expect(list.style.left).toBe("90px");
		expect(Number.isInteger(Number.parseFloat(list.style.top))).toBe(true);
	});

	// A placeholder menu has no selection to align, so it grows from the
	// button's edge: its top from the button's top, or, with more room
	// above, its bottom from the button's bottom.
	it("places a pop-up menu grown down from its button on whole pixels", () => {
		fractionalButtons();
		render(
			<ClassicyPopUpMenu
				id="pop"
				placeholder="Choose"
				options={[
					{ value: "a", label: "One" },
					{ value: "b", label: "Two" },
				]}
			/>,
		);
		fireEvent.click(screen.getByRole("combobox"));
		expect(screen.getByRole("listbox").style.top).toBe("40px");
	});

	it("places a pop-up menu grown up from its button on whole pixels", () => {
		const innerHeight = window.innerHeight;
		window.innerHeight = 560;
		try {
			// A button low on the screen, and a list taller than the room below.
			vi.spyOn(
				HTMLButtonElement.prototype,
				"getBoundingClientRect",
			).mockReturnValue(
				DOMRect.fromRect({ x: 89.5, y: 500.25, width: 120.5, height: 20 }),
			);
			vi.spyOn(Element.prototype, "scrollHeight", "get").mockImplementation(
				function (this: Element) {
					return this.getAttribute("role") === "listbox" ? 200 : 0;
				},
			);
			render(
				<ClassicyPopUpMenu
					id="pop"
					placeholder="Choose"
					options={[
						{ value: "a", label: "One" },
						{ value: "b", label: "Two" },
					]}
				/>,
			);
			fireEvent.click(screen.getByRole("combobox"));
			const list = screen.getByRole("listbox");
			expect(list.classList.contains("classicyPopUpMenuListAbove")).toBe(true);
			// 560 − 520.25 = 39.75.
			expect(list.style.bottom).toBe("40px");
		} finally {
			window.innerHeight = innerHeight;
		}
	});
});
