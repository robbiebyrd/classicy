import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { ClassicyDisclosure } from "@/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events Disclosure emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "Disclosure");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const root = (container: HTMLElement) =>
	container.querySelector(".classicyDisclosure") as HTMLElement;

describe("ClassicyDisclosure appearance", () => {
	it("carries the probe decoration and state classes", () => {
		const { container } = render(
			<ClassicyDisclosure label="More">
				<p>x</p>
			</ClassicyDisclosure>,
		);
		fireEvent.click(screen.getByRole("button", { name: /More/ }));
		const el = root(container);
		expect(el).toHaveClass("classicyDisclosure", "probe-Disclosure");
		// The root had no state class (I-R4): `open` stays on the inner panel.
		expect(el).not.toHaveClass("expanded");
		expect(el.getAttribute("data-probe-state")).toBe("");
		expect(container.querySelector(".classicyDisclosureInner")).toHaveClass(
			"open",
		);
	});

	it("emits its events", () => {
		render(
			<ClassicyDisclosure label="More">
				<p>x</p>
			</ClassicyDisclosure>,
		);
		const header = screen.getByRole("button", { name: /More/ });
		fireEvent.mouseDown(header);
		fireEvent.click(header);
		fireEvent.mouseDown(header);
		fireEvent.click(header);
		expect(emitted()).toEqual([
			{ event: "expand", detail: { input: "pointer" } },
			{ event: "collapse", detail: { input: "pointer" } },
		]);
	});

	it("emits expand and collapse for the keyboard", () => {
		render(
			<ClassicyDisclosure label="More">
				<p>x</p>
			</ClassicyDisclosure>,
		);
		const header = screen.getByRole("button", { name: /More/ });
		fireEvent.keyDown(header, { key: "Enter" });
		fireEvent.keyDown(header, { key: " " });
		fireEvent.keyDown(header, { key: "ArrowRight", ctrlKey: true });
		// Already open: a second ⌘→ does nothing.
		fireEvent.keyDown(header, { key: "ArrowRight", ctrlKey: true });
		fireEvent.keyDown(header, { key: "ArrowLeft", metaKey: true });
		const keyboard = { input: "keyboard" };
		expect(emitted()).toEqual([
			{ event: "expand", detail: keyboard },
			{ event: "collapse", detail: keyboard },
			{ event: "expand", detail: keyboard },
			{ event: "collapse", detail: keyboard },
		]);
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = render(<ClassicyDisclosure label="More" />);
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.hasAttribute("style")).toBe(false);
		expect(el.getAttribute("class")).toBe("classicyDisclosure");
	});
});
