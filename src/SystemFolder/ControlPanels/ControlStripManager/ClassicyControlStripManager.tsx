import { useState } from "react";
import { useClassicyAppIdentityOverrides } from "@/Appearance/ClassicyAppIdentity";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	CONTROL_STRIP_MANAGER_APP_ID,
	CONTROL_STRIP_MANAGER_APP_NAME,
} from "@/SystemFolder/ControlPanels/ControlStripManager/ClassicyControlStripManagerManifest";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	closeWindowMenuItemHelper,
	quitAppHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { useClassicyMountedApps } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyControlGroup } from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";
import {
	arrangeClassicyControlStripModules,
	type ClassicyControlStripModuleDefinition,
	classicyControlStripModuleLabel,
	useClassicyControlStripDisabledModules,
	useClassicyControlStripRegistrations,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
import { ClassicyListBox } from "@/SystemFolder/SystemResources/ListBox/ClassicyListBox";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const APP_ID = CONTROL_STRIP_MANAGER_APP_ID;
const APP_NAME = CONTROL_STRIP_MANAGER_APP_NAME;
const WINDOW_ID = "ControlStripManager_1";

/**
 * The Control Strip control panel: show or hide the strip, and choose which
 * of the installed modules it shows and in what order. Modules the host
 * disabled (`controlStrip={{ disabledModules }}`) are not offered.
 *
 * Everything it edits lives in `System.Manager.Desktop.controlStrip` and
 * persists with the desktop.
 */
export function ClassicyControlStripManager() {
	const dispatch = useAppManagerDispatch();
	const appIcon =
		useClassicyAsset("icons", "controlPanels.controlStripManager.app") ?? "";

	// Mac OS 8 HIG control-panel menu bar (audit ch. 6 §35): Apple / File. No
	// Edit menu: the panel has no edit-text fields.
	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		APP_ID,
		APP_NAME,
		appIcon,
	);
	const windowClose = useClassicyWindowClose(APP_ID);

	const stored = useAppManager((s) => s.System.Manager.Desktop.controlStrip);
	const registrations = useClassicyControlStripRegistrations();
	const mountedApps = useClassicyMountedApps();
	const disabledModules = useClassicyControlStripDisabledModules();
	// K-D7: a module an app owns is listed under the app's display name.
	const appIdentityOverrides = useClassicyAppIdentityOverrides();
	const moduleLabel = (module: ClassicyControlStripModuleDefinition) =>
		classicyControlStripModuleLabel(module, appIdentityOverrides);

	const visible = stored?.visible ?? true;
	const hiddenModules = stored?.hiddenModules ?? [];
	const modules = arrangeClassicyControlStripModules(registrations, {
		disabledModules,
		moduleOrder: stored?.moduleOrder,
		mountedApps,
	}).map((r) => r.definition);
	const ids = modules.map((m) => m.id);

	const [selectedId, setSelectedId] = useState<string | undefined>();
	const selected = modules.find((m) => m.id === selectedId) ?? modules[0];
	const index = selected ? ids.indexOf(selected.id) : -1;
	const selectedHidden = selected ? hiddenModules.includes(selected.id) : false;

	// Moving writes the whole arrangement, so the order is explicit for every
	// module installed now; one installed later joins at the end.
	const move = (delta: -1 | 1) => {
		if (!selected) return;
		const next = [...ids];
		const target = index + delta;
		if (target < 0 || target >= next.length) return;
		[next[index], next[target]] = [next[target], next[index]];
		dispatch({
			type: "ClassicyDesktopControlStripSetModuleOrder",
			moduleOrder: next,
		});
	};

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
				initialSize={[360, 0]}
				initialPosition={[340, 100]}
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
				]}
			>
				<div style={{ padding: "var(--window-padding-size)" }}>
					<ClassicyControlGroup label="Control Strip">
						<ClassicyCheckbox
							id="ControlStripManager_visible"
							label="Show Control Strip"
							checked={visible}
							onClickFunc={(checked) =>
								dispatch({
									type: "ClassicyDesktopControlStripSetVisible",
									visible: checked,
								})
							}
						/>
					</ClassicyControlGroup>
					<ClassicyControlGroup label="Modules">
						{modules.length === 0 ? (
							<span>No Control Strip modules are installed.</span>
						) : (
							<>
								<ClassicyListBox
									id="ControlStripManager_modules"
									label="Installed modules"
									visibleRows={6}
									options={modules.map((m) => ({
										value: m.id,
										label: hiddenModules.includes(m.id)
											? `${moduleLabel(m)} (Hidden)`
											: moduleLabel(m),
										icon: typeof m.icon === "string" ? m.icon : m.fileIcon,
									}))}
									selected={selected ? [selected.id] : []}
									onChangeFunc={(values) => setSelectedId(values[0])}
								/>
								{selected && (
									<ClassicyCheckbox
										// Keyed per module so the checkbox re-reads its state
										// when the selection changes.
										key={selected.id}
										id="ControlStripManager_moduleShown"
										label={`Show “${moduleLabel(selected)}” in the Control Strip`}
										checked={!selectedHidden}
										onClickFunc={(checked) =>
											dispatch({
												type: "ClassicyDesktopControlStripSetModuleHidden",
												moduleId: selected.id,
												hidden: !checked,
											})
										}
									/>
								)}
								<ClassicyButton
									disabled={index <= 0}
									onClickFunc={() => move(-1)}
								>
									Move Left
								</ClassicyButton>
								<ClassicyButton
									disabled={index < 0 || index >= ids.length - 1}
									onClickFunc={() => move(1)}
								>
									Move Right
								</ClassicyButton>
								<ClassicyButton
									disabled={(stored?.moduleOrder ?? []).length === 0}
									onClickFunc={() =>
										dispatch({
											type: "ClassicyDesktopControlStripSetModuleOrder",
											moduleOrder: [],
										})
									}
								>
									Use Standard Order
								</ClassicyButton>
							</>
						)}
					</ClassicyControlGroup>
				</div>
			</ClassicyWindow>
			{aboutWindow}
		</ClassicyApp>
	);
}
