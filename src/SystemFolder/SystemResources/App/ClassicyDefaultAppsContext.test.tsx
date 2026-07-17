import { render } from "@testing-library/react";
import { useContext } from "react";
import { describe, expect, it } from "vitest";
import { ClassicyDefaultAppsContext } from "@/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext";

describe("ClassicyDefaultAppsContext", () => {
	it("defaults all apps to enabled when no Provider is present", () => {
		let captured: unknown;
		function Capture(): null {
			captured = useContext(ClassicyDefaultAppsContext);
			return null;
		}
		render(<Capture />);
		expect(captured).toEqual({
			disableSimpleText: false,
			disablePDFViewer: false,
			disableMoviePlayer: false,
			disablePictureViewer: false,
			disableHyperCard: false,
		});
	});
});
