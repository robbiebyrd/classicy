import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
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
import { quitMenuItemHelper } from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyControlGroup } from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicySpinner } from "@/SystemFolder/SystemResources/Spinner/ClassicySpinner";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const APP_ID = "ScreenSaverManager.app";
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
						menuChildren: [quitMenuItemHelper(APP_ID, APP_NAME, appIcon)],
					},
				]}
			>
				<div style={{ padding: "var(--window-padding-size)" }}>
					<ClassicyControlGroup label="Screen Saver">
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
						<ClassicyButton
							onClickFunc={() => dispatch({ type: SCREEN_SAVER_ACTIVATE_EVENT })}
						>
							Test
						</ClassicyButton>
					</ClassicyControlGroup>
					{selected && (
						// Keyed by saver id so option controls remount (and re-prefill)
						// when a different saver is chosen.
						<ClassicyControlGroup
							key={selected.id}
							label={`Options for ${selected.name}`}
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
								<span>This screen saver has no options.</span>
							)}
						</ClassicyControlGroup>
					)}
				</div>
			</ClassicyWindow>
		</ClassicyApp>
	);
}
