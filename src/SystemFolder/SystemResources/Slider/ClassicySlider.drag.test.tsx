import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
// Registers Platinum's sound pack, which the default theme names.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { ClassicySlider } from "@/SystemFolder/SystemResources/Slider/ClassicySlider";

// A pointer press on the slider is the slider's own (story 0198-0kv): the
// browser's default is prevented and the value follows the pointer's travel
// from where it pressed. Firefox moved the thumb to the pointer on every
// press, so a press on the thumb that never moved changed the value there.
//
// Each slider here is 115 px long at x 40 with a 15 px thumb box along it
// (17 across), so its thumb's center travels 100 px, a pixel a value from
// 0 to 100: value v's center lies at 47.5 + v across, or, vertical (115 px
// tall at y 10), at 117.5 − v down.

const place = (input: HTMLInputElement, vertical: boolean) => {
	input.style.setProperty("--slider-thumb-width", vertical ? "17px" : "15px");
	input.style.setProperty("--slider-thumb-height", vertical ? "15px" : "17px");
	vi.spyOn(input, "getBoundingClientRect").mockReturnValue(
		vertical
			? DOMRect.fromRect({ x: 40, y: 10, width: 19, height: 115 })
			: DOMRect.fromRect({ x: 40, y: 10, width: 115, height: 19 }),
	);
	input.setPointerCapture = vi.fn();
	return input;
};

const at = (vertical: boolean, along: number, pointerId = 1) =>
	vertical
		? {
				pointerId,
				button: 0,
				pointerType: "mouse",
				buttons: 1,
				clientX: 49,
				clientY: along,
			}
		: {
				pointerId,
				button: 0,
				pointerType: "mouse",
				buttons: 1,
				clientX: along,
				clientY: 19,
			};

const centerOf = (vertical: boolean, value: number) =>
	vertical ? 117.5 - value : 47.5 + value;

const slider = (props: Partial<Parameters<typeof ClassicySlider>[0]> = {}) => {
	const onChange = vi.fn();
	const onCommit = vi.fn();
	const vertical = props.orientation === "vertical";
	const { container } = render(
		<ClassicySlider
			id="s"
			value={40}
			onChangeFunc={(e) => onChange(Number(e.currentTarget.value))}
			onCommitFunc={onCommit}
			{...props}
		/>,
	);
	const input = place(
		container.querySelector(".classicySlider") as HTMLInputElement,
		vertical,
	);
	const ghost = container.querySelector(".classicySliderGhost") as HTMLElement;
	return { container, input, ghost, onChange, onCommit, vertical };
};

afterEach(() => {
	vi.restoreAllMocks();
	resetClassicyAppearancePackagesForTests();
});

describe.each([
	"horizontal",
	"vertical",
] as const)("ClassicySlider pointer drag, %s", (orientation) => {
	const vertical = orientation === "vertical";

	it("never changes the value for a press on the thumb that does not move", () => {
		for (const offset of [-7, -3, 0, 2, 7]) {
			const { input, onChange, onCommit } = slider({ orientation });
			const point = at(vertical, centerOf(vertical, 40) + offset);
			// The pointerdown is left alone, so the press's compatibility
			// mouse events still reach the page; its mousedown's default, the
			// browser's own range drag (Firefox's jump to the pointer), is
			// prevented. The input keeps the pointer for the release.
			expect(fireEvent.pointerDown(input, point)).toBe(true);
			expect(fireEvent.mouseDown(input, point)).toBe(false);
			expect(input.setPointerCapture).toHaveBeenCalledWith(1);
			fireEvent.pointerUp(input, at(vertical, centerOf(vertical, 40) + offset));
			expect(input.value, `${offset}`).toBe("40");
			expect(onChange).not.toHaveBeenCalled();
			expect(onCommit.mock.calls).toEqual([[40, { lost: false }]]);
		}
	});

	it("moves the value by the pointer's travel from where it pressed the thumb", () => {
		const { input, onChange, onCommit } = slider({ orientation });
		const from = centerOf(vertical, 40) + 3;
		const toward = vertical ? -1 : 1;
		fireEvent.pointerDown(input, at(vertical, from));
		fireEvent.pointerMove(input, at(vertical, from + toward * 10));
		expect(input.value).toBe("50");
		fireEvent.pointerMove(input, at(vertical, from + toward * 12.4));
		expect(input.value).toBe("52");
		fireEvent.pointerUp(input, at(vertical, from + toward * 12.4));
		expect(onChange.mock.calls).toEqual([[50], [52]]);
		expect(onCommit.mock.calls).toEqual([[52, { lost: false }]]);
	});

	it("puts the thumb under a press on the track, then drags it from there", () => {
		const { input, onChange } = slider({ orientation });
		fireEvent.pointerDown(input, at(vertical, centerOf(vertical, 80)));
		expect(input.value).toBe("80");
		fireEvent.pointerMove(input, at(vertical, centerOf(vertical, 85)));
		expect(input.value).toBe("85");
		expect(onChange.mock.calls).toEqual([[80], [85]]);
	});

	it("snaps to the step and stays in the range", () => {
		const { input } = slider({ orientation, step: 10 });
		fireEvent.pointerDown(input, at(vertical, centerOf(vertical, 40)));
		fireEvent.pointerMove(input, at(vertical, centerOf(vertical, 44)));
		expect(input.value).toBe("40");
		fireEvent.pointerMove(input, at(vertical, centerOf(vertical, 46)));
		expect(input.value).toBe("50");
		fireEvent.pointerMove(input, at(vertical, centerOf(vertical, 400)));
		expect(input.value).toBe("100");
	});
});

