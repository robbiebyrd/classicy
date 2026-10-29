import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { ClassicyPlacard } from "@/SystemFolder/SystemResources/Placard/ClassicyPlacard";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events Placard emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "Placard");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const ITEMS = [
	{ id: "50", title: "50%" },
	{ id: "100", title: "100%" },
];

const root = (container: HTMLElement) =>
	container.querySelector(".classicyPlacard") as HTMLElement;

describe("ClassicyPlacard appearance", () => {
	it("carries the probe decoration and state classes", () => {
		const { container } = render(<ClassicyPlacard disabled>p</ClassicyPlacard>);
		const el = root(container);
		expect(el).toHaveClass("classicyPlacard", "probe-Placard", "disabled");
		expect(el.getAttribute("data-probe-state")).toBe("disabled");
	});

	it("emits its events", () => {
		const { container } = render(
			<ClassicyPlacard onClick={() => {}}>p</ClassicyPlacard>,
		);
		const el = root(container);
		fireEvent.mouseDown(el);
		fireEvent.mouseUp(el);
		expect(emitted()).toEqual([
			{ event: "press", detail: undefined },
			{ event: "release", detail: undefined },
		]);
		fireEvent.click(el);
		expect(emitted().slice(2)).toEqual([
			{ event: "click", detail: { menu: false } },
		]);
	});

	it("opens and closes its menu", () => {
		const { container } = render(
			<ClassicyPlacard menuItems={ITEMS}>100%</ClassicyPlacard>,
		);
		fireEvent.click(root(container));
		expect(emitted()).toEqual([
			{ event: "click", detail: { menu: true } },
			{ event: "open", detail: undefined },
		]);
		// An open menu keeps the placard pressed, as before (I-R4).
		expect(root(container)).toHaveClass("pressed");
		fireEvent.click(screen.getByRole("menuitem", { name: "50%" }));
		expect(emitted().slice(2)).toEqual([{ event: "close", detail: undefined }]);
	});

	it("emits close when an outside press dismisses the menu", () => {
		const { container } = render(
			<ClassicyPlacard menuItems={ITEMS}>100%</ClassicyPlacard>,
		);
		fireEvent.click(root(container));
		fireEvent.mouseDown(document.body);
		expect(emitted().map((e) => e.event)).toEqual(["click", "open", "close"]);
	});

	it("emits press and release for Return and Space", () => {
		const { container } = render(
			<ClassicyPlacard onClick={() => {}}>p</ClassicyPlacard>,
		);
		const el = root(container);
		for (const key of ["Enter", " "]) {
			fireEvent.keyDown(el, { key });
			fireEvent.keyDown(el, { key, repeat: true });
			fireEvent.keyUp(el, { key });
		}
		fireEvent.keyDown(el, { key: "a" });
		fireEvent.keyUp(el, { key: "a" });
		expect(emitted().map((e) => e.event)).toEqual([
			"press",
			"release",
			"press",
			"release",
		]);
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = render(
			<ClassicyPlacard menuItems={ITEMS} disabled>
				p
			</ClassicyPlacard>,
		);
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.hasAttribute("style")).toBe(false);
		expect(el.getAttribute("class")).toBe(
			"classicyPlacard disabled classicyPlacardHasMenu",
		);
	});
});
