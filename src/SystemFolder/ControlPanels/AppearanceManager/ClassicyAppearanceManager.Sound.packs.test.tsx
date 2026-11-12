import type { ChangeEvent } from "react";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { act, render, screen, userEvent } from "@/__tests__/test-utils";
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

// The 3.1 props, copied from v3.1.1's SoundTabProps.
type ThreeOneProps = {
	soundPacks: { id: string; name: string }[];
	soundPack: string;
	changeSoundPack: (e: ChangeEvent<HTMLSelectElement>) => void;
	alertSound: string;
	changeAlertSound: (e: ChangeEvent<HTMLSelectElement>) => void;
	alertVolume: number;
	changeAlertVolume: (alertVolume: number) => void;
	previewAlertVolume: (alertVolume: number) => void;
};

describe("useSoundTab called as in 3.1 (no alerts)", () => {
	it("type-checks without alerts", () => {
		expectTypeOf<ThreeOneProps>().toMatchTypeOf<
			Parameters<typeof useSoundTab>[0]
		>();
		expectTypeOf(useSoundTab).parameter(0).toMatchTypeOf<ThreeOneProps>();
	});

	it("lists the playing pack's alerts, and follows a late registration while mounted", async () => {
		resetClassicySoundPacks();
		const user = userEvent.setup();
		const { alerts: _omit, ...threeOne } = props({});
		render(<Host {...(threeOne as Props)} />);
		await user.click(menu());
		expect(screen.queryAllByRole("option")).toHaveLength(0);
		await user.click(menu());
		act(() => {
			registerClassicySoundPack({
				id: "platinum",
				name: "Platinum",
				src: ["x.mp3"],
				sprite: { a: [0, 1] },
				alerts: [{ value: "ClassicyAlertBonk", label: "Bonk" }],
			} as ClassicySoundPack);
		});
		await user.click(menu());
		expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
			"Bonk",
		]);
		resetClassicySoundPacks();
	});
});
