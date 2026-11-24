import { describe, expect, it } from "vitest";
import {
	CLASSICY_APP_SWITCHER_DEFAULT_SHORTCUT,
	classicyAppSwitcherChordDirection,
	classicyAppSwitcherReverseShortcut,
	classicyAppSwitcherShortcutProblem,
	isClassicyAppSwitcherShortcut,
	nextClassicyAppSwitcherAppId,
} from "./ClassicyApplicationSwitcherCycle";

const key = (
	init: Partial<{
		key: string;
		code: string;
		ctrlKey: boolean;
		altKey: boolean;
		shiftKey: boolean;
		metaKey: boolean;
	}>,
) => ({
	key: "",
	code: "",
	ctrlKey: false,
	altKey: false,
	shiftKey: false,
	metaKey: false,
	...init,
});

describe("nextClassicyAppSwitcherAppId", () => {
	const ids = ["Calc.app", "Finder.app", "Notes.app"];

	it("goes to the next application and wraps around, as Command-Tab did", () => {
		expect(nextClassicyAppSwitcherAppId(ids, "Calc.app", 1)).toBe("Finder.app");
		expect(nextClassicyAppSwitcherAppId(ids, "Notes.app", 1)).toBe("Calc.app");
	});

	it("goes to the previous one with the chord's Shift, wrapping too", () => {
		expect(nextClassicyAppSwitcherAppId(ids, "Finder.app", -1)).toBe(
			"Calc.app",
		);
		expect(nextClassicyAppSwitcherAppId(ids, "Calc.app", -1)).toBe("Notes.app");
	});

	it("starts from the first (or last) application when the front one is not listed", () => {
		expect(nextClassicyAppSwitcherAppId(ids, "Guide.app", 1)).toBe("Calc.app");
		expect(nextClassicyAppSwitcherAppId(ids, undefined, -1)).toBe("Notes.app");
	});

	it("switches nowhere with no other application", () => {
		expect(nextClassicyAppSwitcherAppId(["Finder.app"], "Finder.app", 1)).toBe(
			undefined,
		);
		expect(nextClassicyAppSwitcherAppId([], "Finder.app", 1)).toBe(undefined);
	});
});

