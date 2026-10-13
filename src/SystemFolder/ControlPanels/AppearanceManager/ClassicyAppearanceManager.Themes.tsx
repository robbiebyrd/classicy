import { type ChangeEvent, useMemo } from "react";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import type { TabIndividual } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import packageIcon from "./resources/platinum.png";

interface ThemesTabProps {
	themesList: { value: string; label: string }[] | undefined;
	switchTheme: (e: ChangeEvent<HTMLSelectElement>) => void;
	activeThemeId: string;
	smartScrolling: boolean;
	toggleSmartScrolling: (checked: boolean) => void;
}

export const useThemesTab = ({
	themesList,
	switchTheme,
	activeThemeId,
	smartScrolling,
	toggleSmartScrolling,
}: ThemesTabProps): TabIndividual =>
	useMemo(
		() => ({
			title: "Themes",
			children: (
				<>
					<ClassicyControlLabel
						label={"The current Theme Package is Platinum"}
						icon={packageIcon}
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
					<br />
					{/* Mac OS 8 Appearance "Options" tab: Smart Scrolling groups both
					    scroll arrows at the end of each bar; off splits them to
					    opposite ends. */}
					<ClassicyCheckbox
						id={"appearance_smart_scrolling"}
						label={"Smart Scrolling (arrows together)"}
						checked={smartScrolling}
						onClickFunc={toggleSmartScrolling}
					/>
				</>
			),
		}),
		[
			themesList,
			switchTheme,
			activeThemeId,
			smartScrolling,
			toggleSmartScrolling,
		],
	);
