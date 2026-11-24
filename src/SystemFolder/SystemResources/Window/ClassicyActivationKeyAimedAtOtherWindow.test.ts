import { describe, expect, it } from "vitest";
import { isKeyAimedAtOtherWindow } from "@/SystemFolder/SystemResources/Window/ClassicyKeyAimedAtOtherWindow";

describe("isKeyAimedAtOtherWindow", () => {
	const dom = (html: string) => {
		const host = document.createElement("div");
		host.innerHTML = html;
		document.body.appendChild(host);
		return host;
	};

	it("is true for a control inside another window, false for the own window and for the page", () => {
		const host = dom(
			'<div class="classicyWindow" id="A_1"><button id="a"></button></div>' +
				'<div class="classicyWindow" id="B_1"><button id="b"></button></div>' +
				'<button id="free"></button>',
		);
		const at = (id: string) => ({ target: host.querySelector(`#${id}`) });
		expect(isKeyAimedAtOtherWindow(at("b"), "A_1")).toBe(true);
		expect(isKeyAimedAtOtherWindow(at("a"), "A_1")).toBe(false);
		expect(isKeyAimedAtOtherWindow(at("free"), "A_1")).toBe(false);
		expect(isKeyAimedAtOtherWindow({ target: document }, "A_1")).toBe(false);
		host.remove();
	});
});
