// The System 7 stories import their parameters from here, and only they do:
// importing this module registers the System 7 Appearance Package
// (`@classicy/appearance-system7`), so it is registered only in a story iframe
// that has loaded one of those story files (Storybook loads CSF files
// lazily), never in every iframe through preview.tsx. Platinum's stories, the
// Theme toolbar and the parity baseline never see it, as with the `mirrored`
// package (./mirrored.ts).
import "@classicy/appearance-system7";
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
