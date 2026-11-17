// Menus open where they show (owner report 2026-11-17, plan 0018-dbd Batch
// O). A pull-down hangs from its title's left side; one that would pass the
// desktop's right edge hangs with its right side under its title's right
// side instead, as System 7.5's Help and Application menus do; one still
// too wide is pinned inside the desktop. A submenu flips to its parent's
// left side by the same test, against the desktop's box, not the viewport's.
// jsdom lays nothing out: the boxes below are stubbed.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@/__tests__/test-utils";
import { ClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu";
import { ClassicyMenuBarExtension } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyMenuBarExtension";
import {
	ClassicyMenu,
	type ClassicyMenuItem,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyMenuProvider } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuProvider";
import { ClassicyWindowMenuBar } from "@/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar";

vi.mock("@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss", () => ({}));

// The desktop, 640 x 480 at the viewport's corner as the 7.5 captures are
// (the viewport is jsdom's 1024 x 768, so a test against it would pass the
// menu that the desktop cuts off).
let desktop = { left: 0, top: 0, width: 640, height: 480 };
// Each menu-bar title's box across, by item id: as 7.5 draws them (the Help
// title's box 572-605, `*-755-appmenu-closed.png`).
const TITLES: Record<string, [number, number]> = {
	file: [38, 70],
	help: [572, 605],
	edge: [610, 640],
	win: [560, 600],
	offLeft: [-20, 10],
};
// Each menu's frame width, by the item that opens it.
let widths: Record<string, number> = {};
// A frame's shadow: one pixel past its right side (System 7's, Platinum's).
const SHADOW = 1;
// A submenu's frame over its parent's side.
const OVERLAP = 5;
// A contextual menu wrapper's frame width.
let contextWidth = 100;

const pxOf = (value: string) =>
	[...value.matchAll(/(-?[\d.]+)px/g)].reduce(
		(sum, [, n]) => sum + Number(n),
		0,
	);
const box = (left: number, top: number, width: number, height: number) =>
	DOMRect.fromRect({ x: left, y: top, width, height });

/** The item whose menu `list` is (a title's or a submenu's parent item). */
const ownerOf = (list: Element) => {
	const owner = list.parentElement?.parentElement;
	return owner?.tagName === "LI" ? owner : null;
};

function rectOf(this: Element): DOMRect {
	if (this.classList.contains("classicyDesktop")) {
		return box(desktop.left, desktop.top, desktop.width, desktop.height);
	}
	// A menu bar extension's item, at the bar's right end.
	if (this.classList.contains("classicyDesktopMenuExtension")) {
		return box(560, 0, 40, 19);
	}
	if (this.tagName === "LI" && this.id in TITLES) {
		const [left, right] = TITLES[this.id];
		return box(left, 0, right - left, 19);
	}
	if (this.classList.contains("classicyContextMenuWrapper")) {
		return box(
			pxOf((this as HTMLElement).style.left),
			pxOf((this as HTMLElement).style.top),
			contextWidth,
			50,
		);
	}
	if (this.tagName !== "UL") return box(0, 0, 0, 0);
	if (this.classList.contains("classicyContextMenu")) {
		const wrapper = this.closest(".classicyContextMenuWrapper") as Element;
		return wrapper.getBoundingClientRect();
	}
	const owner = ownerOf(this);
	// A bar's own list.
	if (!owner) return box(0, 0, desktop.width, 20);
	const width = widths[owner.id] ?? 100;
	const wrapper = this.parentElement as HTMLElement;
	const shift = pxOf(wrapper.style.marginLeft);
	const shiftDown = pxOf(wrapper.style.marginTop);
	const flipped = this.classList.contains("classicySubMenuFlipLeft");
	if (owner.id in TITLES) {
		// A pull-down: under its title's left side, or flipped, its right
		// side under the title's right side.
		const [left, right] = TITLES[owner.id];
		return box(
			(flipped ? right - width : left) + shift,
			20 + shiftDown,
			width,
			50,
		);
	}
	// A submenu: beside its parent menu, its frame over the parent's side.
	const parent = (owner.closest("ul") as Element).getBoundingClientRect();
	const left = flipped ? parent.left - width + OVERLAP : parent.right - OVERLAP;
	return box(left + shift, parent.top + shiftDown, width, 50);
}

beforeEach(() => {
	desktop = { left: 0, top: 0, width: 640, height: 480 };
	widths = {};
	contextWidth = 100;
	vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
		rectOf,
	);
	const computed = window.getComputedStyle;
	vi.spyOn(window, "getComputedStyle").mockImplementation(
		(el: Element, pseudo?: string | null) => {
			const isMenuList =
				el.tagName === "UL" &&
				(ownerOf(el) !== null || el.classList.contains("classicyContextMenu"));
			if (pseudo) {
				if (isMenuList && pseudo === "::after") {
					// The frame's right shadow, placed from the padding box (a
					// 1 px border): its right edge SHADOW past the frame's.
					const width = el.getBoundingClientRect().width;
					return {
						content: '""',
						display: "block",
						position: "absolute",
						boxSizing: "content-box",
						left: `${width + SHADOW - 2}px`,
						right: `${-(SHADOW + 1)}px`,
						top: "2px",
						bottom: "-2px",
						width: "1px",
						height: "40px",
					} as unknown as CSSStyleDeclaration;
				}
				return { content: "none" } as unknown as CSSStyleDeclaration;
			}
			if (isMenuList) {
				return {
					boxSizing: "content-box",
					borderLeftWidth: "1px",
					borderRightWidth: "1px",
					borderTopWidth: "1px",
					borderBottomWidth: "1px",
					paddingTop: "0px",
					paddingBottom: "0px",
					boxShadow: "none",
				} as unknown as CSSStyleDeclaration;
			}
			return computed.call(window, el);
		},
	);
});

