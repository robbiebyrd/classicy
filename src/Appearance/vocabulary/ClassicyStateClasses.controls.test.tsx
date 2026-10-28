import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as sass from "sass";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, userEvent } from "@/__tests__/test-utils";
import { DriveSetupList } from "@/SystemFolder/ControlPanels/DriveSetup/DriveSetupList";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyColorPickerCMYK } from "@/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerCMYK";
import { ClassicyColorPickerRGB } from "@/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerRGB";
import { ClassicyFileBrowserViewTable } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { ClassicyListBox } from "@/SystemFolder/SystemResources/ListBox/ClassicyListBox";
import { ClassicyMenu } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicyRadioInput } from "@/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput";
import { ClassicyTable } from "@/SystemFolder/SystemResources/Table/ClassicyTable";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import { ClassicyTree } from "@/SystemFolder/SystemResources/Tree/ClassicyTree";

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManagerDispatch: () => vi.fn(),
	}),
);
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => vi.fn(),
	}),
);
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);
vi.mock("@img/ui/tab.svg?base64", () => ({ default: "" }));

const driveFixtures = [
	{
		name: "Macintosh HD",
		type: "Classicy Volume",
		bus: "ATA",
		id: "0",
		lun: "0",
	},
	{
		name: "Backup Disk",
		type: "Classicy Volume",
		bus: "ATA",
		id: "1",
		lun: "0",
	},
];

