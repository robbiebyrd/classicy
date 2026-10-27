import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { SCREEN_SAVER_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/ScreenSaverManager/ClassicyScreenSaverManagerManifest";
import { ClassicyScreenSaverConfigForm } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverConfigForm";
import {
	isScreenSaverEnabled,
	SCREEN_SAVER_ACTIVATE_EVENT,
	SCREEN_SAVER_APP_ID,
	SCREEN_SAVER_DEFAULT_SAVER_ID,
	SCREEN_SAVER_MAX_TIMEOUT_MINUTES,
	SCREEN_SAVER_MIN_TIMEOUT_MINUTES,
	type ScreenSaverData,
	screenSaverTimeoutMinutes,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverContext";
import {
	getClassicyScreenSaver,
	listClassicyScreenSavers,
	resolveScreenSaverConfig,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyEditMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	closeWindowMenuItemHelper,
	quitAppHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import {
	ClassicyControlGroup,
	ClassicyControlGroupFormRow,
	ClassicyControlGroupStack,
} from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicySpinner } from "@/SystemFolder/SystemResources/Spinner/ClassicySpinner";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import "./ClassicyScreenSaverManager.scss";

const APP_ID = SCREEN_SAVER_MANAGER_APP_ID;
const APP_NAME = "Screen Saver";
const WINDOW_ID = "ScreenSaverManager_1";

/**
 * The Screen Saver control panel: pick a saver, set idle timeout, toggle the
 * feature, test it, and edit the selected saver's options (its custom
 * `configComponent` when it has one, otherwise a form derived from its
 * `configSchema`).
 */
export function ClassicyScreenSaverManager() {
	const dispatch = useAppManagerDispatch();
	const appIcon = ClassicyIcons.system.extensions.screensaver;

	// Mac OS 8 HIG control-panel menu bar (audit ch. 6 §35): Apple / File / Edit.
	// The About entry is discovery data for the desktop menu bar (HIG #209):
	// ClassicyDesktopMenuBar hoists it into the Apple menu and strips it from
	// File before rendering. The Edit menu is required because this panel has
	// edit-text fields (the timeout spinner and the derived options form).
	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		APP_ID,
		APP_NAME,
		appIcon,
	);
	const windowClose = useClassicyWindowClose(APP_ID);
	const editMenu = useClassicyEditMenu(APP_ID);

	const data = useAppManager(
		(s) =>
			s.System.Manager.Applications.apps[SCREEN_SAVER_APP_ID]?.data as
				| ScreenSaverData
				| undefined,
	);
	const saverData: ScreenSaverData = data ?? {};

	const savers = listClassicyScreenSavers();
	const selectedId = saverData.selectedSaver ?? SCREEN_SAVER_DEFAULT_SAVER_ID;
	const selected = getClassicyScreenSaver(selectedId);
	const config = selected
		? resolveScreenSaverConfig(selected, saverData.saverConfigs?.[selected.id])
		: {};

	const onConfigChange = (patch: Record<string, unknown>) => {
		if (!selected) return;
		dispatch({
			type: "ClassicyAppScreenSaverSetConfig",
			saverId: selected.id,
			config: patch,
		});
	};

	const OptionsComponent = selected?.configComponent;

	return (
		<ClassicyApp
			id={APP_ID}
			name={APP_NAME}
			icon={appIcon}
			defaultWindow={WINDOW_ID}
			showDesktopIcon={false}
			showInApplicationsFolder={false}
			addSystemMenu={true}
		>
			<ClassicyWindow
				id={WINDOW_ID}
				title={APP_NAME}
				appId={APP_ID}
				icon={appIcon}
				closable={true}
				resizable={false}
				zoomable={false}
				scrollable={false}
				collapsable={false}
				initialSize={[420, 0]}
				initialPosition={[320, 80]}
				modal={false}
				backgroundColor="var(--color-system-03)"
				appMenu={[
					{
						id: `${APP_ID}_file`,
						title: "File",
						menuChildren: [
							{ ...aboutMenuItem, title: `About ${APP_NAME}` },
							{
								...closeWindowMenuItemHelper(`${APP_ID}_close_window`, () =>
									windowClose(
										WINDOW_ID,
										quitAppHelper(APP_ID, APP_NAME, appIcon),
									),
								),
								keyboardShortcut: "⌥W",
							},
							{ id: "spacer" },
							{
								...quitMenuItemHelper(APP_ID, APP_NAME, appIcon),
								keyboardShortcut: "⌥Q",
							},
						],
					},
					// Edit menu — this panel has edit-text fields (timeout spinner,
					// per-saver options). Commands act on the focused field.
					editMenu,
				]}
			>
				{/* HIGOS8 Ch.3 layout: labels and their controls in two aligned
				    columns (p.84), the checkbox and the push button on full-width
				    rows so the box lines up with the labels (Figure 3-27) and the
				    button sits at the group's lower right (p.72), and the two
				    group boxes 12px apart (Figure 3-29). */}
				<ClassicyControlGroupStack className="classicyScreenSaverManagerContent">
					<ClassicyControlGroup label="Screen Saver" layout="form">
						<ClassicyControlGroupFormRow>
							<ClassicyCheckbox
								id="ScreenSaverManager_enabled"
								label="Start screen saver when idle"
								checked={isScreenSaverEnabled(saverData)}
								onClickFunc={(checked) =>
									dispatch({
										type: "ClassicyAppScreenSaverSetEnabled",
										enabled: checked,
									})
								}
							/>
						</ClassicyControlGroupFormRow>
						<ClassicyPopUpMenu
							id="ScreenSaverManager_saver"
							label="Screen saver"
							labelPosition="left"
							options={savers.map((s) => ({ value: s.id, label: s.name }))}
							selected={selectedId}
							onChangeFunc={(e) =>
								dispatch({
									type: "ClassicyAppScreenSaverSetSaver",
									saverId: e.target.value,
								})
							}
						/>
						<ClassicySpinner
							id="ScreenSaverManager_timeout"
							labelTitle="Minutes of inactivity"
							labelPosition="left"
							minValue={SCREEN_SAVER_MIN_TIMEOUT_MINUTES}
							maxValue={SCREEN_SAVER_MAX_TIMEOUT_MINUTES}
							prefillValue={screenSaverTimeoutMinutes(saverData)}
							onChangeFunc={(e) => {
								const minutes = Number.parseInt(e.target.value, 10);
								if (Number.isFinite(minutes)) {
									dispatch({
										type: "ClassicyAppScreenSaverSetTimeout",
										minutes,
									});
								}
							}}
						/>
						<ClassicyControlGroupFormRow justify="end">
							<ClassicyButton
								onClickFunc={() =>
									dispatch({ type: SCREEN_SAVER_ACTIVATE_EVENT })
								}
							>
								Test
							</ClassicyButton>
						</ClassicyControlGroupFormRow>
					</ClassicyControlGroup>
					{selected && (
						// Keyed by saver id so option controls remount (and re-prefill)
						// when a different saver is chosen.
						<ClassicyControlGroup
							key={selected.id}
							label={`Options for ${selected.name}`}
							layout="form"
						>
							{OptionsComponent ? (
								<OptionsComponent config={config} onChange={onConfigChange} />
							) : selected.configSchema ? (
								<ClassicyScreenSaverConfigForm
									saver={selected}
									config={config}
									onChange={onConfigChange}
								/>
							) : (
								<ClassicyControlGroupFormRow>
									<span>This screen saver has no options.</span>
								</ClassicyControlGroupFormRow>
							)}
						</ClassicyControlGroup>
					)}
				</ClassicyControlGroupStack>
			</ClassicyWindow>
			{aboutWindow}
		</ClassicyApp>
	);
}
