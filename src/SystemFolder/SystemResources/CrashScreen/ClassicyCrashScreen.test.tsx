import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, userEvent } from "@/__tests__/test-utils";
import {
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { CLASSICY_THEME_NON_MEASUREMENT_VARS } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import { ClassicyCrashScreen } from "@/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen";

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
