import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events PopUpMenu emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "PopUpMenu");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const OPTIONS = [
	{ value: "a", label: "Alpha" },
	{ value: "b", label: "Beta" },
];

const root = (container: HTMLElement) =>
	container.querySelector(".classicyPopUpMenu") as HTMLElement;

describe("ClassicyPopUpMenu appearance", () => {
	it("carries the probe decoration and state classes", () => {
		const { container } = render(
			<ClassicyPopUpMenu id="p" options={OPTIONS} disabled />,
		);
		const el = root(container);
		expect(el).toHaveClass("classicyPopUpMenu", "probe-PopUpMenu", "disabled");
		expect(el.getAttribute("data-probe-state")).toBe("disabled");
	});

	it("emits its events", () => {
		const { container } = render(
			<ClassicyPopUpMenu id="p" options={OPTIONS} selected="a" />,
		);
		fireEvent.click(container.querySelector("#p") as HTMLElement);
		expect(emitted()).toEqual([{ event: "open", detail: undefined }]);
		fireEvent.click(screen.getByRole("option", { name: /Beta/ }));
		expect(emitted().slice(1)).toEqual([
			{ event: "change", detail: { value: "b" } },
			{ event: "close", detail: undefined },
		]);
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = render(
			<ClassicyPopUpMenu id="p" options={OPTIONS} disabled />,
		);
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.hasAttribute("style")).toBe(false);
		expect(el.getAttribute("class")).toBe(
			"classicyPopUpMenu classicyPopUpMenuSizeMedium disabled",
		);
	});
});
