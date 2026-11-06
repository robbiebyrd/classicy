import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";

// The real store hosts the alert's window; analytics is stubbed.
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({ useClassicyAnalytics: () => ({ track: () => {}, page: () => {} }) }),
);

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
	vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
	vi.restoreAllMocks();
});

/** Every event Alert emitted, its own `mount` included. */
const emitted = () =>
	probe.events
		.filter((e) => e.component === "Alert")
		.map(({ event, detail }) => ({ event, detail }));

const root = () => document.querySelector(".classicyAlert") as HTMLElement;

const BUTTONS = [
	{ id: "cancel", label: "Cancel", role: "cancel" as const },
	{ id: "ok", label: "OK", role: "default" as const },
];

describe("ClassicyAlert appearance", () => {
	it("carries the probe decoration and no state classes", () => {
		render(<ClassicyAlert alertType="stop" label="Stop" />);
		expect(root()).toHaveClass(
			"classicyAlert",
			"probe-Alert",
			"classicyAlertFixed",
		);
		expect(root().getAttribute("data-probe-state")).toBe("");
	});

	it("emits open on mount, once", () => {
		render(<ClassicyAlert label="Note" />);
		expect(emitted()).toEqual([
			{ event: "mount", detail: undefined },
			{ event: "open", detail: undefined },
		]);
	});

	it("emits close { buttonId } for the button that dismisses it", () => {
		const onClose = vi.fn();
		render(
			<ClassicyAlert
				alertType="caution"
				label="Sure?"
				buttons={BUTTONS}
				onClose={onClose}
			/>,
		);
		const ok = screen.getByRole("button", { name: "OK" });
		fireEvent.mouseDown(ok);
		fireEvent.click(ok);
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(emitted().slice(2)).toEqual([
			{ event: "close", detail: { buttonId: "ok", input: "pointer" } },
		]);
	});

	it("emits close from Return and Escape", () => {
		render(
			<ClassicyAlert alertType="caution" label="Sure?" buttons={BUTTONS} />,
		);
		fireEvent.keyDown(root(), { key: "Enter" });
		fireEvent.keyDown(root(), { key: "Escape" });
		expect(emitted().slice(2)).toEqual([
			{ event: "close", detail: { buttonId: "ok", input: "keyboard" } },
			{ event: "close", detail: { buttonId: "cancel", input: "keyboard" } },
		]);
	});

	it("emits no close for a disabled button", () => {
		render(
			<ClassicyAlert
				label="Note"
				buttons={[{ id: "ok", label: "OK", role: "default", disabled: true }]}
			/>,
		);
		fireEvent.keyDown(root(), { key: "Enter" });
		expect(emitted().slice(2)).toEqual([]);
	});

	it("puts the package's style on the alert body", () => {
		probe.uninstall();
		probe = installClassicyAppearanceProbe({
			on: { mount: () => ({ style: { marginLeft: 3 } }) },
		});
		render(<ClassicyAlert label="Note" />);
		expect(root().style.marginLeft).toBe("3px");
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		render(<ClassicyAlert label="Note" movable />);
		expect(root().hasAttribute("data-probe-state")).toBe(false);
		expect(root().hasAttribute("style")).toBe(false);
		expect(root().getAttribute("class")).toBe(
			"classicyAlert classicyAlertMovable",
		);
	});
});
