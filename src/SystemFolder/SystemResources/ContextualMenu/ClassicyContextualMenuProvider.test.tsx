import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyContextualMenuOptions,
	ClassicyContextualMenuProvider,
	useClassicyContextualMenu,
} from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { setClassicyTaskbarBand } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal";

const menuA: ClassicyMenuItem[] = [{ id: "a1", title: "Alpha One" }];
const menuB: ClassicyMenuItem[] = [{ id: "b1", title: "Beta One" }];

const Trigger = ({
	items,
	label,
}: {
	items: ClassicyMenuItem[];
	label: string;
}) => {
	const { showContextMenu, hideContextMenu } = useClassicyContextualMenu();
	return (
		<>
			<button type="button" onClick={() => showContextMenu(items, [100, 100])}>
				{label}
			</button>
			<button type="button" onClick={() => hideContextMenu()}>
				hide-{label}
			</button>
		</>
	);
};

describe("ClassicyContextualMenuProvider", () => {
	it("shows the menu when showContextMenu is called", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
		fireEvent.click(screen.getByText("show-a"));
		expect(screen.getByText("Alpha One")).toBeInTheDocument();
	});

	it("replaces an open menu when showContextMenu is called again", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
				<Trigger items={menuB} label="show-b" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		fireEvent.click(screen.getByText("show-b"));
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
		expect(screen.getByText("Beta One")).toBeInTheDocument();
	});

	it("hides the menu when hideContextMenu is called", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		fireEvent.click(screen.getByText("hide-show-a"));
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
	});

	it("hides the menu on outside mousedown (existing ClassicyContextualMenu behavior)", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		fireEvent.mouseDown(document.body);
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
	});

	it("applies the HIG +1px down-right click offset to the menu position", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		// clickAt [100,100] + [1,1] offset
		expect(wrapper.style.left).toBe("101px");
		expect(wrapper.style.top).toBe("101px");
	});

	it("injects a disabled Help item as the first item when none is supplied", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		const items = Array.from(
			document.querySelectorAll(".classicyContextMenu > li"),
		);
		expect(items[0]).toHaveTextContent("Help");
		expect(items[0]).toHaveClass("disabled");
		// The caller's own items still render after Help.
		expect(screen.getByText("Alpha One")).toBeInTheDocument();
	});

	it("does not inject a second Help item when the caller supplied one", () => {
		const withHelp: ClassicyMenuItem[] = [
			{ id: "help", title: "Help", disabled: true },
			{ id: "x1", title: "Extra One" },
		];
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={withHelp} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		expect(screen.getAllByText("Help")).toHaveLength(1);
	});

	it("flips the root menu leftward when it would overflow the right edge", () => {
		const rectSpy = vi
			.spyOn(Element.prototype, "getBoundingClientRect")
			.mockReturnValue({
				width: 300,
				height: 0,
				top: 0,
				bottom: 0,
				left: 0,
				right: 0,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			} as DOMRect);
		const WideTrigger = () => {
			const { showContextMenu } = useClassicyContextualMenu();
			return (
				<button
					type="button"
					onClick={() => showContextMenu(menuA, [window.innerWidth - 5, 100])}
				>
					show-wide
				</button>
			);
		};
		render(
			<ClassicyContextualMenuProvider>
				<WideTrigger />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-wide"));
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		// left was innerWidth-5+1; with a 300px menu overflowing, it flips to
		// (clickX - width), clamped to >= 0.
		const expected = Math.max(0, window.innerWidth - 5 + 1 - 300);
		expect(wrapper.style.left).toBe(`${expected}px`);
		rectSpy.mockRestore();
	});

	it("flips the root menu upward when it would overflow the bottom edge", () => {
		const rectSpy = vi
			.spyOn(Element.prototype, "getBoundingClientRect")
			.mockReturnValue({
				width: 100,
				height: 200,
				top: 0,
				bottom: 0,
				left: 0,
				right: 0,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			} as DOMRect);
		const LowTrigger = () => {
			const { showContextMenu } = useClassicyContextualMenu();
			return (
				<button
					type="button"
					onClick={() => showContextMenu(menuA, [10, window.innerHeight - 5])}
				>
					show-low
				</button>
			);
		};
		render(
			<ClassicyContextualMenuProvider>
				<LowTrigger />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-low"));
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		// top was innerHeight-5+1; a 200px menu overflows, so it opens above
		// the click: (clickY - height), clamped to >= 0.
		const expected = Math.max(0, window.innerHeight - 5 + 1 - 200);
		expect(wrapper.style.top).toBe(`${expected}px`);
		expect(wrapper.style.left).toBe("11px");
		rectSpy.mockRestore();
	});

	// Plan 0020-w98 §2 "Menus": a mounted taskbar's band is off the bottom of
	// the box a menu keeps to, so a menu that would run under the taskbar
	// opens above the point instead; with no band it opens below as before.
	it.each([
		[0, 561],
		[28, 361],
	])("keeps a menu above a %i px taskbar band", (band, top) => {
		setClassicyTaskbarBand(band);
		const rectSpy = vi
			.spyOn(Element.prototype, "getBoundingClientRect")
			.mockReturnValue({
				width: 100,
				height: 200,
				top: 0,
				bottom: 0,
				left: 0,
				right: 0,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			} as DOMRect);
		// 561 + 200 = 761: inside jsdom's 768 px viewport, past 768 − 28.
		const NearBottomTrigger = () => {
			const { showContextMenu } = useClassicyContextualMenu();
			return (
				<button type="button" onClick={() => showContextMenu(menuA, [10, 560])}>
					show-near-bottom
				</button>
			);
		};
		render(
			<ClassicyContextualMenuProvider>
				<NearBottomTrigger />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-near-bottom"));
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		expect(wrapper.style.top).toBe(`${top}px`);
		rectSpy.mockRestore();
	});

	it("hook is a no-op without a provider", () => {
		render(<Trigger items={menuA} label="show-a" />);
		fireEvent.click(screen.getByText("show-a"));
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
	});
});

// The options a caller opens a menu with (`ClassicyContextualMenuOptions`):
// the Windows shell's window pop-up menu opens with every one of them, and
// with none a menu opens exactly as above.
describe("ClassicyContextualMenuProvider options", () => {
	const items: ClassicyMenuItem[] = [
		{ id: "o1", title: "One" },
		{ id: "o2", title: "Two", disabled: true },
		{ id: "spacer" },
		{ id: "o3", title: "Three" },
	];

	const OptionsTrigger = ({
		options,
	}: {
		options?: ClassicyContextualMenuOptions;
	}) => {
		const { showContextMenu } = useClassicyContextualMenu();
		return (
			<>
				<input aria-label="field" />
				<button
					type="button"
					onClick={() => showContextMenu(items, [100, 100], options)}
				>
					open
				</button>
			</>
		);
	};

	const open = (options?: ClassicyContextualMenuOptions) => {
		render(
			<ClassicyContextualMenuProvider>
				<OptionsTrigger options={options} />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("open"));
	};
	const wrapper = () =>
		document.querySelector<HTMLElement>(".classicyContextMenuWrapper");
	const listItems = () =>
		Array.from(
			document.querySelectorAll<HTMLElement>(".classicyContextMenu > li"),
		);
	const byId = (id: string) => document.getElementById(id) as HTMLElement;

	afterEach(() => {
		vi.useRealTimers();
	});

	it("opens as always with none: Help first, 1 px off the click, the focus kept, Escape and the arrows passing", () => {
		open();
		expect(listItems()[0]).toHaveTextContent("Help");
		expect(wrapper()?.style.left).toBe("101px");
		const focused = document.activeElement;
		expect(fireEvent.keyDown(document.body, { key: "ArrowDown" })).toBe(true);
		expect(document.activeElement).toBe(focused);
		expect(fireEvent.keyDown(document.body, { key: "Escape" })).toBe(true);
		expect(wrapper()).not.toBeNull();
	});

	it("leaves the Help item out with helpItem: false", () => {
		open({ helpItem: false });
		expect(listItems().map((li) => li.textContent)).toEqual([
			"One",
			"Two",
			"Three",
		]);
	});

	it('puts its top-left corner at the point with placement: "corner"', () => {
		open({ placement: "corner" });
		expect(wrapper()?.style.left).toBe("100px");
		expect(wrapper()?.style.top).toBe("100px");
	});

	it("focuses the first item with focusFirstItem, and gives the focus back when it closes", () => {
		render(
			<ClassicyContextualMenuProvider>
				<OptionsTrigger
					options={{ helpItem: false, focusFirstItem: true, keyboard: true }}
				/>
			</ClassicyContextualMenuProvider>,
		);
		const field = screen.getByLabelText("field");
		field.focus();
		// Opened as a key would open it: the field has the focus.
		act(() => {
			(screen.getByText("open") as HTMLButtonElement).click();
		});
		expect(document.activeElement).toBe(byId("o1"));
		fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
		expect(wrapper()).toBeNull();
		expect(document.activeElement).toBe(field);
	});

	it("walks the items, the dimmed one included, on the arrows with keyboard, wrapping at the ends", () => {
		open({ helpItem: false, keyboard: true });
		// None focused: Down takes the first, Up the last.
		expect(fireEvent.keyDown(document.body, { key: "ArrowDown" })).toBe(false);
		expect(document.activeElement).toBe(byId("o1"));
		fireEvent.keyDown(document.activeElement as Element, { key: "ArrowDown" });
		expect(document.activeElement).toBe(byId("o2"));
		fireEvent.keyDown(document.activeElement as Element, { key: "ArrowDown" });
		expect(document.activeElement).toBe(byId("o3"));
		fireEvent.keyDown(document.activeElement as Element, { key: "ArrowDown" });
		expect(document.activeElement).toBe(byId("o1"));
		fireEvent.keyDown(document.activeElement as Element, { key: "ArrowUp" });
		expect(document.activeElement).toBe(byId("o3"));
	});

	it("keeps the arrows and Escape from everything else, Escape closing it", () => {
		const outer = vi.fn();
		document.addEventListener("keydown", outer);
		open({ helpItem: false, keyboard: true });
		fireEvent.keyDown(document.body, { key: "ArrowUp" });
		expect(document.activeElement).toBe(byId("o3"));
		expect(fireEvent.keyDown(document.body, { key: "Escape" })).toBe(false);
		expect(wrapper()).toBeNull();
		expect(outer).not.toHaveBeenCalled();
		// Closed, it holds nothing.
		fireEvent.keyDown(document.body, { key: "Escape" });
		expect(outer).toHaveBeenCalledTimes(1);
		document.removeEventListener("keydown", outer);
	});

	it("leaves a press on its anchor to the anchor's owner, and closes on any other", () => {
		const Anchored = () => {
			const { showContextMenu } = useClassicyContextualMenu();
			return (
				<button
					type="button"
					onClick={(e) =>
						showContextMenu(items, [100, 100], { anchor: e.currentTarget })
					}
				>
					anchor
				</button>
			);
		};
		render(
			<ClassicyContextualMenuProvider>
				<Anchored />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("anchor"));
		fireEvent.mouseDown(screen.getByText("anchor"));
		expect(wrapper()).not.toBeNull();
		fireEvent.mouseDown(document.body);
		expect(wrapper()).toBeNull();
	});

	it("waits for the keyboard with keyboard, with no idle timeout", () => {
		vi.useFakeTimers();
		open({ keyboard: true });
		act(() => {
			vi.advanceTimersByTime(20000);
		});
		expect(wrapper()).not.toBeNull();
	});

	it("closes after 15 s idle without it, as always", () => {
		vi.useFakeTimers();
		open();
		act(() => {
			vi.advanceTimersByTime(20000);
		});
		expect(wrapper()).toBeNull();
	});
});
