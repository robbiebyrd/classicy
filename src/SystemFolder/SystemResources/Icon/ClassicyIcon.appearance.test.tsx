import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { ClassicyIcon } from "@/SystemFolder/SystemResources/Icon/ClassicyIcon";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events Icon emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "Icon");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const root = (container: HTMLElement) =>
	container.querySelector(".classicyIcon") as HTMLElement;

const ICON = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

describe("ClassicyIcon appearance", () => {
	it("carries the probe decoration and state classes", () => {
		const { container } = render(
			<ClassicyIcon appId="Test.app" name="Read Me" icon={ICON} />,
		);
		const el = root(container);
		fireEvent.click(el);
		expect(el).toHaveClass("classicyIcon", "probe-Icon", "selected");
		expect(el.getAttribute("data-probe-state")).toBe("selected");
	});

	it("emits select on a click, toggling", () => {
		const { container } = render(
			<ClassicyIcon appId="Test.app" name="Read Me" icon={ICON} />,
		);
		const el = root(container);
		fireEvent.mouseDown(el);
		fireEvent.mouseUp(el);
		fireEvent.click(el);
		fireEvent.click(el);
		expect(emitted().filter((e) => e.event === "select")).toEqual([
			{ event: "select", detail: { selected: true } },
			{ event: "select", detail: { selected: false } },
		]);
	});

	it("emits open on a double-click and on Enter", () => {
		const { container } = render(
			<ClassicyIcon
				appId="Test.app"
				name="Read Me"
				icon={ICON}
				onClickFunc={() => {}}
			/>,
		);
		const el = root(container);
		fireEvent.mouseDown(el);
		fireEvent.mouseUp(el);
		fireEvent.doubleClick(el);
		fireEvent.keyDown(el, { key: "Enter" });
		expect(emitted().filter((e) => e.event === "open")).toEqual([
			{ event: "open", detail: { input: "pointer" } },
			{ event: "open", detail: { input: "keyboard" } },
		]);
	});

	it("emits no open without an open action", () => {
		const { container } = render(
			<ClassicyIcon appId="Test.app" name="Read Me" icon={ICON} />,
		);
		fireEvent.doubleClick(root(container));
		expect(emitted().filter((e) => e.event === "open")).toEqual([]);
	});

	it("brackets a press with one dragStart and one dragEnd", () => {
		const { container } = render(
			<ClassicyIcon appId="Test.app" name="Read Me" icon={ICON} />,
		);
		const el = root(container);
		fireEvent.mouseDown(el);
		expect(el).toHaveClass("dragging");
		fireEvent.mouseUp(el);
		// A stray second release ends nothing.
		fireEvent.mouseUp(el);
		expect(emitted()).toEqual([
			{ event: "dragStart", detail: undefined },
			{ event: "dragEnd", detail: undefined },
		]);
	});

	it("emits no drag for a position-locked icon", () => {
		const { container } = render(
			<ClassicyIcon
				appId="Test.app"
				name="Read Me"
				icon={ICON}
				positionLocked
			/>,
		);
		const el = root(container);
		fireEvent.mouseDown(el);
		fireEvent.mouseUp(el);
		expect(emitted()).toEqual([]);
	});

	it("never lets the package's style move or restack the icon", () => {
		probe.uninstall();
		probe = installClassicyAppearanceProbe({
			on: {
				mount: () => ({
					style: { left: 99, top: 99, zIndex: 77, marginLeft: 3 },
				}),
			},
		});
		const { container } = render(
			<ClassicyIcon
				appId="Test.app"
				name="Read Me"
				icon={ICON}
				initialPosition={[5, 6]}
				style={{ marginTop: 7 }}
			/>,
		);
		const el = root(container);
		expect(el.style.left).toBe("5px");
		expect(el.style.top).toBe("6px");
		expect(el.style.zIndex).toBe("");
		expect(el.style.marginLeft).toBe("3px");
		expect(el.style.marginTop).toBe("7px");
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = render(
			<ClassicyIcon appId="Test.app" name="Read Me" icon={ICON} />,
		);
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.getAttribute("style")).toBe("left: 0px; top: 0px;");
		expect(el.getAttribute("class")).toBe("classicyIcon classicyLabelBelow");
	});
});
