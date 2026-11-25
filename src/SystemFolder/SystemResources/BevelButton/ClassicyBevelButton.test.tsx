import { afterEach, describe, expect, it, vi } from "vitest";
// The test packages' default theme names Platinum's sound pack.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import {
	act,
	fireEvent,
	render,
	screen,
	userEvent,
} from "@/__tests__/test-utils";
import {
	registerClassicyAppearancePackage as registerTipsPackage,
	resetClassicyAppearancePackagesForTests as resetTipsPackages,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";
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
	"@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.scss",
	() => ({}),
);

describe("ClassicyBevelButton", () => {
	it("renders text content", () => {
		render(<ClassicyBevelButton>Tool</ClassicyBevelButton>);
		expect(screen.getByRole("button", { name: "Tool" })).toBeInTheDocument();
	});

	it("defaults to the off state and medium bevel", () => {
		render(<ClassicyBevelButton>Tool</ClassicyBevelButton>);
		const btn = screen.getByRole("button", { name: "Tool" });
		expect(btn).not.toHaveClass("pressed", "checked", "mixed", "disabled");
		expect(btn).not.toHaveAttribute("data-state");
		expect(btn).toHaveClass("classicyBevelButtonBevelMedium");
	});

	it("merges a consumer className instead of dropping it", () => {
		// `className` used to ride in with the spread props and then be
		// overwritten by the computed class list.
		render(
			<ClassicyBevelButton className="myTool" bevelWidth="small">
				Tool
			</ClassicyBevelButton>,
		);
		expect(screen.getByRole("button", { name: "Tool" })).toHaveClass(
			"classicyBevelButton",
			"classicyBevelButtonBevelSmall",
			"myTool",
		);
	});

	it("maps bevelWidth to the correct class", () => {
		render(<ClassicyBevelButton bevelWidth="small">S</ClassicyBevelButton>);
		expect(screen.getByRole("button", { name: "S" })).toHaveClass(
			"classicyBevelButtonBevelSmall",
		);
	});

	it("fires onClickFunc on click", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		render(<ClassicyBevelButton onClickFunc={onClick}>Go</ClassicyBevelButton>);
		await user.click(screen.getByRole("button", { name: "Go" }));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("toggle mode flips the on-state and fires onChangeFunc", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<ClassicyBevelButton mode="toggle" onChangeFunc={onChange}>
				Bold
			</ClassicyBevelButton>,
		);
		const btn = screen.getByRole("button", { name: "Bold" });
		expect(btn).not.toHaveClass("checked");
		await user.click(btn);
		expect(onChange).toHaveBeenCalledWith(true);
		expect(btn).toHaveClass("checked");
		expect(btn).not.toHaveClass("pressed");
		expect(btn).not.toHaveAttribute("data-state");
	});

	it("radio mode turns on and stays on (never toggles back off)", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<ClassicyBevelButton mode="radio" onChangeFunc={onChange}>
				Left
			</ClassicyBevelButton>,
		);
		const btn = screen.getByRole("radio", { name: "Left" });
		await user.click(btn);
		expect(btn).toHaveAttribute("aria-checked", "true");
		await user.click(btn);
		// Only the first click changed state.
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(btn).toHaveClass("checked");
		expect(btn).not.toHaveClass("pressed");
	});

	it("reports the mixed state", () => {
		render(
			<ClassicyBevelButton mode="toggle" mixed={true}>
				Mixed
			</ClassicyBevelButton>,
		);
		const btn = screen.getByRole("button", { name: "Mixed" });
		expect(btn).toHaveClass("mixed");
		expect(btn).toHaveAttribute("aria-pressed", "mixed");
	});

	it("computes disabled-off and disabled-on states and blocks clicks", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		const { rerender } = render(
			<ClassicyBevelButton disabled={true} onClickFunc={onClick}>
				Off
			</ClassicyBevelButton>,
		);
		const btn = screen.getByRole("button", { name: "Off" });
		expect(btn).toBeDisabled();
		expect(btn).toHaveClass("disabled");
		expect(btn).not.toHaveClass("checked");
		await user.click(btn);
		expect(onClick).not.toHaveBeenCalled();

		rerender(
			<ClassicyBevelButton disabled={true} on={true} mode="toggle">
				On
			</ClassicyBevelButton>,
		);
		expect(screen.getByRole("button", { name: "On" })).toHaveClass(
			"disabled",
			"checked",
		);
	});

	it("popup mode shows a pop-up arrow and sets aria-haspopup", () => {
		render(
			<ClassicyBevelButton mode="popup" popupArrow="large">
				100%
			</ClassicyBevelButton>,
		);
		const btn = screen.getByRole("button", { name: "100%" });
		expect(btn).toHaveAttribute("aria-haspopup", "menu");
		expect(btn.querySelector(".classicyBevelButtonArrow")).toBeInTheDocument();
	});

	// A bevel button with no pop-up surface can still be a disclosure trigger
	// (a collapsible section's ▸/▾ toggle): the caller owns its expanded state,
	// so the button must pass the caller's disclosure ARIA through untouched.
	it("passes a caller's aria-expanded and aria-controls through when it has no pop-up", () => {
		const { rerender } = render(
			<ClassicyBevelButton
				aria-label="Expand lane"
				aria-expanded={false}
				aria-controls="lane-body"
			>
				▸
			</ClassicyBevelButton>,
		);
		const btn = screen.getByRole("button", { name: "Expand lane" });
		expect(btn).toHaveAttribute("aria-expanded", "false");
		expect(btn).toHaveAttribute("aria-controls", "lane-body");

		rerender(
			<ClassicyBevelButton
				aria-label="Expand lane"
				aria-expanded={true}
				aria-controls="lane-body"
			>
				▾
			</ClassicyBevelButton>,
		);
		expect(btn).toHaveAttribute("aria-expanded", "true");
	});

	it("passes a caller's aria-haspopup through when it has no pop-up", () => {
		render(
			<ClassicyBevelButton aria-label="Pick a color" aria-haspopup="dialog">
				Color
			</ClassicyBevelButton>,
		);
		expect(
			screen.getByRole("button", { name: "Pick a color" }),
		).toHaveAttribute("aria-haspopup", "dialog");
	});

	it("renders an icon image when icon is provided", () => {
		render(
			<ClassicyBevelButton icon="data:image/gif;base64,R0lGOD" iconAlt="Cut">
				{""}
			</ClassicyBevelButton>,
		);
		expect(screen.getByAltText("Cut")).toBeInTheDocument();
	});

	it("adds the square class only when square is set", () => {
		const { rerender } = render(
			<ClassicyBevelButton>Tool</ClassicyBevelButton>,
		);
		expect(screen.getByRole("button")).not.toHaveClass(
			"classicyBevelButtonSquare",
		);

		rerender(<ClassicyBevelButton square>Tool</ClassicyBevelButton>);
		expect(screen.getByRole("button")).toHaveClass("classicyBevelButtonSquare");
	});

	it("keeps the bevel width and mode classes on a square button", () => {
		render(
			<ClassicyBevelButton square bevelWidth="large" mode="toggle">
				Tool
			</ClassicyBevelButton>,
		);
		const button = screen.getByRole("button");
		expect(button).toHaveClass("classicyBevelButtonSquare");
		expect(button).toHaveClass("classicyBevelButtonBevelLarge");
		expect(button).toHaveClass("classicyBevelButtonModeToggle");
	});

	it("still renders an icon inside a square button", () => {
		render(<ClassicyBevelButton square icon="/icons/cut.png" iconAlt="Cut" />);
		expect(screen.getByAltText("Cut")).toBeInTheDocument();
	});

	it("treats numeric 0 children as real content, not absent", () => {
		render(<ClassicyBevelButton icon="/i.png">{0}</ClassicyBevelButton>);
		const btn = screen.getByRole("button");
		// The "0" must render inside the label span, not as a bare text node
		// sitting directly under the button.
		const label = btn.querySelector(".classicyBevelButtonLabel");
		expect(label).toHaveTextContent("0");
		expect(btn).toHaveTextContent("0");
	});
});

