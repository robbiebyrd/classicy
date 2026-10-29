import type { ReactElement, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import {
	type ClassicyStoreSystemApp,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyAboutWindow } from "@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindow";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import { ClassicyAssistant } from "@/SystemFolder/SystemResources/Assistant/ClassicyAssistant";
import { ClassicyBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp";
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import {
	ClassicyButtonToolbar,
	ClassicyButtonToolbarGroup,
} from "@/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyColorPicker } from "@/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker";
import { ClassicyColorPickerCMYK } from "@/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerCMYK";
import { ClassicyColorPickerCrayon } from "@/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerCrayon";
import { MAC_OS_8_CRAYONS } from "@/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerCrayons";
import { ClassicyColorPickerDialog } from "@/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerDialog";
import { ClassicyColorPickerHLS } from "@/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerHLS";
import { ClassicyColorPickerHSV } from "@/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerHSV";
import { ClassicyColorPickerRGB } from "@/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerRGB";
import { ClassicyColorWheel } from "@/SystemFolder/SystemResources/ColorPicker/ClassicyColorWheel";
import { ClassicyComboBox } from "@/SystemFolder/SystemResources/ComboBox/ClassicyComboBox";
import { ClassicyContextualMenuTarget } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuTarget";
import {
	ClassicyControlGroup,
	ClassicyControlGroupFormRow,
	ClassicyControlGroupStack,
} from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyControlStrip } from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip";
import { ClassicyDatePicker } from "@/SystemFolder/SystemResources/DatePicker/ClassicyDatePicker";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { ClassicyDesktopIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";
import { ClassicyDisclosure } from "@/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure";
import { ClassicyFileBrowser } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowser";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileOpenDialog } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileOpenDialog";
import { ClassicyFileSaveDialog } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileSaveDialog";
import { ClassicyFileInput } from "@/SystemFolder/SystemResources/FileInput/ClassicyFileInput";
import {
	ClassicyForm,
	ClassicyFormButtonRow,
} from "@/SystemFolder/SystemResources/Form/ClassicyForm";
import { ClassicyHelpButton } from "@/SystemFolder/SystemResources/HelpButton/ClassicyHelpButton";
import { ClassicyIcon } from "@/SystemFolder/SystemResources/Icon/ClassicyIcon";
import { ClassicyImageWell } from "@/SystemFolder/SystemResources/ImageWell/ClassicyImageWell";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyInputDialog } from "@/SystemFolder/SystemResources/InputDialog/ClassicyInputDialog";
import { ClassicyKbd } from "@/SystemFolder/SystemResources/Kbd/ClassicyKbd";
import { ClassicyKeyboardEquivalentDialog } from "@/SystemFolder/SystemResources/KeyboardEquivalent/ClassicyKeyboardEquivalentDialog";
import { ClassicyKeyboardEquivalentField } from "@/SystemFolder/SystemResources/KeyboardEquivalent/ClassicyKeyboardEquivalentField";
import { ClassicyLink } from "@/SystemFolder/SystemResources/Link/ClassicyLink";
import { ClassicyListBox } from "@/SystemFolder/SystemResources/ListBox/ClassicyListBox";
import { ClassicyLittleArrows } from "@/SystemFolder/SystemResources/LittleArrows/ClassicyLittleArrows";
import { ClassicyMenu } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyMeter } from "@/SystemFolder/SystemResources/Meter/ClassicyMeter";
import { ClassicyOutput } from "@/SystemFolder/SystemResources/Output/ClassicyOutput";
import { ClassicyPager } from "@/SystemFolder/SystemResources/Pager/ClassicyPager";
import { ClassicyPixelArt } from "@/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt";
import { ClassicyPlacard } from "@/SystemFolder/SystemResources/Placard/ClassicyPlacard";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicyPopUpSlider } from "@/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSlider";
import { ClassicyProgressBar } from "@/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar";
import { ClassicyRadioInput } from "@/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput";
import { ClassicyRichTextEditor } from "@/SystemFolder/SystemResources/RichTextEditor/ClassicyRichTextEditor";
import { ClassicySeparator } from "@/SystemFolder/SystemResources/Separator/ClassicySeparator";
import { ClassicySlider } from "@/SystemFolder/SystemResources/Slider/ClassicySlider";
import { ClassicySpinner } from "@/SystemFolder/SystemResources/Spinner/ClassicySpinner";
import { ClassicySplitView } from "@/SystemFolder/SystemResources/SplitView/ClassicySplitView";
import { ClassicyTable } from "@/SystemFolder/SystemResources/Table/ClassicyTable";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import { ClassicyTextEditor } from "@/SystemFolder/SystemResources/TextEditor/ClassicyTextEditor";
import { ClassicyTimePicker } from "@/SystemFolder/SystemResources/TimePicker/ClassicyTimePicker";
import { ClassicyTree } from "@/SystemFolder/SystemResources/Tree/ClassicyTree";
import { ClassicyTriangle } from "@/SystemFolder/SystemResources/Triangle/ClassicyTriangle";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { ClassicyWindowFrame } from "@/SystemFolder/SystemResources/Window/ClassicyWindowFrame";

