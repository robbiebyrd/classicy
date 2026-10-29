import type { CSSProperties } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyControlStrip } from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip";
import {
	CLASSICY_CONTROL_STRIP_MODULE_IDS,
	type ClassicyControlStripModuleDefinition,
	registerClassicyControlStripModule,
	unregisterClassicyControlStripModule,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";

const MODULES: ClassicyControlStripModuleDefinition[] = [
	{ id: "one", label: "One", icon: "one.png", content: () => <p>one</p> },
	{ id: "two", label: "Two", icon: "two.png", content: () => <p>two</p> },
];
const BUILT_INS = Object.values(CLASSICY_CONTROL_STRIP_MODULE_IDS);

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});
	for (const module of MODULES) registerClassicyControlStripModule(module);
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
	for (const module of MODULES) unregisterClassicyControlStripModule(module.id);
	vi.restoreAllMocks();
});

/** The events ControlStrip emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "ControlStrip");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const strip = () => screen.getByRole("toolbar", { name: "Control Strip" });
const tab = () =>
	document.querySelector(".classicyControlStripTab") as HTMLButtonElement;

/** A mouse click on the tab: press, release (on the document), click. */
const clickTab = () => {
	fireEvent.mouseDown(tab(), { button: 0, clientX: 0 });
	fireEvent.mouseUp(tab(), { button: 0, clientX: 0 });
	fireEvent.click(tab(), { detail: 1 });
};

const renderStrip = (props: { style?: CSSProperties } = {}) =>
	render(<ClassicyControlStrip disabledModules={BUILT_INS} {...props} />);

describe("ClassicyControlStrip appearance", () => {
	it("carries the probe decoration and state classes", () => {
		renderStrip();
		clickTab();
		expect(strip()).toHaveClass(
			"classicyControlStrip",
			"probe-ControlStrip",
			"collapsed",
		);
		expect(strip().getAttribute("data-probe-state")).toBe("collapsed");
	});

	it("emits collapse and expand from the tab, by mouse and keyboard", () => {
		renderStrip();
		clickTab();
		clickTab();
		fireEvent.keyDown(tab(), { key: "Enter" });
		fireEvent.click(tab(), { detail: 0 });
		expect(emitted()).toEqual([
			{ event: "collapse", detail: { input: "pointer" } },
			{ event: "expand", detail: { input: "pointer" } },
			{ event: "collapse", detail: { input: "keyboard" } },
		]);
	});

	it("emits collapse from the collapse box", () => {
		renderStrip();
		const box = screen.getByRole("button", { name: "Collapse Control Strip" });
		fireEvent.mouseDown(box, { button: 0 });
		fireEvent.click(box, { detail: 1 });
		expect(emitted()).toEqual([
			{ event: "collapse", detail: { input: "pointer" } },
		]);
	});

	it("brackets a tab drag with dragStart and dragEnd { kind: resize }", () => {
		vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(300);
		vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
		vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(30);
		renderStrip();
		fireEvent.mouseDown(tab(), { button: 0, clientX: 200 });
		fireEvent.mouseMove(document, { clientX: 160 });
		fireEvent.mouseMove(document, { clientX: 140 });
		fireEvent.mouseUp(document);
		expect(emitted()).toEqual([
			{ event: "dragStart", detail: { kind: "resize" } },
			{ event: "dragEnd", detail: { kind: "resize" } },
		]);
	});

	it("brackets a Control-drag of the collapse box with dragStart and dragEnd { kind: move }", () => {
		const desktop = document.createElement("div");
		document.body.appendChild(desktop);
		vi.spyOn(HTMLElement.prototype, "offsetParent", "get").mockReturnValue(
			desktop,
		);
		vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(24);
		renderStrip();
		const box = screen.getByRole("button", { name: "Collapse Control Strip" });
		fireEvent.mouseDown(box, { button: 0, ctrlKey: true, clientX: 5 });
		fireEvent.mouseMove(document, { clientX: 700, clientY: 300 });
		fireEvent.mouseMove(document, { clientX: 710, clientY: 280 });
		fireEvent.mouseUp(document);
		expect(emitted()).toEqual([
			{ event: "dragStart", detail: { kind: "move" } },
			{ event: "dragEnd", detail: { kind: "move" } },
		]);
		desktop.remove();
	});

	it("emits no drag for a tab click or a Control-click that does not move", () => {
		renderStrip();
		const box = screen.getByRole("button", { name: "Collapse Control Strip" });
		fireEvent.mouseDown(box, { button: 0, ctrlKey: true, clientX: 5 });
		fireEvent.mouseUp(document);
		clickTab();
		expect(emitted()).toEqual([
			{ event: "collapse", detail: { input: "pointer" } },
		]);
	});

	it("puts the consumer style after the package's", () => {
		probe.uninstall();
		probe = installClassicyAppearanceProbe({
			on: { mount: () => ({ style: { marginTop: 1, marginLeft: 3 } }) },
		});
		renderStrip({ style: { marginTop: 7 } });
		expect(strip().style.marginLeft).toBe("3px");
		expect(strip().style.marginTop).toBe("7px");
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		renderStrip();
		expect(strip().hasAttribute("data-probe-state")).toBe(false);
		expect(strip().hasAttribute("style")).toBe(false);
		expect(strip().getAttribute("class")).toBe("classicyControlStrip");
	});
});
