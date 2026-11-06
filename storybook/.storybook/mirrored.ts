// The six `Mirrored` stories import their parameters from here, and only
// they do: importing this module registers the Storybook-only `mirrored`
// Appearance Package (./MirroredPackage), so it is registered only in a
// story iframe that has loaded one of those story files (Storybook loads
// CSF files lazily), never in every iframe through preview.tsx. Other
// stories, and lists of the registered packages, never see it (ruling F-R6).
import "./MirroredPackage";
import { desktopParameters } from "./helpers";

/**
 * `desktopParameters` under the Storybook-only `mirrored` Appearance Package
 * (MirroredPackage.ts): every arrangement slot flipped. Spread into a
 * `Mirrored` story's `parameters`; importing it registers the package.
 */
export const mirroredParameters = {
	...desktopParameters,
	classicy: { ...desktopParameters.classicy, appearancePackage: "mirrored" },
};
