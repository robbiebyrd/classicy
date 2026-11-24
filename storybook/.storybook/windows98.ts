// The Windows 98 stories import their parameters and helpers from here, and
// only they do: importing this module registers the Windows 98 Appearance
// Package (`@classicy/appearance-windows98`), so it is registered only in a
// story iframe that has loaded one of those story files (Storybook loads
// CSF files lazily) or where it was chosen in the Package toolbar
// (./StorybookPackages.ts), never in every iframe through preview.tsx, as
// with System 7 (./system7.ts) and the `mirrored` package (./mirrored.ts).
import "@classicy/appearance-windows98";
import {
	createElement,
	type ReactElement,
	type ReactNode,
	useEffect,
} from "react";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { desktopParameters } from "./helpers";

/**
 * `desktopParameters` under the Windows 98 Appearance Package, which
 * activates its defaults, the "Windows Standard" theme. Spread into a
 * Windows 98 story's `parameters`; importing it registers the package.
 */
export const windows98Parameters = {
	...desktopParameters,
	classicy: { ...desktopParameters.classicy, appearancePackage: "windows98" },
};

/**
 * Activates one of the package's themes (`ClassicyDesktopChangeTheme`) once
 * the desktop has mounted, and renders its children.
 */
export function WithTheme({
	id,
	children,
}: {
	id: string;
	children?: ReactNode;
}) {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({ type: "ClassicyDesktopChangeTheme", activeTheme: id });
	}, [dispatch, id]);
	return children;
}

/**
 * A scene's story under one of the package's other schemes ("Windows 95",
 * "Brick", …); the "Windows Standard" one is the defaults', a story whose
 * `render` is the scene itself.
 */
export const inScheme = (
	id: string,
	scene: () => ReactNode,
): { render: () => ReactElement } => ({
	render: () => createElement(WithTheme, { id }, scene()),
});
