import type { ReactNode } from "react";
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
// Render ClassicyButton as a plain <button> so footer-button assertions read
// its label and click without pulling in the real button's sound/analytics.
vi.mock("@/SystemFolder/SystemResources/Button/ClassicyButton", () => ({
	ClassicyButton: ({
		children,
		onClickFunc,
		disabled,
	}: {
		children: ReactNode;
		onClickFunc?: () => void;
		disabled?: boolean;
	}) => (
		<button type="button" disabled={disabled} onClick={onClickFunc}>
			{children}
		</button>
	),
}));

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

describe("ClassicyAssistant — controlled mode", () => {
	it("renders the page prop and ignores initialPage", () => {
		render(<ClassicyAssistant pages={pages} page={1} initialPage={2} />);
		expect(screen.getByText("Network Settings")).toBeInTheDocument();
	});

	it("clamps an out-of-range page prop", () => {
		render(<ClassicyAssistant pages={pages} page={99} />);
		expect(screen.getByText("Finish")).toBeInTheDocument();
	});

	it("reports navigation without changing page itself", async () => {
		const user = userEvent.setup();
		const onPageChange = vi.fn();
		render(
			<ClassicyAssistant pages={pages} page={0} onPageChange={onPageChange} />,
		);
		await user.click(screen.getByRole("button", { name: "Next page" }));
		expect(onPageChange).toHaveBeenCalledWith(1);
		expect(screen.getByText("Introduction")).toBeInTheDocument();
	});

	it("follows a changed page prop", () => {
		const { rerender } = render(<ClassicyAssistant pages={pages} page={0} />);
		rerender(<ClassicyAssistant pages={pages} page={2} />);
		expect(screen.getByText("Finish")).toBeInTheDocument();
	});

	it("still gates on canAdvance", async () => {
		const gated: ClassicyAssistantPage[] = [
			{ title: "One", content: <p>one</p>, canAdvance: () => false },
			{ title: "Two", content: <p>two</p> },
		];
		const user = userEvent.setup();
		const onPageChange = vi.fn();
		render(
			<ClassicyAssistant pages={gated} page={0} onPageChange={onPageChange} />,
		);
		await user.click(screen.getByRole("button", { name: "Next page" }));
		expect(onPageChange).not.toHaveBeenCalled();
		expect(soundDispatch).toHaveBeenCalledWith({
			type: "ClassicySoundPlayError",
		});
	});

	it("reports arrow-key navigation too", async () => {
		const user = userEvent.setup();
		const onPageChange = vi.fn();
		const { container } = render(
			<ClassicyAssistant pages={pages} page={1} onPageChange={onPageChange} />,
		);
		(container.querySelector(".classicyAssistant") as HTMLElement).focus();
		await user.keyboard("{ArrowLeft}");
		expect(onPageChange).toHaveBeenCalledWith(0);
		expect(screen.getByText("Network Settings")).toBeInTheDocument();
	});
});

describe("ClassicyAssistant — advance gate", () => {
	it("blocks Next and beeps when canAdvance returns false", async () => {
		const gated: ClassicyAssistantPage[] = [
			{ title: "One", content: <p>one</p>, canAdvance: () => false },
			{ title: "Two", content: <p>two</p> },
		];
		const user = userEvent.setup();
		render(<ClassicyAssistant pages={gated} />);
		await user.click(screen.getByRole("button", { name: "Next page" }));
		expect(screen.getByText("One")).toBeInTheDocument();
		expect(soundDispatch).toHaveBeenCalledWith({
			type: "ClassicySoundPlayError",
		});
	});

	it("allows Next when canAdvance returns true", async () => {
		const gated: ClassicyAssistantPage[] = [
			{ title: "One", content: <p>one</p>, canAdvance: () => true },
			{ title: "Two", content: <p>two</p> },
		];
		const user = userEvent.setup();
		render(<ClassicyAssistant pages={gated} />);
		await user.click(screen.getByRole("button", { name: "Next page" }));
		expect(screen.getByText("Two")).toBeInTheDocument();
	});

	it("never gates Previous", async () => {
		const gated: ClassicyAssistantPage[] = [
			{ title: "One", content: <p>one</p> },
			{ title: "Two", content: <p>two</p>, canAdvance: () => false },
		];
		const user = userEvent.setup();
		render(<ClassicyAssistant pages={gated} initialPage={1} />);
		await user.click(screen.getByRole("button", { name: "Previous page" }));
		expect(screen.getByText("One")).toBeInTheDocument();
	});
});

