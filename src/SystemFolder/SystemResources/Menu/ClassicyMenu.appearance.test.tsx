import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchAnimationEnd } from "@/__tests__/animationEnd";
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

const FLASH_FALLBACK_PASSED_MS = 500;

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

	it("emits release on the flash's own animationend, once, before and after the fallback", async () => {
		const onClickFunc = vi.fn();
		renderMenu(onClickFunc);
		// A flash-named animationend on an item that is not flashing is not
		// the end of its flash: no release, no action.
		dispatchAnimationEnd(item("save"));
		expect(emitted("MenuItem")).toEqual([]);
		fireEvent.mouseDown(item("save"));
		fireEvent.click(item("save"));
		expect(emitted("MenuItem")).toEqual([
			{ event: "press", detail: { itemId: "save", input: "pointer" } },
		]);
		// The flash ends: release now, well before the 400 ms fallback.
		dispatchAnimationEnd(item("save"));
		expect(emitted("MenuItem")).toEqual([
			{ event: "press", detail: { itemId: "save", input: "pointer" } },
			{ event: "release", detail: { itemId: "save", input: "pointer" } },
		]);
		await waitFor(() => expect(onClickFunc).toHaveBeenCalledTimes(1));
		// The fallback's moment passes: still one release, one action.
		await new Promise((resolve) =>
			setTimeout(resolve, FLASH_FALLBACK_PASSED_MS),
		);
		expect(emitted("MenuItem")).toEqual([
			{ event: "press", detail: { itemId: "save", input: "pointer" } },
			{ event: "release", detail: { itemId: "save", input: "pointer" } },
		]);
		expect(onClickFunc).toHaveBeenCalledTimes(1);
	});

	// The own-target guard on its own: the item IS flashing, so only the
	// `e.target === e.currentTarget` check stops an animation that ends on one
	// of its own children (here its title) from ending the flash.
	it("ignores a flash-named animationend from the flashing item's own child", async () => {
		const onClickFunc = vi.fn();
		renderMenu(onClickFunc);
		fireEvent.mouseDown(item("save"));
		fireEvent.click(item("save"));
		dispatchAnimationEnd(item("save").querySelector("p") as HTMLElement);
		expect(emitted("MenuItem")).toEqual([
			{ event: "press", detail: { itemId: "save", input: "pointer" } },
		]);
		expect(onClickFunc).not.toHaveBeenCalled();
		// The fallback still ends it, once.
		await waitFor(() => expect(onClickFunc).toHaveBeenCalledTimes(1));
		expect(
			emitted("MenuItem").filter((e) => e.event === "release"),
		).toHaveLength(1);
	});

	// The flash is the package's press decoration, never the item's own: under
	// a package whose MenuItem `press` returns nothing (this probe's), a chosen
	// leaf gets no flash class, and its action still runs once, through the
	// 400 ms fallback.
	it("adds no flash class of its own when the package's press decorates nothing", async () => {
		const onClickFunc = vi.fn();
		renderMenu(onClickFunc);
		fireEvent.mouseDown(item("save"));
		fireEvent.click(item("save"));
		expect(emitted("MenuItem")).toEqual([
			{ event: "press", detail: { itemId: "save", input: "pointer" } },
		]);
		expect(item("save")).not.toHaveClass("classicyMenuItemFlash");
		expect(onClickFunc).not.toHaveBeenCalled();
		await waitFor(() => expect(onClickFunc).toHaveBeenCalledTimes(1));
		expect(item("save")).not.toHaveClass("classicyMenuItemFlash");
		await new Promise((resolve) =>
			setTimeout(resolve, FLASH_FALLBACK_PASSED_MS),
		);
		expect(onClickFunc).toHaveBeenCalledTimes(1);
	});

	it("emits one release, for the child only, when a submenu leaf's flash ends", async () => {
		const parentAction = vi.fn();
		const childAction = vi.fn();
		render(
			<ClassicyMenuProvider>
				<ClassicyMenu
					name="test"
					menuItems={[
						{
							id: "more",
							title: "More",
							onClickFunc: parentAction,
							menuChildren: [
								{ id: "child", title: "Child", onClickFunc: childAction },
							],
						},
					]}
				/>
			</ClassicyMenuProvider>,
		);
		fireEvent.mouseDown(item("more"));
		fireEvent.click(item("more"));
		fireEvent.mouseDown(item("child"));
		fireEvent.click(item("child"));
		// The child's flash ends; animationend bubbles through the parent <li>.
		dispatchAnimationEnd(item("child"));
		await waitFor(() => expect(childAction).toHaveBeenCalledTimes(1));
		await new Promise((resolve) =>
			setTimeout(resolve, FLASH_FALLBACK_PASSED_MS),
		);
		expect(
			emitted("MenuItem").filter(
				(e) => e.event === "press" || e.event === "release",
			),
		).toEqual([
			{ event: "press", detail: { itemId: "child", input: "pointer" } },
			{ event: "release", detail: { itemId: "child", input: "pointer" } },
		]);
		expect(parentAction).not.toHaveBeenCalled();
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

	it("emits focus and blur only for the item itself, not its ancestors", () => {
		renderMenu();
		fireEvent.mouseDown(item("more"));
		fireEvent.click(item("more"));
		probe.events.length = 0;
		// Hovering or focusing a submenu item bubbles through the parent <li>.
		fireEvent.mouseOver(item("child"));
		fireEvent.focus(item("child"));
		fireEvent.blur(item("child"));
		// A mouseover from inside an item (its title) is still that item.
		fireEvent.mouseOver(item("child").querySelector("p") as HTMLElement);
		expect(emitted("MenuItem")).toEqual([
			{ event: "focus", detail: { itemId: "child", input: "pointer" } },
			{ event: "focus", detail: { itemId: "child", input: "pointer" } },
			{ event: "blur", detail: { itemId: "child", input: "pointer" } },
			{ event: "focus", detail: { itemId: "child", input: "pointer" } },
		]);
	});

	it("renders a divider without a MenuItem of its own", () => {
		render(
			<ClassicyMenuProvider>
				<ClassicyMenu
					name="test"
					menuItems={[
						{ id: "one", title: "One" },
						{ id: "spacer" },
						{ id: "two", title: "Two" },
					]}
				/>
			</ClassicyMenuProvider>,
		);
		expect(
			probe.events.filter(
				(e) => e.component === "MenuItem" && e.event === "mount",
			),
		).toHaveLength(2);
	});

	it("reports a submenu opened by hovering as pointer input, after a key press", () => {
		render(
			<ClassicyMenuProvider>
				<ClassicyMenu
					name="test"
					menuItems={[
						{ id: "a", title: "A", menuChildren: [{ id: "a1", title: "A1" }] },
						{ id: "b", title: "B", menuChildren: [{ id: "b1", title: "B1" }] },
					]}
				/>
			</ClassicyMenuProvider>,
		);
		// Return opens A (and makes the menus hover-active).
		fireEvent.keyDown(item("a"), { key: "Enter" });
		// The pointer then glides onto B, with no press since the key.
		fireEvent.mouseEnter(item("b"));
		expect(emitted("Menu")).toEqual([
			{ event: "open", detail: { itemId: "a", input: "keyboard" } },
			{ event: "close", detail: { itemId: "a", input: "pointer" } },
			{ event: "open", detail: { itemId: "b", input: "pointer" } },
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