afterEach(() => {
	vi.restoreAllMocks();
	document.body.innerHTML = "";
});

const menuBar = (items: ClassicyMenuItem[]) => (
	<div className="classicyDesktop">
		<ClassicyMenuProvider>
			<ClassicyMenu
				name="bar"
				menuItems={items}
				navClass="classicyDesktopMenu"
				subNavClass="classicySubMenu"
			/>
		</ClassicyMenuProvider>
	</div>
);

const title = (id: string, children: ClassicyMenuItem[] = []) => ({
	id,
	title: id,
	menuChildren: [{ id: `${id}-1`, title: `${id} one` }, ...children],
});

const listOf = (id: string) =>
	document.querySelector(
		`[id="${id}"] > .classicyMenuWrapper > ul`,
	) as HTMLElement;
const wrapperOf = (id: string) =>
	document.querySelector(`[id="${id}"] > .classicyMenuWrapper`) as HTMLElement;

describe("a menu bar's pull-down", () => {
	it("hangs from its title's left side where it fits", () => {
		render(menuBar([title("file")]));
		fireEvent.click(screen.getByText("file"));
		expect(listOf("file")).not.toHaveClass("classicySubMenuFlipLeft");
		expect(wrapperOf("file").style.marginLeft).toBe("");
		expect(listOf("file").getBoundingClientRect().left).toBe(38);
	});

	it("hangs with its right side under its title's right side when it would pass the desktop's right edge", () => {
		// 7.5's Help menu: 158 wide, its title's box 572-605, so it ends at
		// 605 (`*-menu-help-and-selected-icon.png`: 447-605).
		widths = { help: 158 };
		render(menuBar([title("file"), title("help")]));
		fireEvent.click(screen.getByText("help"));
		expect(listOf("help")).toHaveClass("classicySubMenuFlipLeft");
		expect(wrapperOf("help").style.marginLeft).toBe("");
		const frame = listOf("help").getBoundingClientRect();
		expect([frame.left, frame.right]).toEqual([447, 605]);
	});

	it("counts its frame's shadow: a frame that fits with its shadow past the edge flips", () => {
		// Under the `edge` title (610-640), a 30 px menu's frame ends on the
		// desktop's edge, and its shadow a pixel past it.
		widths = { edge: 30 };
		render(menuBar([title("edge")]));
		fireEvent.click(screen.getByText("edge"));
		expect(listOf("edge")).toHaveClass("classicySubMenuFlipLeft");
		// Flipped, its frame ends under the title's right side, on the edge,
		// its shadow past it: pinned back inside by the shadow's width.
		const frame = listOf("edge").getBoundingClientRect();
		expect(frame.right + SHADOW).toBe(640);
	});

	it("is pinned inside the desktop when it is too wide for the room left of its title's right side", () => {
		widths = { help: 620 };
		render(menuBar([title("help")]));
		fireEvent.click(screen.getByText("help"));
		expect(listOf("help")).toHaveClass("classicySubMenuFlipLeft");
		// Flipped it would start at -15: moved 15 px right, by its wrapper's
		// margins, equal and opposite, so the box moves whole.
		expect(wrapperOf("help").style.marginLeft).toBe("15px");
		expect(wrapperOf("help").style.marginRight).toBe("-15px");
		const frame = listOf("help").getBoundingClientRect();
		expect([frame.left, frame.right]).toEqual([0, 620]);
	});

	it("keeps its left side inside a desktop narrower than itself", () => {
		widths = { help: 700 };
		render(menuBar([title("help")]));
		fireEvent.click(screen.getByText("help"));
		expect(listOf("help").getBoundingClientRect().left).toBe(0);
	});

	it("is measured again when it opens again", () => {
		widths = { help: 158 };
		render(menuBar([title("help")]));
		fireEvent.click(screen.getByText("help"));
		expect(listOf("help")).toHaveClass("classicySubMenuFlipLeft");
		fireEvent.click(screen.getByText("help"));
		expect(listOf("help")).not.toHaveClass("classicySubMenuFlipLeft");
		desktop = { ...desktop, width: 1024 };
		fireEvent.click(screen.getByText("help"));
		expect(listOf("help")).not.toHaveClass("classicySubMenuFlipLeft");
		expect(listOf("help").getBoundingClientRect().left).toBe(572);
	});

	it("is measured again when the desktop changes size while it is open", () => {
		const observers: { cb: ResizeObserverCallback; targets: Element[] }[] = [];
		vi.stubGlobal(
			"ResizeObserver",
			class {
				targets: Element[] = [];
				constructor(cb: ResizeObserverCallback) {
					observers.push({ cb, targets: this.targets });
				}
				observe(target: Element) {
					this.targets.push(target);
				}
				disconnect() {
					this.targets.length = 0;
				}
				unobserve() {}
			},
		);
		widths = { help: 158 };
		desktop = { ...desktop, width: 1024 };
		render(menuBar([title("help")]));
		fireEvent.click(screen.getByText("help"));
		expect(listOf("help")).not.toHaveClass("classicySubMenuFlipLeft");
		const watching = observers.filter((o) =>
			o.targets.some((t) => t.classList.contains("classicyDesktop")),
		);
		expect(watching.length).toBeGreaterThan(0);
		desktop = { ...desktop, width: 640 };
		act(() => {
			for (const o of watching) o.cb([], {} as ResizeObserver);
		});
		expect(listOf("help")).toHaveClass("classicySubMenuFlipLeft");
		const frame = listOf("help").getBoundingClientRect();
		expect([frame.left, frame.right]).toEqual([447, 605]);
		vi.unstubAllGlobals();
	});
});

