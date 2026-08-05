import { describe, expect, it } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";
import {
	ClassicyButtonToolbar,
	ClassicyButtonToolbarGroup,
} from "@/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar";

const separators = (container: HTMLElement) =>
	container.querySelectorAll(".classicySeparatorVertical");

describe("ClassicyButtonToolbar", () => {
	it("renders no separator for a single group", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<button type="button">A</button>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(separators(container)).toHaveLength(0);
	});

	it("renders one separator between two groups", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<button type="button">A</button>
				</ClassicyButtonToolbarGroup>
				<ClassicyButtonToolbarGroup>
					<button type="button">B</button>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(separators(container)).toHaveLength(1);
	});

	it("renders N-1 separators for N groups", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<button type="button">A</button>
				</ClassicyButtonToolbarGroup>
				<ClassicyButtonToolbarGroup>
					<button type="button">B</button>
				</ClassicyButtonToolbarGroup>
				<ClassicyButtonToolbarGroup>
					<button type="button">C</button>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(separators(container)).toHaveLength(2);
	});

	it("renders nothing but the container when empty", () => {
		const { container } = render(
			<ClassicyButtonToolbar>{null}</ClassicyButtonToolbar>,
		);
		expect(
			container.querySelector(".classicyButtonToolbar"),
		).toBeInTheDocument();
		expect(separators(container)).toHaveLength(0);
	});

	it("ignores a falsy conditional group when counting separators", () => {
		const show = false;
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<button type="button">A</button>
				</ClassicyButtonToolbarGroup>
				{show && (
					<ClassicyButtonToolbarGroup>
						<button type="button">B</button>
					</ClassicyButtonToolbarGroup>
				)}
			</ClassicyButtonToolbar>,
		);
		expect(separators(container)).toHaveLength(0);
	});

	it("renders a non-button child inside a group without error", () => {
		const { getByText } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<span>label</span>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(getByText("label")).toBeInTheDocument();
	});

	it("merges an extra className onto the toolbar", () => {
		const { container } = render(
			<ClassicyButtonToolbar className="extraBar">
				<ClassicyButtonToolbarGroup>
					<button type="button">A</button>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(container.querySelector(".classicyButtonToolbar")).toHaveClass(
			"extraBar",
		);
	});
});

describe("ClassicyBevelButton square defaults inside a toolbar", () => {
	const squareButtons = (container: HTMLElement) =>
		container.querySelectorAll(".classicyBevelButtonSquare");

	it("makes an icon-only button square inside a toolbar", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<ClassicyBevelButton icon="/i.png" iconAlt="Back" />
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(squareButtons(container)).toHaveLength(1);
	});

	it("leaves a text button rectangular inside a toolbar", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<ClassicyBevelButton>Open</ClassicyBevelButton>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(squareButtons(container)).toHaveLength(0);
	});

	it("leaves an icon button WITH text rectangular inside a toolbar", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<ClassicyBevelButton icon="/i.png" iconAlt="Back">
						Back
					</ClassicyBevelButton>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(squareButtons(container)).toHaveLength(0);
	});

	it("honors an explicit square={false} on an icon-only toolbar button", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<ClassicyBevelButton icon="/i.png" iconAlt="Back" square={false} />
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(squareButtons(container)).toHaveLength(0);
	});

	it("honors an explicit square on a text toolbar button", () => {
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<ClassicyBevelButton square>Go</ClassicyBevelButton>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		expect(squareButtons(container)).toHaveLength(1);
	});

	it("does not make an icon-only button square outside a toolbar", () => {
		const { container } = render(
			<ClassicyBevelButton icon="/i.png" iconAlt="Back" />,
		);
		expect(squareButtons(container)).toHaveLength(0);
	});
});
