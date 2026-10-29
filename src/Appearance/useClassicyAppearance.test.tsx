import { act, render, renderHook } from "@testing-library/react";
import { produce } from "immer";
import { StrictMode, useLayoutEffect } from "react";
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
import {
	resetClassicyAppearanceAttributeWarningsForTests,
	useClassicyAppearance,
} from "@/Appearance/useClassicyAppearance";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

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

describe("useClassicyAppearance robustness", () => {
	const SINK_ID = "use-classicy-appearance-test";
	let entries: ClassicyLogEntry[];

	beforeEach(() => {
		entries = [];
		registerClassicyLogSink({
			id: SINK_ID,
			onLog: (entry) => entries.push(entry),
		});
		// The console mirror of the expected error entries; keep output clean.
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		resetClassicyAppearanceAttributeWarningsForTests();
	});

	afterEach(() => {
		unregisterClassicyLogSink(SINK_ID);
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
	});

	const errors = () => entries.filter((entry) => entry.level === "error");
	const warnings = () => entries.filter((entry) => entry.level === "warn");

	it("applies a decoration emitted from a layout effect on the first commit", () => {
		install({ on: { open: () => ({ className: "opened" }) } });
		const LayoutEmitter = () => {
			const { className, emit } = useClassicyAppearance("Button", {});
			useLayoutEffect(() => emit("open"), [emit]);
			return <div data-testid="root" className={className} />;
		};
		const { getByTestId } = render(<LayoutEmitter />);
		expect(getByTestId("root").className).toBe("probe-Button opened");
	});

	it("applies a decoration emitted from a layout effect on a StrictMode re-mount", () => {
		let opened = 0;
		install({
			on: {
				open: () => {
					opened += 1;
					return { className: `opened${opened}` };
				},
			},
		});
		const LayoutEmitter = () => {
			const { className, emit } = useClassicyAppearance("Button", {});
			useLayoutEffect(() => emit("open"), [emit]);
			return <div data-testid="root" className={className} />;
		};
		const { getByTestId } = render(
			<StrictMode>
				<LayoutEmitter />
			</StrictMode>,
		);
		// StrictMode re-mounts the effects once: the re-mount's emit wins.
		expect(opened).toBe(2);
		expect(getByTestId("root").className).toBe("probe-Button opened2");
	});

	it("logs and ignores a throwing mount handler", () => {
		install({
			on: {
				mount: () => {
					throw new Error("mount boom");
				},
			},
		});
		const { result } = renderHook(() =>
			useClassicyAppearance("Button", PRESSED),
		);
		expect(result.current.className).toBe("pressed probe-Button");
		expect(errors()).toHaveLength(1);
		expect(errors()[0]).toMatchObject({
			subsystem: "ClassicyAppearance",
			message: "Button.mount handler threw; ignored.",
		});
		expect((errors()[0].details[0] as Error).message).toBe("mount boom");
	});

	it("logs and ignores a throwing press handler; the caller's own logic still runs", () => {
		install({
			on: {
				press: () => ({ className: "flash" }),
				release: () => {
					playClassicyAppearanceSound("ClassicyButtonClickUp");
					throw new Error("release boom");
				},
			},
		});
		const { result } = renderHook(() =>
			useClassicyAppearance("Button", PRESSED),
		);
		act(() => result.current.emit("press"));
		const ownLogic = vi.fn();
		act(() => {
			result.current.emit("release");
			ownLogic();
		});
		expect(ownLogic).toHaveBeenCalledOnce();
		// The thrown handler counts as returning nothing.
		expect(result.current.className).toBe("pressed probe-Button flash");
		expect(errors().map((entry) => entry.message)).toEqual([
			"Button.release handler threw; ignored.",
		]);
		// The sound played before the throw went out, and the bridge's stack
		// is balanced: a sound outside any handler is refused again.
		expect(soundSpy).toHaveBeenCalledExactlyOnceWith({
			type: "ClassicySoundPlay",
			sound: "ClassicyButtonClickUp",
		});
		playClassicyAppearanceSound("ClassicyButtonClickDown");
		expect(soundSpy).toHaveBeenCalledOnce();
	});

	it("logs and ignores a throwing decorate()", () => {
		registerClassicyAppearancePackage(
			makePackage("throwing-decorate", {
				hooks: {
					decorate: () => {
						throw new Error("decorate boom");
					},
				},
			}),
		);
		setPackageId("throwing-decorate");
		const { result } = renderHook(() =>
			useClassicyAppearance("Button", PRESSED),
		);
		expect(result.current.className).toBe("pressed");
		expect(result.current.style).toBeUndefined();
		expect(result.current.attrs).toEqual({});
		expect(errors()[0]).toMatchObject({
			subsystem: "ClassicyAppearance",
			message: "Button.decorate threw; ignored.",
		});
	});

	it("keeps only data-* attrs that are not data-classicy-*", () => {
		install({
			on: {
				press: () => ({
					attrs: {
						id: "x",
						role: "y",
						"aria-label": "z",
						"data-classicy-part": "app",
						"data-Classicy-part": "app",
						"data-foo": "1",
					},
				}),
			},
		});
		const { result } = renderHook(() =>
			useClassicyAppearance("Button", PRESSED),
		);
		act(() => result.current.emit("press"));
		expect(result.current.attrs).toEqual({
			"data-probe-state": "pressed",
			"data-foo": "1",
		});
	});

	it("reports a dropped attribute once per package and key, in development", () => {
		install({ on: { press: () => ({ attrs: { id: `x${Math.random()}` } }) } });
		const { result } = renderHook(() =>
			useClassicyAppearance("Button", PRESSED),
		);
		act(() => result.current.emit("press"));
		act(() => result.current.emit("press"));
		expect(warnings()).toHaveLength(1);
		expect(warnings()[0]).toMatchObject({
			subsystem: "ClassicyAppearance",
			message:
				'Package "probe" set the attribute "id"; only data-* attributes outside data-classicy-* are applied.',
		});

		// Another package dropping the same key is reported once too.
		registerClassicyAppearancePackage(
			makePackage("probe-two", {
				hooks: { decorate: () => ({ attrs: { id: "y" } }) },
			}),
		);
		setPackageId("probe-two");
		expect(warnings()).toHaveLength(2);
		expect(warnings()[1].message).toContain('Package "probe-two"');
	});

	it("does not report dropped attributes in production", () => {
		vi.stubEnv("NODE_ENV", "production");
		install({ on: { press: () => ({ attrs: { id: "x" } }) } });
		const { result } = renderHook(() =>
			useClassicyAppearance("Button", PRESSED),
		);
		act(() => result.current.emit("press"));
		expect(result.current.attrs).toEqual({ "data-probe-state": "pressed" });
		expect(warnings()).toHaveLength(0);
	});
});

