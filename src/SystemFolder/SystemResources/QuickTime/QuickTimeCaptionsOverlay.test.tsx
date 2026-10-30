import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
	QuickTimeCaptionsOverlay,
	stripCaptionTags,
} from "@/SystemFolder/SystemResources/QuickTime/QuickTimeCaptionsOverlay";

afterEach(cleanup);

describe("QuickTimeCaptionsOverlay", () => {
	it("renders nothing when text is null", () => {
		const { container } = render(<QuickTimeCaptionsOverlay text={null} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders the cue with default themed classes and strips HTML tags", () => {
		const { container, getByText } = render(
			<QuickTimeCaptionsOverlay text={"Hello <i>world</i>"} />,
		);
		expect(getByText("Hello world")).toBeInTheDocument();
		const cue = container.querySelector(".quickTimePlayerCaptions");
		expect(cue).not.toBeNull();
		expect(
			container.querySelector(".quickTimePlayerCaptionsCustomStyle"),
		).toBeNull();
	});

	it("applies caller styles when captionStyle is provided", () => {
		const { container } = render(
			<QuickTimeCaptionsOverlay
				text="Styled cue"
				captionStyle={{
					font: "--ui-font",
					color: 16777215,
					colorOpacity: 1,
					bgColor: 0,
					bgOpacity: 0.8,
					size: 150,
				}}
			/>,
		);
		const cue = container.querySelector(
			".quickTimePlayerCaptions",
		) as HTMLElement;
		expect(cue.classList.contains("quickTimePlayerCaptionsCustomStyle")).toBe(
			true,
		);
		expect(cue.style.fontSize).toBe("150%");
		// The colors are composed by QuickTimeCaptionsOverlay.scss from the
		// custom properties, not inline.
		expect(cue.style.getPropertyValue("--classicy-caption-fg")).toBe(
			"255, 255, 255",
		);
		expect(cue.style.getPropertyValue("--classicy-caption-fg-alpha")).toBe("1");
		expect(cue.style.getPropertyValue("--classicy-caption-bg")).toBe("0, 0, 0");
		expect(cue.style.getPropertyValue("--classicy-caption-bg-alpha")).toBe(
			"0.8",
		);
	});

	it("publishes caption colors as custom properties", () => {
		const { container } = render(
			<QuickTimeCaptionsOverlay
				text="Styled cue"
				captionStyle={{
					color: 0xff0000,
					colorOpacity: 0.5,
					bgColor: 0,
					bgOpacity: 0.25,
					size: 100,
					font: "ui",
				}}
			/>,
		);
		const cue = container.querySelector(
			".quickTimePlayerCaptions",
		) as HTMLElement;
		expect(cue.style.getPropertyValue("--classicy-caption-fg")).toBe(
			"255, 0, 0",
		);
		expect(cue.style.getPropertyValue("--classicy-caption-fg-alpha")).toBe(
			"0.5",
		);
		expect(cue.style.getPropertyValue("--classicy-caption-bg")).toBe("0, 0, 0");
		expect(cue.style.getPropertyValue("--classicy-caption-bg-alpha")).toBe(
			"0.25",
		);
		expect(cue.style.color).toBe("");
		expect(cue.style.backgroundColor).toBe("");
	});
});

describe("stripCaptionTags", () => {
	// The linear scanner replaced `text.replace(/<[^>]*>/g, "")` (flagged as
	// polynomial ReDoS); it must keep that regex's exact semantics.
	const cases: [string, string][] = [
		["Hello <i>world</i>", "Hello world"],
		["<c.yellow>styled</c> cue", "styled cue"],
		["no tags at all", "no tags at all"],
		// An unclosed `<` is not a tag; it stays literal.
		["a < b", "a < b"],
		["trailing <i", "trailing <i"],
		// `[^>]*` lets `<` through, so `<<a>` is one tag, start to first `>`.
		["<<a>", ""],
		["x<<a>y", "xy"],
		// A bare `>` with no opener stays literal.
		["a > b", "a > b"],
		["", ""],
		["<>", ""],
	];
	// Each expected value is what that regex returned; the regex itself is not
	// re-run here, since a tag-stripping regex in source reads as an HTML
	// sanitizer (CodeQL js/incomplete-multi-character-sanitization).
	it.each(cases)("matches the old regex on %j", (input, expected) => {
		expect(stripCaptionTags(input)).toBe(expected);
	});

	it("handles a hostile cue full of unclosed brackets without stalling", () => {
		const hostile = "<".repeat(100_000);
		expect(stripCaptionTags(hostile)).toBe(hostile);
	});
});
