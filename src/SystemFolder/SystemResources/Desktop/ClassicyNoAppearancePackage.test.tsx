// No package, no desktop (plan 0014-ahm, 0015 §1.5): with no Appearance
// Package registered, ClassicyDesktop draws a plain message in place of the
// desktop and stops. ClassicyDesktop still imports Platinum, so these tests
// reach the no-package state by resetting the registry.
import { act, render, screen } from "@testing-library/react";
import type { CSSProperties } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { ClassicyNoAppearancePackage } from "@/SystemFolder/SystemResources/Desktop/ClassicyNoAppearancePackage";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

// jsdom plays no audio: a silent Howl keeps the output to real failures.
vi.mock("howler", () => ({
	Howl: class {
		play = vi.fn();
		stop = vi.fn();
		volume = vi.fn();
		unload = vi.fn();
		playing = vi.fn().mockReturnValue(false);
	},
}));

// ClassicyDesktop imports Platinum, so it is registered here; kept to put it
// back after each case.
const platinum = getClassicyAppearancePackage("platinum");

const HEADING = "No Appearance Package is loaded";
const BODY =
	"Classicy needs an Appearance Package to draw its desktop. Load one at your app's entry, for example:";
const CODE = 'import "@classicy/appearance-platinum";';
const LOG_MESSAGE =
	'No Appearance Package is registered; import "@classicy/appearance-platinum" (or another package) at your app\'s entry.';

const Child = () => <p data-testid="host-child">host app</p>;

const renderDesktop = () =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop>
				<Child />
			</ClassicyDesktop>
		</ClassicyAppManagerProvider>,
	);

describe("ClassicyDesktop with no Appearance Package", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		vi.spyOn(console, "error").mockImplementation(() => {});
		resetClassicyAppearancePackagesForTests();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
		if (platinum) registerClassicyAppearancePackage(platinum);
		useAppManager.setState(DefaultAppManagerState, true);
		vi.restoreAllMocks();
	});

	it("draws the stop screen and nothing of the desktop", () => {
		const { container } = renderDesktop();
		expect(container.querySelector(".classicyNoAppearancePackage")).not.toBe(
			null,
		);
		expect(document.getElementById("classicyDesktop")).toBeNull();
		expect(document.querySelector(".classicyDesktop")).toBeNull();
		expect(document.querySelector(".classicyMenuBar")).toBeNull();
		expect(document.querySelector(".classicyDesktopIcon")).toBeNull();
		expect(document.querySelector(".classicyWindow")).toBeNull();
		expect(document.querySelector(".classicyControlStrip")).toBeNull();
		// The host's apps are not mounted either.
		expect(screen.queryByTestId("host-child")).toBeNull();
	});

	it("says exactly what is missing and how to load one", () => {
		renderDesktop();
		expect(screen.getByRole("heading", { name: HEADING })).toBeVisible();
		expect(screen.getByText(BODY).tagName).toBe("P");
		const code = screen.getByText(CODE);
		expect(code.tagName).toBe("CODE");
		expect(code.textContent).toBe(CODE);
		const stop = document.querySelector(".classicyNoAppearancePackage");
		expect(stop?.textContent).toBe(`${HEADING}${BODY}${CODE}`);
	});

	it("is not the crash screen: no Sad Mac", () => {
		const { container } = renderDesktop();
		expect(container.querySelector(".classicyCrashScreen")).toBeNull();
		expect(container.querySelector("img")).toBeNull();
	});

	it("carries the core theme's variables, since no package supplies any", () => {
		renderDesktop();
		const stop = document.querySelector<HTMLElement>(
			".classicyNoAppearancePackage",
		);
		expect(stop?.style.getPropertyValue("--color-black")).toBe("#000000");
		expect(stop?.style.getPropertyValue("--ui-font-size")).toBe("14px");
	});

	it("takes the desktop's className and style, as the desktop's root while it shows", () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop className="host" style={{ marginTop: 7 }} />
			</ClassicyAppManagerProvider>,
		);
		const stop = document.querySelector<HTMLElement>(
			".classicyNoAppearancePackage",
		);
		expect(stop).toHaveClass("classicyNoAppearancePackage", "host");
		expect(stop?.style.marginTop).toBe("7px");
	});

	it("is replaced by the desktop when a package registers", async () => {
		renderDesktop();
		expect(document.getElementById("classicyDesktop")).toBeNull();
		await act(async () => {
			if (platinum) registerClassicyAppearancePackage(platinum);
		});
		expect(document.querySelector(".classicyNoAppearancePackage")).toBeNull();
		expect(
			document
				.getElementById("classicyDesktop")
				?.getAttribute("data-classicy-appearance"),
		).toBe("platinum");
		expect(screen.getByTestId("host-child")).toBeInTheDocument();
	});

	it("comes back when the last package goes", async () => {
		await act(async () => {
			if (platinum) registerClassicyAppearancePackage(platinum);
		});
		renderDesktop();
		expect(document.getElementById("classicyDesktop")).not.toBeNull();
		await act(async () => resetClassicyAppearancePackagesForTests());
		expect(document.getElementById("classicyDesktop")).toBeNull();
		expect(
			document.querySelector(".classicyNoAppearancePackage"),
		).not.toBeNull();
	});
});

describe("ClassicyNoAppearancePackage passthrough", () => {
	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => {});
	});
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("merges className after its own and style after the core variables", () => {
		const { container } = render(
			<ClassicyNoAppearancePackage
				className="host"
				style={{ marginTop: 7, "--color-black": "#111111" } as CSSProperties}
			/>,
		);
		const root = container.firstElementChild as HTMLElement;
		expect(root.getAttribute("class")).toBe("classicyNoAppearancePackage host");
		expect(root.style.marginTop).toBe("7px");
		// A consumer key wins over the screen's own, custom properties included.
		expect(root.style.getPropertyValue("--color-black")).toBe("#111111");
		expect(root.style.getPropertyValue("--color-white")).toBe("#ffffff");
	});
});

describe("ClassicyNoAppearancePackage's log", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	// A fresh module graph, so "once per page" starts over for this case
	// whatever ran before it in this file.
	it("is one error per page, not per render or remount", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.resetModules();
		const { ClassicyNoAppearancePackage } = await import(
			"@/SystemFolder/SystemResources/Desktop/ClassicyNoAppearancePackage"
		);
		const log = await import("@/SystemFolder/SystemResources/Log/ClassicyLog");
		const entries: ClassicyLogEntry[] = [];
		log.registerClassicyLogSink({
			id: "no-package-test",
			onLog: (entry) => entries.push(entry),
		});
		try {
			const first = render(<ClassicyNoAppearancePackage />);
			first.rerender(<ClassicyNoAppearancePackage />);
			first.unmount();
			render(<ClassicyNoAppearancePackage />).unmount();
			render(<ClassicyNoAppearancePackage />);
		} finally {
			log.unregisterClassicyLogSink("no-package-test");
		}
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			level: "error",
			subsystem: "Appearance",
			message: LOG_MESSAGE,
			details: [],
		});
	});

	it("is not written while a package is registered", () => {
		const entries: ClassicyLogEntry[] = [];
		registerClassicyLogSink({
			id: "no-package-registered-test",
			onLog: (entry) => entries.push(entry),
		});
		try {
			renderDesktop();
		} finally {
			unregisterClassicyLogSink("no-package-registered-test");
		}
		expect(document.getElementById("classicyDesktop")).not.toBeNull();
		expect(entries.filter((e) => e.message === LOG_MESSAGE)).toEqual([]);
	});
});
