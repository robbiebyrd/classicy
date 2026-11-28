import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, userEvent } from "@/__tests__/test-utils";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import {
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { CLASSICY_THEME_NON_MEASUREMENT_VARS } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import {
	CLASSICY_FATAL_EXCEPTION_SCREEN,
	ClassicyCrashScreen,
} from "@/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen";

vi.mock(
	"@/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen.scss",
	() => ({}),
);

// A component that always throws during render.
const Bomb = () => {
	throw new Error("boom");
};

describe("ClassicyCrashScreen", () => {
	beforeEach(() => {
		// React logs caught render errors loudly; keep test output clean.
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("renders its children when nothing throws", () => {
		const { getByText, container } = render(
			<ClassicyCrashScreen>
				<p>desktop</p>
			</ClassicyCrashScreen>,
		);
		expect(getByText("desktop")).toBeInTheDocument();
		expect(
			container.querySelector(".classicyCrashScreen"),
		).not.toBeInTheDocument();
	});

	it("renders the Sad Mac overlay instead of children when a child throws", () => {
		const { container, getByRole, queryByText } = render(
			<ClassicyCrashScreen>
				<Bomb />
			</ClassicyCrashScreen>,
		);
		expect(container.querySelector(".classicyCrashScreen")).toBeInTheDocument();
		expect(getByRole("img")).toBeInTheDocument();
		expect(queryByText("desktop")).not.toBeInTheDocument();
	});

	it("logs the error via console.error", () => {
		render(
			<ClassicyCrashScreen>
				<Bomb />
			</ClassicyCrashScreen>,
		);
		expect(console.error).toHaveBeenCalled();
	});

	it("reloads the page when the overlay is clicked", async () => {
		const reload = vi.fn();
		vi.stubGlobal("location", { ...window.location, reload });
		const { container } = render(
			<ClassicyCrashScreen>
				<Bomb />
			</ClassicyCrashScreen>,
		);
		await userEvent.click(
			container.querySelector(".classicyCrashScreen") as HTMLElement,
		);
		expect(reload).toHaveBeenCalled();
	});

	it("reloads the page on any keydown while crashed", () => {
		const reload = vi.fn();
		vi.stubGlobal("location", { ...window.location, reload });
		render(
			<ClassicyCrashScreen>
				<Bomb />
			</ClassicyCrashScreen>,
		);
		fireEvent.keyDown(window, { key: "Escape" });
		expect(reload).toHaveBeenCalled();
	});

	it("does not listen for keydown before a crash", () => {
		const reload = vi.fn();
		vi.stubGlobal("location", { ...window.location, reload });
		render(
			<ClassicyCrashScreen>
				<p>desktop</p>
			</ClassicyCrashScreen>,
		);
		fireEvent.keyDown(window, { key: "Escape" });
		expect(reload).not.toHaveBeenCalled();
	});
});

// The audit's 1.14: under `layout.crashScreen: "fatalException"` (Windows 98)
// the crash is Windows' own fatal-exception screen, text on blue; without
// the key (Platinum, System 7) the Sad Mac as before.
describe("ClassicyCrashScreen's fatal-exception screen", () => {
	let restore: (() => void) | undefined;

	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		restore?.();
		restore = undefined;
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("draws Windows 98's text, title first, under the key", () => {
		restore = activateTestWindowsKeysPackage({ crashScreen: "fatalException" });
		const { container, queryByRole } = render(
			<ClassicyCrashScreen>
				<Bomb />
			</ClassicyCrashScreen>,
		);
		const screen = container.querySelector(
			".classicyCrashScreen.classicyCrashScreenFatalException",
		) as HTMLElement;
		expect(screen).toBeInTheDocument();
		expect(queryByRole("img")).not.toBeInTheDocument();
		expect(screen.querySelector(".classicyCrashScreenTitle")?.textContent).toBe(
			" Windows ",
		);
		expect(
			[...screen.querySelectorAll(".classicyCrashScreenLine")].map(
				(line) => line.textContent,
			),
		).toEqual([
			" ",
			"A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMM(01) +",
			"00010E36. The current application will be terminated.",
			" ",
			"*  Press any key to terminate the current application.",
			"*  Press CTRL+ALT+DEL again to restart your computer. You will",
			"   lose any unsaved information in all applications.",
			" ",
		]);
		expect(
			screen.querySelector(".classicyCrashScreenPrompt")?.textContent,
		).toBe("Press any key to continue _");
		expect(CLASSICY_FATAL_EXCEPTION_SCREEN.prompt).toBe(
			"Press any key to continue _",
		);
	});

	it("names the crash and the restart for assistive technology", () => {
		restore = activateTestWindowsKeysPackage({ crashScreen: "fatalException" });
		const { getByRole } = render(
			<ClassicyCrashScreen>
				<Bomb />
			</ClassicyCrashScreen>,
		);
		const button = getByRole("button");
		expect(button.getAttribute("aria-label")).toMatch(/crashed/);
		expect(button.getAttribute("aria-label")).toMatch(/press any key/i);
	});

	it("reloads on a click and on any key", async () => {
		restore = activateTestWindowsKeysPackage({ crashScreen: "fatalException" });
		const reload = vi.fn();
		vi.stubGlobal("location", { ...window.location, reload });
		const { container } = render(
			<ClassicyCrashScreen>
				<Bomb />
			</ClassicyCrashScreen>,
		);
		await userEvent.click(
			container.querySelector(".classicyCrashScreen") as HTMLElement,
		);
		expect(reload).toHaveBeenCalledTimes(1);
		fireEvent.keyDown(window, { key: "a" });
		expect(reload).toHaveBeenCalledTimes(2);
	});

	it.each([
		["the key absent", {}],
		["sadMac", { crashScreen: "sadMac" as const }],
	])("draws the Sad Mac with %s", (_label, layout) => {
		restore = activateTestWindowsKeysPackage(layout);
		const { container, getByRole } = render(
			<ClassicyCrashScreen>
				<Bomb />
			</ClassicyCrashScreen>,
		);
		expect(
			container.querySelector(".classicyCrashScreenFatalException"),
		).not.toBeInTheDocument();
		expect(getByRole("img").getAttribute("alt")).toMatch(/^Sad Mac/);
	});
});

// The fatal-exception screen's colors are its own, outside any theme (the
// literal-color sweep's crash-screen list), and its text is sized in viewport
// units, so it reads no theme variable either.
describe("ClassicyCrashScreen's fatal-exception styles", () => {
	const sheet = readFileSync(
		resolve(__dirname, "ClassicyCrashScreen.scss"),
		"utf8",
	);
	const rule = sheet.slice(
		sheet.indexOf(".classicyCrashScreen.classicyCrashScreenFatalException"),
	);

	it("draws light gray on blue with the title inverted", () => {
		expect(rule).toMatch(/color: #aaaaaa;\s*background: #0000aa;/);
		expect(rule).toMatch(
			/\.classicyCrashScreenTitle \{[^}]*color: #0000aa;\s*background: #aaaaaa;/,
		);
	});

	it("sizes its text in viewport units and reads no variable", () => {
		expect(rule).toMatch(/font-size: min\([\d.]+vw, [\d.]+vh\);/);
		expect(rule).not.toMatch(/var\(/);
	});
});

// H-R27a: the Sad Mac replaces the whole desktop, so it renders outside the
// element that carries the theme's variables. Its sheet must not read a theme
// measurement (it would never be set there), and anything it does read needs
// a fallback of its own; the art keeps its intrinsic size.
describe("ClassicyCrashScreen styles", () => {
	const sheet = readFileSync(
		resolve(__dirname, "ClassicyCrashScreen.scss"),
		"utf8",
	).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
	const reads = [...sheet.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)\s*([,)])/g)];

	it("reads no theme measurement variable", () => {
		const measurements = Object.keys(getThemeVars(getTheme("default"))).filter(
			(name) => !CLASSICY_THEME_NON_MEASUREMENT_VARS.includes(name),
		);
		expect(
			reads
				.map(([, name]) => name)
				.filter((name) => measurements.includes(name)),
		).toEqual([]);
	});

	it("reads every variable with a fallback of its own", () =>
		expect(
			reads.filter(([, , next]) => next !== ",").map(([, name]) => name),
		).toEqual([]));
});
