import { type ChangeEvent, useCallback, useMemo, useRef } from "react";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import type { ClassicyAssetSource } from "@/Appearance/ClassicyAssetSource";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import type { TabIndividual } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";

interface ThemesTabProps {
	/**
	 * The active Appearance Package's icon (`ClassicyAppearancePackage.icon`),
	 * shown in the label; a generic package glyph when it has none.
	 */
	packageIcon?: ClassicyAssetSource;
	/** The active Appearance Package's name, shown in the label. */
	packageName: string;
	themesList: { value: string; label: string }[] | undefined;
	switchTheme: (e: ChangeEvent<HTMLSelectElement>) => void;
	activeThemeId: string;
	smartScrolling: boolean;
	toggleSmartScrolling: (checked: boolean) => void;
	doubleClickTitleToCollapse: boolean;
	toggleDoubleClickTitleToCollapse: (checked: boolean) => void;
	/** Saves the active theme (built-in or custom) as a theme file. */
	saveTheme: () => void;
	/** Loads the theme file the user picked. */
	loadThemeFile: (file: File) => void;
}

export const useThemesTab = ({
	packageIcon,
	packageName,
	themesList,
	switchTheme,
	activeThemeId,
	smartScrolling,
	toggleSmartScrolling,
	doubleClickTitleToCollapse,
	toggleDoubleClickTitleToCollapse,
	saveTheme,
	loadThemeFile,
}: ThemesTabProps): TabIndividual => {
	// A plain hidden file input, opened by the Load button: one file per pick
	// and nothing to show, so ClassicyFileInput's running file list would only
	// get in the way.
	const fileInputRef = useRef<HTMLInputElement>(null);
	// The generic package glyph: the core icon tree's extension icon, for a
	// package that brings no icon of its own.
	const genericPackageIcon = useClassicyAsset("icons", "system.extension");
	const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);
	const onFilePicked = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const file = e.currentTarget.files?.[0];
			// Clear the input so picking the same file again still fires change.
			e.currentTarget.value = "";
			if (file) loadThemeFile(file);
		},
		[loadThemeFile],
	);

	return useMemo(
		() => ({
			title: "Themes",
			children: (
				<>
					<ClassicyControlLabel
						label={`The current Appearance Package is ${packageName}`}
						icon={packageIcon ?? genericPackageIcon}
					/>
					<br />
					{themesList && (
						<ClassicyPopUpMenu
							id={"select_theme"}
							label={"Selected Theme"}
							labelPosition="left"
							options={themesList}
							onChangeFunc={switchTheme}
							selected={activeThemeId || "default"}
						/>
					)}
					<div className={"classicyAppearanceManagerThemeFileRow"}>
						<ClassicyButton onClickFunc={saveTheme}>Save Theme…</ClassicyButton>
						<ClassicyButton onClickFunc={openFilePicker}>
							Load Theme…
						</ClassicyButton>
						<input
							ref={fileInputRef}
							type="file"
							accept="application/json,.json"
							hidden
							data-testid="appearance_theme_file_input"
							onChange={onFilePicked}
						/>
					</div>
					{/* Mac OS 8 Appearance "Options" tab: Smart Scrolling groups both
					    scroll arrows at the end of each bar; off splits them to
					    opposite ends. */}
					<ClassicyCheckbox
						id={"appearance_smart_scrolling"}
						label={"Smart Scrolling (arrows together)"}
						checked={smartScrolling}
						onClickFunc={toggleSmartScrolling}
					/>
					{/* Its Options-tab neighbor: a title-bar double-click collapses
					    the window (WindowShade) when on. */}
					<ClassicyCheckbox
						id={"appearance_double_click_title_to_collapse"}
						label={"Double-click title bar to collapse windows"}
						checked={doubleClickTitleToCollapse}
						onClickFunc={toggleDoubleClickTitleToCollapse}
					/>
				</>
			),
		}),
		[
			packageIcon,
			genericPackageIcon,
			packageName,
			themesList,
			switchTheme,
			activeThemeId,
			smartScrolling,
			toggleSmartScrolling,
			doubleClickTitleToCollapse,
			toggleDoubleClickTitleToCollapse,
			saveTheme,
			openFilePicker,
			onFilePicked,
		],
	);
};