describe("ClassicyBevelButton square default with numeric 0 children", () => {
	it("does NOT go square inside a toolbar when children is 0", async () => {
		const { ClassicyButtonToolbar, ClassicyButtonToolbarGroup } = await import(
			"@/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar"
		);
		const { container } = render(
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<ClassicyBevelButton icon="/i.png" iconAlt="Count">
						{0}
					</ClassicyBevelButton>
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>,
		);
		const btn = container.querySelector(".classicyBevelButton");
		expect(btn).not.toHaveClass("classicyBevelButtonSquare");
		const label = btn?.querySelector(".classicyBevelButtonLabel");
		expect(label).toHaveTextContent("0");
	});
});

// A disabled button's image takes the active package's
// `iconDimming.disabledControl` rule (the 98.js report's 2.7: Windows 98
// embosses it, DrawState's DSS_DISABLED). With no such rule (Platinum and
// System 7 declare none), the image stays as it is and the stylesheet dims
// it, as before.
describe("ClassicyBevelButton: a disabled button's image", () => {
	it("draws the plain image, unmarked, where the package declares no disabledControl rule", () => {
		render(
			<ClassicyBevelButton disabled icon="/icons/cut.png" iconAlt="Cut" />,
		);
		const img = screen.getByRole("img", { name: "Cut" });
		expect(img).toHaveAttribute("src", "/icons/cut.png");
		expect(img).not.toHaveClass("classicyIconDimmedImage");
	});

	it("draws the embossed image once ready under a package that declares one", async () => {
		const {
			registerClassicyAppearancePackage,
			resetClassicyAppearancePackagesForTests,
		} = await import("@/Appearance/ClassicyAppearancePackage");
		const { getTheme } = await import(
			"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance"
		);
		const { resetClassicyDimmedIconsForTests } = await import(
			"@/Appearance/ClassicyIconDimming.internal"
		);
		vi.stubGlobal(
			"Image",
			class {
				constructor() {
					const img = document.createElement("img");
					Object.defineProperty(img, "naturalWidth", { value: 2 });
					Object.defineProperty(img, "naturalHeight", { value: 2 });
					queueMicrotask(() => img.onload?.(new Event("load")));
					// biome-ignore lint/correctness/noConstructorReturn: stands in for an HTMLImageElement
					return img;
				}
			},
		);
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
			() =>
				({
					drawImage: vi.fn(),
					getImageData: () => ({ data: new Uint8ClampedArray(16) }),
					putImageData: vi.fn(),
				}) as unknown as CanvasRenderingContext2D,
		);
		vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
			"data:image/png;base64,EMBOSSED",
		);
		// The active package (the default id, which the test store resolves):
		// an emboss in ButtonHilight and ButtonShadow, as Windows 98's.
		registerClassicyAppearancePackage({
			id: "platinum",
			name: "Embosses",
			css: "",
			defaults: { ...getTheme("default"), package: "platinum" },
			layout: {
				window: { growBoxCorner: "bottom-right" },
				menuBar: { placement: "screen" },
				desktop: { iconGridOrigin: "top-right" },
			},
			iconDimming: {
				disabledControl: {
					emboss: {
						highlight: { colorKey: "system", index: 0 },
						shadow: { colorKey: "system", index: 4 },
					},
				},
			},
		});
		try {
			render(
				<ClassicyBevelButton disabled icon="/icons/cut.png" iconAlt="Cut" />,
			);
			const img = screen.getByRole("img", { name: "Cut" });
			await vi.waitFor(() =>
				expect(img).toHaveAttribute("src", "data:image/png;base64,EMBOSSED"),
			);
			expect(img).toHaveClass("classicyIconDimmedImage");
			// Enabled again, the image is its own.
			render(<ClassicyBevelButton icon="/icons/copy.png" iconAlt="Copy" />);
			expect(screen.getByRole("img", { name: "Copy" })).toHaveAttribute(
				"src",
				"/icons/copy.png",
			);
		} finally {
			resetClassicyAppearancePackagesForTests();
			resetClassicyDimmedIconsForTests();
			vi.restoreAllMocks();
			vi.unstubAllGlobals();
		}
	});
});

