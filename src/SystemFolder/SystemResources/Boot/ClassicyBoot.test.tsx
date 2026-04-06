import { describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicyBoot } from "@/SystemFolder/SystemResources/Boot/ClassicyBoot";

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);

const mockDispatch = vi.hoisted(() => vi.fn());
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => mockDispatch,
	}),
);

vi.mock("@/SystemFolder/SystemResources/Boot/ClassicyBoot.scss", () => ({}));

describe("ClassicyBoot", () => {
	it("renders a div with classicyBoot class", () => {
		const { container } = render(<ClassicyBoot />);
		const div = container.firstChild as HTMLElement;
		expect(div).toBeInTheDocument();
		expect(div.tagName).toBe("DIV");
		expect(div).toHaveClass("classicyBoot");
	});

	it("dispatches ClassicySoundPlay with ClassicyBoot sound on mount", () => {
		mockDispatch.mockClear();
		render(<ClassicyBoot />);
		expect(mockDispatch).toHaveBeenCalledWith({
			type: "ClassicySoundPlay",
			sound: "ClassicyBoot",
		});
	});
});