vi.mock("@img/ui/tab.svg?base64", () => ({ default: "" }));

const APP = "Passthrough.app";

const app: ClassicyStoreSystemApp = {
	id: APP,
	name: "Passthrough",
	icon: "",
	open: true,
	focused: true,
	windows: {},
};

const seedStore = () => {
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		useAppManager.setState((state) => ({
			...state,
			System: {
				...state.System,
				Manager: {
					...state.System.Manager,
					Applications: {
						...state.System.Manager.Applications,
						apps: { ...state.System.Manager.Applications.apps, [APP]: app },
					},
				},
			},
		}));
	});
};

/** The real provider stack (analytics + sound); the store is seeded per test. */
const Providers = ({ children }: { children: ReactNode }) => (
	<ClassicyAppManagerProvider>{children}</ClassicyAppManagerProvider>
);

const noop = () => {};
const HOST = "host";
const STYLE = { marginTop: 7 };

const fs = () =>
	new ClassicyFileSystem("passthrough-fs", {
		_type: "directory",
		Documents: { _type: "directory" },
	});

type Row = [
	name: string,
	render: () => ReactElement,
	root: (c: HTMLElement) => HTMLElement,
	ownClass?: boolean,
];

const first = (c: HTMLElement) => c.firstElementChild as HTMLElement;
const sel = (selector: string) => (c: HTMLElement) =>
	(c.querySelector(selector) ??
		document.querySelector(selector)) as HTMLElement;

