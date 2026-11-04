import { produce } from "immer";
import type { CSSProperties } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import { withElementsFromPoint } from "@/__tests__/withElementsFromPoint";
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

	describe("Finder outline drags (file-backed icons)", () => {
		const PLAN = "Macintosh HD:Desktop Folder:Plan.txt";
		const ITEM = `classicy-desktop-item:${PLAN}`;
		const renderFileIcon = () => {
			act(() => {
				useAppManager.setState((state) =>
					produce(state, (draft) => {
						draft.System.Manager.Desktop.icons = [
							{
								appId: ITEM,
								appName: "Plan.txt",
								icon: "/p.png",
								kind: "file",
								filePath: PLAN,
								location: [100, 100],
							},
						];
					}),
				);
			});
			const view = render(
				<ClassicyDesktopIcon
					appId={ITEM}
					appName="Plan.txt"
					icon="/p.png"
					kind="file"
					filePath={PLAN}
				/>,
			);
			return Object.assign(root(view.container), { unmount: view.unmount });
		};
		const desktop = () => {
			const el = document.createElement("div");
			el.setAttribute("data-classicy-drop-desktop", "");
			return el;
		};
		const drags = () =>
			emitted().filter((e) => e.event === "dragStart" || e.event === "dragEnd");

		it("emits one dragStart at the threshold and one dragEnd on a drop", () => {
			const el = renderFileIcon();
			withElementsFromPoint([desktop()], () => {
				fireEvent.mouseDown(el, { button: 0, clientX: 10, clientY: 10 });
				fireEvent.mouseMove(document, { clientX: 13, clientY: 10 });
				expect(drags()).toEqual([]);
				fireEvent.mouseMove(document, { clientX: 40, clientY: 30 });
				fireEvent.mouseMove(document, { clientX: 50, clientY: 40 });
				fireEvent.mouseUp(document, { clientX: 50, clientY: 40 });
				fireEvent.mouseUp(el, { clientX: 50, clientY: 40 });
			});
			expect(drags()).toEqual([
				{ event: "dragStart", detail: { kind: "file" } },
				{
					event: "dragEnd",
					detail: { kind: "file", dropped: true, cancelled: false },
				},
			]);
			expect(el).not.toHaveClass("dragging");
		});

		it("emits one dragEnd, not dropped, on a release over nothing", () => {
			const el = renderFileIcon();
			withElementsFromPoint([], () => {
				fireEvent.mouseDown(el, { button: 0, clientX: 10, clientY: 10 });
				fireEvent.mouseMove(document, { clientX: 40, clientY: 30 });
				fireEvent.mouseUp(document, { clientX: 40, clientY: 30 });
			});
			expect(drags()).toEqual([
				{ event: "dragStart", detail: { kind: "file" } },
				{
					event: "dragEnd",
					detail: { kind: "file", dropped: false, cancelled: false },
				},
			]);
		});

		it("emits one dragEnd, cancelled, on Escape", () => {
			const el = renderFileIcon();
			withElementsFromPoint([desktop()], () => {
				fireEvent.mouseDown(el, { button: 0, clientX: 10, clientY: 10 });
				fireEvent.mouseMove(document, { clientX: 40, clientY: 30 });
				fireEvent.keyDown(document, { key: "Escape" });
				fireEvent.mouseUp(document, { clientX: 40, clientY: 30 });
			});
			expect(drags()).toEqual([
				{ event: "dragStart", detail: { kind: "file" } },
				{
					event: "dragEnd",
					detail: { kind: "file", dropped: false, cancelled: true },
				},
			]);
		});

		it("ends the drag, cancelled, before unmount when the icon unmounts mid-drag", () => {
			const el = renderFileIcon();
			const before = useAppManager.getState().System.Manager.Desktop.icons;
			withElementsFromPoint([desktop()], () => {
				fireEvent.mouseDown(el, { button: 0, clientX: 10, clientY: 10 });
				fireEvent.mouseMove(document, { clientX: 40, clientY: 30 });
				el.unmount();
				expect(document.querySelector(".classicyFileDragGhost")).toBeNull();
				fireEvent.mouseMove(document, { clientX: 50, clientY: 40 });
				fireEvent.mouseUp(document, { clientX: 50, clientY: 40 });
			});
			// The unmounted icon's drop never ran: nothing moved.
			expect(useAppManager.getState().System.Manager.Desktop.icons).toBe(
				before,
			);
			expect(emitted().filter((e) => e.event !== "select")).toEqual([
				{ event: "dragStart", detail: { kind: "file" } },
				{
					event: "dragEnd",
					detail: { kind: "file", dropped: false, cancelled: true },
				},
				{ event: "unmount", detail: undefined },
			]);
		});

		it("emits no drag for a click", () => {
			const el = renderFileIcon();
			withElementsFromPoint([desktop()], () => {
				fireEvent.mouseDown(el, { button: 0, clientX: 10, clientY: 10 });
				fireEvent.mouseMove(document, { clientX: 12, clientY: 11 });
				fireEvent.mouseUp(document, { clientX: 12, clientY: 11 });
				fireEvent.mouseUp(el, { clientX: 12, clientY: 11 });
			});
			expect(drags()).toEqual([]);
		});
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
