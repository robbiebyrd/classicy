import type { ClassicyAppearanceHooks } from "@classicy/classicy";

// System 7's behavior hooks: the blink of a chosen menu item (HIG p.56), and
// nothing else. System 7 had no interface feedback sounds, so no handler
// plays one; each only decorates.

/** `T` with every object in it read-only; functions stay as they are. */
type DeepReadonly<T> = T extends (...args: never[]) => unknown
	? T
	: { readonly [K in keyof T]: DeepReadonly<T[K]> };

/** Freezes `value` and every plain object or array inside it. */
const deepFreeze = <T extends object>(value: T): DeepReadonly<T> => {
	for (const child of Object.values(value))
		if (child !== null && typeof child === "object") deepFreeze(child);
	return Object.freeze(value) as DeepReadonly<T>;
};

/**
 * The System 7 Appearance Package's hooks (`hooks` in its registration):
 * a menu item's press decorates it with the blink (`classicyMenuItemFlash`,
 * styled in styles/components/_Menu.scss), whose animationend runs the
 * item's action, and its release clears it. Deeply frozen, as Platinum's.
 */
export const system7AppearanceHooks: DeepReadonly<ClassicyAppearanceHooks> =
	deepFreeze<ClassicyAppearanceHooks>({
		on: {
			MenuItem: {
				press: () => ({ className: "classicyMenuItemFlash" }),
				release: () => ({}),
			},
		},
	});
