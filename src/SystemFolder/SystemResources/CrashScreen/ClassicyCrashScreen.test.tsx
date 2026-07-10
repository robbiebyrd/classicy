import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, userEvent } from "@/__tests__/test-utils";
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