const cases: Row[] = [
	[
		"ClassicyButton",
		() => (
			<ClassicyButton className={HOST} style={STYLE}>
				x
			</ClassicyButton>
		),
		sel(".classicyButton"),
	],
	[
		"ClassicyCheckbox",
		() => <ClassicyCheckbox id="c" className={HOST} style={STYLE} />,
		sel(".classicyCheckboxHolder"),
	],
	[
		"ClassicyControlLabel",
		() => <ClassicyControlLabel label="L" className={HOST} style={STYLE} />,
		sel(".classicyControlLabelHolder"),
	],
	[
		"ClassicyDisclosure",
		() => <ClassicyDisclosure className={HOST} style={STYLE} />,
		sel(".classicyDisclosure"),
	],
	[
		"ClassicyFileInput",
		() => <ClassicyFileInput id="f" className={HOST} style={STYLE} />,
		sel(".classicyFileInputHolder"),
	],
	[
		"ClassicyMeter (bare gauge)",
		() => <ClassicyMeter value={5} className={HOST} style={STYLE} />,
		sel(".classicyMeter"),
	],
	[
		"ClassicyMeter (value row)",
		() => <ClassicyMeter value={5} showValue className={HOST} style={STYLE} />,
		sel(".classicyMeterRow"),
	],
	[
		"ClassicyMeter (labeled)",
		() => <ClassicyMeter value={5} label="M" className={HOST} style={STYLE} />,
		first,
	],
	[
		"ClassicyOutput",
		() => <ClassicyOutput id="o" value={1} className={HOST} style={STYLE} />,
		sel(".classicyOutput"),
	],
	[
		"ClassicyOutput (labeled)",
		() => (
			<ClassicyOutput
				id="o"
				value={1}
				label="O"
				className={HOST}
				style={STYLE}
			/>
		),
		first,
	],
	[
		"ClassicyProgressBar",
		() => <ClassicyProgressBar value={5} className={HOST} style={STYLE} />,
		sel(".classicyProgress"),
	],
	[
		"ClassicyProgressBar (labeled)",
		() => (
			<ClassicyProgressBar value={5} label="P" className={HOST} style={STYLE} />
		),
		first,
	],
	[
		"ClassicyRadioInput",
		() => (
			<ClassicyRadioInput
				name="r"
				inputs={[{ id: "r1", label: "One" }]}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyRadioInputGroup"),
	],
	[
		"ClassicyRadioInput (labeled)",
		() => (
			<ClassicyRadioInput
				name="r"
				label="R"
				inputs={[{ id: "r1", label: "One" }]}
				className={HOST}
				style={STYLE}
			/>
		),
		first,
	],
	[
		"ClassicySlider",
		() => <ClassicySlider id="s" value={1} className={HOST} style={STYLE} />,
		sel(".classicySliderTrackGroup"),
	],
	[
		"ClassicySlider (labeled)",
		() => (
			<ClassicySlider
				id="s"
				value={1}
				labelTitle="S"
				className={HOST}
				style={STYLE}
			/>
		),
		first,
	],
	[
		"ClassicyPager",
		() => (
			<ClassicyPager
				page={0}
				pageCount={2}
				onPageChange={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyPager"),
	],
	[
		"ClassicyInput",
		() => <ClassicyInput id="i" className={HOST} style={STYLE} />,
		sel(".classicyInputHolder"),
	],
	[
		"ClassicySpinner",
		() => <ClassicySpinner id="sp" className={HOST} style={STYLE} />,
		sel(".classicySpinnerHolder"),
	],
	[
		"ClassicyDatePicker",
		() => <ClassicyDatePicker id="d" className={HOST} style={STYLE} />,
		sel(".classicyDatePickerHolder"),
	],
	[
		"ClassicyTimePicker",
		() => <ClassicyTimePicker id="t" className={HOST} style={STYLE} />,
		sel(".classicyTimePickerHolder"),
	],
	[
		"ClassicyImageWell",
		() => <ClassicyImageWell className={HOST} style={STYLE} />,
		sel(".classicyImageWell"),
	],
	[
		"ClassicyPlacard",
		() => (
			<ClassicyPlacard className={HOST} style={STYLE}>
				p
			</ClassicyPlacard>
		),
		sel(".classicyPlacardHolder"),
	],
	[
		"ClassicyListBox",
		() => (
			<ClassicyListBox
				id="l"
				options={[{ value: "a", label: "A" }]}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyListBox"),
	],
	[
		"ClassicyListBox (labeled)",
		() => (
			<ClassicyListBox
				id="l"
				label="L"
				options={[{ value: "a", label: "A" }]}
				className={HOST}
				style={STYLE}
			/>
		),
		first,
	],
	[
		"ClassicyTabs",
		() => (
			<ClassicyTabs
				tabs={[{ title: "One", children: <p>1</p> }]}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyTabContainer"),
	],
	[
		"ClassicyTree",
		() => (
			<ClassicyTree
				nodes={[{ id: "a", label: "A" }]}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyTree"),
	],
	[
		"ClassicyAssistant",
		() => (
			<ClassicyAssistant
				pages={[{ title: "One", content: <p>1</p> }]}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyAssistant"),
	],
	[
		"ClassicyComboBox",
		() => (
			<ClassicyComboBox id="cb" options={[]} className={HOST} style={STYLE} />
		),
		sel(".classicyComboBoxWrapper"),
	],
	[
		"ClassicyColorPicker",
		() => <ClassicyColorPicker id="cp" className={HOST} style={STYLE} />,
		sel(".classicyColorPickerSwatchWrapper"),
	],
	[
		"ClassicyColorPickerCMYK",
		() => (
			<ClassicyColorPickerCMYK
				color={0}
				onChangeFunc={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyColorPickerSlidersTab"),
	],
	[
		"ClassicyColorPickerRGB",
		() => (
			<ClassicyColorPickerRGB
				color={0}
				onChangeFunc={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyColorPickerSlidersTab"),
	],
	[
		"ClassicyColorPickerHSV",
		() => (
			<ClassicyColorPickerHSV
				color={0}
				onChangeFunc={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyColorPickerWheelTab"),
	],
	[
		"ClassicyColorPickerHLS",
		() => (
			<ClassicyColorPickerHLS
				color={0}
				onChangeFunc={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyColorPickerWheelTab"),
	],
	[
		"ClassicyColorPickerCrayon",
		() => (
			<ClassicyColorPickerCrayon
				color={0}
				crayons={MAC_OS_8_CRAYONS}
				onChangeFunc={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyColorPickerCrayonTab"),
	],
	[
		"ClassicyColorWheel",
		() => (
			<ClassicyColorWheel
				hue={0}
				saturation={0}
				brightness={100}
				mode="hsv"
				onChangeFunc={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyColorPickerWheelCanvas"),
	],
	[
		"ClassicyFileBrowser",
		() => (
			<ClassicyFileBrowser
				fs={fs()}
				path="Documents"
				appId={APP}
				display="list"
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyFileBrowserFill"),
	],
	[
		"ClassicyRichTextEditor",
		() => <ClassicyRichTextEditor content="" className={HOST} style={STYLE} />,
		sel(".classicyRichTextEditor"),
	],
	[
		"ClassicyTextEditor",
		() => <ClassicyTextEditor className={HOST} style={STYLE} />,
		sel(".classicyTextEditorHolder"),
	],
	[
		"ClassicyIcon",
		() => (
			<ClassicyIcon
				appId={APP}
				name="Icon"
				icon="/i.png"
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyIcon"),
	],
	[
		"ClassicyDesktopIcon",
		() => (
			<ClassicyDesktopIcon
				appId={APP}
				appName="Passthrough"
				icon="/i.png"
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyDesktopIcon"),
	],
	[
		"ClassicyDesktopMenuBar",
		() => <ClassicyDesktopMenuBar className={HOST} style={STYLE} />,
		sel(".classicyDesktopMenuBar"),
	],
	[
		"ClassicyDesktop",
		() => (
			<ClassicyDesktop
				startupScreen={false}
				controlStrip={false}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyDesktop"),
	],
	[
		"ClassicyWindow",
		() => (
			<ClassicyWindow
				id="w"
				appId={APP}
				title="W"
				className={HOST}
				style={STYLE}
			>
				<p>body</p>
			</ClassicyWindow>
		),
		sel(".classicyWindow"),
	],
	[
		"ClassicyAlert (forwards to its window)",
		() => (
			<ClassicyAlert appId={APP} label="Alert" className={HOST} style={STYLE} />
		),
		sel(".classicyWindow"),
	],
	[
		"ClassicyAboutWindow (forwards to its window)",
		() => (
			<ClassicyAboutWindow
				appId={APP}
				appName="Passthrough"
				appIcon="/i.png"
				hideFunc={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyWindow"),
	],
	[
		"ClassicyInputDialog (forwards to its window)",
		() => (
			<ClassicyInputDialog
				appId={APP}
				onConfirm={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyWindow"),
	],
	[
		"ClassicyKeyboardEquivalentDialog (forwards to its window)",
		() => (
			<ClassicyKeyboardEquivalentDialog
				appId={APP}
				onConfirm={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyWindow"),
	],
	[
		"ClassicyKeyboardEquivalentField",
		() => (
			<ClassicyKeyboardEquivalentField
				id="kef"
				onChange={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyControlGroupFieldset"),
	],
	[
		"ClassicyColorPickerDialog (forwards to its window)",
		() => (
			<ClassicyColorPickerDialog
				id="cpd"
				appId={APP}
				open
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyWindow"),
	],
	[
		"ClassicyFileOpenDialog (forwards to its window)",
		() => (
			<ClassicyFileOpenDialog
				id="fod"
				appId={APP}
				open
				volumes={[]}
				onOpenFunc={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyWindow"),
	],
	[
		"ClassicyFileSaveDialog (forwards to its window)",
		() => (
			<ClassicyFileSaveDialog
				id="fsd"
				appId={APP}
				open
				volumes={[]}
				formats={[]}
				onSaveFunc={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyWindow"),
	],
	// Components that already had className: style joins it.
	[
		"ClassicyBalloonHelp",
		() => (
			<ClassicyBalloonHelp content="c" className={HOST} style={STYLE}>
				x
			</ClassicyBalloonHelp>
		),
		sel(".classicyBalloonHelpAnchor"),
	],
	[
		"ClassicyButtonToolbar",
		() => (
			<ClassicyButtonToolbar className={HOST} style={STYLE}>
				<ClassicyButton>x</ClassicyButton>
			</ClassicyButtonToolbar>
		),
		sel(".classicyButtonToolbar"),
	],
	[
		"ClassicyButtonToolbarGroup",
		() => (
			<ClassicyButtonToolbarGroup className={HOST} style={STYLE}>
				<ClassicyButton>x</ClassicyButton>
			</ClassicyButtonToolbarGroup>
		),
		sel(".classicyButtonToolbarGroup"),
	],
	[
		"ClassicyContextualMenuTarget",
		() => (
			<ClassicyContextualMenuTarget
				menuItems={[{ id: "a", title: "A" }]}
				className={HOST}
				style={STYLE}
			>
				x
			</ClassicyContextualMenuTarget>
		),
		sel(".classicyContextualMenuTarget"),
	],
	[
		"ClassicyControlGroup",
		() => (
			<ClassicyControlGroup label="G" className={HOST} style={STYLE}>
				x
			</ClassicyControlGroup>
		),
		sel(".classicyControlGroupFieldset"),
	],
	[
		"ClassicyControlGroupFormRow",
		() => (
			<ClassicyControlGroupFormRow className={HOST} style={STYLE}>
				x
			</ClassicyControlGroupFormRow>
		),
		sel(".classicyControlGroupFormRow"),
	],
	[
		"ClassicyControlGroupStack",
		() => (
			<ClassicyControlGroupStack className={HOST} style={STYLE}>
				x
			</ClassicyControlGroupStack>
		),
		sel(".classicyControlGroupStack"),
	],
	[
		"ClassicyControlStrip",
		() => <ClassicyControlStrip className={HOST} style={STYLE} />,
		sel(".classicyControlStrip"),
	],
	[
		"ClassicyForm",
		() => (
			<ClassicyForm className={HOST} style={STYLE}>
				x
			</ClassicyForm>
		),
		sel(".classicyForm"),
	],
	[
		"ClassicyFormButtonRow",
		() => (
			<ClassicyFormButtonRow className={HOST} style={STYLE}>
				x
			</ClassicyFormButtonRow>
		),
		sel(".classicyFormButtonRow"),
	],
	[
		"ClassicyHelpButton",
		() => <ClassicyHelpButton className={HOST} style={STYLE} />,
		sel(".classicyHelpButton"),
	],
	[
		"ClassicyKbd (inline)",
		() => (
			<ClassicyKbd className={HOST} style={STYLE}>
				K
			</ClassicyKbd>
		),
		sel(".classicyKbd"),
	],
	[
		"ClassicyKbd (keycaps)",
		() => (
			<ClassicyKbd variant="keycaps" className={HOST} style={STYLE}>
				K
			</ClassicyKbd>
		),
		sel(".classicyKbdKeycaps"),
	],
	[
		"ClassicyLittleArrows",
		() => <ClassicyLittleArrows onStep={noop} className={HOST} style={STYLE} />,
		sel(".classicyLittleArrows"),
	],
	[
		"ClassicyMenu",
		() => (
			<ClassicyMenu
				name="m"
				menuItems={[{ id: "a", title: "A" }]}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyMenuWrapper"),
	],
	[
		// The pixel art has no class of its own: the consumer's class is its only one.
		"ClassicyPixelArt",
		() => <ClassicyPixelArt rows={["#."]} className={HOST} style={STYLE} />,
		first,
		false,
	],
	[
		"ClassicyPopUpMenu",
		() => (
			<ClassicyPopUpMenu
				id="pm"
				options={[{ value: "a", label: "A" }]}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyPopUpMenu"),
	],
	[
		"ClassicyPopUpSlider",
		() => (
			<ClassicyPopUpSlider
				value={1}
				onChange={noop}
				ariaLabel="v"
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyPopUpSlider"),
	],
	[
		"ClassicySeparator",
		() => <ClassicySeparator className={HOST} style={STYLE} />,
		sel(".classicySeparator"),
	],
	[
		"ClassicySplitView",
		() => (
			<ClassicySplitView className={HOST} style={STYLE}>
				<p>a</p>
				<p>b</p>
			</ClassicySplitView>
		),
		sel(".classicySplitView"),
	],
	[
		"ClassicyTable",
		() => (
			<ClassicyTable
				columns={[
					{ id: "n", title: "N", accessor: (r: { id: string }) => r.id },
				]}
				rows={[{ id: "1" }]}
				getRowId={(r: { id: string }) => r.id}
				className={HOST}
				style={STYLE}
			/>
		),
		sel(".classicyTableContainer"),
	],
	[
		"ClassicyTriangle (non-interactive svg)",
		() => (
			<ClassicyTriangle interactive={false} className={HOST} style={STYLE} />
		),
		sel(".classicyTriangle"),
	],
	[
		// The interactive wrapper has no class of its own, like the pixel art.
		"ClassicyTriangle (interactive wrapper)",
		() => <ClassicyTriangle className={HOST} style={STYLE} />,
		first,
		false,
	],
	[
		"ClassicyWindowFrame",
		() => (
			<ClassicyWindowFrame className={HOST} style={STYLE} width={300}>
				x
			</ClassicyWindowFrame>
		),
		sel(".classicyWindowFrame"),
	],
];

beforeEach(() => {
	// jsdom implements neither; stub them so the output stays free of its
	// "Not implemented" notices.
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
	vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
	vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(noop);
	seedStore();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("className and style passthrough", () => {
	it.each(
		cases,
	)("%s merges className and style onto its root", (_name, make, root, ownClass = true) => {
		const { container } = render(make(), { wrapper: Providers });
		const el = root(container);
		expect(el).toBeTruthy();
		expect((el.getAttribute("class") ?? "").split(" ")).toContain(HOST);
		if (ownClass) expect(el.getAttribute("class")).toMatch(/^classicy[A-Z]/);
		expect(el.style.marginTop).toBe("7px");
	});

	it("ClassicyButton keeps its own class when className is passed (spread-order bug)", () => {
		const { container } = render(
			<ClassicyButton className={HOST} isDefault>
				x
			</ClassicyButton>,
		);
		const b = container.querySelector("button") as HTMLElement;
		expect(b).toHaveClass("classicyButton", "default", HOST);
	});

	it("ClassicyWindow: style cannot override the stored size", () => {
		const { container } = render(
			<ClassicyWindow
				id="sized"
				appId={APP}
				title="W"
				initialSize={[300, 200]}
				style={{ width: 999, marginTop: 7 }}
			>
				<p>body</p>
			</ClassicyWindow>,
		);
		const root = container.querySelector(".classicyWindow") as HTMLElement;
		expect(root.style.width).toBe("300px");
		expect(root.style.marginTop).toBe("7px");
	});

	it("ClassicyWindow keeps its state classes beside a consumer className", () => {
		const { container } = render(
			<ClassicyWindow id="state" appId={APP} title="W" className={HOST}>
				<p>body</p>
			</ClassicyWindow>,
		);
		const root = container.querySelector(".classicyWindow") as HTMLElement;
		expect(root).toHaveClass("classicyWindow", "classicyWindowDocument", HOST);
	});

	it("ClassicyListBox keeps its visible-rows custom property under a consumer style", () => {
		const { container } = render(
			<ClassicyListBox
				id="rows"
				visibleRows={4}
				options={[{ value: "a", label: "A" }]}
				style={STYLE}
			/>,
		);
		const el = container.querySelector(".classicyListBox") as HTMLElement;
		expect(el.style.getPropertyValue("--classicy-listbox-visible-rows")).toBe(
			"4",
		);
		expect(el.style.marginTop).toBe("7px");
	});

	it("ClassicyIcon keeps its position and mask under a consumer style", () => {
		const { container } = render(
			<ClassicyIcon
				appId={APP}
				name="Icon"
				icon="/i.png"
				size={48}
				initialPosition={[10, 20]}
				style={STYLE}
			/>,
		);
		const el = container.querySelector(".classicyIcon") as HTMLElement;
		expect(el.style.left).toBe("10px");
		expect(el.style.top).toBe("20px");
		expect(el.style.getPropertyValue("--desktop-icon-size")).toBe("48px");
		expect(el.style.marginTop).toBe("7px");
		const mask = container.querySelector(
			".classicyIconMaskOuter",
		) as HTMLElement;
		expect(mask.style.getPropertyValue("--classicy-icon-mask")).toBe(
			"url(/i.png)",
		);
	});

	it("ClassicyDesktop keeps the theme custom properties under a consumer style", () => {
		const { container } = render(
			<ClassicyDesktop
				startupScreen={false}
				controlStrip={false}
				style={STYLE}
			/>,
		);
		const el = container.querySelector("#classicyDesktop") as HTMLElement;
		expect(el.style.marginTop).toBe("7px");
		expect(el.style.cssText).toContain("--");
	});

	it("ClassicyControlStrip keeps its state classes beside a consumer className", () => {
		const { container } = render(
			<ClassicyControlStrip className={HOST} defaultCollapsed />,
		);
		const el = container.querySelector(".classicyControlStrip") as HTMLElement;
		expect(el).toHaveClass("classicyControlStrip", "collapsed", HOST);
	});

	it("ClassicyWindowFrame keeps its width custom property under a consumer style", () => {
		const { container } = render(
			<ClassicyWindowFrame width={300} style={STYLE}>
				x
			</ClassicyWindowFrame>,
		);
		const el = container.querySelector(".classicyWindowFrame") as HTMLElement;
		expect(el.style.getPropertyValue("--classicy-window-frame-width")).toBe(
			"300px",
		);
		expect(el.style.marginTop).toBe("7px");
	});
});

// Ruling I-R5: an Appearance Package's style lands between the component's
// own and the consumer's, so a consumer `style` key always wins.
const decorationCases: [
	name: string,
	render: () => ReactElement,
	root: (c: HTMLElement) => HTMLElement,
][] = [
	[
		"ClassicyButton",
		() => <ClassicyButton style={STYLE}>x</ClassicyButton>,
		sel(".classicyButton"),
	],
	[
		"ClassicyBevelButton",
		() => <ClassicyBevelButton style={STYLE}>x</ClassicyBevelButton>,
		sel(".classicyBevelButton"),
	],
	[
		"ClassicyPopUpMenu",
		() => (
			<ClassicyPopUpMenu
				id="p"
				options={[{ value: "a", label: "A" }]}
				style={STYLE}
			/>
		),
		sel(".classicyPopUpMenu"),
	],
	[
		"ClassicyRadioInput",
		() => <ClassicyRadioInput name="r" inputs={[{ id: "a" }]} style={STYLE} />,
		sel(".classicyRadioInputGroup"),
	],
	[
		"ClassicyListBox",
		() => (
			<ClassicyListBox
				id="l"
				visibleRows={4}
				options={[{ value: "a", label: "A" }]}
				style={STYLE}
			/>
		),
		sel(".classicyListBox"),
	],
	[
		"ClassicyTabs",
		() => (
			<ClassicyTabs
				tabs={[{ title: "One", children: <p>1</p> }]}
				style={STYLE}
			/>
		),
		sel(".classicyTabContainer"),
	],
	[
		"ClassicyDisclosure",
		() => <ClassicyDisclosure label="D" style={STYLE} />,
		sel(".classicyDisclosure"),
	],
	[
		"ClassicyTree",
		() => <ClassicyTree nodes={[{ id: "a", label: "A" }]} style={STYLE} />,
		sel(".classicyTree"),
	],
	[
		"ClassicyTable",
		() => (
			<ClassicyTable
				columns={[
					{ id: "n", title: "N", accessor: (r: { id: string }) => r.id },
				]}
				rows={[{ id: "1" }]}
				getRowId={(r: { id: string }) => r.id}
				style={STYLE}
			/>
		),
		sel(".classicyTableContainer"),
	],
	[
		"ClassicyLink",
		() => (
			<ClassicyLink href="https://example.com" style={STYLE}>
				x
			</ClassicyLink>
		),
		sel(".classicyLink"),
	],
	[
		"ClassicyFileInput",
		() => <ClassicyFileInput id="f" style={STYLE} />,
		sel(".classicyFileInputHolder"),
	],
	// The surfaces (task 2.3). Menu and Alert have no row: a consumer's style
	// lands on the menu's wrapper and the alert's window, not on the list or
	// the alert body the package decorates.
	[
		"ClassicyWindow",
		() => (
			<ClassicyWindow id="w" appId={APP} title="W" style={STYLE}>
				<p>body</p>
			</ClassicyWindow>
		),
		sel(".classicyWindow"),
	],
	[
		"ClassicyIcon",
		() => <ClassicyIcon appId={APP} name="Icon" icon="/i.png" style={STYLE} />,
		sel(".classicyIcon"),
	],
	[
		"ClassicyDesktopIcon",
		() => (
			<ClassicyDesktopIcon
				appId={APP}
				appName="Passthrough"
				icon="/i.png"
				style={STYLE}
			/>
		),
		sel(".classicyDesktopIcon"),
	],
	[
		"ClassicyControlStrip",
		() => <ClassicyControlStrip style={STYLE} />,
		sel(".classicyControlStrip"),
	],
	[
		"ClassicyAssistant",
		() => (
			<ClassicyAssistant
				pages={[{ title: "One", content: <p>1</p> }]}
				style={STYLE}
			/>
		),
		sel(".classicyAssistant"),
	],
];

// The window and the icons own their position and stacking: a package's
// style sets neither (the consumer's left/top still moves an icon).
const geometryCases = decorationCases.filter(([name]) =>
	["ClassicyWindow", "ClassicyIcon", "ClassicyDesktopIcon"].includes(name),
);

describe("appearance package style under passthrough", () => {
	it.each(
		geometryCases,
	)("%s: the package's style never moves or restacks it", (_name, make, root) => {
		const probe = installClassicyAppearanceProbe({
			on: { mount: () => ({ style: { left: 901, top: 902, zIndex: 77 } }) },
		});
		try {
			const { container } = render(make(), { wrapper: Providers });
			const el = root(container);
			expect(el).toHaveAttribute("data-probe-state");
			expect(el.style.left).not.toBe("901px");
			expect(el.style.top).not.toBe("902px");
			expect(el.style.zIndex).toBe("");
		} finally {
			probe.uninstall();
		}
	});

	it.each(
		decorationCases,
	)("%s: consumer style beats the package's style", (_name, make, root) => {
		const probe = installClassicyAppearanceProbe({
			on: { mount: () => ({ style: { marginTop: 1, marginLeft: 3 } }) },
		});
		try {
			const { container } = render(make(), { wrapper: Providers });
			const el = root(container);
			expect(el).toHaveAttribute("data-probe-state");
			expect(el.style.marginLeft).toBe("3px");
			expect(el.style.marginTop).toBe("7px");
		} finally {
			probe.uninstall();
		}
	});
});
