import { act, renderHook } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { playClassicyAppearanceSound } from "@/Appearance/ClassicyAppearanceSound";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

const { soundSpy } = vi.hoisted(() => ({ soundSpy: vi.fn() }));

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	async (importOriginal) => ({
		...(await importOriginal<object>()),
		useSoundDispatch: () => soundSpy,
	}),
);

const setPackageId = (packageId: string) =>
	act(() => {
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Appearance.packageId = packageId;
			}),
		);
	});

const makePackage = (
	id: string,
	overrides: Partial<ClassicyAppearancePackage> = {},
): ClassicyAppearancePackage => ({
	id,
	name: id,
	css: "",
	defaults: { ...getTheme("default"), package: id },
	layout: CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
	...overrides,
});

const PRESSED = { pressed: true, disabled: false };

let probe: ReturnType<typeof installClassicyAppearanceProbe> | undefined;

const install = (
	...args: Parameters<typeof installClassicyAppearanceProbe>
) => {
	probe = installClassicyAppearanceProbe(...args);
	return probe;
};

beforeEach(() => {
	resetClassicyAppearancePackagesForTests();
	setPackageId("platinum");
	soundSpy.mockReset();
});

afterEach(() => {
	probe?.uninstall();
	probe = undefined;
});

describe("useClassicyAppearance", () => {
	it("is a pure function of state without package hooks", () => {
		const { result } = renderHook(() =>
			useClassicyAppearance("Button", PRESSED),
		);
		expect(result.current.className).toBe("pressed");
		expect(result.current.style).toBeUndefined();
		expect(result.current.attrs).toEqual({});
		act(() => result.current.emit("press"));
		expect(result.current.className).toBe("pressed");
	});

	it("merges decorate() into className, style and attrs", () => {
		install();
		const { result, unmount } = renderHook(() =>
			useClassicyAppearance("Button", PRESSED),
		);
		expect(result.current.className).toBe("pressed probe-Button");
		expect(result.current.attrs).toEqual({ "data-probe-state": "pressed" });
		expect(result.current.style).toBeUndefined();
		unmount();

		registerClassicyAppearancePackage(
			makePackage("probe-style", {
				hooks: { decorate: () => ({ style: { outline: "1px" } }) },
			}),
		);
		setPackageId("probe-style");
		const styled = renderHook(() => useClassicyAppearance("Button", PRESSED));
		expect(styled.result.current.style).toEqual({ outline: "1px" });
		expect(styled.result.current.className).toBe("pressed");
	});

	it("emit calls the handler with the context", () => {
		const press = vi.fn();
		install({ on: { press } });
		const { result } = renderHook(() =>
			useClassicyAppearance("Button", PRESSED),
		);
		act(() => result.current.emit("press", 7));
		expect(press).toHaveBeenCalledExactlyOnceWith({
			component: "Button",
			event: "press",
			element: null,
			state: { pressed: true, disabled: false },
			detail: 7,
		});
	});

	it("passes the ref element", () => {
		const press = vi.fn();
		install({ on: { press } });
		const ref = { current: document.createElement("button") };
		const { result } = renderHook(() =>
			useClassicyAppearance("Button", PRESSED, ref),
		);
		act(() => result.current.emit("press"));
		expect(press.mock.calls[0][0].element).toBe(ref.current);
	});

	it("applies a returned decoration on the next render and clears it on the next decoration", () => {
		install({
			on: {
				press: () => ({ className: "flash" }),
				release: () => ({}),
			},
		});
		const { result } = renderHook(() =>
			useClassicyAppearance("Button", PRESSED),
		);
		act(() => result.current.emit("press"));
		expect(result.current.className).toBe("pressed probe-Button flash");
		act(() => result.current.emit("release"));
		expect(result.current.className).toBe("pressed probe-Button");
	});

	it("a handler side effect without a return leaves the decoration unchanged", () => {
		const sideEffect = vi.fn();
		install({
			on: {
				press: () => ({ className: "flash" }),
				release: () => {
					sideEffect();
				},
			},
		});
		const { result } = renderHook(() =>
			useClassicyAppearance("Button", PRESSED),
		);
		act(() => result.current.emit("press"));
		act(() => result.current.emit("release"));
		expect(sideEffect).toHaveBeenCalledOnce();
		expect(result.current.className).toBe("pressed probe-Button flash");
	});

	it("merges an emitted style and attrs after decorate()", () => {
		install({
			on: {
				press: () => ({
					style: { color: "red" },
					attrs: { "data-probe-state": "emitted", "data-flash": "on" },
				}),
			},
		});
		const { result } = renderHook(() =>
			useClassicyAppearance("Button", PRESSED),
		);
		act(() => result.current.emit("press"));
		expect(result.current.style).toEqual({ color: "red" });
		expect(result.current.attrs).toEqual({
			"data-probe-state": "emitted",
			"data-flash": "on",
		});
	});

	it("emits mount once and unmount once", () => {
		const { events } = install();
		const { rerender, unmount } = renderHook(() =>
			useClassicyAppearance("Button", PRESSED),
		);
		const count = (event: string) =>
			events.filter((entry) => entry.event === event).length;
		expect(count("mount")).toBe(1);
		expect(events[0]).toEqual({
			component: "Button",
			event: "mount",
			detail: undefined,
		});
		rerender();
		rerender();
		expect(count("mount")).toBe(1);
		expect(count("unmount")).toBe(0);
		unmount();
		expect(count("unmount")).toBe(1);
	});

	it("lets a mount handler decorate", () => {
		install({ on: { mount: () => ({ className: "mounted" }) } });
		const { result } = renderHook(() =>
			useClassicyAppearance("Button", PRESSED),
		);
		expect(result.current.className).toBe("pressed probe-Button mounted");
	});

	it("keeps emit stable across renders", () => {
		install();
		const { result, rerender } = renderHook(() =>
			useClassicyAppearance("Button", PRESSED),
		);
		const first = result.current.emit;
		rerender();
		expect(result.current.emit).toBe(first);
	});

	it("clears the emitted decoration when the package changes", () => {
		install({ on: { press: () => ({ className: "flash" }) } });
		const { result } = renderHook(() =>
			useClassicyAppearance("Button", PRESSED),
		);
		act(() => result.current.emit("press"));
		expect(result.current.className).toContain("flash");
		registerClassicyAppearancePackage(makePackage("platinum"));
		setPackageId("platinum");
		expect(result.current.className).not.toContain("flash");
		expect(result.current.className).toBe("pressed");
		setPackageId("probe");
		expect(result.current.className).toBe("pressed probe-Button");
	});

	it("the sound bridge dispatches through the component's sound dispatch", () => {
		install({
			on: {
				press: () => playClassicyAppearanceSound("ClassicyButtonClickDown"),
				release: () =>
					playClassicyAppearanceSound("ClassicyButtonClickUp", {
						interrupt: true,
					}),
			},
		});
		const { result } = renderHook(() =>
			useClassicyAppearance("Button", PRESSED),
		);
		act(() => result.current.emit("press"));
		expect(soundSpy).toHaveBeenCalledExactlyOnceWith({
			type: "ClassicySoundPlay",
			sound: "ClassicyButtonClickDown",
		});
		act(() => result.current.emit("release"));
		expect(soundSpy).toHaveBeenLastCalledWith({
			type: "ClassicySoundPlayInterrupt",
			sound: "ClassicyButtonClickUp",
		});
	});
});

describe("installClassicyAppearanceProbe", () => {
	it("restores the previous packages and package id on uninstall", () => {
		const platinum = makePackage("platinum");
		registerClassicyAppearancePackage(platinum);
		const installed = installClassicyAppearanceProbe();
		expect(useAppManager.getState().System.Manager.Appearance.packageId).toBe(
			"probe",
		);
		installed.uninstall();
		expect(useAppManager.getState().System.Manager.Appearance.packageId).toBe(
			"platinum",
		);
		expect(getClassicyAppearancePackage("platinum")).toBe(platinum);
		expect(getClassicyAppearancePackage("probe")).toBeUndefined();
		const { result } = renderHook(() =>
			useClassicyAppearance("Button", PRESSED),
		);
		expect(result.current.className).toBe("pressed");
	});
});
