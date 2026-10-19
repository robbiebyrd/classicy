import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClassicyPixelArt } from "@/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt";

describe("ClassicyPixelArt", () => {
	it("draws each run of one token as a single themed rect, skipping transparency", () => {
		const { container } = render(
			<ClassicyPixelArt rows={["KK.W", ".33."]} className="art" />,
		);
		const svg = container.querySelector("svg") as SVGSVGElement;
		expect(svg).toHaveClass("art");
		expect(svg.getAttribute("width")).toBe("4");
		expect(svg.getAttribute("height")).toBe("2");
		expect(svg.getAttribute("aria-hidden")).toBe("true");
		const rects = [...svg.querySelectorAll("rect")].map((r) => [
			r.getAttribute("x"),
			r.getAttribute("y"),
			r.getAttribute("width"),
			r.getAttribute("class"),
		]);
		expect(rects).toEqual([
			["0", "0", "2", "classicyPixelK"],
			["3", "0", "1", "classicyPixelW"],
			["1", "1", "2", "classicyPixel3"],
		]);
	});
});
