import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { ClassicyLink } from "@/SystemFolder/SystemResources/Link/ClassicyLink";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events Link emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "Link");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const root = (container: HTMLElement) =>
	container.querySelector(".classicyLink") as HTMLElement;

describe("ClassicyLink appearance", () => {
	it("carries the probe decoration and state classes", () => {
		const { container } = render(
			<ClassicyLink href="https://example.com" disabled>
				Docs
			</ClassicyLink>,
		);
		const el = root(container);
		expect(el).toHaveClass("classicyLink", "probe-Link", "disabled");
		expect(el.getAttribute("data-probe-state")).toBe("disabled");
	});

	it("emits its events", () => {
		render(
			<ClassicyLink
				href="https://example.com"
				onClickFunc={(e) => e.preventDefault()}
			>
				Docs
			</ClassicyLink>,
		);
		fireEvent.click(screen.getByText("Docs"));
		expect(emitted()).toEqual([{ event: "click", detail: undefined }]);
	});

	it("emits click for keyboard activation of an event link", () => {
		render(<ClassicyLink event="ClassicyNoSuchAction">Run</ClassicyLink>);
		fireEvent.keyDown(screen.getByRole("button", { name: "Run" }), {
			key: "Enter",
		});
		fireEvent.keyDown(screen.getByRole("button", { name: "Run" }), {
			key: " ",
		});
		expect(emitted().map((e) => e.event)).toEqual(["click", "click"]);
	});

	it("emits nothing when disabled", () => {
		render(
			<ClassicyLink href="https://example.com" disabled>
				Docs
			</ClassicyLink>,
		);
		fireEvent.click(screen.getByText("Docs"));
		expect(emitted()).toEqual([]);
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = render(
			<ClassicyLink href="https://example.com" disabled>
				Docs
			</ClassicyLink>,
		);
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.hasAttribute("style")).toBe(false);
		expect(el.getAttribute("class")).toBe("classicyLink disabled");
	});
});
