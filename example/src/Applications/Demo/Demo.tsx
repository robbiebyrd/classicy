import {
	ClassicyApp,
	ClassicyBalloonHelp,
	ClassicyButton,
	ClassicyCheckbox,
	ClassicyColorPicker,
	ClassicyControlGroup,
	ClassicyControlLabel,
	ClassicyDisclosure,
	ClassicyIcons,
	ClassicyInput,
	ClassicyPopUpMenu,
	ClassicyProgressBar,
	ClassicyRadioInput,
	ClassicyTabs,
	ClassicyWindow,
	quitAppHelper,
	quitMenuItemHelper,
	useAppManagerDispatch,
} from "classicy";
import { useCallback, useEffect, useMemo, useState } from "react";

const RADIO_INPUTS = [
	{
		id: "test1",
		isDefault: true,
		disabled: false,
		label: "Radio Button 1 (Default)",
		checked: false,
	},
	{ id: "test2", label: "Radio Button 2 (Regular)", checked: false },
	{ id: "test3", mixed: true, label: "Radio Button 3 (Mixed)", checked: false },
];

const RADIO_INPUTS_DISABLED = [
	{
		id: "test4",
		disabled: true,
		label: "Radio Button 4 (Disabled)",
		checked: false,
	},
	{
		id: "test5",
		disabled: true,
		mixed: true,
		label: "Radio Button 6 (Disabled + Checked + Mixed)",
		checked: true,
	},
];

export const Demo = () => {
	const appName = "Demo";
	const appId = "Demo.app";
	const appIcon = ClassicyIcons.system.folders.directory;

	const desktopEventDispatch = useAppManagerDispatch();
	const [pickedColor, setPickedColor] = useState(0x2060c0);

	const quitApp = useCallback(() => {
		desktopEventDispatch(quitAppHelper(appId, appName, appIcon));
	}, [desktopEventDispatch, appIcon]);

	const closeDemoWindow = () => {
		desktopEventDispatch({
			type: "ClassicyWindowClose",
			app: {
				id: appId,
			},
			window: {
				id: "demo_error_modal",
			},
		});
	};

	useEffect(() => {
		desktopEventDispatch({
			type: "ClassicyWindowFocus",
			app: {
				id: appId,
			},
			window: {
				id: "demo_error_modal",
			},
		});
	}, [desktopEventDispatch]);

	const appMenu = useMemo(
		() => [
			{
				id: "file",
				title: "File",
				menuChildren: [
					{
						...quitMenuItemHelper(appId, appName, appIcon),
						balloon: {
							title: "Quit Demo",
							content:
								"Closes the Demo application and returns to the desktop.",
							position: "bottom-left" as const,
						},
					},
				],
			},
		],
		[appIcon],
	);

	const tabs = [
		{
			title: "Inputs",
			children: (
				<>
					<ClassicyControlGroup label={"Pop Up Menu"}>
						<ClassicyPopUpMenu
							id={"select_theme"}
							options={[
								{ value: "hello", label: "Hello" },
								{ value: "hello2", label: "Hello again!" },
							]}
							selected={"hello"}
						/>
					</ClassicyControlGroup>
					<ClassicyInput id={"test"} labelTitle={"Text Input"} />
					<ClassicyControlGroup label={"Radio Buttons"}>
						<ClassicyRadioInput
							inputs={RADIO_INPUTS}
							name={"test_radio"}
							label={"Radio Buttons"}
						/>
						<ClassicyRadioInput
							inputs={RADIO_INPUTS_DISABLED}
							name={"test_radio_disabled"}
							label={"Disabled Radio Buttons"}
						/>
					</ClassicyControlGroup>
					<ClassicyControlGroup label={"Checkboxes"}>
						<ClassicyCheckbox
							id={"test6"}
							isDefault={true}
							checked={true}
							label={"Default Checkbox"}
							disabled={false}
						/>
						<ClassicyCheckbox
							id={"test7"}
							isDefault={false}
							label={"Checkbox 2"}
							disabled={false}
						/>
						<ClassicyCheckbox
							id={"test8"}
							mixed={true}
							isDefault={false}
							label={"Mixed"}
							disabled={false}
						/>
						<ClassicyCheckbox
							id={"test9"}
							isDefault={false}
							label={"Disabled"}
							disabled={true}
						/>
					</ClassicyControlGroup>
				</>
			),
		},
		{
			title: "Colors",
			children: (
				<ClassicyControlGroup label={"Color Picker"}>
					<ClassicyColorPicker
						id={"demo-color-1"}
						value={pickedColor}
						labelTitle={"Accent color:"}
						onChangeFunc={setPickedColor}
					/>
					<ClassicyColorPicker
						id={"demo-color-2"}
						defaultValue={0xba572c}
						labelTitle={"Uncontrolled:"}
					/>
					<ClassicyColorPicker
						id={"demo-color-3"}
						defaultValue={0x888888}
						labelTitle={"Disabled:"}
						disabled={true}
					/>
				</ClassicyControlGroup>
			),
		},
		{
			title: "Feedback",
			children: (
				<>
					<ClassicyControlGroup label={"Progress Bars"}>
						<ClassicyProgressBar value={59} />
						<ClassicyProgressBar indeterminate={true} />
					</ClassicyControlGroup>
					<ClassicyDisclosure label={"Expandable Section"}>
						<p style={{ fontFamily: "var(--header-font)" }}>HELLO!</p>
					</ClassicyDisclosure>
				</>
			),
		},
		{
			title: "Buttons",
			children: (
				<>
					<ClassicyBalloonHelp
						title="Do Nothing"
						content="This button does absolutely nothing."
						position="top-left"
					>
						<ClassicyButton isDefault={true}>Do Nothing</ClassicyButton>
					</ClassicyBalloonHelp>
					<ClassicyBalloonHelp
						title="Quit App"
						content="Click here to quit this application."
						position="top-left"
					>
						<ClassicyButton isDefault={false} onClickFunc={quitApp}>
							Quit
						</ClassicyButton>
					</ClassicyBalloonHelp>
					<ClassicyBalloonHelp
						title="Disabled"
						content="This button is disabled."
						position="top-left"
					>
						<ClassicyButton isDefault={false} disabled={true}>
							Disabled
						</ClassicyButton>
					</ClassicyBalloonHelp>
				</>
			),
		},
	];

	return (
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			defaultWindow={"demo2"}
			addSystemMenu={false}
		>
			<ClassicyWindow
				id={"demo_error_modal"}
				appId={appId}
				closable={false}
				resizable={false}
				zoomable={false}
				scrollable={false}
				collapsable={false}
				initialSize={[0, 0]}
				initialPosition={[300, 300]}
				modal={true}
				appMenu={appMenu}
				hidden={false}
				type={"error"}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						padding: ".5em",
					}}
				>
					<img src={ClassicyIcons.system.error} alt="Error" />
					<ClassicyControlLabel
						label={"This is an error modal dialog."}
					></ClassicyControlLabel>
				</div>
				<ClassicyButton onClickFunc={closeDemoWindow}>OK</ClassicyButton>
			</ClassicyWindow>
			<ClassicyWindow
				id={"demo2"}
				title={appName}
				appId={appId}
				closable={false}
				resizable={false}
				zoomable={false}
				scrollable={true}
				collapsable={false}
				initialSize={["40%", 500]}
				initialPosition={[300, 50]}
				modal={true}
				appMenu={appMenu}
			>
				<ClassicyTabs tabs={tabs} />
			</ClassicyWindow>
		</ClassicyApp>
	);
};

export default Demo;
