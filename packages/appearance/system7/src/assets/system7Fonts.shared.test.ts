import { beforeEach, describe, expect, it, vi } from "vitest";
import { classicyFontStylesheet } from "../../../../../bin/classicyFontStylesheet";
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

	// Platinum first writes every face System 7 shares, which is all of
	// them: System 7 is left with no rule, so it leaves no empty element.
	it("leave no System 7 element when Platinum registers first", async () => {
		await load(["platinum", "system7"]);
		expect(document.getElementById("classicy-fonts-system7")).toBeNull();
		expect(Object.keys(fontRules())).toEqual(["classicy-fonts-platinum"]);
	}, 60_000);

	it("System 7 alone still writes its five faces", async () => {
		await load(["system7"]);
		expect(fontRules()["classicy-fonts-system7"].map(faceOf).sort()).toEqual(
			SYSTEM7_FONT_FACES.map(key).sort(),
		);
	}, 60_000);
});

// Strict CSP (story 0215-sa3, item 4): a host that links both packages'
// fonts stylesheets declares the five shared faces twice, each with its own
// package's URL. A browser keeps the last rule of identical descriptors and
// loads only that one file, so nothing downloads twice, provided the two
// rules differ in nothing but the URL. Were one to differ (a unicode-range,
// a weight), both would stay in the family and both might load.
describe("the two static fonts stylesheets, both linked", () => {
	const sheet = (
		faces: readonly {
			family: string;
			file: string;
			weight: string;
			style: string;
		}[],
		name: string,
	) =>
		classicyFontStylesheet(faces, (face) => `assets/${face.file}.woff2`, name)
			.trim()
			.split("\n");
	/** A rule with its url() blanked: what the browser matches faces by. */
	const withoutUrl = (rule: string) => rule.replace(/url\("[^"]*"\)/, "url()");

	it("declare each shared face with the same descriptors, apart from the URL", () => {
		const platinum = new Map(
			PLATINUM_FONT_FACES.map((face, i) => [
				key(face),
				sheet(PLATINUM_FONT_FACES, "platinum")[i],
			]),
		);
		const system7 = sheet(SYSTEM7_FONT_FACES, "system7");
		expect(system7).toHaveLength(SYSTEM7_FONT_FACES.length);
		SYSTEM7_FONT_FACES.forEach((face, i) => {
			const other = platinum.get(key(face));
			expect(other, key(face)).toBeDefined();
			expect(withoutUrl(system7[i])).toBe(withoutUrl(other as string));
		});
	});
});