describe("the switching chord", () => {
	it("defaults to Control-` and goes backward with Shift added", () => {
		expect(CLASSICY_APP_SWITCHER_DEFAULT_SHORTCUT).toBe("⌃`");
		expect(classicyAppSwitcherReverseShortcut("⌃`")).toBe("⌃⇧`");
		expect(classicyAppSwitcherReverseShortcut("⌥J")).toBe("⌥⇧J");
	});

	it("matches Control-` forward and Control-Shift-` (which types ~) backward", () => {
		expect(
			classicyAppSwitcherChordDirection(
				"⌃`",
				key({ key: "`", code: "Backquote", ctrlKey: true }),
			),
		).toBe(1);
		expect(
			classicyAppSwitcherChordDirection(
				"⌃`",
				key({ key: "~", code: "Backquote", ctrlKey: true, shiftKey: true }),
			),
		).toBe(-1);
	});

	it("matches the physical key on a layout that types another character there", () => {
		expect(
			classicyAppSwitcherChordDirection(
				"⌃`",
				key({ key: "Dead", code: "Backquote", ctrlKey: true }),
			),
		).toBe(1);
	});

	it("leaves the key alone without its modifier, or with another one", () => {
		expect(
			classicyAppSwitcherChordDirection(
				"⌃`",
				key({ key: "`", code: "Backquote" }),
			),
		).toBe(0);
		expect(
			classicyAppSwitcherChordDirection(
				"⌃`",
				key({ key: "`", code: "Backquote", altKey: true }),
			),
		).toBe(0);
		expect(
			classicyAppSwitcherChordDirection(
				"⌃`",
				key({ key: "`", code: "Backquote", ctrlKey: true, altKey: true }),
			),
		).toBe(0);
		expect(
			classicyAppSwitcherChordDirection(
				"⌃`",
				key({ key: "`", code: "Backquote", ctrlKey: true, metaKey: true }),
			),
		).toBe(0);
		expect(
			classicyAppSwitcherChordDirection(
				"⌃`",
				key({ key: "1", code: "Digit1", ctrlKey: true }),
			),
		).toBe(0);
	});

	it("reads Command as Meta or Control, and Option alone as Alt", () => {
		const j = (init: Parameters<typeof key>[0]) =>
			key({ key: "j", code: "KeyJ", ...init });
		expect(classicyAppSwitcherChordDirection("⌘J", j({ metaKey: true }))).toBe(
			1,
		);
		expect(classicyAppSwitcherChordDirection("⌘J", j({ ctrlKey: true }))).toBe(
			1,
		);
		expect(classicyAppSwitcherChordDirection("⌥J", j({ altKey: true }))).toBe(
			1,
		);
		// Option-J types ∆ on a Mac: the physical key still matches.
		expect(
			classicyAppSwitcherChordDirection(
				"⌥J",
				key({ key: "∆", code: "KeyJ", altKey: true }),
			),
		).toBe(1);
		expect(
			classicyAppSwitcherChordDirection(
				"⌥J",
				j({ altKey: true, ctrlKey: true }),
			),
		).toBe(0);
	});

	it("accepts a chord with Control, Option or Command and no Shift", () => {
		expect(isClassicyAppSwitcherShortcut("⌃`")).toBe(true);
		expect(isClassicyAppSwitcherShortcut("⌥⇥")).toBe(true);
		expect(isClassicyAppSwitcherShortcut("⌘J")).toBe(true);
		expect(isClassicyAppSwitcherShortcut("⌃⇧`")).toBe(false);
		expect(isClassicyAppSwitcherShortcut("`")).toBe(false);
		expect(isClassicyAppSwitcherShortcut("⌃")).toBe(false);
		// An unusable stored chord never matches a key.
		expect(
			classicyAppSwitcherChordDirection(
				"⌃⇧`",
				key({ key: "~", code: "Backquote", ctrlKey: true, shiftKey: true }),
			),
		).toBe(0);
	});

	it("says why a recorded chord cannot switch applications", () => {
		expect(classicyAppSwitcherShortcutProblem("⌃⇧J")).toMatch(/Shift/);
		expect(classicyAppSwitcherShortcutProblem("F5")).toMatch(
			/Control, Option or Command/,
		);
		expect(classicyAppSwitcherShortcutProblem("⌃J")).toBe(null);
	});

	describe("the two loose cases (review M6)", () => {
		const key = (
			init: Partial<
				Pick<
					KeyboardEvent,
					"key" | "code" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey"
				>
			>,
		) => ({
			key: "",
			code: "",
			ctrlKey: false,
			altKey: false,
			shiftKey: false,
			metaKey: false,
			...init,
		});

		it("a chord with Control and Command needs both held", () => {
			const chord = "⌃⌘J";
			expect(
				classicyAppSwitcherChordDirection(
					chord,
					key({ key: "j", code: "KeyJ", ctrlKey: true }),
				),
			).toBe(0);
			expect(
				classicyAppSwitcherChordDirection(
					chord,
					key({ key: "j", code: "KeyJ", metaKey: true }),
				),
			).toBe(0);
			expect(
				classicyAppSwitcherChordDirection(
					chord,
					key({ key: "j", code: "KeyJ", ctrlKey: true, metaKey: true }),
				),
			).toBe(1);
			expect(
				classicyAppSwitcherChordDirection(
					chord,
					key({
						key: "J",
						code: "KeyJ",
						ctrlKey: true,
						metaKey: true,
						shiftKey: true,
					}),
				),
			).toBe(-1);
		});

		it("a letter matches the key that types it, not the key in its place on a US keyboard (AZERTY's Z and W)", () => {
			// On AZERTY the key in the US W place types "z", and the one in the
			// US Z place types "w".
			expect(
				classicyAppSwitcherChordDirection(
					"⌃Z",
					key({ key: "z", code: "KeyW", ctrlKey: true }),
				),
			).toBe(1);
			expect(
				classicyAppSwitcherChordDirection(
					"⌃Z",
					key({ key: "w", code: "KeyZ", ctrlKey: true }),
				),
			).toBe(0);
			// Shift types the capital, still the letter.
			expect(
				classicyAppSwitcherChordDirection(
					"⌃Z",
					key({ key: "Z", code: "KeyW", ctrlKey: true, shiftKey: true }),
				),
			).toBe(-1);
		});

		it("an Option letter a Mac composes into another character still matches by its key", () => {
			expect(
				classicyAppSwitcherChordDirection(
					"⌥J",
					key({ key: "∆", code: "KeyJ", altKey: true }),
				),
			).toBe(1);
			expect(
				classicyAppSwitcherChordDirection(
					"⌥J",
					key({ key: "∆", code: "KeyK", altKey: true }),
				),
			).toBe(0);
		});

		it("the key beside Tab still switches on a layout that types another character there", () => {
			expect(
				classicyAppSwitcherChordDirection(
					"⌃`",
					key({ key: "²", code: "Backquote", ctrlKey: true }),
				),
			).toBe(1);
		});
	});
});
