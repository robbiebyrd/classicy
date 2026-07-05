import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { QuickTimeCaptionsOverlay } from "@/SystemFolder/SystemResources/QuickTime/QuickTimeCaptionsOverlay";

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
		// Browser normalizes rgba with alpha=1 to rgb format
		expect(cue.style.color).toBe("rgb(255, 255, 255)");
		expect(cue.style.backgroundColor).toBe("rgba(0, 0, 0, 0.8)");
	});
});