describe("shared bare state classes on controls, lists and menus", () => {
	it("ClassicyButton: isDefault → default, depressed → pressed", () => {
		render(
			<ClassicyButton isDefault depressed>
				x
			</ClassicyButton>,
		);
		const b = screen.getByRole("button");
		expect(b).toHaveClass("classicyButton", "default", "pressed");
		expect(b).not.toHaveClass("classicyButtonDefault");
		expect(b).not.toHaveClass("classicyButtonDepressed");
	});

	it("ClassicyCheckbox: mixed/checked/disabled", () => {
		render(
			<ClassicyCheckbox id="cb" label="Box" checked mixed isDefault disabled />,
		);
		const cb = screen.getByRole("checkbox");
		expect(cb).toHaveClass("classicyCheckbox", "mixed", "checked", "disabled");
		expect(cb).toHaveClass("default");
		expect(cb).not.toHaveClass("classicyCheckboxMixed");
		expect(cb).not.toHaveClass("classicyCheckboxDefault");
	});

	it("ClassicyRadioInput: wrapper carries checked/disabled, input carries default/mixed", () => {
		render(
			<ClassicyRadioInput
				name="r"
				inputs={[
					{ id: "a", label: "A", checked: true, isDefault: true },
					{ id: "b", label: "B", disabled: true, mixed: true },
				]}
			/>,
		);
		const a = document.getElementById("a") as HTMLElement;
		const b = document.getElementById("b") as HTMLElement;
		expect(a.parentElement).toHaveClass("classicyRadioInputWrapper", "checked");
		expect(a).toHaveClass("default");
		expect(b.parentElement).toHaveClass("disabled");
		expect(b).toHaveClass("mixed");
		expect(a.parentElement).not.toHaveClass("classicyRadioInputWrapperChecked");
		expect(b.parentElement).not.toHaveClass(
			"classicyRadioInputWrapperDisabled",
		);
	});

	it("ClassicyMenu: disabled item carries disabled, open item carries open", () => {
		render(
			<ClassicyMenu
				name="m"
				menuItems={[
					{ id: "off", title: "Off", disabled: true },
					{
						id: "parent",
						title: "Parent",
						menuChildren: [{ id: "child", title: "Child" }],
					},
				]}
			/>,
		);
		const off = screen.getByText("Off").closest("li") as HTMLElement;
		const parent = screen.getByText("Parent").closest("li") as HTMLElement;
		expect(off).toHaveClass("classicyMenuItem", "disabled");
		expect(off).not.toHaveClass("classicyMenuItemDisabled");
		expect(parent).not.toHaveClass("open");
		fireEvent.click(parent);
		expect(parent).toHaveClass("open");
		expect(parent).not.toHaveClass("classicyMenuItemOpen");
	});

	it("ClassicyPopUpMenu: disabled → disabled, no select--disabled", () => {
		const { container } = render(
			<ClassicyPopUpMenu
				id="pm"
				options={[{ value: "a", label: "A" }]}
				selected="a"
				disabled
			/>,
		);
		const root = container.querySelector(".classicyPopUpMenu") as HTMLElement;
		expect(root).toHaveClass("disabled");
		expect(root).not.toHaveClass("select--disabled");
		expect(container.querySelector("#pm")).toHaveClass("disabled");
	});

	it("ClassicyPopUpMenu: an open menu carries open", async () => {
		const user = userEvent.setup();
		const { container } = render(
			<ClassicyPopUpMenu
				id="pm"
				options={[{ value: "a", label: "A" }]}
				selected="a"
			/>,
		);
		await user.click(screen.getByRole("combobox"));
		const root = container.querySelector(".classicyPopUpMenu") as HTMLElement;
		expect(root).toHaveClass("open");
		expect(root).not.toHaveClass("classicyPopUpMenuOpen");
	});

	it("ClassicyListBox: selected option → selected; disabled option → disabled", () => {
		render(
			<ClassicyListBox
				id="lb"
				selected={["a"]}
				options={[
					{ value: "a", label: "Alpha" },
					{ value: "b", label: "Beta", disabled: true },
				]}
			/>,
		);
		const alpha = screen.getByRole("option", { name: "Alpha" });
		const beta = screen.getByRole("option", { name: "Beta" });
		expect(alpha).toHaveClass("classicyListBoxOption", "selected");
		expect(beta).toHaveClass("disabled");
		expect(alpha).not.toHaveClass("classicyListBoxOptionSelected");
		expect(beta).not.toHaveClass("classicyListBoxOptionDisabled");
	});

	it("ClassicyListBox: a disabled list carries disabled", () => {
		render(
			<ClassicyListBox
				id="lb"
				disabled
				options={[{ value: "a", label: "Alpha" }]}
			/>,
		);
		const box = screen.getByRole("listbox");
		expect(box).toHaveClass("classicyListBox", "disabled");
		expect(box).not.toHaveClass("classicyListBoxDisabled");
	});

	it("ClassicyTabs: the selected tab button carries selected, not classicyTabButtonActive", () => {
		render(
			<ClassicyTabs
				tabs={[
					{ title: "One", children: <p>1</p> },
					{ title: "Two", children: <p>2</p> },
				]}
			/>,
		);
		const [one, two] = screen.getAllByRole("tab");
		expect(one).toHaveClass("classicyTabButton", "selected");
		expect(one).not.toHaveClass("classicyTabButtonActive");
		expect(two).not.toHaveClass("selected");
	});

	it("ClassicyTree: selected leaf and branch rows carry selected; disabled leaf carries disabled", () => {
		render(
			<ClassicyTree
				nodes={[
					{
						id: "folder",
						label: "Folder",
						defaultOpen: true,
						children: [
							{ id: "leaf", label: "Leaf" },
							{ id: "off", label: "Off", disabled: true },
						],
					},
				]}
				selectionMode="single"
				selectedIds={["leaf"]}
				onSelectNode={() => {}}
			/>,
		);
		const leaf = screen
			.getByText("Leaf")
			.closest(".classicyTreeNodeLabelHolder");
		const off = screen.getByText("Off").closest(".classicyTreeNodeLabelHolder");
		expect(leaf).toHaveClass("selected");
		expect(leaf).not.toHaveClass("classicyTreeNodeSelected");
		expect(off).toHaveClass("disabled");
		expect(off).not.toHaveClass("classicyTreeNodeDisabled");
	});

	it("ClassicyTable rows: selected; sorted column header: selected", () => {
		type Row = { id: string; name: string };
		const rows: Row[] = [
			{ id: "1", name: "One" },
			{ id: "2", name: "Two" },
		];
		const { container } = render(
			<ClassicyTable
				columns={[{ id: "name", title: "Name", accessor: (r: Row) => r.name }]}
				rows={rows}
				getRowId={(r: Row) => r.id}
			/>,
		);
		fireEvent.click(screen.getByText("Two"));
		const selected = container.querySelector("tr.classicyTableRow.selected");
		expect(selected).not.toBeNull();
		expect(selected).not.toHaveClass("classicyTableRowSelected");
		fireEvent.click(screen.getByText("Name"));
		const header = container.querySelector(
			".classicyTableColumnHeader.selected",
		);
		expect(header).not.toBeNull();
		expect(header).not.toHaveClass("classicyTableColumnHeaderSelected");
	});

	it("FileBrowserViewTable rows: selected", async () => {
		const user = userEvent.setup();
		const cfs = new ClassicyFileSystem("state-classes-fbvt", {
			_type: "directory",
			Documents: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"apple.pdf": {
					_type: ClassicyFileSystemEntryFileType.Pdf,
					_url: "https://example.com/apple.pdf",
				},
			},
		});
		vi.spyOn(cfs, "size").mockResolvedValue(100);
		const { container } = render(
			<ClassicyFileBrowserViewTable
				fs={cfs}
				path="Documents"
				appId="Finder.app"
			/>,
		);
		await screen.findByText("apple.pdf");
		(
			container.querySelector(
				".classicyFileBrowserViewTableContainer",
			) as HTMLElement
		).focus();
		await user.keyboard("{ArrowDown}");
		const row = screen.getByText("apple.pdf").closest("tr");
		expect(row).toHaveClass("classicyFileBrowserViewTableRow", "selected");
		expect(row).not.toHaveClass("classicyFileBrowserViewTableRowSelected");
	});

	it("ClassicyColorPickerRGB sliders: classicyColorPickerSliderRed/Green/Blue", () => {
		const { container } = render(
			<ClassicyColorPickerRGB color={0x336699} onChangeFunc={() => {}} />,
		);
		for (const part of ["Red", "Green", "Blue"]) {
			expect(
				container.querySelector(`.classicyColorPickerSlider${part}`),
			).not.toBeNull();
		}
		expect(container.querySelector('[class*="Slider--"]')).toBeNull();
	});

	it("ClassicyColorPickerCMYK sliders: classicyColorPickerSliderCyan/Magenta/Yellow/Black", () => {
		const { container } = render(
			<ClassicyColorPickerCMYK color={0x336699} onChangeFunc={() => {}} />,
		);
		for (const part of ["Cyan", "Magenta", "Yellow", "Black"]) {
			expect(
				container.querySelector(`.classicyColorPickerSlider${part}`),
			).not.toBeNull();
		}
		expect(container.querySelector('[class*="Slider--"]')).toBeNull();
	});

	it("DriveSetupList: classicyDriveSetupListRow.selected", () => {
		const { container } = render(
			<DriveSetupList
				drives={driveFixtures}
				selected="Backup Disk"
				onSelect={() => {}}
			/>,
		);
		const rows = container.querySelectorAll("tr.classicyDriveSetupListRow");
		expect(rows).toHaveLength(2);
		expect(rows[0]).not.toHaveClass("selected");
		expect(rows[1]).toHaveClass("selected");
		expect(container.querySelector('[class*="driveSetupList__"]')).toBeNull();
		expect(
			container.querySelector(".classicyDriveSetupListTable"),
		).not.toBeNull();
	});
});