describe("a window's own menu bar", () => {
	const windowBar = (items: ClassicyMenuItem[]) => (
		<div className="classicyDesktop">
			<div className="classicyWindow">
				<ClassicyWindowMenuBar
					appId="T.app"
					windowId="main"
					menuItems={items}
				/>
			</div>
		</div>
	);

	it("flips a pull-down that would pass the desktop's right edge", () => {
		// A window near the desktop's right side: its title 560-600.
		widths = { win: 120 };
		render(windowBar([title("win")]));
		fireEvent.click(screen.getByText("win"));
		expect(listOf("win")).toHaveClass("classicySubMenuFlipLeft");
		const frame = listOf("win").getBoundingClientRect();
		expect([frame.left, frame.right]).toEqual([480, 600]);
	});

	it("pins a pull-down under a title past the desktop's left edge inside it", () => {
		// The window dragged partly off the desktop's left side.
		render(windowBar([title("offLeft")]));
		fireEvent.click(screen.getByText("offLeft"));
		expect(listOf("offLeft")).not.toHaveClass("classicySubMenuFlipLeft");
		expect(wrapperOf("offLeft").style.marginLeft).toBe("20px");
		expect(listOf("offLeft").getBoundingClientRect().left).toBe(0);
	});
});

describe("a submenu", () => {
	const nested = (parent = "help") =>
		menuBar([
			{
				id: parent,
				title: parent,
				menuChildren: [
					{
						id: "sort",
						title: "Sort By",
						menuChildren: [{ id: "name", title: "Name" }],
					},
				],
			},
		]);

	it("flips to its parent's left side when it would pass the desktop's right edge, not the viewport's", () => {
		// The Help menu flipped to 447-605; its submenu beside it would run
		// 600-760, inside the 1024 px viewport but past the 640 px desktop.
		widths = { help: 158, sort: 160 };
		render(nested());
		fireEvent.click(screen.getByText("help"));
		fireEvent.click(screen.getByText("Sort By"));
		expect(listOf("sort")).toHaveClass("classicySubMenuFlipLeft");
		const frame = listOf("sort").getBoundingClientRect();
		expect([frame.left, frame.right]).toEqual([292, 452]);
	});

	it("stays on its parent's right side where it fits", () => {
		desktop = { ...desktop, width: 1024 };
		widths = { help: 158, sort: 160 };
		render(nested());
		fireEvent.click(screen.getByText("help"));
		fireEvent.click(screen.getByText("Sort By"));
		expect(listOf("sort")).not.toHaveClass("classicySubMenuFlipLeft");
	});

	it("is pinned inside the desktop when flipped it still passes the left edge", () => {
		widths = { help: 158, sort: 500 };
		render(nested());
		fireEvent.click(screen.getByText("help"));
		fireEvent.click(screen.getByText("Sort By"));
		expect(listOf("sort")).toHaveClass("classicySubMenuFlipLeft");
		// Flipped it would start at 447 - 500 + 5 = -48.
		expect(wrapperOf("sort").style.marginLeft).toBe("48px");
		expect(listOf("sort").getBoundingClientRect().left).toBe(0);
	});
});

