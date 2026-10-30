import { produce } from "immer";
import type { CSSProperties } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import {
	type ClassicyStoreSystemApp,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { updateAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

// The real store drives the window's focus, collapse, zoom and drag state;
// analytics and the cursor are stubbed.
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({ useClassicyAnalytics: () => ({ track: () => {}, page: () => {} }) }),
);
vi.mock("@/SystemFolder/SystemResources/Cursor/useClassicyCursor", () => ({
	useClassicyCursor: () => vi.fn(),
}));

const APP = "TestApp.app";

const app: ClassicyStoreSystemApp = {
	id: APP,
	name: "Test",
	icon: "",
	open: true,
	focused: true,
	windows: {},
};

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
	vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Applications.apps[APP] = structuredClone(app);
			}),
		);
	});
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
	vi.restoreAllMocks();
});

/** The events Window emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "Window");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const root = () => document.querySelector(".classicyWindow") as HTMLElement;
const part = (className: string) =>
	document.querySelector(`.${className}`) as HTMLElement;

/** Unfocus the window, as when another window took focus. */
const blurWindow = () =>
	act(() => {
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				updateAppWindow(draft.System.Manager.Applications.apps[APP], "w", {
					focused: false,
				});
			}),
		);
	});

/** A mouse click: press, release and click on one element. */
const click = (el: HTMLElement, init: MouseEventInit = {}) => {
	fireEvent.mouseDown(el, init);
	fireEvent.mouseUp(el, init);
	fireEvent.click(el, init);
};

const renderWindow = (props: { style?: CSSProperties; modal?: boolean } = {}) =>
	render(
		<ClassicyWindow
			id="w"
			appId={APP}
			title="Test"
			initialSize={[300, 200]}
			initialPosition={[40, 50]}
			{...props}
		>
			<p>content</p>
		</ClassicyWindow>,
	);

