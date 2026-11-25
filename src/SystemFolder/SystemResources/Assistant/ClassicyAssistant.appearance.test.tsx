import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { ClassicyAssistant } from "@/SystemFolder/SystemResources/Assistant/ClassicyAssistant";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events Assistant emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "Assistant");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const root = (container: HTMLElement) =>
	container.querySelector(".classicyAssistant") as HTMLElement;

const pages = [
	{ title: "One", content: <p>1</p> },
	{ title: "Two", content: <p>2</p> },
	{ title: "Three", content: <p>3</p>, canAdvance: () => false },
];

describe("ClassicyAssistant appearance", () => {
	it("carries the probe decoration and no state classes", () => {
		const { container } = render(<ClassicyAssistant pages={pages} />);
		const el = root(container);
		expect(el).toHaveClass("classicyAssistant", "probe-Assistant");
		expect(el.getAttribute("data-probe-state")).toBe("");
	});

	it("emits change { page } for the Next arrow and the arrow keys", () => {
		const { container } = render(<ClassicyAssistant pages={pages} />);
		const next = screen.getByRole("button", { name: "Next page" });
		fireEvent.mouseDown(next);
		fireEvent.click(next);
		fireEvent.keyDown(root(container), { key: "ArrowLeft" });
		expect(emitted()).toEqual([
			{ event: "change", detail: { page: 1, input: "pointer" } },
			{ event: "change", detail: { page: 0, input: "keyboard" } },
		]);
	});

	it("emits nothing for a refused or a no-op move", () => {
		const { container } = render(
			<ClassicyAssistant pages={pages} initialPage={2} />,
		);
		// The last page refuses to advance, and there is no page after it.
		fireEvent.keyDown(root(container), { key: "ArrowRight" });
		expect(emitted()).toEqual([]);
	});

	it("puts the consumer style after the package's", () => {
		probe.uninstall();
		probe = installClassicyAppearanceProbe({
			on: { mount: () => ({ style: { marginTop: 1, marginLeft: 3 } }) },
		});
		const { container } = render(
			<ClassicyAssistant pages={pages} style={{ marginTop: 7 }} />,
		);
		const el = root(container);
		expect(el.style.marginLeft).toBe("3px");
		expect(el.style.marginTop).toBe("7px");
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = render(
			<ClassicyAssistant pages={pages} className="host" />,
		);
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.hasAttribute("style")).toBe(false);
		expect(el.getAttribute("class")).toBe("classicyAssistant host");
	});
});

// Windows' wizard buttons (`assistant.navigation: "buttons"`, the audit's
// 12.22) move through the pager's handlers, so the `change` hook hears them
// as it hears the arrows; their access keys are drawn and taken as every
// push button's are (`menu.accessKeys`, L4-H1): Alt+N is Next, Alt+B Back.
describe("ClassicyAssistant appearance — Windows' wizard buttons", () => {
	beforeEach(() => {
		probe.uninstall();
		probe = installClassicyAppearanceProbe({
			layout: windows98.layout as never,
		});
	});
	// Alt and the key, in the window holding focus.
	const alt = (k: string, target: HTMLElement) => {
		target.focus();
		return fireEvent.keyDown(target, {
			key: k,
			code: `Key${k.toUpperCase()}`,
			altKey: true,
		});
	};
	const inWindow = (node: React.ReactNode) => (
		<div className="classicyWindow">{node}</div>
	);
	const part = (name: string) =>
		screen
			.getByRole("button", { name })
			.querySelector("[data-classicy-part='access-key']");

	it("underlines B and N and emits change { page } for a click and for Alt+B", () => {
		const { container } = render(inWindow(<ClassicyAssistant pages={pages} />));
		expect(part("< Back")).toHaveTextContent("B");
		expect(part("Next >")).toHaveTextContent("N");
		const next = screen.getByRole("button", { name: "Next >" });
		fireEvent.mouseDown(next);
		fireEvent.click(next);
		alt("b", root(container));
		// (An access key clicks its button from a window capture listener,
		// ahead of the document one that marks the press's modality, so the
		// second change's `input` is the pointer's; only the page is pinned.)
		expect(
			emitted().map((e) => [e.event, (e.detail as { page: number }).page]),
		).toEqual([
			["change", 1],
			["change", 0],
		]);
		expect(emitted()[0]?.detail).toEqual({ page: 1, input: "pointer" });
	});

	it("takes Alt+N to the next page and refuses past a page's canAdvance", () => {
		const { container } = render(
			inWindow(<ClassicyAssistant pages={pages} initialPage={1} />),
		);
		alt("n", root(container));
		expect(screen.getAllByText("Three").length).toBeGreaterThan(0);
		// The last page refuses to advance, and Next > is disabled there.
		expect(screen.getByRole("button", { name: "Next >" })).toBeDisabled();
		expect(
			emitted().map((e) => [e.event, (e.detail as { page: number }).page]),
		).toEqual([["change", 2]]);
	});

	it("draws no access keys without the package's access keys", () => {
		probe.uninstall();
		probe = installClassicyAppearanceProbe({
			layout: {
				...(windows98.layout as never as Record<string, unknown>),
				menu: undefined,
			} as never,
		});
		render(inWindow(<ClassicyAssistant pages={pages} />));
		expect(part("< Back")).toBeNull();
		expect(part("Next >")).toBeNull();
		expect(screen.getByRole("button", { name: "< Back" })).not.toHaveAttribute(
			"accesskey",
		);
	});
});