describe("useClassicyAppearance subscriptions", () => {
	it("follows a re-registration of the active package", () => {
		registerClassicyAppearancePackage(
			makePackage("live", {
				hooks: { decorate: () => ({ className: "v1" }) },
			}),
		);
		setPackageId("live");
		const { result } = renderHook(() =>
			useClassicyAppearance("Button", PRESSED),
		);
		expect(result.current.className).toBe("pressed v1");
		act(() =>
			registerClassicyAppearancePackage(
				makePackage("live", {
					hooks: { decorate: () => ({ className: "v2" }) },
				}),
			),
		);
		expect(result.current.className).toBe("pressed v2");
	});

	it("follows a late registration of the stored package id", () => {
		setPackageId("late");
		const { result } = renderHook(() =>
			useClassicyAppearance("Button", PRESSED),
		);
		expect(result.current.className).toBe("pressed");
		act(() =>
			registerClassicyAppearancePackage(
				makePackage("late", {
					hooks: { decorate: () => ({ className: "late" }) },
				}),
			),
		);
		expect(result.current.className).toBe("pressed late");
	});

	it("does not re-render on an unrelated store change", () => {
		install();
		let renders = 0;
		renderHook(() => {
			renders += 1;
			return useClassicyAppearance("Button", PRESSED);
		});
		const before = renders;
		act(() => {
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Desktop.disableBalloonHelp =
						!draft.System.Manager.Desktop.disableBalloonHelp;
				}),
			);
		});
		expect(renders).toBe(before);
	});
});