describe("a submenu that fits on neither side", () => {
	it("is pinned from the side it passes the edge by less", () => {
		// Under File (38-70) in a 400 px desktop, the menu runs 38-196; the
		// 300 px submenu beside it would pass the right edge by 92 (its
		// shadow included), flipped the left edge by 257: it stays on the
		// right side, pinned back by 92.
		desktop = { ...desktop, width: 400 };
		widths = { file: 158, sort: 300 };
		render(
			menuBar([
				{
					id: "file",
					title: "file",
					menuChildren: [
						{
							id: "sort",
							title: "Sort By",
							menuChildren: [{ id: "name", title: "Name" }],
						},
					],
				},
			]),
		);
		fireEvent.click(screen.getByText("file"));
		fireEvent.click(screen.getByText("Sort By"));
		expect(listOf("sort")).not.toHaveClass("classicySubMenuFlipLeft");
		expect(wrapperOf("sort").style.marginLeft).toBe("-92px");
		const frame = listOf("sort").getBoundingClientRect();
		expect([frame.left, frame.right]).toEqual([99, 399]);
	});
});

describe("menus open where they show, vertically", () => {
	it("pins a pull-down that would pass a short desktop's bottom up inside it", () => {
		// The pull-down hangs at 20-70; the desktop ends at 60.
		desktop = { ...desktop, height: 60 };
		render(menuBar([title("file")]));
		fireEvent.click(screen.getByText("file"));
		expect(wrapperOf("file").style.marginTop).toBe("-10px");
		expect(wrapperOf("file").style.marginBottom).toBe("10px");
		expect(listOf("file").getBoundingClientRect().top).toBe(10);
	});

	it("flips a contextual menu up at the desktop's bottom, not the viewport's", () => {
		render(
			<div className="classicyDesktop">
				<ClassicyContextualMenu
					name="ctx"
					position={[100, 450]}
					menuItems={[{ id: "a", title: "A" }]}
				/>
			</div>,
		);
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		// 450 + 50 passes the 480 px desktop (inside the 768 px viewport).
		expect(wrapper.style.top).toBe("400px");
	});

	it("pins a contextual menu flipped up past the desktop's top inside it", () => {
		desktop = { left: 0, top: 100, width: 640, height: 50 };
		render(
			<div className="classicyDesktop">
				<ClassicyContextualMenu
					name="ctx"
					position={[100, 120]}
					menuItems={[{ id: "a", title: "A" }]}
				/>
			</div>,
		);
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		expect(wrapper.style.top).toBe("100px");
	});
});

