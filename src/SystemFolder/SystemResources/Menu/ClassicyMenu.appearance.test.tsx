import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import type { ClassicyComponentName } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { ClassicyMenu } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyMenuProvider } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuProvider";

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({ useClassicyAnalytics: () => ({ track: () => {}, page: () => {} }) }),
);

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events `component` emitted, without mount and unmount. */
const emitted = (component: ClassicyComponentName) =>
	probe.events
		.filter(
			(e) =>
				e.component === component &&
				e.event !== "mount" &&
				e.event !== "unmount",
		)
		.map(({ event, detail }) => ({ event, detail }));

const item = (id: string) => document.getElementById(id) as HTMLElement;

const ITEMS = [
	{ id: "save", title: "Save", onClickFunc: () => {} },
	{ id: "off", title: "Off", disabled: true },
	{
		id: "more",
		title: "More",
		menuChildren: [{ id: "child", title: "Child" }],
	},
];

const renderMenu = (onClickFunc?: () => void) =>
	render(
		<ClassicyMenuProvider>
			<ClassicyMenu
				name="test"
				navClass="classicyContextMenu"
				menuItems={
					onClickFunc
						? [{ id: "save", title: "Save", onClickFunc }, ...ITEMS.slice(1)]
						: ITEMS
				}
			/>
		</ClassicyMenuProvider>,
	);

describe("ClassicyMenu appearance", () => {
	it("decorates the menu list and each item", () => {
		const { container } = renderMenu();
		const list = container.querySelector("ul") as HTMLElement;
		expect(list).toHaveClass("classicyContextMenu", "probe-Menu");
		expect(list.getAttribute("data-probe-state")).toBe("");
		expect(item("save")).toHaveClass("classicyMenuItem", "probe-MenuItem");
		expect(item("off")).toHaveClass("probe-MenuItem", "disabled");
		expect(item("off").getAttribute("data-probe-state")).toBe("disabled");
	});

	it("emits press, then release exactly once, for a chosen leaf", async () => {
		const onClickFunc = vi.fn();
		renderMenu(onClickFunc);
		fireEvent.mouseDown(item("save"));
		fireEvent.click(item("save"));
		expect(emitted("MenuItem")).toEqual([
			{ event: "press", detail: { itemId: "save", input: "pointer" } },
		]);
		// The flash ends by animationend and by the fallback timer: one release.
		fireEvent.animationEnd(item("save"), {
			animationName: "classicyMenuItemFlashKeyframes",
		});
		await waitFor(() => expect(onClickFunc).toHaveBeenCalledTimes(1));
		await new Promise((resolve) => setTimeout(resolve, 500));
		expect(emitted("MenuItem")).toEqual([
			{ event: "press", detail: { itemId: "save", input: "pointer" } },
			{ event: "release", detail: { itemId: "save", input: "pointer" } },
		]);
	});

	it("emits press from Return on an item", () => {
		renderMenu();
		fireEvent.keyDown(item("save"), { key: "Enter" });
		expect(emitted("MenuItem")).toEqual([
			{ event: "press", detail: { itemId: "save", input: "keyboard" } },
		]);
	});

	it("emits nothing for a disabled item", () => {
		renderMenu();
		fireEvent.click(item("off"));
		expect(emitted("MenuItem")).toEqual([]);
	});

	it("emits focus and blur for hover and keyboard focus", () => {
		renderMenu();
		fireEvent.mouseOver(item("save"));
		fireEvent.mouseOut(item("save"));
		// Arrow keys move focus between items.
		fireEvent.keyDown(document.body, { key: "ArrowDown" });
		fireEvent.focus(item("save"));
		fireEvent.blur(item("save"));
		expect(emitted("MenuItem")).toEqual([
			{ event: "focus", detail: { itemId: "save", input: "pointer" } },
			{ event: "blur", detail: { itemId: "save", input: "pointer" } },
			{ event: "focus", detail: { itemId: "save", input: "keyboard" } },
			{ event: "blur", detail: { itemId: "save", input: "keyboard" } },
		]);
	});

	it("emits open on the submenu's item and on the menu, and close on the menu", () => {
		renderMenu();
		fireEvent.mouseDown(item("more"));
		fireEvent.click(item("more"));
		expect(emitted("MenuItem")).toEqual([
			{ event: "open", detail: { itemId: "more", input: "pointer" } },
		]);
		expect(emitted("Menu")).toEqual([
			{ event: "open", detail: { itemId: "more", input: "pointer" } },
		]);
		// A second click on the open parent closes every menu.
		fireEvent.keyDown(item("more"), { key: "Enter" });
		expect(emitted("Menu")).toEqual([
			{ event: "open", detail: { itemId: "more", input: "pointer" } },
			{ event: "close", detail: { itemId: "more", input: "keyboard" } },
		]);
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = renderMenu();
		const list = container.querySelector("ul") as HTMLElement;
		expect(list.getAttribute("class")).toBe("classicyContextMenu");
		expect(list.hasAttribute("style")).toBe(false);
		expect(item("off").hasAttribute("data-probe-state")).toBe(false);
		expect(item("off").hasAttribute("style")).toBe(false);
		expect(item("off").getAttribute("class")).toBe(
			"classicyMenuItem classicyMenuItemNoImage disabled",
		);
	});
});
