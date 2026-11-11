import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";

/**
 * Base SCSS is structure only (CLAUDE.md, "Theming"): the radio, checkbox,
 * little-arrows, edit-text and list looks live in Platinum's partials, so a
 * second package never has to fight them. These pin the compiled base sheets
 * free of the look properties that moved.
 */

const LOOK =
	/^(background(-color|-image)?|box-shadow|text-shadow|outline|border-radius|border-color|border-style|border(-top|-right|-bottom|-left)?|color|content|opacity)\s*:/;

const FILES = [
	"SystemResources/RadioInput/ClassicyRadioInput.scss",
	"SystemResources/Checkbox/ClassicyCheckbox.scss",
	"SystemResources/LittleArrows/ClassicyLittleArrows.scss",
	"SystemResources/Input/ClassicyInput.scss",
	"SystemResources/ListBox/ClassicyListBox.scss",
	"SystemResources/Tree/ClassicyTree.scss",
];

// Visibility, not a look: the radio's mark is hidden until it is checked.
const KEPT = new Set(["opacity: 0;", "opacity: 1;"]);

describe("base control sheets hold no look", () => {
	for (const file of FILES) {
		it(file, () => {
			const css = sass.compile(
				path.resolve(process.cwd(), "src/SystemFolder", file),
				{ style: "expanded" },
			).css;
			const looks = css
				.split("\n")
				.map((l) => l.trim())
				.filter((l) => LOOK.test(l) && !KEPT.has(l));
			expect(looks).toEqual([]);
		});
	}
});
