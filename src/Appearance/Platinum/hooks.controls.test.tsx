import "@/Appearance/Platinum";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { produce } from "immer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@/__tests__/test-utils";
import { getActiveClassicyAppearancePackageId } from "@/Appearance/ClassicyAssetRegistry";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyPlacard } from "@/SystemFolder/SystemResources/Placard/ClassicyPlacard";
import { ClassicyRadioInput } from "@/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";

// The sprites now come from Platinum's hooks; they must still reach the
// component's own sound dispatch.
const { soundSpy } = vi.hoisted(() => ({ soundSpy: vi.fn() }));

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	async (importOriginal) => ({
		...(await importOriginal<object>()),
		useSoundDispatch: () => soundSpy,
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn(), page: vi.fn() }),
	}),
);

const play = (sound: string) => ({ type: "ClassicySoundPlay", sound });

/** The sprites played since the last reset, in order. */
const played = () =>
	soundSpy.mock.calls.map(([action]) => (action as { sound?: string }).sound);

beforeEach(() => {
	act(() => {
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Appearance.packageId = "platinum";
			}),
		);
	});
	expect(getActiveClassicyAppearancePackageId()).toBe("platinum");
	soundSpy.mockReset();
});

describe("Platinum control sounds through the appearance hooks", () => {
	it("a push button still clicks down and up", () => {
		render(<ClassicyButton>OK</ClassicyButton>);
		const button = screen.getByRole("button", { name: "OK" });
		fireEvent.mouseDown(button);
		expect(soundSpy).toHaveBeenLastCalledWith(play("ClassicyButtonClickDown"));
		fireEvent.mouseUp(button);
		expect(soundSpy).toHaveBeenLastCalledWith(play("ClassicyButtonClickUp"));
		soundSpy.mockReset();
		fireEvent.keyDown(button, { key: "Enter" });
		expect(soundSpy).toHaveBeenLastCalledWith(play("ClassicyButtonClickDown"));
		fireEvent.keyUp(button, { key: "Enter" });
		expect(played()).toEqual([
			"ClassicyButtonClickDown",
			"ClassicyButtonClickUp",
		]);
	});

	it("a bevel button opening its menu still plays MenuOpen", () => {
		render(
			<ClassicyBevelButton
				menuItems={[{ id: "a", title: "Alpha" }]}
				popupTrigger="click"
			>
				Pick
			</ClassicyBevelButton>,
		);
		const button = screen.getByRole("button", { name: "Pick" });
		fireEvent.mouseDown(button, { button: 0 });
		fireEvent.mouseUp(button, { button: 0 });
		fireEvent.click(button, { detail: 1 });
		// The click trigger opens on the press.
		expect(played()).toEqual([
			"ClassicyButtonClickDown",
			"ClassicyMenuOpen",
			"ClassicyButtonClickUp",
		]);
		expect(soundSpy).toHaveBeenCalledWith(play("ClassicyMenuOpen"));
		// Down Arrow opens it from the keyboard, with MenuOpen and no click
		// (the menu then plays its own hover sound as it focuses the first
		// item).
		fireEvent.mouseDown(document.body);
		soundSpy.mockReset();
		fireEvent.keyDown(button, { key: "ArrowDown" });
		expect(played()[0]).toBe("ClassicyMenuOpen");
		expect(played()).not.toContain("ClassicyButtonClickDown");
		expect(played()).not.toContain("ClassicyButtonClickUp");
	});

	it("a radio item still clicks", () => {
		render(
			<ClassicyRadioInput
				name="choice"
				inputs={[
					{ id: "one", label: "One" },
					{ id: "two", label: "Two" },
				]}
			/>,
		);
		const two = screen.getByRole("radio", { name: "Two" });
		fireEvent.mouseDown(two);
		expect(soundSpy).toHaveBeenLastCalledWith(
			play("ClassicyInputRadioClickDown"),
		);
		fireEvent.mouseUp(two);
		expect(soundSpy).toHaveBeenLastCalledWith(
			play("ClassicyInputRadioClickUp"),
		);
		// The label is a second press target.
		soundSpy.mockReset();
		const label = screen.getByText("One");
		fireEvent.mouseDown(label);
		fireEvent.mouseUp(label);
		expect(played()).toEqual([
			"ClassicyInputRadioClickDown",
			"ClassicyInputRadioClickUp",
		]);
	});

	it("a tab press and select still click", () => {
		render(
			<ClassicyTabs
				tabs={[
					{ title: "One", children: <p>One</p> },
					{ title: "Two", children: <p>Two</p> },
				]}
			/>,
		);
		const two = screen.getByRole("tab", { name: "Two" });
		fireEvent.mouseDown(two);
		expect(soundSpy).toHaveBeenLastCalledWith(play("ClassicyTabClickDown"));
		// Tabs select on mouseup.
		fireEvent.mouseUp(two);
		expect(soundSpy).toHaveBeenLastCalledWith(play("ClassicyTabClickUp"));
		// An arrow key clicks up on the tab it lands on, as today, but never
		// down.
		soundSpy.mockReset();
		fireEvent.keyDown(screen.getByRole("tab", { name: "Two" }), {
			key: "ArrowLeft",
		});
		expect(played()).toEqual(["ClassicyTabClickUp"]);
	});

	it("a placard clicks under the pointer and stays silent on Return and Space", () => {
		render(<ClassicyPlacard onClick={() => {}}>Items</ClassicyPlacard>);
		const placard = screen.getByRole("button", { name: "Items" });
		fireEvent.mouseDown(placard);
		fireEvent.mouseUp(placard);
		expect(played()).toEqual([
			"ClassicyButtonClickDown",
			"ClassicyButtonClickUp",
		]);
		soundSpy.mockReset();
		fireEvent.keyDown(placard, { key: "Enter" });
		fireEvent.keyUp(placard, { key: "Enter" });
		fireEvent.keyDown(placard, { key: " " });
		fireEvent.keyUp(placard, { key: " " });
		expect(soundSpy).not.toHaveBeenCalled();
	});

	it("the component source no longer dispatches the sprite", () => {
		const sources = [
			"src/SystemFolder/SystemResources/Button/ClassicyButton.tsx",
			"src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx",
			"src/SystemFolder/SystemResources/Placard/ClassicyPlacard.tsx",
			"src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.tsx",
			"src/SystemFolder/SystemResources/Tabs/ClassicyTabs.tsx",
			"src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.tsx",
		];
		for (const file of sources)
			expect(
				readFileSync(resolve(__dirname, "../../..", file), "utf8"),
				file,
			).not.toMatch(/sound: "Classicy(Button|InputRadio|Tab|Menu)/);
	});
});
