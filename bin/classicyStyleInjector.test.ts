import { afterEach, describe, expect, it } from "vitest";
import {
	CLASSICY_STYLE_ELEMENT_ID,
	classicyStyleInjector,
} from "./classicyStyleInjector";

// Runs the injector exactly as a bundle would: as plain script code.
const run = (css: string) => new Function(classicyStyleInjector(css))();

afterEach(() => {
	document.getElementById(CLASSICY_STYLE_ELEMENT_ID)?.remove();
	for (const el of document.head.querySelectorAll("link")) el.remove();
});

describe("classicyStyleInjector (#303)", () => {
	it("inserts the stylesheet once, as the first element in <head>", () => {
		const host = document.createElement("link");
		host.rel = "stylesheet";
		document.head.append(host);

		run(".a{color:red}");
		run(".a{color:blue}");

		const styles = document.querySelectorAll(`#${CLASSICY_STYLE_ELEMENT_ID}`);
		expect(styles).toHaveLength(1);
		expect(styles[0].textContent).toBe(".a{color:red}");
		// First in <head>, so a host stylesheet wins ties.
		expect(document.head.firstChild).toBe(styles[0]);
	});

	it("keeps CSS that would break out of a string or a style element", () => {
		const css = '.a::after{content:"</style>\\"\'"}';
		run(css);
		expect(
			document.getElementById(CLASSICY_STYLE_ELEMENT_ID)?.textContent,
		).toBe(css);
	});

	it("does nothing without a document", () => {
		const code = classicyStyleInjector(".a{}");
		expect(() => new Function("document", code)(undefined)).not.toThrow();
	});
});
