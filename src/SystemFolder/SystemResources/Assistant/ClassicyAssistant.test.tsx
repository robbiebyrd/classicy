import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import {
	ClassicyAssistant,
	type ClassicyAssistantPage,
} from "@/SystemFolder/SystemResources/Assistant/ClassicyAssistant";

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => vi.fn() }),
);
vi.mock(
	"@/SystemFolder/SystemResources/Assistant/ClassicyAssistant.scss",
	() => ({}),
);

const pages: ClassicyAssistantPage[] = [
	{ title: "Introduction", content: <p>Welcome to the assistant</p> },
	{ title: "Network Settings", content: <p>Configure your network</p> },
	{ title: "Finish", content: <p>All done</p> },
];

describe("ClassicyAssistant — core render", () => {
	it("renders the first page's title and content by default", () => {
		render(<ClassicyAssistant pages={pages} />);
		expect(screen.getByText("Introduction")).toBeInTheDocument();
		expect(screen.getByText("Welcome to the assistant")).toBeInTheDocument();
	});

	it("shows the 1-based current page number", () => {
		const { container } = render(<ClassicyAssistant pages={pages} />);
		expect(
			container.querySelector(".classicyAssistantPageIndicator")?.textContent,
		).toBe("1");
	});

	it("seeds the starting page from initialPage", () => {
		render(<ClassicyAssistant pages={pages} initialPage={1} />);
		expect(screen.getByText("Network Settings")).toBeInTheDocument();
	});

	it("clamps an out-of-range initialPage to the last page", () => {
		render(<ClassicyAssistant pages={pages} initialPage={99} />);
		expect(screen.getByText("Finish")).toBeInTheDocument();
	});
});
