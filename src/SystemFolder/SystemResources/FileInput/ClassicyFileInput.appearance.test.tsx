import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { ClassicyFileInput } from "@/SystemFolder/SystemResources/FileInput/ClassicyFileInput";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events FileInput emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "FileInput");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const file = (name: string) => new File(["x"], name, { type: "text/plain" });

const choose = (container: HTMLElement, files: File[]) =>
	fireEvent.change(
		container.querySelector('input[type="file"]') as HTMLInputElement,
		{ target: { files } },
	);

const root = (container: HTMLElement) =>
	container.querySelector(".classicyFileInputHolder") as HTMLElement;

describe("ClassicyFileInput appearance", () => {
	it("carries the probe decoration and state classes", () => {
		const { container } = render(
			<ClassicyFileInput id="f" multiple maxFiles={1} />,
		);
		choose(container, [file("a.txt"), file("b.txt")]);
		const el = root(container);
		expect(el).toHaveClass("classicyFileInputHolder", "probe-FileInput");
		// The root had no state class (I-R4): `error` stays on the message.
		expect(el).not.toHaveClass("error");
		expect(el.getAttribute("data-probe-state")).toBe("");
		expect(container.querySelector(".classicyFileInputMessage")).toHaveClass(
			"error",
		);
	});

	it("emits its events", () => {
		const { container } = render(<ClassicyFileInput id="f" />);
		choose(container, [file("a.txt")]);
		expect(emitted()).toEqual([
			{ event: "change", detail: { fileName: "a.txt" } },
		]);
	});

	it("emits nothing for a refused choice", () => {
		const { container } = render(
			<ClassicyFileInput id="f" multiple maxFiles={1} />,
		);
		choose(container, [file("a.txt"), file("b.txt")]);
		expect(emitted()).toEqual([]);
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = render(<ClassicyFileInput id="f" disabled />);
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.hasAttribute("style")).toBe(false);
		expect(el.getAttribute("class")).toBe(
			"classicyFileInputHolder classicyLabelAbove",
		);
	});
});
