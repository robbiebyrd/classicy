import type {
	ClassicyAppearanceContext,
	ClassicyAppearanceHandler,
	ClassicyAppearanceHooks,
} from "@/Appearance/ClassicyAppearancePackage";
import { playClassicyAppearanceSound } from "@/Appearance/ClassicyAppearanceSound";
import type { ClassicySoundSpriteId } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";

// Platinum's behavior hooks: the Mac OS 8 control, window and menu feedback
// sounds, and the menu item's selection flash. A runtime leaf apart from the
// sound bridge (types only from the package module), so the Platinum module
// stays store-free.

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

/** `detail.kind` of a Window drag or change event ("move" or "resize"). */
const dragKind = (ctx: ClassicyAppearanceContext): unknown =>
	(ctx.detail as { kind?: unknown } | undefined)?.kind;

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
		// Every window sound plays for the cause and input that played it
		// before the move (I-R16, I-R17). The zoom event fires wherever the
		// zoom sprite plays (the zoom box, a collapse, a resize start), so it
		// follows `zoomed` whatever the `cause`.
		Window: {
			focus: sound("ClassicyWindowFocus"),
			collapse: sound("ClassicyWindowCollapse"),
			expand: sound("ClassicyWindowExpand"),
			zoom: (ctx) => {
				playClassicyAppearanceSound(
					(ctx.detail as { zoomed: boolean }).zoomed
						? "ClassicyWindowZoomMaximize"
						: "ClassicyWindowZoomMinimize",
				);
			},
			close: sound("ClassicyWindowClose"),
			// A move starts with the idle sound; a resize start has none.
			dragStart: (ctx) => {
				if (dragKind(ctx) !== "resize")
					playClassicyAppearanceSound("ClassicyWindowMoveIdle");
			},
			change: (ctx) => {
				if (dragKind(ctx) === "move")
					playClassicyAppearanceSound("ClassicyWindowMoveMoving");
			},
			dragEnd: sound("ClassicyWindowMoveStop", true),
		},
		// A leaf's press flashes it until its action runs (`release`). No
		// pack has a blur sprite, and a blur is silent, so `blur` is unmapped.
		MenuItem: {
			press: () => {
				playClassicyAppearanceSound("ClassicyMenuItemClick");
				return { className: "classicyMenuItemFlash" };
			},
			release: () => ({}),
			open: sound("ClassicyMenuOpen"),
			focus: sound("ClassicyMenuItemHover"),
		},
	},
};
