// The `RenamedByPackage` story imports its parameters from here, and only
// story files that use the package do: importing this module registers the
// Storybook-only `renamed` Appearance Package (./RenamedPackage), so it is
// registered only in a story iframe that has loaded one of those story files
// (Storybook loads CSF files lazily), never in every iframe through
// preview.tsx. Other stories, and lists of the registered packages, never see
// it (ruling F-R6).
import "./RenamedPackage";
import { desktopParameters } from "./helpers";

/**
 * `desktopParameters` under the Storybook-only `renamed` Appearance Package
 * (RenamedPackage.ts): Platinum's look, with Movie Player shown as "Media
 * Player" and the host app TV.app as "Television". Spread into a story's
 * `parameters`; importing it registers the package.
 */
export const renamedParameters = {
	...desktopParameters,
	classicy: { ...desktopParameters.classicy, appearancePackage: "renamed" },
};
