import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { ClassicyListBox } from "@/SystemFolder/SystemResources/ListBox/ClassicyListBox";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events ListBox emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "ListBox");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const OPTIONS = [
	{ value: "a", label: "Alpha" },
	{ value: "b", label: "Beta" },
];

const root = (container: HTMLElement) =>
	container.querySelector(".classicyListBox") as HTMLElement;

describe("ClassicyListBox appearance", () => {
	it("carries the probe decoration and state classes", () => {
		const { container } = render(
			<ClassicyListBox id="l" options={OPTIONS} disabled />,
		);
		const el = root(container);
		expect(el).toHaveClass("classicyListBox", "probe-ListBox", "disabled");
		expect(el.getAttribute("data-probe-state")).toBe("disabled");
	});

	it("emits its events", () => {
		render(<ClassicyListBox id="l" options={OPTIONS} />);
		fireEvent.click(screen.getByRole("option", { name: "Beta" }));
		// Clicking a row focuses it first, so focus enters the list.
		expect(emitted()).toEqual([
			{ event: "focus", detail: undefined },
			{ event: "select", detail: { value: "b" } },
		]);
	});

	it("emits focus and blur when focus enters and leaves the list", () => {
		render(
			<>
				<ClassicyListBox id="l" options={OPTIONS} />
				<button type="button">outside</button>
			</>,
		);
		const [alpha, beta] = screen.getAllByRole("option");
		fireEvent.focus(alpha);
		// Moving between rows stays inside the list: no blur/focus pair.
		fireEvent.blur(alpha, { relatedTarget: beta });
		fireEvent.focus(beta, { relatedTarget: alpha });
		fireEvent.blur(beta, {
			relatedTarget: screen.getByRole("button", { name: "outside" }),
		});
		expect(emitted().map((e) => e.event)).toEqual(["focus", "blur"]);
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = render(
			<ClassicyListBox id="l" options={OPTIONS} disabled />,
		);
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.hasAttribute("style")).toBe(false);
		expect(el.getAttribute("class")).toBe("classicyListBox disabled");
	});
});