describe("ClassicyAssistant — footer buttons", () => {
	it("renders global buttons when a page defines none", () => {
		const onClick = vi.fn();
		render(
			<ClassicyAssistant
				pages={pages}
				buttons={[{ title: "Cancel", onClick }]}
			/>,
		);
		expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
	});

	it("fires a button's onClick", async () => {
		const onClick = vi.fn();
		const user = userEvent.setup();
		render(
			<ClassicyAssistant
				pages={pages}
				buttons={[{ title: "Cancel", onClick }]}
			/>,
		);
		await user.click(screen.getByRole("button", { name: "Cancel" }));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("per-page buttons override global buttons", () => {
		const withPageButtons: ClassicyAssistantPage[] = [
			{
				title: "One",
				content: <p>one</p>,
				buttons: [{ title: "Help", onClick: vi.fn() }],
			},
		];
		render(
			<ClassicyAssistant
				pages={withPageButtons}
				buttons={[{ title: "Cancel", onClick: vi.fn() }]}
			/>,
		);
		expect(screen.getByRole("button", { name: "Help" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
	});

	it("caps footer buttons at 3 and warns", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const four = [1, 2, 3, 4].map((n) => ({
			title: `B${n}`,
			onClick: vi.fn(),
		}));
		render(<ClassicyAssistant pages={pages} buttons={four} />);
		expect(screen.getByRole("button", { name: "B3" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "B4" })).toBeNull();
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});
});

describe("ClassicyAssistant — header icons", () => {
	it("renders the small label icon before the title", () => {
		const iconPages: ClassicyAssistantPage[] = [
			{ title: "Intro", content: <p>x</p>, labelIcon: "label.png" },
		];
		const { container } = render(<ClassicyAssistant pages={iconPages} />);
		const img = container.querySelector(".classicyAssistantHeaderLabelIcon");
		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute("src", "label.png");
		expect(img).toHaveAttribute("aria-hidden", "true");
	});

	it("renders the large accessory icon with the size class", () => {
		const iconPages: ClassicyAssistantPage[] = [
			{
				title: "Intro",
				content: <p>x</p>,
				accessoryIcon: "big.png",
				accessoryIconSize: "lg",
			},
		];
		const { container } = render(<ClassicyAssistant pages={iconPages} />);
		const img = container.querySelector(".classicyAssistantAccessoryIcon");
		expect(img).toHaveClass("classicyAssistantAccessoryIconLg");
		expect(img).toHaveAttribute("src", "big.png");
	});

	it("defaults the accessory icon size to sm", () => {
		const iconPages: ClassicyAssistantPage[] = [
			{ title: "Intro", content: <p>x</p>, accessoryIcon: "big.png" },
		];
		const { container } = render(<ClassicyAssistant pages={iconPages} />);
		expect(
			container.querySelector(".classicyAssistantAccessoryIcon"),
		).toHaveClass("classicyAssistantAccessoryIconSm");
	});

	it("renders no icons when none are provided", () => {
		const { container } = render(<ClassicyAssistant pages={pages} />);
		expect(
			container.querySelector(".classicyAssistantHeaderLabelIcon"),
		).toBeNull();
		expect(
			container.querySelector(".classicyAssistantAccessoryIcon"),
		).toBeNull();
	});
});

describe("ClassicyAssistant — keyboard & a11y", () => {
	it("advances on ArrowRight and retreats on ArrowLeft", async () => {
		const user = userEvent.setup();
		const { container } = render(<ClassicyAssistant pages={pages} />);
		const root = container.querySelector(".classicyAssistant") as HTMLElement;
		root.focus();
		await user.keyboard("{ArrowRight}");
		expect(screen.getByText("Network Settings")).toBeInTheDocument();
		await user.keyboard("{ArrowLeft}");
		expect(screen.getByText("Introduction")).toBeInTheDocument();
	});

	it("ArrowRight respects canAdvance", async () => {
		const gated: ClassicyAssistantPage[] = [
			{ title: "One", content: <p>one</p>, canAdvance: () => false },
			{ title: "Two", content: <p>two</p> },
		];
		const user = userEvent.setup();
		const { container } = render(<ClassicyAssistant pages={gated} />);
		(container.querySelector(".classicyAssistant") as HTMLElement).focus();
		await user.keyboard("{ArrowRight}");
		expect(screen.getByText("One")).toBeInTheDocument();
	});

	it("exposes the current title via an aria-live header region", () => {
		render(<ClassicyAssistant pages={pages} />);
		const region = screen.getByRole("region", { name: "Introduction" });
		expect(region).toHaveAttribute("aria-live", "polite");
	});

	it("labels the body group with the current title", () => {
		render(<ClassicyAssistant pages={pages} />);
		expect(
			screen.getByRole("group", { name: "Introduction" }),
		).toBeInTheDocument();
	});
});
