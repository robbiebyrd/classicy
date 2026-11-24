import { describe, expect, it } from "vitest";
import { isActivationKeyAimedAtOtherWindowControl } from "@/SystemFolder/SystemResources/Window/ClassicyActivationKeyAimedAtOtherWindow";

describe("isActivationKeyAimedAtOtherWindowControl", () => {
	const dom = (html: string) => {
		const host = document.createElement("div");
		host.innerHTML = html;
		document.body.appendChild(host);
		return host;
	};

	it("is true only for Enter or Space on an interactive control of another window", () => {
		const host = dom(
			'<div class="classicyWindow" id="A_1"><button id="a"></button></div>' +
				'<div class="classicyWindow" id="B_1" tabindex="0"><button id="b"></button>' +
				'<a href="#x" id="link">l</a><div role="button" id="rb"></div>' +
				'<div id="plain"></div></div><button id="free"></button>',
		);
		const at = (id: string, key: string) => ({
			target: host.querySelector(`#${id}`),
			key,
		});
		for (const id of ["b", "link", "rb"]) {
			expect(
				isActivationKeyAimedAtOtherWindowControl(at(id, "Enter"), "A_1"),
			).toBe(true);
			expect(isActivationKeyAimedAtOtherWindowControl(at(id, " "), "A_1")).toBe(
				true,
			);
		}
		// Plain typing, and arrows, stay with the front app.
		expect(isActivationKeyAimedAtOtherWindowControl(at("b", "4"), "A_1")).toBe(
			false,
		);
		expect(
			isActivationKeyAimedAtOtherWindowControl(at("b", "ArrowRight"), "A_1"),
		).toBe(false);
		// A non-control inside the other window (the Assistant's tabIndex div).
		expect(
			isActivationKeyAimedAtOtherWindowControl(at("plain", "Enter"), "A_1"),
		).toBe(false);
		// The own window, the page, and a non-element target.
		expect(
			isActivationKeyAimedAtOtherWindowControl(at("a", "Enter"), "A_1"),
		).toBe(false);
		expect(
			isActivationKeyAimedAtOtherWindowControl(at("free", "Enter"), "A_1"),
		).toBe(false);
		expect(
			isActivationKeyAimedAtOtherWindowControl(
				{ target: document, key: "Enter" },
				"A_1",
			),
		).toBe(false);
		host.remove();
	});
});
