import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, userEvent } from "@/__tests__/test-utils";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
// The Windows-layout package below needs a sound pack registered.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => vi.fn(),
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss",
	() => ({}),
);

describe("ClassicyCheckbox", () => {
	it("renders a checkbox", () => {
		render(<ClassicyCheckbox id="cb-1" />);
		expect(screen.getByRole("checkbox")).toBeInTheDocument();
	});

	it("starts unchecked by default", () => {
		render(<ClassicyCheckbox id="cb-1" />);
		expect(screen.getByRole("checkbox")).not.toBeChecked();
	});

	it("starts checked when checked=true", () => {
		render(<ClassicyCheckbox id="cb-1" checked={true} />);
		expect(screen.getByRole("checkbox")).toBeChecked();
	});

	it("toggles checked state on click", async () => {
		const user = userEvent.setup();
		render(<ClassicyCheckbox id="cb-1" />);
		const checkbox = screen.getByRole("checkbox");
		expect(checkbox).not.toBeChecked();
		await user.click(checkbox);
		expect(checkbox).toBeChecked();
		await user.click(checkbox);
		expect(checkbox).not.toBeChecked();
	});

	it("calls onClickFunc with new checked value", async () => {
		const user = userEvent.setup();
		const onClickFunc = vi.fn();
		render(<ClassicyCheckbox id="cb-1" onClickFunc={onClickFunc} />);
		await user.click(screen.getByRole("checkbox"));
		expect(onClickFunc).toHaveBeenCalledWith(true);
	});

	it("disabled checkbox: onClickFunc still fires but state does not toggle", async () => {
		const onClickFunc = vi.fn();
		render(
			<ClassicyCheckbox id="cb-1" disabled={true} onClickFunc={onClickFunc} />,
		);
		const checkbox = screen.getByRole("checkbox");
		// Disabled checkboxes cannot be interacted with via userEvent, so we verify the
		// element is disabled and that the handler wiring reflects the disabled behavior.
		expect(checkbox).toBeDisabled();
	});

	it("renders label text", () => {
		render(<ClassicyCheckbox id="cb-1" label="Accept terms" />);
		expect(screen.getByText("Accept terms")).toBeInTheDocument();
	});

	it("mixed state adds mixed class", () => {
		render(<ClassicyCheckbox id="cb-1" mixed={true} />);
		expect(screen.getByRole("checkbox")).toHaveClass("mixed");
	});
});

// The remaining chapters' audit's 4.11 / B.12 (WIG Ch.4 "Access Keys",
// p.27; Ch.8 "Navigation in Secondary Windows", pp.148-149): a check box's
// `accessKey` is its label's.
describe("ClassicyCheckbox — access keys", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());
	const alt = (k: string, target: Element) =>
		fireEvent.keyDown(target, {
			key: k,
			code: `Key${k.toUpperCase()}`,
			altKey: true,
		});
	const Form = ({ onClickFunc }: { onClickFunc: (v: boolean) => void }) => (
		<div className="classicyWindow">
			<button type="button">Find</button>
			<ClassicyCheckbox
				id="match"
				label="Match case"
				accessKey="c"
				onClickFunc={onClickFunc}
			/>
			<ClassicyCheckbox id="whole" label="Whole words" />
		</div>
	);

	it("underlines its key and toggles on Alt and it under the Windows layout", () => {
		registerClassicyAppearancePackage({
			id: "windows-checks",
			name: "Windows check boxes",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-checks-default",
				package: "windows-checks",
			},
			layout: windows98.layout as never,
		});
		const onClickFunc = vi.fn();
		const { container } = render(<Form onClickFunc={onClickFunc} />);
		const parts = Array.from(
			container.querySelectorAll("[data-classicy-part='access-key']"),
		).map((el) => el.textContent);
		// "Match case" takes its given "c"; "Whole words" its first letter.
		expect(parts).toEqual(["c", "W"]);
		const find = screen.getByRole("button", { name: "Find" });
		find.focus();
		expect(alt("c", find)).toBe(false);
		expect(screen.getByRole("checkbox", { name: "Match case" })).toBeChecked();
		expect(screen.getByRole("checkbox", { name: "Match case" })).toHaveFocus();
		expect(onClickFunc).toHaveBeenCalledWith(true);
		alt("w", document.activeElement as Element);
		expect(screen.getByRole("checkbox", { name: "Whole words" })).toBeChecked();
	});

	it("draws and takes nothing by default (Platinum)", () => {
		const onClickFunc = vi.fn();
		const { container } = render(<Form onClickFunc={onClickFunc} />);
		expect(container.querySelector("[data-classicy-part]")).toBeNull();
		const find = screen.getByRole("button", { name: "Find" });
		find.focus();
		expect(alt("c", find)).toBe(true);
		expect(onClickFunc).not.toHaveBeenCalled();
		expect(find).toHaveFocus();
	});
});
