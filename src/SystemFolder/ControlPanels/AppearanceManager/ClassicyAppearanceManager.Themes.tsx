import { type ChangeEvent, useMemo } from "react";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import type { TabIndividual } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import packageIcon from "./resources/platinum.png";

interface ThemesTabProps {
	themesList: { value: string; label: string }[] | undefined;
	switchTheme: (e: ChangeEvent<HTMLSelectElement>) => void;
	activeThemeId: string;
}

export const useThemesTab = ({
	themesList,
	switchTheme,
	activeThemeId,
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
				</>
			),
		}),
		[themesList, switchTheme, activeThemeId],
	);
