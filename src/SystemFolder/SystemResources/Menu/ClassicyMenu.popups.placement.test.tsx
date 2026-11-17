// Pop-up menus and pop-up bevel buttons open where they show, by the menu
// bar's rule (ClassicyMenu.placement.test.tsx): a menu that would pass the
// desktop's right edge hangs with its right side under its button's right
// side instead, its frame's shadow counted, and one still too wide is pinned
// inside the desktop. Measured against the desktop's box, not the
// viewport's. jsdom lays nothing out: the boxes below are stubbed.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	act,
	fireEvent,
	render,
	screen,
	userEvent,
} from "@/__tests__/test-utils";
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";
import { ClassicyComboBox } from "@/SystemFolder/SystemResources/ComboBox/ClassicyComboBox";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({ useClassicyAnalytics: () => ({ track: vi.fn() }) }),
);
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => vi.fn() }),
);

// A 640 x 480 desktop in jsdom's 1024 x 768 viewport; the button at its
// right end. A test may move either.
let DESKTOP = { left: 0, top: 0, width: 640, height: 480 };
let BUTTON = { left: 600, right: 630, top: 100, bottom: 120 };
// The open surface's frame width and content height, a test's to set.
let surfaceWidth = 100;
let surfaceContent = 56;

const pxOf = (value: string) => Number.parseFloat(value) || 0;
const box = (left: number, top: number, width: number, height: number) =>
	DOMRect.fromRect({ x: left, y: top, width, height });

/** The fixed surface a stub places: an open pop-up list or bevel popup. */
const isSurface = (el: Element) =>
	el.getAttribute("role") === "listbox" ||
	el.classList.contains("classicyBevelButtonPopup");

beforeEach(() => {
	surfaceWidth = 100;
	surfaceContent = 56;
	DESKTOP = { left: 0, top: 0, width: 640, height: 480 };
	BUTTON = { left: 600, right: 630, top: 100, bottom: 120 };
	vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
		function (this: Element) {
			if (this.classList.contains("classicyDesktop"))
				return box(DESKTOP.left, DESKTOP.top, DESKTOP.width, DESKTOP.height);
			if (
				this.tagName === "BUTTON" ||
				this.classList.contains("classicyComboBox")
			)
				return box(
					BUTTON.left,
					BUTTON.top,
					BUTTON.right - BUTTON.left,
					BUTTON.bottom - BUTTON.top,
				);
			if (isSurface(this)) {
				const style = (this as HTMLElement).style;
				// Its content (`surfaceContent`, default 56) capped by its
				// max-height, then its frame (1 px of padding and of border each
				// side); placed by its top, or its bottom from the viewport's.
				const cap = Number.parseFloat(style.maxHeight);
				const height =
					(Number.isFinite(cap)
						? Math.min(surfaceContent, cap)
						: surfaceContent) + 4;
				const top = style.top
					? pxOf(style.top)
					: style.bottom
						? window.innerHeight - pxOf(style.bottom) - height
						: 0;
				return box(pxOf(style.left), top, surfaceWidth, height);
			}
			// A bevel popup's menu list fills the popup.
			const surface = this.parentElement?.closest(".classicyBevelButtonPopup");
			if (this.tagName === "UL" && surface && !this.closest("li"))
				return surface.getBoundingClientRect();
			return box(0, 0, 0, 0);
		},
	);
	const computed = window.getComputedStyle;
	vi.spyOn(window, "getComputedStyle").mockImplementation(
		(el: Element, pseudo?: string | null) => {
			if (pseudo) return { content: "none" } as unknown as CSSStyleDeclaration;
			// Platinum's pop-up list draws its shadow as a box-shadow, 2 px
			// out to the right and below.
			if (isSurface(el))
				return {
					boxShadow:
						"rgb(255, 255, 255) 1px 1px 0px 0px inset, rgb(0, 0, 0) 2px 2px 0px 0px",
					borderLeftWidth: "1px",
					borderRightWidth: "1px",
					borderTopWidth: "1px",
					borderBottomWidth: "1px",
				} as unknown as CSSStyleDeclaration;
			return computed.call(window, el);
		},
	);
});

afterEach(() => {
	vi.restoreAllMocks();
	document.body.innerHTML = "";
});

const onDesktop = (ui: React.ReactNode) => (
	<div className="classicyDesktop" id="classicyDesktop">
		{ui}
	</div>
);

const options = [
	{ value: "geneva", label: "Geneva" },
	{ value: "chicago", label: "Chicago" },
];

