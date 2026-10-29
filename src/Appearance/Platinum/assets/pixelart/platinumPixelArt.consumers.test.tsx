import "@/Appearance/Platinum";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicySystemArtKey,
	resolveClassicyAsset,
} from "@/Appearance/ClassicyAssetRegistry";
import { ClassicyContextualMenuProvider } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import { ClassicyControlStrip } from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip";
import {
	CLASSICY_CONTROL_STRIP_MODULE_IDS,
	registerClassicyControlStripModule,
	unregisterClassicyControlStripModule,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
import {
	ClassicyPixelArt,
	decodeClassicyPixelArtRows,
} from "@/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt";
import { ClassicyPopUpSlider } from "@/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSlider";

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSound: () => ({ disabled: [], volume: 100 }),
		useSoundDispatch: () => vi.fn(),
	}),
);

const KEYS: ClassicySystemArtKey[] = [
	"controlStripTab",
	"controlStripCollapse",
	"controlStripScrollLeft",
	"controlStripScrollRight",
	"controlStripScrollLeftDisabled",
	"controlStripScrollRightDisabled",
	"controlStripModuleArrow",
	"popUpSliderTrack",
	"popUpSliderThumb",
];

/**
 * A glyph's expected drawing: Platinum's registered rows, rendered through
 * `rows` (not `art`), so the reference does not depend on the key wiring
 * under test. `viewBox` plus the rects identify the glyph.
 */
const expected = (key: ClassicySystemArtKey) => {
	const rows = decodeClassicyPixelArtRows(
		resolveClassicyAsset("systemArt", key, "platinum"),
	);
	const { container, unmount } = render(<ClassicyPixelArt rows={rows} />);
	const svg = container.querySelector("svg") as SVGSVGElement;
	const drawing = `${svg.getAttribute("viewBox")}|${svg.innerHTML}`;
	unmount();
	return drawing;
};

/** The one ClassicyPixelArt `<svg>` inside `el`, as `viewBox|rects`. */
const drawn = (el: Element | null) => {
	const svgs = el?.querySelectorAll('svg[shape-rendering="crispEdges"]') ?? [];
	expect(svgs).toHaveLength(1);
	const svg = svgs[0] as SVGSVGElement;
	return `${svg.getAttribute("viewBox")}|${svg.innerHTML}`;
};

const button = (name: string) => screen.getByRole("button", { name });

const renderStrip = () =>
	render(
		<ClassicyContextualMenuProvider>
			<ClassicyControlStrip
				disabledModules={Object.values(CLASSICY_CONTROL_STRIP_MODULE_IDS)}
			/>
		</ClassicyContextualMenuProvider>,
	);

describe("the Control Strip and pop-up slider draw Platinum's glyphs", () => {
	afterEach(() => {
		unregisterClassicyControlStripModule("pixel-art-probe");
		vi.restoreAllMocks();
	});

	it("every glyph is distinct, so a swapped key cannot match", () => {
		expect(new Set(KEYS.map(expected)).size).toBe(KEYS.length);
	});

	it("draws the collapse box, tab, module arrow and disabled scroll arrows", () => {
		registerClassicyControlStripModule({
			id: "pixel-art-probe",
			label: "Probe",
			icon: "probe.png",
			menuItems: [{ id: "probe-item", title: "Probe" }],
		});
		renderStrip();
		expect(drawn(button("Collapse Control Strip"))).toBe(
			expected("controlStripCollapse"),
		);
		expect(drawn(button("Collapse or resize Control Strip"))).toBe(
			expected("controlStripTab"),
		);
		expect(drawn(button("Probe"))).toBe(expected("controlStripModuleArrow"));
		// jsdom does no layout, so nothing overflows and neither arrow can scroll.
		expect(button("Scroll Control Strip left")).toBeDisabled();
		expect(drawn(button("Scroll Control Strip left"))).toBe(
			expected("controlStripScrollLeftDisabled"),
		);
		expect(button("Scroll Control Strip right")).toBeDisabled();
		expect(drawn(button("Scroll Control Strip right"))).toBe(
			expected("controlStripScrollRightDisabled"),
		);
	});

	it("draws the enabled scroll arrows when the modules overflow", () => {
		// A 100px window onto 300px of 30px modules.
		vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(300);
		vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
		vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(30);
		renderStrip();
		expect(button("Scroll Control Strip right")).toBeEnabled();
		expect(drawn(button("Scroll Control Strip right"))).toBe(
			expected("controlStripScrollRight"),
		);
		expect(drawn(button("Scroll Control Strip left"))).toBe(
			expected("controlStripScrollLeftDisabled"),
		);
		fireEvent.click(button("Scroll Control Strip right"));
		expect(button("Scroll Control Strip left")).toBeEnabled();
		expect(drawn(button("Scroll Control Strip left"))).toBe(
			expected("controlStripScrollLeft"),
		);
	});

	it("draws the pop-up slider's track and thumb", () => {
		const { container } = render(
			<ClassicyPopUpSlider ariaLabel="Volume" value={40} onChange={() => {}} />,
		);
		const track = container.querySelector(
			"svg.classicyPopUpSliderTrack",
		) as SVGSVGElement;
		expect(`${track.getAttribute("viewBox")}|${track.innerHTML}`).toBe(
			expected("popUpSliderTrack"),
		);
		expect(drawn(container.querySelector(".classicyPopUpSliderThumb"))).toBe(
			expected("popUpSliderThumb"),
		);
	});
});