// An icon-only toolbar button is named by a ToolTip (the WIG audit's 12.9;
// WIG Ch.12 "Tooltips", p.276, Figure 12.6; App. C "User Assistance",
// p.364) under the package's `layout.balloonHelp.unlabeledTips`, shown
// whether or not balloon help is on; a button with text, one with no name,
// and every button under a Mac layout show none.
describe("ClassicyBevelButton — the ToolTip of an unlabeled button", () => {
	afterEach(() => {
		resetTipsPackages();
		vi.useRealTimers();
	});
	const useWindowsLayout = () =>
		registerTipsPackage({
			id: "windows-bevels",
			name: "Windows bevels",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-bevels-default",
				package: "windows-bevels",
			},
			layout: windows98.layout as never,
		});
	const hover = (name: string) => {
		fireEvent.mouseEnter(screen.getByRole("button", { name }), {
			clientX: 10,
			clientY: 10,
		});
		act(() => {
			vi.advanceTimersByTime(500);
		});
	};
	const tooltip = () => document.querySelector(".classicyBalloonHelp");

	it("shows the icon's name, and the aria-label over it, under the Windows layout", () => {
		vi.useFakeTimers();
		useWindowsLayout();
		const { unmount } = render(
			<ClassicyBevelButton icon="/icons/cut.png" iconAlt="Cut" />,
		);
		hover("Cut");
		expect(tooltip()).toHaveTextContent("Cut");
		expect(tooltip()).toHaveAttribute("role", "tooltip");
		expect(screen.getByRole("button", { name: "Cut" })).toHaveAttribute(
			"aria-describedby",
			tooltip()?.id,
		);
		// A press hides it.
		fireEvent.mouseDown(screen.getByRole("button", { name: "Cut" }));
		expect(tooltip()).toBeNull();
		unmount();
		render(
			<ClassicyBevelButton
				icon="/icons/cut.png"
				iconAlt="Scissors"
				aria-label="Cut"
				aria-describedby="hint"
			/>,
		);
		hover("Cut");
		expect(tooltip()).toHaveTextContent("Cut");
		expect(screen.getByRole("button", { name: "Cut" })).toHaveAttribute(
			"aria-describedby",
			`hint ${tooltip()?.id}`,
		);
	});

	it("shows none for a button with text, or with no name, under the Windows layout", () => {
		vi.useFakeTimers();
		useWindowsLayout();
		render(
			<>
				<ClassicyBevelButton icon="/icons/cut.png" iconAlt="Cut">
					Cut
				</ClassicyBevelButton>
				<ClassicyBevelButton icon="/icons/copy.png" data-testid="nameless" />
			</>,
		);
		fireEvent.mouseEnter(screen.getAllByRole("button")[0]);
		fireEvent.mouseEnter(screen.getByTestId("nameless"));
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(tooltip()).toBeNull();
	});

	it("shows none under a Mac layout, and adds nothing to the button", () => {
		vi.useFakeTimers();
		render(<ClassicyBevelButton icon="/icons/cut.png" iconAlt="Cut" />);
		hover("Cut");
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(tooltip()).toBeNull();
		expect(screen.getByRole("button", { name: "Cut" })).not.toHaveAttribute(
			"aria-describedby",
		);
	});
});