describe("a pop-up menu", () => {
	it("hangs from its button's left side where it fits", async () => {
		surfaceWidth = 30;
		render(
			onDesktop(
				<ClassicyPopUpMenu id="f" options={options} selected="geneva" />,
			),
		);
		await userEvent.setup().click(screen.getByRole("combobox"));
		expect(screen.getByRole("listbox").style.left).toBe("600px");
	});

	it("hangs with its right side under its button's right side when it would pass the desktop's right edge", async () => {
		render(
			onDesktop(
				<ClassicyPopUpMenu id="f" options={options} selected="geneva" />,
			),
		);
		await userEvent.setup().click(screen.getByRole("combobox"));
		// 600 + 100 + its 2 px shadow passes 640: 630 - 100.
		expect(screen.getByRole("listbox").style.left).toBe("530px");
	});

	it("is pinned inside the desktop when it is wider than the room left of its button's right side", async () => {
		surfaceWidth = 700;
		render(
			onDesktop(
				<ClassicyPopUpMenu id="f" options={options} selected="geneva" />,
			),
		);
		await userEvent.setup().click(screen.getByRole("combobox"));
		expect(screen.getByRole("listbox").style.left).toBe("0px");
	});
});

describe("a combo box's list", () => {
	it("hangs with its right side under its field's right side when it would pass the desktop's right edge", async () => {
		render(
			onDesktop(
				<ClassicyComboBox
					id="c"
					options={[{ value: "a", label: "Apple" }]}
					prefillValue=""
				/>,
			),
		);
		fireEvent.click(screen.getByRole("button", { name: "Show options" }));
		expect(screen.getByRole("listbox").style.left).toBe("530px");
	});
});

describe("a pop-up bevel button's menu", () => {
	const quickClick = (el: Element) => {
		fireEvent.mouseDown(el, { button: 0 });
		fireEvent.mouseUp(el, { button: 0 });
		fireEvent.click(el, { detail: 1 });
	};
	const bevel = () =>
		onDesktop(
			<ClassicyBevelButton
				mode="popup"
				aria-label="Marquee"
				popupPlacement="below"
				menuItems={[{ id: "a", title: "A" }]}
				popupHoldDelayMs={10_000}
			/>,
		);

	it("hangs below with its left side under the button's where it fits", () => {
		surfaceWidth = 30;
		render(bevel());
		quickClick(screen.getByRole("button", { name: "Marquee" }));
		expect(screen.getByRole("menu").style.left).toBe("600px");
	});

	it("hangs with its right side under the button's right side when it would pass the desktop's right edge", () => {
		render(bevel());
		quickClick(screen.getByRole("button", { name: "Marquee" }));
		// Not clamped flush to the viewport's 1024 px edge: the desktop's.
		expect(screen.getByRole("menu").style.left).toBe("530px");
	});

	it("is pinned inside the desktop when it is wider than the room left of the button's right side", () => {
		surfaceWidth = 700;
		render(bevel());
		quickClick(screen.getByRole("button", { name: "Marquee" }));
		expect(screen.getByRole("menu").style.left).toBe("0px");
	});
});

// The bounds' top and bottom too: a desktop shorter than the viewport,
// its button at the bottom (a desktop embedded in a page).
describe("down, in a desktop shorter than the viewport", () => {
	beforeEach(() => {
		DESKTOP = { left: 0, top: 0, width: 640, height: 200 };
		BUTTON = { left: 300, right: 340, top: 180, bottom: 200 };
	});

	it("slides an aligned pop-up menu up inside the desktop", async () => {
		render(
			onDesktop(
				<ClassicyPopUpMenu id="f" options={options} selected="geneva" />,
			),
		);
		await userEvent.setup().click(screen.getByRole("combobox"));
		// Its 64 px floor would run past 196 (200 less the margin) from 190;
		// its 2 px shadow comes off the room too: 200 − 2 − 4 − 64.
		expect(screen.getByRole("listbox").style.top).toBe("130px");
	});

	it("grows a combo box's list upward when there is no room below in the desktop", () => {
		vi.spyOn(Element.prototype, "scrollHeight", "get").mockImplementation(
			function (this: Element) {
				return this.getAttribute("role") === "listbox" ? 120 : 0;
			},
		);
		render(
			onDesktop(
				<ClassicyComboBox
					id="c"
					options={[{ value: "a", label: "Apple" }]}
					prefillValue=""
				/>,
			),
		);
		fireEvent.click(screen.getByRole("button", { name: "Show options" }));
		const list = screen.getByRole("listbox");
		// Its bottom on the field's top (768 − 180), not hanging below 200.
		expect(list.style.bottom).toBe("588px");
		expect(list.style.top).toBe("");
	});

	it("flips a bevel button's menu up when there is no room below in the desktop", () => {
		render(
			onDesktop(
				<ClassicyBevelButton
					mode="popup"
					aria-label="Marquee"
					popupPlacement="below"
					menuItems={[{ id: "a", title: "A" }]}
					popupHoldDelayMs={10_000}
				/>,
			),
		);
		const button = screen.getByRole("button", { name: "Marquee" });
		fireEvent.mouseDown(button, { button: 0 });
		fireEvent.mouseUp(button, { button: 0 });
		fireEvent.click(button, { detail: 1 });
		expect(screen.getByRole("menu").style.top).toBe("120px");
	});
});

