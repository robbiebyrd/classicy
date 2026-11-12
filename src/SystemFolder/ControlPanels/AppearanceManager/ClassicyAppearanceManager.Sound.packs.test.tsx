import type { ChangeEvent } from "react";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";
import { useSoundTab } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Sound";
import {
	type ClassicySoundPack,
	registerClassicySoundPack,
	resetClassicySoundPacks,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => vi.fn() }),
);

type Props = Parameters<typeof useSoundTab>[0];
const props = (over: Partial<Props>): Props => ({
	alerts: [],
	alertSound: "",
	changeAlertSound: vi.fn() as (e: ChangeEvent<HTMLSelectElement>) => void,
	alertVolume: 100,
	changeAlertVolume: vi.fn(),
	previewAlertVolume: vi.fn(),
	soundPacks: [{ id: "platinum", name: "Platinum" }],
	soundPack: "platinum",
	changeSoundPack: vi.fn() as (e: ChangeEvent<HTMLSelectElement>) => void,
	...over,
});
const Host = (p: Props) => <div>{useSoundTab(p).children}</div>;
const menu = () => screen.getAllByRole("combobox")[1];

describe("Sound tab alert list", () => {
	it("lists exactly the alerts it is given", async () => {
		const user = userEvent.setup();
		render(
			<Host
				{...props({
					alerts: [
						{ value: "ClassicyAlertSimpleBeep", label: "Simple Beep" },
						{ value: "ClassicyAlertDroplet", label: "Droplet" },
					],
					alertSound: "ClassicyAlertSimpleBeep",
				})}
			/>,
		);
		expect(menu()).toHaveTextContent("Simple Beep");
		await user.click(menu());
		expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
			"Simple Beep",
			"Droplet",
		]);
	});

	it("shows no options for a pack with no alerts, without error", async () => {
		const user = userEvent.setup();
		render(<Host {...props({})} />);
		await user.click(menu());
		expect(screen.queryAllByRole("option")).toHaveLength(0);
	});
});

describe("useSoundTab called as in 3.1 (no alerts)", () => {
	it("type-checks without alerts", () => {
		type ThreeOne = Omit<Props, "alerts">;
		expectTypeOf<ThreeOne>().toMatchTypeOf<Parameters<typeof useSoundTab>[0]>();
		const call = (p: ThreeOne) => useSoundTab(p);
		expect(call).toBeTypeOf("function");
	});

	it("lists the playing pack's alerts, and follows a late registration", async () => {
		resetClassicySoundPacks();
		const user = userEvent.setup();
		const { alerts: _omit, ...threeOne } = props({});
		const sprite = { a: [0, 1] as [number, number] };
		const view = render(<Host {...(threeOne as Props)} />);
		await user.click(menu());
		expect(screen.queryAllByRole("option")).toHaveLength(0);
		view.unmount();
		registerClassicySoundPack({
			id: "platinum",
			name: "Platinum",
			src: ["x.mp3"],
			sprite,
			alerts: [{ value: "ClassicyAlertBonk", label: "Bonk" }],
		} as ClassicySoundPack);
		render(<Host {...(threeOne as Props)} />);
		await user.click(menu());
		expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
			"Bonk",
		]);
		resetClassicySoundPacks();
	});
});