describe("ClassicySlider pointer drag, left to the browser", () => {
	it("leaves a touch, and any button but the first, to the browser", () => {
		const { input } = slider();
		const touch = { ...at(false, 120), pointerType: "touch" };
		fireEvent.pointerDown(input, touch);
		expect(fireEvent.mouseDown(input, touch)).toBe(true);
		fireEvent.pointerUp(input, touch);
		const right = { ...at(false, 120), button: 2 };
		fireEvent.pointerDown(input, right);
		expect(fireEvent.mouseDown(input, right)).toBe(true);
		expect(input.value).toBe("40");
	});

	it("ignores another pointer's moves", () => {
		const { input } = slider();
		fireEvent.pointerDown(input, at(false, centerOf(false, 40)));
		fireEvent.pointerMove(input, at(false, centerOf(false, 60), 2));
		expect(input.value).toBe("40");
	});

	it("does nothing while disabled", () => {
		const { input } = slider({ disabled: true });
		fireEvent.pointerDown(input, at(false, centerOf(false, 80)));
		expect(input.value).toBe("40");
	});
});

// The slider's drag never hides a press from the rest of the page: a
// document `mousedown` listener (the pop-up, combo box and contextual menu
// closers) sees it, and a drag that loses its pointer ends (fix round 1).
describe("ClassicySlider pointer drag and the page", () => {
	it("lets a document mousedown and mouseup listener see the press", () => {
		const seen: string[] = [];
		const listen = (e: Event) => seen.push(e.type);
		document.addEventListener("mousedown", listen);
		document.addEventListener("mouseup", listen);
		const { input } = slider();
		const point = at(false, centerOf(false, 40));
		fireEvent.pointerDown(input, point);
		fireEvent.mouseDown(input, point);
		fireEvent.pointerUp(input, { ...point, buttons: 0 });
		fireEvent.mouseUp(input, { ...point, buttons: 0 });
		document.removeEventListener("mousedown", listen);
		document.removeEventListener("mouseup", listen);
		expect(seen).toEqual(["mousedown", "mouseup"]);
	});

	it("leaves a touch's mousedown to the browser", () => {
		const { input } = slider();
		const touch = { ...at(false, 120), pointerType: "touch" };
		fireEvent.pointerDown(input, touch);
		expect(fireEvent.mouseDown(input, touch)).toBe(true);
	});

	it("ends a drag whose pointer capture is lost, where it is", () => {
		const { input, onCommit } = slider();
		fireEvent.pointerDown(input, at(false, centerOf(false, 40)));
		fireEvent.pointerMove(input, at(false, centerOf(false, 50)));
		fireEvent.lostPointerCapture(input, { pointerId: 1 });
		expect(onCommit.mock.calls).toEqual([[50, { lost: true }]]);
		fireEvent.pointerMove(input, at(false, centerOf(false, 67)));
		expect(input.value).toBe("50");
	});

	it("ignores another pointer's lost capture", () => {
		const { input } = slider();
		fireEvent.pointerDown(input, at(false, centerOf(false, 40)));
		fireEvent.lostPointerCapture(input, { pointerId: 2 });
		fireEvent.pointerMove(input, at(false, centerOf(false, 55)));
		expect(input.value).toBe("55");
	});

	it("ends a drag when a move comes with the button up", () => {
		const { input, onCommit } = slider();
		fireEvent.pointerDown(input, at(false, centerOf(false, 40)));
		fireEvent.pointerMove(input, {
			...at(false, centerOf(false, 67)),
			buttons: 0,
		});
		expect(input.value).toBe("40");
		expect(onCommit.mock.calls).toEqual([[40, { lost: true }]]);
		fireEvent.pointerMove(input, at(false, centerOf(false, 70)));
		expect(input.value).toBe("40");
	});

	it("ends a drag released off the input, so a later hover moves nothing", () => {
		const { input, onChange } = slider();
		fireEvent.pointerDown(input, at(false, centerOf(false, 40)));
		fireEvent.pointerUp(document.body, {
			...at(false, centerOf(false, 40)),
			buttons: 0,
		});
		fireEvent.pointerMove(input, at(false, centerOf(false, 67)));
		expect(input.value).toBe("40");
		expect(onChange).not.toHaveBeenCalled();
	});

	it("focuses the input without scrolling it into view", () => {
		const { input } = slider();
		const focus = vi.spyOn(input, "focus");
		fireEvent.pointerDown(input, at(false, centerOf(false, 40)));
		expect(focus).toHaveBeenCalledWith({ preventScroll: true });
	});
});

