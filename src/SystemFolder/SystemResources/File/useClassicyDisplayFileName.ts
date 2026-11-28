import { useMemo } from "react";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	classicyFileExtensionsHidden,
	classicyRegisteredFileExtension,
} from "@/SystemFolder/SystemResources/File/ClassicyFileNames";

/** How the active package shows names (`useClassicyDisplayFileName`). */
export type ClassicyDisplayFileNames = {
	/**
	 * Whether any extension may be hidden: false under a layout that shows
	 * every name whole (or while the user shows them), so a caller may skip
	 * looking an entry up.
	 */
	hides: boolean;
	/** `name` as shown: without its hidden extension, else as stored. */
	display: (name: string, entry: { _type?: string } | undefined) => string;
	/** The extension `name` is shown without, with its dot, or `""`. */
	hiddenExtension: (
		name: string,
		entry: { _type?: string } | undefined,
	) => string;
};

const SHOWN_WHOLE: ClassicyDisplayFileNames = Object.freeze({
	hides: false,
	display: (name: string) => name,
	hiddenExtension: () => "",
});

/**
 * How the active package shows file names, live (WIG Ch.10 "System Naming
 * Conventions", p.210): under `layout.files.extensions` `"hideRegistered"`
 * (Windows 98) and while the user leaves Finder Preferences' "Hide file
 * extensions for known file types" on (Finder's `hideFileExtensions`), a
 * file of a type an application other than the Finder opens
 * (`fileTypeHandlers`) is shown without its final extension; under any
 * other layout every name is shown as stored. The folder views, desktop
 * items and property sheets read names through it; a rename edits the
 * shown name and appends `hiddenExtension`.
 */
export const useClassicyDisplayFileName = (): ClassicyDisplayFileNames => {
	const layout = useClassicyAppearanceLayout();
	// Read defensively: a hand-built or mocked store may lack the slices.
	const fileTypeHandlers = useAppManager(
		(state) => state?.System?.Manager?.Applications?.fileTypeHandlers,
	);
	const hideFileExtensions = useAppManager(
		(state) =>
			(
				state?.System?.Manager?.Applications?.apps?.["Finder.app"]?.data as
					| { hideFileExtensions?: unknown }
					| undefined
			)?.hideFileExtensions !== false,
	);
	const hides = classicyFileExtensionsHidden(layout, hideFileExtensions);
	return useMemo(() => {
		if (!hides) return SHOWN_WHOLE;
		const hiddenExtension = (
			name: string,
			entry: { _type?: string } | undefined,
		): string => classicyRegisteredFileExtension(name, entry, fileTypeHandlers);
		return {
			hides: true,
			hiddenExtension,
			display: (name, entry) =>
				name.slice(0, name.length - hiddenExtension(name, entry).length),
		};
	}, [hides, fileTypeHandlers]);
};
