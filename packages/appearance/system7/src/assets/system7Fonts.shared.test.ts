import { beforeEach, describe, expect, it, vi } from "vitest";
import { PLATINUM_FONT_FACES } from "../../../platinum/src/assets/platinumFonts.internal";
import { SYSTEM7_FONT_FACES } from "./system7Fonts.internal";

// System 7's five faces are byte-identical copies of Platinum's
// (system7Fonts.test.ts), so a host loading both packages writes each shared
// face once, in the element of whichever package registered first, and every
// face either ships exactly once in the document (story 0210-aal).

/** Every `@font-face` rule in the document's font elements, by element. */
const fontRules = (): Record<string, string[]> =>
	Object.fromEntries(
		[...document.querySelectorAll('style[id^="classicy-fonts-"]')].map(
			(style) => [
				style.id,
				style.textContent?.match(/@font-face\{[^}]*\}/g) ?? [],
			],
		),
	);

/** `family|weight|style` of a rule. */
const faceOf = (rule: string): string => {
	const [, family, weight, style] =
		/font-family:"([^"]+)";.*font-weight:([^;]+);font-style:([^;]+);/.exec(
			rule,
		) ?? [];
	return `${family}|${weight}|${style}`;
};

const key = ({
	family,
	weight,
	style,
}: {
	family: string;
	weight: string;
	style: string;
}) => `${family}|${weight}|${style}`;

/** Loads both packages' asset modules, fresh, in `order`. */
const load = async (order: ("platinum" | "system7")[]) => {
	vi.resetModules();
	document.head.innerHTML = "";
	for (const id of order)
		if (id === "platinum")
			await import("../../../platinum/src/assets/platinumAssets");
		else await import("./system7Assets");
};

beforeEach(() => {
	document.head.innerHTML = "";
});

describe("Platinum and System 7 loaded together", () => {
	it.each([
		[["platinum", "system7"] as const, "classicy-fonts-platinum"],
		[["system7", "platinum"] as const, "classicy-fonts-system7"],
	])(
		"write each face once (%j): the shared ones in %s",
		async (order, sharedIn) => {
			await load([...order]);
			const rules = fontRules();
			const all = Object.values(rules).flat().map(faceOf);
			// Every Platinum face, System 7's among them, exactly once.
			expect([...all].sort()).toEqual(PLATINUM_FONT_FACES.map(key).sort());
			const shared = new Set(SYSTEM7_FONT_FACES.map(key));
			expect(
				rules[sharedIn]
					.map(faceOf)
					.filter((face) => shared.has(face))
					.sort(),
			).toEqual([...shared].sort());
		},
		60_000,
	);

	it("System 7 alone still writes its five faces", async () => {
		await load(["system7"]);
		expect(fontRules()["classicy-fonts-system7"].map(faceOf).sort()).toEqual(
			SYSTEM7_FONT_FACES.map(key).sort(),
		);
	}, 60_000);
});
