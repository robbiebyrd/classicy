import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";
import {
	ClassicyAssistant,
	type ClassicyAssistantPage,
} from "@/SystemFolder/SystemResources/Assistant/ClassicyAssistant";

// Stable sound-dispatch spy shared across tests so page-change/error sounds
// can be asserted. Hoisted so it is defined before the vi.mock factory runs.
const { soundDispatch } = vi.hoisted(() => ({ soundDispatch: vi.fn() }));

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => soundDispatch }),
);
vi.mock(
	"@/SystemFolder/SystemResources/Assistant/ClassicyAssistant.scss",
	() => ({}),
);

beforeEach(() => {
	soundDispatch.mockClear();
});

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

describe("ClassicyAssistant — navigation", () => {
	it("advances to the next page and fires onPageChange", async () => {
		const user = userEvent.setup();
		const onPageChange = vi.fn();
		render(<ClassicyAssistant pages={pages} onPageChange={onPageChange} />);
		await user.click(screen.getByRole("button", { name: "Next page" }));
		expect(screen.getByText("Network Settings")).toBeInTheDocument();
		expect(onPageChange).toHaveBeenCalledWith(1);
	});

	it("goes back to the previous page", async () => {
		const user = userEvent.setup();
		render(<ClassicyAssistant pages={pages} initialPage={1} />);
		await user.click(screen.getByRole("button", { name: "Previous page" }));
		expect(screen.getByText("Introduction")).toBeInTheDocument();
	});

	it("disables Previous on the first page", () => {
		render(<ClassicyAssistant pages={pages} />);
		expect(
			screen.getByRole("button", { name: "Previous page" }),
		).toBeDisabled();
	});

	it("disables Next on the last page", () => {
		render(<ClassicyAssistant pages={pages} initialPage={2} />);
		expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
	});

	it("plays a click sound on page change", async () => {
		const user = userEvent.setup();
		render(<ClassicyAssistant pages={pages} />);
		await user.click(screen.getByRole("button", { name: "Next page" }));
		expect(soundDispatch).toHaveBeenCalledWith({
			type: "ClassicySoundPlay",
			sound: "ClassicyTabClickUp",
		});
	});
});
