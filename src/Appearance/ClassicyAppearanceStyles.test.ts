import { afterEach, describe, expect, it, vi } from "vitest";
import {
	CLASSICY_APPEARANCE_STYLE_ELEMENT_PREFIX,
	injectClassicyAppearanceStyles,
} from "@/Appearance/ClassicyAppearanceStyles";
import { CLASSICY_STYLE_ELEMENT_ID } from "../../bin/classicyStyleInjector";

const clearHead = () => {
	for (const el of Array.from(document.head.children)) el.remove();
};

afterEach(() => {
	vi.unstubAllGlobals();
	clearHead();
});

describe("injectClassicyAppearanceStyles", () => {
	it("uses the classicy-appearance- prefix", () =>
		expect(CLASSICY_APPEARANCE_STYLE_ELEMENT_PREFIX).toBe(
			"classicy-appearance-",
		));

	it("inserts the style element directly after #classicy-styles", () => {
		document.head.append(document.createElement("meta"));
		const base = document.createElement("style");
		base.id = CLASSICY_STYLE_ELEMENT_ID;
		document.head.prepend(base);
		injectClassicyAppearanceStyles("p", ".a{}");
		expect(document.head.children[0].id).toBe("classicy-styles");
		expect(document.head.children[1].id).toBe("classicy-appearance-p");
		expect(document.head.children[1].textContent).toBe(".a{}");
	});

	it("appends to head when #classicy-styles is absent", () => {
		document.head.append(document.createElement("meta"));
		injectClassicyAppearanceStyles("p", ".a{}");
		const last = document.head.lastElementChild;
		expect(last?.tagName).toBe("STYLE");
		expect(last?.id).toBe("classicy-appearance-p");
	});

	it("is idempotent and updates the text on a second call", () => {
		injectClassicyAppearanceStyles("p", ".a{}");
		const first = document.getElementById("classicy-appearance-p");
		injectClassicyAppearanceStyles("p", ".b{}");
		expect(document.querySelectorAll("#classicy-appearance-p").length).toBe(1);
		expect(document.getElementById("classicy-appearance-p")).toBe(first);
		expect(first?.textContent).toBe(".b{}");
	});

	it("keeps one element per package id", () => {
		injectClassicyAppearanceStyles("p", ".a{}");
		injectClassicyAppearanceStyles("q", ".b{}");
		expect(
			document.querySelectorAll(
				`style[id^="${CLASSICY_APPEARANCE_STYLE_ELEMENT_PREFIX}"]`,
			).length,
		).toBe(2);
	});

	it("is a no-op without document", () => {
		vi.stubGlobal("document", undefined);
		expect(() => injectClassicyAppearanceStyles("p", ".a{}")).not.toThrow();
	});
});
