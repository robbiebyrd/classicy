import { produce } from "immer";
import type { CSSProperties } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktopIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon";

// The real store drives selection (ClassicyDesktopIconFocus); analytics is
// stubbed.
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({ useClassicyAnalytics: () => ({ track: () => {}, page: () => {} }) }),
);

const APP = "Icon.app";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Desktop.icons = [
					{
						appId: APP,
						appName: "Icon",
						icon: "/i.png",
						kind: "app_shortcut",
						location: [100, 200],
					},
				];
			}),
		);
	});
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events DesktopIcon emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "DesktopIcon");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const root = (container: HTMLElement) =>
	container.querySelector(".classicyDesktopIcon") as HTMLElement;

const renderIcon = (
	props: { style?: CSSProperties; noLaunch?: boolean } = {},
) =>
	render(
		<ClassicyDesktopIcon
			appId={APP}
			appName="Icon"
			icon="/i.png"
			kind="app_shortcut"
			noLaunch
			{...props}
		/>,
	);

describe("ClassicyDesktopIcon appearance", () => {
	it("carries the probe decoration and state classes", () => {
		const { container } = renderIcon();
		const el = root(container);
		fireEvent.mouseDown(el);
		expect(el).toHaveClass("classicyDesktopIcon", "probe-DesktopIcon");
		expect(el).toHaveClass("selected", "dragging");
		expect(el.getAttribute("data-probe-state")).toBe("selected dragging");
	});

	it("emits select once for a click that selects", () => {
		const { container } = renderIcon();
		const el = root(container);
		fireEvent.mouseDown(el);
		fireEvent.mouseUp(el);
		fireEvent.click(el);
		expect(emitted().filter((e) => e.event === "select")).toEqual([
			{ event: "select", detail: { input: "pointer" } },
		]);
		// A click on the icon that is already the selection selects nothing.
		fireEvent.mouseDown(el);
		fireEvent.mouseUp(el);
		fireEvent.click(el);
		expect(emitted().filter((e) => e.event === "select")).toHaveLength(1);
	});

	it("emits select for a click on a selected icon that collapses a multiple selection", () => {
		const { container } = renderIcon();
		const el = root(container);
		act(() => {
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Desktop.selectedIcons = [APP, "Other.app"];
				}),
			);
		});
		fireEvent.mouseDown(el);
		fireEvent.mouseUp(el);
		fireEvent.click(el);
		expect(emitted().filter((e) => e.event === "select")).toEqual([
			{ event: "select", detail: { input: "pointer" } },
		]);
		expect(
			useAppManager.getState().System.Manager.Desktop.selectedIcons,
		).toEqual([APP]);
	});

	it("emits select once for a double-click, then open", () => {
		const { container } = renderIcon();
		const el = root(container);
		for (let i = 0; i < 2; i++) {
			fireEvent.mouseDown(el);
			fireEvent.mouseUp(el);
			fireEvent.click(el);
		}
		fireEvent.doubleClick(el);
		expect(
			emitted()
				.filter((e) => e.event === "select" || e.event === "open")
				.map((e) => e.event),
		).toEqual(["select", "open"]);
	});

	it("emits open on a double-click and on Enter", () => {
		const { container } = renderIcon();
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

	it("brackets a press with one dragStart and one dragEnd", () => {
		const { container } = renderIcon();
		const el = root(container);
		fireEvent.mouseDown(el, { clientX: 110, clientY: 210 });
		fireEvent.mouseMove(el, { clientX: 150, clientY: 260 });
		fireEvent.mouseUp(el);
		fireEvent.mouseUp(el);
		expect(
			emitted().filter((e) => e.event === "dragStart" || e.event === "dragEnd"),
		).toEqual([
			{ event: "dragStart", detail: undefined },
			{ event: "dragEnd", detail: undefined },
		]);
	});

	it("never lets the package's style move or restack the icon", () => {
		probe.uninstall();
		probe = installClassicyAppearanceProbe({
			on: {
				mount: () => ({
					style: { left: 9, top: 9, zIndex: 77, marginLeft: 3 },
				}),
			},
		});
		const { container } = renderIcon({ style: { marginTop: 7 } });
		const el = root(container);
		expect(el.style.top).toBe("200px");
		expect(el.style.left).toBe("100px");
		expect(el.style.zIndex).toBe("");
		expect(el.style.marginLeft).toBe("3px");
		expect(el.style.marginTop).toBe("7px");
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = renderIcon();
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.getAttribute("style")).toBe("top: 200px; left: 100px;");
		expect(el.getAttribute("class")).toBe(
			"classicyDesktopIcon classicyDesktopIconAlias",
		);
	});
});
