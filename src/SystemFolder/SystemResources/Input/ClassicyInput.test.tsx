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

	it("shows every character as the user types into a prefilled field", async () => {
		const user = userEvent.setup();
		render(<ClassicyInput id="test-input" prefillValue="" />);
		const input = screen.getByRole<HTMLInputElement>("textbox");
		await user.type(input, "hello");
		expect(input.value).toBe("hello");
	});

	it("appends typed characters after an initial prefillValue", async () => {
		const user = userEvent.setup();
		render(<ClassicyInput id="test-input" prefillValue="A" />);
		const input = screen.getByRole<HTMLInputElement>("textbox");
		await user.type(input, "BC");
		expect(input.value).toBe("ABC");
	});

	it("resyncs the displayed value when prefillValue changes", () => {
		const { rerender } = render(
			<ClassicyInput id="test-input" prefillValue="first" />,
		);
		const input = screen.getByRole<HTMLInputElement>("textbox");
		expect(input.value).toBe("first");
		rerender(<ClassicyInput id="test-input" prefillValue="second" />);
		expect(input.value).toBe("second");
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

	it("defaults the input type to text", () => {
		render(<ClassicyInput id="typed-default" />);
		expect(document.getElementById("typed-default")).toHaveAttribute("type", "text");
	});

	it("passes a custom type through to the input", () => {
		render(<ClassicyInput id="typed-password" type="password" />);
		expect(document.getElementById("typed-password")).toHaveAttribute(
			"type",
			"password",
		);
	});
});
