import { useCallback } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

type CursorName = keyof typeof ClassicyIcons.ui.cursors;

export const useClassicyCursor = () => {
	const setCursor = useCallback((name?: CursorName) => {
		if (!name) {
			document.body.style.cursor = "";
			return;
		}
		const url = ClassicyIcons.ui.cursors[name];
		document.body.style.cursor = url ? `url(${url}), auto` : "";
	}, []);

	return setCursor;
};
