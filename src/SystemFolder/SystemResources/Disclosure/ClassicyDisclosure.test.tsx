import path from "node:path";
import * as sass from "sass";
import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";
import { ClassicyDisclosure } from "@/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure";

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/Triangle/ClassicyTriangle.scss",
	() => ({}),
);

describe("ClassicyDisclosure", () => {
	it("renders with closed class by default", () => {
		const { container } = render(<ClassicyDisclosure label="More info" />);
		const inner = container.querySelector(".classicyDisclosureInner");
		expect(inner).toHaveClass("classicyDisclosureInnerClose");
		expect(inner).not.toHaveClass("open");
	});

	it("toggles to open class when header is clicked", async () => {
		const user = userEvent.setup();
		const { container } = render(<ClassicyDisclosure label="More info" />);
		const header = container.querySelector(
			".classicyDisclosureHeader",
		) as HTMLElement;
		await user.click(header);
		const inner = container.querySelector(".classicyDisclosureInner");
		expect(inner).toHaveClass("open");
		expect(inner).not.toHaveClass("classicyDisclosureInnerClose");
	});

	it("toggles back to closed class on second click", async () => {
		const user = userEvent.setup();
		const { container } = render(<ClassicyDisclosure label="More info" />);
		const header = container.querySelector(
			".classicyDisclosureHeader",
		) as HTMLElement;
		await user.click(header);
		await user.click(header);
		const inner = container.querySelector(".classicyDisclosureInner");
		expect(inner).toHaveClass("classicyDisclosureInnerClose");
	});

	it("renders children inside the disclosure inner div", () => {
		render(
			<ClassicyDisclosure label="Section">
				<p>Hidden content</p>
			</ClassicyDisclosure>,
		);
		expect(screen.getByText("Hidden content")).toBeInTheDocument();
	});

	it("renders the label text", () => {
		render(<ClassicyDisclosure label="Show details" />);
		expect(screen.getByText("Show details")).toBeInTheDocument();
	});

	it("toggles open on Enter key press", async () => {
		const user = userEvent.setup();
		const { container } = render(<ClassicyDisclosure label="More info" />);
		const header = container.querySelector(
			".classicyDisclosureHeader",
		) as HTMLElement;
		header.focus();
		await user.keyboard("{Enter}");
		const inner = container.querySelector(".classicyDisclosureInner");
		expect(inner).toHaveClass("open");
	});

	it("toggles open on Space key press", async () => {
		const user = userEvent.setup();
		const { container } = render(<ClassicyDisclosure label="More info" />);
		const header = container.querySelector(
			".classicyDisclosureHeader",
		) as HTMLElement;
		header.focus();
		await user.keyboard(" ");
		const inner = container.querySelector(".classicyDisclosureInner");
		expect(inner).toHaveClass("open");
	});

	it("opens with Command-Right and closes with Command-Left", async () => {
		const user = userEvent.setup();
		const { container } = render(<ClassicyDisclosure label="More info" />);
		const header = container.querySelector(
			".classicyDisclosureHeader",
		) as HTMLElement;
		header.focus();
		await user.keyboard("{Meta>}{ArrowRight}{/Meta}");
		const inner = container.querySelector(".classicyDisclosureInner");
		expect(inner).toHaveClass("open");
		await user.keyboard("{Meta>}{ArrowLeft}{/Meta}");
		expect(inner).toHaveClass("classicyDisclosureInnerClose");
	});
});

// vitest's root is the repo root, and jsdom leaves import.meta.url as a
// non-file URL, so resolve from the project root.
const disclosureCss = sass.compile(
	path.resolve(
		process.cwd(),
		"src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.scss",
	),
	{ style: "expanded" },
).css;

describe("ClassicyDisclosure arrangement", () => {
	// The header always renders the triangle, then the label; a left label is
	// moved visually by `order`, so a package can reorder the pair.
	it("keeps one DOM order and moves a left label with order", () => {
		const { container } = render(
			<ClassicyDisclosure label="More info" labelPosition="left" />,
		);
		const header = container.querySelector(
			".classicyDisclosureHeader",
		) as HTMLElement;
		expect(header).toHaveClass("classicyDisclosureLabelLeft");
		expect(header.lastElementChild).toHaveClass("classicyControlLabelHolder");
		const match = disclosureCss.match(
			/^\.classicyDisclosureLabelLeft > \.classicyControlLabelHolder \{\n([^}]*)\n\}/m,
		);
		expect(match?.[1]).toMatch(/^\s*order: -1;$/m);
	});

	it("leaves a right label unmarked", () => {
		const { container } = render(<ClassicyDisclosure label="More info" />);
		const header = container.querySelector(
			".classicyDisclosureHeader",
		) as HTMLElement;
		expect(header).not.toHaveClass("classicyDisclosureLabelLeft");
		expect(header.lastElementChild).toHaveClass("classicyControlLabelHolder");
	});
});
