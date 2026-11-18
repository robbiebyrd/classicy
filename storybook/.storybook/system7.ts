// The System 7 stories import their parameters and helpers from here, and
// only they do: importing this module registers the System 7 Appearance
// Package (`@classicy/appearance-system7`), so it is registered only in a
// story iframe that has loaded one of those story files (Storybook loads
// CSF files lazily) or where it was chosen in the Package toolbar
// (./StorybookPackages.ts), never in every iframe through preview.tsx.
// Platinum's stories and the parity baseline never see it, as with the
// `mirrored` package (./mirrored.ts).
import "@classicy/appearance-system7";
import {
	createElement,
	type ReactElement,
	type ReactNode,
	useEffect,
} from "react";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { desktopParameters } from "./helpers";

/**
 * `desktopParameters` under the System 7 Appearance Package, which activates
 * its defaults, the black-and-white "System 7" theme. Spread into a System 7
 * story's `parameters`; importing it registers the package.
 */
export const system7Parameters = {
	...desktopParameters,
	classicy: { ...desktopParameters.classicy, appearancePackage: "system7" },
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
 * The color theme's (`system7-color`) story of a scene; the black-and-white
 * one is the defaults', a story whose `render` is the scene itself.
 */
export const inColor = (
	scene: () => ReactNode,
): { render: () => ReactElement } => ({
	render: () => createElement(WithTheme, { id: "system7-color" }, scene()),
});
