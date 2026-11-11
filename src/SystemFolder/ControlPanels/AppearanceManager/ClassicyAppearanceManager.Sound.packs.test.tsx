import type { ChangeEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";
import { useSoundTab } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Sound";

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