const root = process.cwd();
const compile = (relative: string) =>
	sass.compile(resolve(root, relative), {
		style: "expanded",
		loadPaths: [resolve(root, "src")],
	}).css;
const R = "src/SystemFolder/SystemResources/";

describe("compiled SCSS of the touched components", () => {
	// A lone-root state rule is written `:where(.root).state` so it keeps the
	// one-class specificity of the legacy class it replaces (later single-class
	// rules such as .classicyButtonShapeSquare still win over it).
	it("Button: pressed and default state rules, no legacy classes", () => {
		const css = compile(`${R}Button/ClassicyButton.scss`);
		expect(css).toContain(":where(.classicyButton).pressed {");
		expect(css).toContain(":where(.classicyButton).default {");
		expect(css).toContain(
			":where(.classicyButton).default.classicyButtonKeyActive {",
		);
		expect(css).not.toContain(".classicyButtonDepressed");
		expect(css).not.toContain(".classicyButtonDefault");
	});

	it("no touched stylesheet still contains a legacy or BEM stray selector", () => {
		const files = [
			"Button/ClassicyButton",
			"Checkbox/ClassicyCheckbox",
			"RadioInput/ClassicyRadioInput",
			"Menu/ClassicyMenu",
			"PopUpMenu/ClassicyPopUpMenu",
			"ListBox/ClassicyListBox",
			"Tabs/ClassicyTabs",
			"Tree/ClassicyTree",
			"Table/ClassicyTable",
			"File/ClassicyFileBrowserViewTable",
			"Link/ClassicyLink",
			"Output/ClassicyOutput",
			"ControlLabel/ClassicyControlLabel",
			"PopUpSlider/ClassicyPopUpSlider",
			"Slider/ClassicySlider",
			"ColorPicker/ClassicyColorPicker",
			"FileInput/ClassicyFileInput",
			"Disclosure/ClassicyDisclosure",
		].map((f) => `${R}${f}.scss`);
		files.push("src/SystemFolder/ControlPanels/DriveSetup/DriveSetupList.scss");
		const legacy =
			/\.classicy(ButtonDefault|ButtonDepressed|CheckboxDefault|CheckboxMixed|RadioInput(WrapperChecked|WrapperDisabled|LabelDisabled|Default|Mixed)|MenuItem(Disabled|Open)|PopUpMenu(Open|ButtonDisabled)|ListBox(Disabled|OptionSelected|OptionDisabled)|TabButtonActive|TreeNode(Selected|Disabled)|Table(RowSelected|ColumnHeaderSelected)|FileBrowserViewTableRowSelected|(Link|Output|ControlLabel|ComboBox|PopUpSlider|Slider)Disabled|SliderTicksDisabled|ColorPicker(SwatchDisabled|CrayonSelected|ModeListItemSelected)|FileInputError|DisclosureInnerOpen)\b|\.select--disabled|\.classicyColorPickerSlider--|driveSetupList__/;
		for (const file of files) {
			const css = compile(file);
			expect(css, file).not.toMatch(legacy);
			expect(readFileSync(resolve(root, file), "utf8"), file).not.toContain(
				"&--",
			);
		}
	});

	it("the slider tracks key off the part classes", () => {
		const css = compile(`${R}ColorPicker/ClassicyColorPicker.scss`);
		for (const part of [
			"Red",
			"Green",
			"Blue",
			"Cyan",
			"Magenta",
			"Yellow",
			"Black",
		]) {
			expect(css).toContain(
				`.classicyColorPickerSlider${part} .classicySlider::`,
			);
		}
	});

	it("DriveSetupList: .classicyDriveSetupListRow.selected", () => {
		const css = compile(
			"src/SystemFolder/ControlPanels/DriveSetup/DriveSetupList.scss",
		);
		expect(css).toContain(".classicyDriveSetupListRow.selected {");
		expect(css).not.toContain("driveSetupList__row--selected");
	});
});