describe("ClassicyWindow appearance", () => {
	it("carries the probe decoration and state classes", () => {
		renderWindow();
		blurWindow();
		expect(root()).toHaveClass("classicyWindow", "probe-Window", "inactive");
		expect(root().getAttribute("data-probe-state")).toBe("inactive");
	});

	it("emits focus when a click focuses it", () => {
		renderWindow();
		blurWindow();
		click(part("classicyWindowContents"));
		expect(emitted()).toEqual([
			{ event: "focus", detail: { input: "pointer" } },
		]);
		expect(root()).toHaveClass("active");
	});

	it("emits collapse and expand from the collapse box, by mouse and keyboard", () => {
		renderWindow();
		click(part("classicyWindowCollapseBox"));
		fireEvent.keyDown(part("classicyWindowCollapseBox"), { key: "Enter" });
		expect(
			emitted().filter((e) => e.event === "collapse" || e.event === "expand"),
		).toEqual([
			{ event: "collapse", detail: { input: "pointer" } },
			{ event: "expand", detail: { input: "keyboard" } },
		]);
	});

	it("emits collapse once for an Option-click that collapses every window", () => {
		renderWindow();
		click(part("classicyWindowCollapseBox"), { altKey: true });
		expect(
			emitted().filter((e) => e.event === "collapse" || e.event === "expand"),
		).toEqual([{ event: "collapse", detail: { all: true, input: "pointer" } }]);
	});

	it("emits zoom { zoomed, cause: zoom } from the zoom box", () => {
		renderWindow();
		click(part("classicyWindowZoomBox"));
		fireEvent.keyDown(part("classicyWindowZoomBox"), { key: " " });
		expect(emitted().filter((e) => e.event === "zoom")).toEqual([
			{
				event: "zoom",
				detail: { zoomed: true, input: "pointer", cause: "zoom" },
			},
			{
				event: "zoom",
				detail: { zoomed: false, input: "keyboard", cause: "zoom" },
			},
		]);
	});

	it("names collapse and resize-start as the cause of their zoom { zoomed: false }", () => {
		renderWindow();
		click(part("classicyWindowCollapseBox"));
		click(part("classicyWindowCollapseBox"));
		fireEvent.mouseDown(part("classicyWindowResizer"), {
			clientX: 340,
			clientY: 250,
		});
		fireEvent.mouseUp(root(), { clientX: 340, clientY: 250 });
		expect(emitted().filter((e) => e.event === "zoom")).toEqual([
			{
				event: "zoom",
				detail: { zoomed: false, input: "pointer", cause: "collapse" },
			},
			{
				event: "zoom",
				detail: { zoomed: false, input: "pointer", cause: "resize" },
			},
		]);
	});

	it("emits close from the close box", () => {
		renderWindow();
		click(part("classicyWindowCloseBox"));
		expect(emitted().filter((e) => e.event === "close")).toEqual([
			{ event: "close", detail: { input: "pointer" } },
		]);
	});

	it("emits close from Escape on a modal window", () => {
		renderWindow({ modal: true });
		fireEvent.keyDown(root(), { key: "Escape" });
		expect(emitted().filter((e) => e.event === "close")).toEqual([
			{ event: "close", detail: { input: "keyboard" } },
		]);
	});

	it("brackets a title-bar drag: dragStart, moves, one dragEnd", () => {
		renderWindow();
		const title = part("classicyWindowTitle");
		fireEvent.mouseDown(title, { clientX: 100, clientY: 60 });
		fireEvent.mouseMove(title, { clientX: 110, clientY: 60 });
		fireEvent.mouseMove(title, { clientX: 120, clientY: 64 });
		fireEvent.mouseUp(title, { clientX: 120, clientY: 64 });
		// The release also reaches the document, which must not end it again.
		const drag = emitted().filter((e) =>
			["dragStart", "change", "dragEnd"].includes(e.event),
		);
		expect(drag[0]).toEqual({ event: "dragStart", detail: { kind: "move" } });
		expect(drag.at(-1)).toEqual({ event: "dragEnd", detail: { kind: "move" } });
		const moves = drag.slice(1, -1);
		expect(moves.length).toBeGreaterThan(0);
		for (const move of moves)
			expect(move).toEqual({ event: "change", detail: { kind: "move" } });
		expect(drag.filter((e) => e.event === "dragEnd")).toHaveLength(1);
		expect(drag.filter((e) => e.event === "dragStart")).toHaveLength(1);
	});

	it("ends a drag released outside the window once", () => {
		renderWindow();
		const title = part("classicyWindowTitle");
		fireEvent.mouseDown(title, { clientX: 100, clientY: 60 });
		fireEvent.mouseMove(document.body, { clientX: 140, clientY: 90 });
		fireEvent.mouseUp(document.body, { clientX: 140, clientY: 90 });
		fireEvent.mouseUp(document.body, { clientX: 140, clientY: 90 });
		expect(
			emitted().filter((e) => e.event === "dragStart" || e.event === "dragEnd"),
		).toEqual([
			{ event: "dragStart", detail: { kind: "move" } },
			{ event: "dragEnd", detail: { kind: "move" } },
		]);
	});

	it("brackets a resize: dragStart, change, dragEnd { kind: resize }", () => {
		renderWindow();
		const grow = part("classicyWindowResizer");
		fireEvent.mouseDown(grow, { clientX: 340, clientY: 250 });
		fireEvent.mouseMove(root(), { clientX: 360, clientY: 270 });
		fireEvent.mouseUp(root(), { clientX: 360, clientY: 270 });
		const drag = emitted().filter((e) =>
			["dragStart", "change", "dragEnd"].includes(e.event),
		);
		expect(drag[0]).toEqual({ event: "dragStart", detail: { kind: "resize" } });
		expect(drag).toContainEqual({
			event: "change",
			detail: { kind: "resize" },
		});
		expect(drag.at(-1)).toEqual({
			event: "dragEnd",
			detail: { kind: "resize" },
		});
		expect(drag.filter((e) => e.event === "dragEnd")).toHaveLength(1);
	});

	// The document listener carries the resize while the pointer is outside
	// the window; it reports each step as the window's own handler does.
	it("emits change { kind: resize } while the pointer is outside the window", () => {
		renderWindow();
		const grow = part("classicyWindowResizer");
		fireEvent.mouseDown(grow, { clientX: 340, clientY: 250 });
		fireEvent.mouseMove(document.body, { clientX: 380, clientY: 290 });
		fireEvent.mouseMove(document.body, { clientX: 400, clientY: 300 });
		fireEvent.mouseUp(document.body, { clientX: 400, clientY: 300 });
		expect(
			emitted().filter((e) =>
				["dragStart", "change", "dragEnd"].includes(e.event),
			),
		).toEqual([
			{ event: "dragStart", detail: { kind: "resize" } },
			{ event: "change", detail: { kind: "resize" } },
			{ event: "change", detail: { kind: "resize" } },
			{ event: "dragEnd", detail: { kind: "resize" } },
		]);
	});

	// The document listener carries a drag while the pointer is outside the
	// window; it reports each step as the window's own handler does.
	it("emits change { kind: move } while the pointer is outside the window", () => {
		renderWindow();
		const title = part("classicyWindowTitle");
		fireEvent.mouseDown(title, { clientX: 100, clientY: 60 });
		fireEvent.mouseMove(document.body, { clientX: 140, clientY: 90 });
		fireEvent.mouseMove(document.body, { clientX: 160, clientY: 100 });
		fireEvent.mouseUp(document.body, { clientX: 160, clientY: 100 });
		expect(
			emitted().filter((e) =>
				["dragStart", "change", "dragEnd"].includes(e.event),
			),
		).toEqual([
			{ event: "dragStart", detail: { kind: "move" } },
			{ event: "change", detail: { kind: "move" } },
			{ event: "change", detail: { kind: "move" } },
			{ event: "dragEnd", detail: { kind: "move" } },
		]);
	});

	// A move over the window reaches both its own handler and, by bubbling,
	// the document listener; only one of them reports it.
	it("emits one change per move while the pointer is over the window", () => {
		renderWindow();
		const title = part("classicyWindowTitle");
		fireEvent.mouseDown(title, { clientX: 100, clientY: 60 });
		fireEvent.mouseMove(document.body, { clientX: 110, clientY: 60 });
		const before = emitted().filter((e) => e.event === "change").length;
		fireEvent.mouseMove(title, { clientX: 120, clientY: 64 });
		expect(emitted().filter((e) => e.event === "change")).toHaveLength(
			before + 1,
		);
		fireEvent.mouseUp(title, { clientX: 120, clientY: 64 });
	});

	it("emits no drag for a bare title-bar click", () => {
		renderWindow();
		click(part("classicyWindowTitle"), { clientX: 100, clientY: 60 });
		expect(
			emitted().filter((e) =>
				["dragStart", "change", "dragEnd"].includes(e.event),
			),
		).toEqual([]);
	});

	it("never lets the package's style move, size or restack the window", () => {
		probe.uninstall();
		probe = installClassicyAppearanceProbe({
			on: {
				mount: () => ({
					style: {
						left: 1,
						top: 2,
						width: 3,
						height: 4,
						zIndex: 77,
						marginLeft: 3,
						marginTop: 1,
					},
				}),
			},
		});
		renderWindow({ style: { marginTop: 7 } });
		expect(root().style.left).toBe("40px");
		expect(root().style.top).toBe("50px");
		expect(root().style.width).toBe("300px");
		expect(root().style.height).toBe("200px");
		expect(root().style.zIndex).toBe("");
		expect(root().style.marginLeft).toBe("3px");
		expect(root().style.marginTop).toBe("7px");
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		renderWindow();
		expect(root().hasAttribute("data-probe-state")).toBe(false);
		expect(root().getAttribute("class")).toBe(
			"classicyWindow classicyWindowDocument active classicyWindowScrollBarsHidden",
		);
	});
});