describe("ClassicyBevelButton — nameTip", () => {
	afterEach(() => {
		resetTipsPackages();
		vi.useRealTimers();
	});

	it("keeps an icon-only button's name off a ToolTip under the Windows layout when nameTip is false", () => {
		vi.useFakeTimers();
		registerTipsPackage({
			id: "windows-name-tips",
			name: "Windows name tips",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-name-tips-default",
				package: "windows-name-tips",
			},
			layout: windows98.layout as never,
		});
		render(
			<>
				<ClassicyBevelButton
					icon="/icons/help.png"
					aria-label="Help"
					nameTip={false}
				/>
				<ClassicyBevelButton icon="/icons/cut.png" iconAlt="Cut" />
			</>,
		);
		fireEvent.mouseEnter(screen.getByRole("button", { name: "Help" }), {
			clientX: 10,
			clientY: 10,
		});
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(document.querySelector(".classicyBalloonHelp")).toBeNull();
		fireEvent.mouseLeave(screen.getByRole("button", { name: "Help" }));
		fireEvent.mouseEnter(screen.getByRole("button", { name: "Cut" }), {
			clientX: 10,
			clientY: 10,
		});
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(document.querySelector(".classicyBalloonHelp")).toHaveTextContent(
			"Cut",
		);
	});
});
