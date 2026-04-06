import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);

vi.mock("@/SystemFolder/SystemResources/Input/ClassicyInput.scss", () => ({}));
vi.mock(
	"@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss",
	() => ({}),
);

describe("ClassicyInput", () => {
	it("renders an input element with placeholder", () => {
		render(<ClassicyInput id="test-input" placeholder="Enter text" />);
		expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
	});

	it("renders an input with the given id", () => {
		render(<ClassicyInput id="my-field" />);
		expect(document.getElementById("my-field")).toBeInTheDocument();
	});

	it("calls onChangeFunc when user types", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<ClassicyInput id="test-input" onChangeFunc={onChange} />);
		await user.type(screen.getByRole("textbox"), "hello");
		expect(onChange).toHaveBeenCalled();
	});

	it("calls onEnterFunc when Enter key is pressed", async () => {
		const user = userEvent.setup();
		const onEnter = vi.fn();
		render(<ClassicyInput id="test-input" onEnterFunc={onEnter} />);
		const input = screen.getByRole("textbox");
		await user.click(input);
		await user.keyboard("{Enter}");
		expect(onEnter).toHaveBeenCalledTimes(1);
	});

	it("respects disabled prop", () => {
		render(<ClassicyInput id="test-input" disabled={true} />);
		expect(screen.getByRole("textbox")).toBeDisabled();
	});

	it("renders a label when labelTitle is provided", () => {
		render(<ClassicyInput id="test-input" labelTitle="Username" />);
		expect(screen.getByText("Username")).toBeInTheDocument();
	});

	it("does not render a label when labelTitle is omitted", () => {
		render(<ClassicyInput id="test-input" />);
		expect(screen.queryByRole("label")).not.toBeInTheDocument();
	});
});