// A package that declares `layout.slider.thumbDrag: "onRelease"` (Platinum,
// HIGOS8 p.34, Figure 2-17): a slider drawn with a ghost keeps its indicator
// where it was while the ghost follows the pointer, and takes the value when
// the button comes up.
const ON_RELEASE_PACKAGE = "test-slider-on-release";
const registerOnRelease = () =>
	registerClassicyAppearancePackage({
		id: ON_RELEASE_PACKAGE,
		name: "Slider On Release",
		css: "",
		defaults: {
			...getTheme("default"),
			id: "test-slider-on-release-default",
			package: ON_RELEASE_PACKAGE,
		},
		layout: {
			...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
			slider: { thumbDrag: "onRelease" },
		},
	});

describe.each([
	"horizontal",
	"vertical",
] as const)("ClassicySlider ghost drag on release, %s", (orientation) => {
	const vertical = orientation === "vertical";
	beforeEach(() => {
		resetClassicyAppearancePackagesForTests();
		registerOnRelease();
	});

	it("holds the indicator while the ghost follows the pointer, then sets the value on release", () => {
		const { input, ghost, onChange, onCommit } = slider({
			orientation,
			ghost: true,
		});
		const from = centerOf(vertical, 40) + 2;
		const toward = vertical ? -1 : 1;
		fireEvent.pointerDown(input, at(vertical, from));
		expect(ghost).not.toHaveClass("classicySliderGhostHidden");
		expect(ghost.style.getPropertyValue("--classicy-ghost-pos")).toBe("0.4");
		fireEvent.pointerMove(input, at(vertical, from + toward * 25));
		expect(input.value).toBe("40");
		expect(ghost.style.getPropertyValue("--classicy-ghost-pos")).toBe("0.65");
		expect(onChange).not.toHaveBeenCalled();
		fireEvent.pointerUp(input, at(vertical, from + toward * 25));
		expect(input.value).toBe("65");
		expect(onChange.mock.calls).toEqual([[65]]);
		expect(onCommit.mock.calls).toEqual([[65, { lost: false }]]);
		expect(ghost).toHaveClass("classicySliderGhostHidden");
	});

	it("shows the ghost under a press on the track, and sets nothing until the release", () => {
		const { input, ghost, onChange } = slider({ orientation, ghost: true });
		fireEvent.pointerDown(input, at(vertical, centerOf(vertical, 90)));
		expect(input.value).toBe("40");
		expect(ghost.style.getPropertyValue("--classicy-ghost-pos")).toBe("0.9");
		expect(onChange).not.toHaveBeenCalled();
		fireEvent.pointerUp(input, at(vertical, centerOf(vertical, 90)));
		expect(onChange.mock.calls).toEqual([[90]]);
	});

	it("drops the ghost's value when the pointer stream is lost", () => {
		const { input, ghost, onChange, onCommit } = slider({
			orientation,
			ghost: true,
		});
		fireEvent.pointerDown(input, at(vertical, centerOf(vertical, 40)));
		fireEvent.pointerMove(input, at(vertical, centerOf(vertical, 70)));
		fireEvent.pointerCancel(input);
		expect(input.value).toBe("40");
		expect(onChange).not.toHaveBeenCalled();
		expect(onCommit.mock.calls).toEqual([[40, { lost: true }]]);
		expect(ghost).toHaveClass("classicySliderGhostHidden");
		// Its own release, if it still arrives, sets nothing.
		fireEvent.pointerUp(input, at(vertical, centerOf(vertical, 70)));
		expect(input.value).toBe("40");
		expect(onChange).not.toHaveBeenCalled();
	});

	it("drags a slider with no ghost live, as every slider may (HIGOS8 p.35, live feedback)", () => {
		const { input, onChange } = slider({ orientation });
		fireEvent.pointerDown(input, at(vertical, centerOf(vertical, 40)));
		fireEvent.pointerMove(input, at(vertical, centerOf(vertical, 60)));
		expect(input.value).toBe("60");
		expect(onChange.mock.calls).toEqual([[60]]);
	});

	it("leaves the keyboard live", () => {
		const { input, onChange } = slider({ orientation, ghost: true });
		fireEvent.change(input, { target: { value: "41" } });
		expect(onChange.mock.calls).toEqual([[41]]);
	});
});

describe("ClassicySlider ghost drag, live (the default)", () => {
	it("moves the indicator and its ghost together", () => {
		const { input, ghost, onChange } = slider({ ghost: true });
		fireEvent.pointerDown(input, at(false, centerOf(false, 40)));
		fireEvent.pointerMove(input, at(false, centerOf(false, 70)));
		expect(input.value).toBe("70");
		expect(onChange.mock.calls).toEqual([[70]]);
		expect(ghost.style.getPropertyValue("--classicy-ghost-pos")).toBe("0.7");
	});
});
