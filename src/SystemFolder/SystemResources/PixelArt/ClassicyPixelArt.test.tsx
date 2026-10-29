import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { registerClassicySystemArt } from "@/Appearance/ClassicyAssetRegistry";
import { isClassicyAssetSource } from "@/Appearance/ClassicyAssetSource";
import {
	CLASSICY_PIXEL_ART_MIME,
	ClassicyPixelArt,
	decodeClassicyPixelArtRows,
	encodeClassicyPixelArtRows,
} from "@/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt";

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

	it("encode/decode round-trips rows", () => {
		const rows = ["KKKK", "K33K", "K..K"];
		expect(
			decodeClassicyPixelArtRows(encodeClassicyPixelArtRows(rows)),
		).toEqual(rows);
	});

	it("decode rejects foreign sources and drops a trailing empty row", () => {
		expect(decodeClassicyPixelArtRows("data:image/png;base64,AAAA")).toEqual(
			[],
		);
		expect(decodeClassicyPixelArtRows(undefined)).toEqual([]);
		expect(
			decodeClassicyPixelArtRows("data:text/x-classicy-pixel-art,KK%0AKK%0A"),
		).toEqual(["KK", "KK"]);
	});

	it("decode returns no rows for a malformed payload instead of throwing", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(
			decodeClassicyPixelArtRows("data:text/x-classicy-pixel-art,K%ZZ"),
		).toEqual([]);
		expect(warn).toHaveBeenCalledWith(
			"[ClassicyPixelArt] Ignored pixel art with a malformed URI-encoded payload",
		);
		warn.mockRestore();
	});

	it("renders registered art by key", () => {
		registerClassicySystemArt("platinum", {
			controlStripModuleArrow: encodeClassicyPixelArtRows(["K.", "KK"]),
		});
		const { container } = render(
			<ClassicyPixelArt art="controlStripModuleArrow" />,
		);
		expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe(
			"0 0 2 2",
		);
		expect(container.querySelectorAll("rect")).toHaveLength(2);
	});

	it("takes exactly one of rows or art (rows win if a caller casts past the type)", () => {
		registerClassicySystemArt("platinum", {
			controlStripTab: encodeClassicyPixelArtRows(["KKK"]),
		});
		const { container } = render(
			// @ts-expect-error: `rows` and `art` are mutually exclusive
			<ClassicyPixelArt rows={["K"]} art="controlStripTab" />,
		);
		expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe(
			"0 0 1 1",
		);
	});

	it("encodes rows as a data: source the asset registry accepts", () => {
		// Every palette token, plus the characters encodeURIComponent leaves
		// alone (`'`, `(`, `)`), which must not trip the quoted-url() check.
		const rows = ["KW1234567", "bcdmn.", "'()"];
		const src = encodeClassicyPixelArtRows(rows);
		expect(src.startsWith(`data:${CLASSICY_PIXEL_ART_MIME},`)).toBe(true);
		expect(src).not.toMatch(/["\\\r\n]/);
		expect(isClassicyAssetSource(src)).toBe(true);
		expect(decodeClassicyPixelArtRows(src)).toEqual(rows);
	});
});
