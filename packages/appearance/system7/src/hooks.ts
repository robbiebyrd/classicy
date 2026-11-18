import type { ClassicyAppearanceHooks } from "@classicy/classicy";
import { type DeepReadonly, deepFreeze } from "./system7DeepFreeze.internal";

// System 7's behavior hooks: the blink of a chosen menu item (HIG p.56), and
// nothing else. System 7 had no interface feedback sounds, so no handler
// plays one; each only decorates.

/**
 * How many times a chosen menu item blinks: System 7's default, three
 * (HIG figure 7-9: General Controls' Menu Blinking, Off, 1, 2 or 3). Each
 * blink is one cycle of the `classicySystem7MenuItemFlash` keyframes.
 */
const MENU_BLINKS = 3;

/**
 * The System 7 Appearance Package's hooks (`hooks` in its registration):
 * a menu item's press decorates it with the blink (`classicyMenuItemFlash`,
 * styled in styles/components/_Menu.scss, run `MENU_BLINKS` times), whose
 * animationend runs the item's action, and its release clears it. Deeply
 * frozen, as Platinum's.
 */
export const system7AppearanceHooks: DeepReadonly<ClassicyAppearanceHooks> =
	deepFreeze<ClassicyAppearanceHooks>({
		on: {
			MenuItem: {
				press: () => ({
					className: "classicyMenuItemFlash",
					style: { animationIterationCount: MENU_BLINKS },
				}),
				release: () => ({}),
			},
		},
	});