describe("a combo box's scroll indicators", () => {
	it("follow its list across when typing re-places it", () => {
		vi.spyOn(Element.prototype, "scrollHeight", "get").mockImplementation(
			function (this: Element) {
				return this.getAttribute("role") === "listbox" ? 400 : 0;
			},
		);
		vi.spyOn(Element.prototype, "clientHeight", "get").mockImplementation(
			function (this: Element) {
				return this.getAttribute("role") === "listbox" ? 100 : 0;
			},
		);
		render(
			onDesktop(
				<ClassicyComboBox
					id="c"
					options={[
						{ value: "a", label: "Apple" },
						{ value: "b", label: "Apricot" },
					]}
					prefillValue=""
				/>,
			),
		);
		fireEvent.click(screen.getByRole("button", { name: "Show options" }));
		const down = () =>
			document.querySelector<HTMLElement>(
				'[data-classicy-part="menu-scroll-down"]',
			);
		expect(screen.getByRole("listbox").style.left).toBe("530px");
		expect(down()?.style.left).toBe("530px");
		// Typing narrows it so it fits under the field's left side again.
		surfaceWidth = 30;
		act(() => {
			fireEvent.change(screen.getByRole("combobox"), {
				target: { value: "Ap" },
			});
		});
		expect(screen.getByRole("listbox").style.left).toBe("600px");
		expect(down()?.style.left).toBe("600px");
	});
});

// A desktop barely taller than a list's 64 px floor (80 px): its frame and
// its 2 px shadow (Platinum's box-shadow) stay inside, sliding or pinned.
describe("in a desktop barely taller than a list's floor", () => {
	beforeEach(() => {
		DESKTOP = { left: 0, top: 0, width: 640, height: 80 };
		BUTTON = { left: 300, right: 340, top: 58, bottom: 78 };
		vi.spyOn(Element.prototype, "scrollHeight", "get").mockImplementation(
			function (this: Element) {
				return this.getAttribute("role") === "listbox" ? 120 : 0;
			},
		);
		surfaceContent = 120;
	});

	const inkBottom = (list: HTMLElement) =>
		list.getBoundingClientRect().bottom + 2;

	it("keeps an aligned pop-up menu's shadow inside the desktop's bottom", async () => {
		render(
			onDesktop(
				<ClassicyPopUpMenu id="f" options={options} selected="geneva" />,
			),
		);
		await userEvent.setup().click(screen.getByRole("combobox"));
		const list = screen.getByRole("listbox");
		expect(list.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
		expect(inkBottom(list)).toBeLessThanOrEqual(80);
	});

	it("pins a combo box's list with no room above or below the field inside the desktop", () => {
		render(
			onDesktop(
				<ClassicyComboBox
					id="c"
					options={[{ value: "a", label: "Apple" }]}
					prefillValue=""
				/>,
			),
		);
		fireEvent.click(screen.getByRole("button", { name: "Show options" }));
		const list = screen.getByRole("listbox");
		expect(list.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
		expect(inkBottom(list)).toBeLessThanOrEqual(80);
	});
});

// Below the floor: a desktop shorter than a list's 64 px floor and its
// frame. The list cannot show whole anywhere; its top wins, at the
// desktop's top, as a pull-down's does.
describe("in a desktop shorter than a list's floor", () => {
	it("keeps a combo box list's top inside the desktop", () => {
		DESKTOP = { left: 0, top: 0, width: 640, height: 50 };
		BUTTON = { left: 300, right: 340, top: 28, bottom: 48 };
		vi.spyOn(Element.prototype, "scrollHeight", "get").mockImplementation(
			function (this: Element) {
				return this.getAttribute("role") === "listbox" ? 120 : 0;
			},
		);
		surfaceContent = 120;
		render(
			onDesktop(
				<ClassicyComboBox
					id="c"
					options={[{ value: "a", label: "Apple" }]}
					prefillValue=""
				/>,
			),
		);
		fireEvent.click(screen.getByRole("button", { name: "Show options" }));
		expect(screen.getByRole("listbox").getBoundingClientRect().top).toBe(0);
	});
});

describe("a combo box's list in a desktop of ordinary height", () => {
	it("measures its room from the field's edge it hangs from", () => {
		// A field at 200-220 in a 480 px desktop, a long list: below it the
		// room is 480 − 220, not 480 − 200, so the list (its frame and its
		// shadow) ends inside the desktop.
		DESKTOP = { left: 0, top: 0, width: 640, height: 480 };
		BUTTON = { left: 300, right: 340, top: 200, bottom: 220 };
		vi.spyOn(Element.prototype, "scrollHeight", "get").mockImplementation(
			function (this: Element) {
				return this.getAttribute("role") === "listbox" ? 450 : 0;
			},
		);
		surfaceContent = 450;
		render(
			onDesktop(
				<ClassicyComboBox
					id="c"
					options={[{ value: "a", label: "Apple" }]}
					prefillValue=""
				/>,
			),
		);
		fireEvent.click(screen.getByRole("button", { name: "Show options" }));
		const list = screen.getByRole("listbox");
		expect(list.getBoundingClientRect().top).toBe(220);
		expect(list.getBoundingClientRect().bottom + 2).toBeLessThanOrEqual(480);
	});
});
