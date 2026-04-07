import {
	ClassicyApp,
	ClassicyButton,
	ClassicyCheckbox,
	ClassicyControlGroup,
	ClassicyControlLabel,
	ClassicyDisclosure,
	ClassicyIcons,
	ClassicyInput,
	ClassicyPopUpMenu,
	ClassicyProgressBar,
	ClassicyRadioInput,
	ClassicyWindow,
	quitAppHelper,
	quitMenuItemHelper,
	useAppManagerDispatch,
} from "classicy";
import {
	type FC as FunctionalComponent,
	useCallback,
	useEffect,
} from "react";

const RADIO_INPUTS = [
	{ id: "test1", isDefault: true, disabled: false, label: "Radio Button 1 (Default)", checked: false },
	{ id: "test2", label: "Radio Button 2 (Regular)", checked: false },
	{ id: "test3", mixed: true, label: "Radio Button 3 (Mixed)", checked: false },
];

const RADIO_INPUTS_DISABLED = [
	{ id: "test4", disabled: true, label: "Radio Button 4 (Disabled)", checked: false },
	{ id: "test5", disabled: true, mixed: true, label: "Radio Button 6 (Disabled + Checked + Mixed)", checked: true },
];

export const Demo: FunctionalComponent= () => {
	const appName = "Demo";
	const appId = "Demo.app";
	const appIcon = ClassicyIcons.system.folders.directory;

	const desktopEventDispatch = useAppManagerDispatch();

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

	const appMenu = [
		{
			id: "file",
			title: "File",
			menuChildren: [quitMenuItemHelper(appId, appName, appIcon)],
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
				scrollable={false}
				collapsable={false}
				initialSize={[400, 0]}
				initialPosition={[300, 50]}
				modal={true}
				appMenu={appMenu}
			>
				<div
					style={{
						padding: ".5em",
						display: "flex",
						flexDirection: "column",
					}}
				>
					<ClassicyControlGroup label={"Pop Up Menu"}>
						<ClassicyPopUpMenu
							id={"select_theme"}
							small={false}
							options={[
								{ value: "hello", label: "Hello" },
								{ value: "hello2", label: "Hello again!" },
							]}
							selected={"hello"}
						/>
					</ClassicyControlGroup>
					<ClassicyControlGroup label={"Progress Bars"}>
						<ClassicyProgressBar value={59}></ClassicyProgressBar>
						<ClassicyProgressBar indeterminate={true}></ClassicyProgressBar>
					</ClassicyControlGroup>
					<ClassicyInput id={"test"} labelTitle={"Text Input"}></ClassicyInput>
				</div>
				<ClassicyControlGroup label={"Test Radio Inputs"}>
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
				<ClassicyControlGroup label={"Test Checkboxes"}>
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
						onClickFunc={() => {
							alert("This is disabled");
						}}
					/>
				</ClassicyControlGroup>
				<ClassicyDisclosure label={"Expandable Section"}>
					<p style={{ fontFamily: "var(--header-font)" }}>HELLO!</p>
				</ClassicyDisclosure>
				<ClassicyButton isDefault={true}>Do Nothing</ClassicyButton>
				<ClassicyButton isDefault={false} onClickFunc={quitApp}>
					Quit
				</ClassicyButton>
				<ClassicyButton isDefault={false} disabled={true}>
					Disabled
				</ClassicyButton>
			</ClassicyWindow>
		</ClassicyApp>
	);
};

export default Demo;