describe("a desktop resize with a submenu open", () => {
	it("measures the outermost menu first, then each submenu beside its parent's new place", () => {
		const observers: { cb: ResizeObserverCallback; targets: Element[] }[] = [];
		vi.stubGlobal(
			"ResizeObserver",
			class {
				targets: Element[] = [];
				constructor(cb: ResizeObserverCallback) {
					observers.push({ cb, targets: this.targets });
				}
				observe(target: Element) {
					this.targets.push(target);
				}
				disconnect() {
					this.targets.length = 0;
				}
				unobserve() {}
			},
		);
		// In 640: Help flipped to 447-605, its 500 px submenu flipped too
		// (-48) and pinned in by 48.
		widths = { help: 158, sort: 500 };
		render(
			menuBar([
				{
					id: "help",
					title: "help",
					menuChildren: [
						{
							id: "sort",
							title: "Sort By",
							menuChildren: [{ id: "name", title: "Name" }],
						},
					],
				},
			]),
		);
		fireEvent.click(screen.getByText("help"));
		fireEvent.click(screen.getByText("Sort By"));
		expect(listOf("sort").getBoundingClientRect().left).toBe(0);
		// To 1024: Help fits unflipped (572-730); its submenu beside it would
		// run 725-1225, so it flips, to 77-577, and needs no pin. Observers
		// told child first, as a browser may, must not leave the submenu
		// measured against its parent's old place.
		desktop = { ...desktop, width: 1024 };
		const watching = observers.filter((o) =>
			o.targets.some((t) => t.classList.contains("classicyDesktop")),
		);
		act(() => {
			for (const o of [...watching].reverse()) o.cb([], {} as ResizeObserver);
		});
		expect(listOf("help")).not.toHaveClass("classicySubMenuFlipLeft");
		expect(listOf("sort")).toHaveClass("classicySubMenuFlipLeft");
		expect(wrapperOf("sort").style.marginLeft).toBe("");
		const frame = listOf("sort").getBoundingClientRect();
		expect([frame.left, frame.right]).toEqual([77, 577]);
		vi.unstubAllGlobals();
	});
});

describe("a contextual menu", () => {
	it("flips at the desktop's right edge, not the viewport's", () => {
		render(
			<div className="classicyDesktop">
				<ClassicyContextualMenu
					name="ctx"
					position={[600, 100]}
					menuItems={[{ id: "a", title: "A" }]}
				/>
			</div>,
		);
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		// Its right side at the point.
		expect(wrapper.style.left).toBe("500px");
	});

	it("is pinned inside the desktop's left edge when flipped it would pass it", () => {
		contextWidth = 300;
		desktop = { left: 40, top: 0, width: 400, height: 480 };
		render(
			<div className="classicyDesktop">
				<ClassicyContextualMenu
					name="ctx"
					position={[300, 100]}
					menuItems={[{ id: "a", title: "A" }]}
				/>
			</div>,
		);
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		expect(wrapper.style.left).toBe("40px");
	});
});

describe("a contextual menu, as the desktop changes size", () => {
	it("is measured again while it is open", () => {
		const observers: { cb: ResizeObserverCallback; targets: Element[] }[] = [];
		vi.stubGlobal(
			"ResizeObserver",
			class {
				targets: Element[] = [];
				constructor(cb: ResizeObserverCallback) {
					observers.push({ cb, targets: this.targets });
				}
				observe(target: Element) {
					this.targets.push(target);
				}
				disconnect() {
					this.targets.length = 0;
				}
				unobserve() {}
			},
		);
		desktop = { ...desktop, width: 1024 };
		render(
			<div className="classicyDesktop">
				<ClassicyContextualMenu
					name="ctx"
					position={[600, 100]}
					menuItems={[{ id: "a", title: "A" }]}
				/>
			</div>,
		);
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		expect(wrapper.style.left).toBe("600px");
		desktop = { ...desktop, width: 640 };
		act(() => {
			for (const o of observers)
				if (o.targets.some((t) => t.classList.contains("classicyDesktop")))
					o.cb([], {} as ResizeObserver);
		});
		expect(wrapper.style.left).toBe("500px");
		vi.unstubAllGlobals();
	});
});

describe("a menu bar extension's pull-down", () => {
	it("hangs with its right side under the item's right side when it would pass the desktop's right edge", async () => {
		const region = document.createElement("ul");
		region.id = "classicyDesktopMenuExtensions";
		const root = document.createElement("div");
		root.id = "classicyDesktop";
		root.className = "classicyDesktop";
		document.body.append(region, root);
		render(
			<ClassicyMenuBarExtension
				id="user"
				title="Account"
				icon="/user.png"
				menuItems={[{ id: "account", title: "Account…" }]}
			/>,
		);
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Account" }));
		});
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		// Not at the item's left side less its width (460): under its right
		// side, 600.
		expect(wrapper.style.left).toBe("500px");
	});
});
