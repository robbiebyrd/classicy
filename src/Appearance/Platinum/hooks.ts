import type {
	ClassicyAppearanceContext,
	ClassicyAppearanceHandler,
	ClassicyAppearanceHooks,
} from "@/Appearance/ClassicyAppearancePackage";
import { playClassicyAppearanceSound } from "@/Appearance/ClassicyAppearanceSound";
import type { ClassicySoundSpriteId } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";

// Platinum's behavior hooks: the Mac OS 8 control feedback sounds. A runtime
// leaf apart from the sound bridge (types only from the package module), so
// the Platinum module stays store-free.

/** A handler that plays `sprite` and returns nothing (no decoration change). */
const sound =
	(
		sprite: ClassicySoundSpriteId,
		interrupt = false,
	): ClassicyAppearanceHandler =>
	() => {
		playClassicyAppearanceSound(sprite, { interrupt });
	};

const isKeyboard = (ctx: ClassicyAppearanceContext): boolean =>
	(ctx.detail as { input?: unknown } | undefined)?.input === "keyboard";

/**
 * `handler` for pointer presses only: a Placard's Return/Space and the tab an
 * arrow, Home or End key lands on press silently, as they did before the
 * sounds moved into the package (ruling I-R14). An event with no `input`
 * plays.
 */
const pointerOnly =
	(handler: ClassicyAppearanceHandler): ClassicyAppearanceHandler =>
	(ctx) => {
		if (!isKeyboard(ctx)) return handler(ctx);
	};

/** The Platinum Appearance Package's hooks (`hooks` in its registration). */
export const platinumAppearanceHooks: ClassicyAppearanceHooks = {
	on: {
		Button: {
			press: sound("ClassicyButtonClickDown"),
			release: sound("ClassicyButtonClickUp"),
		},
		BevelButton: {
			press: sound("ClassicyButtonClickDown"),
			release: sound("ClassicyButtonClickUp"),
			open: sound("ClassicyMenuOpen"),
		},
		Placard: {
			press: pointerOnly(sound("ClassicyButtonClickDown")),
			release: pointerOnly(sound("ClassicyButtonClickUp")),
		},
		RadioInput: {
			press: sound("ClassicyInputRadioClickDown"),
			release: sound("ClassicyInputRadioClickUp"),
		},
		Tabs: {
			press: pointerOnly(sound("ClassicyTabClickDown")),
			select: sound("ClassicyTabClickUp"),
			change: sound("ClassicyTabClickUp"),
		},
		Assistant: {
			change: sound("ClassicyTabClickUp"),
		},
	},
};
