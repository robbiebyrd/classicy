import type { ChangeEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import {
	render,
	renderHook,
	screen,
	userEvent,
	within,
} from "@/__tests__/test-utils";
import { useSoundTab } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Sound";

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => vi.fn() }),
);

// ClassicyPopUpMenu is a custom combobox: role="combobox" trigger shows the
// selected label; clicking opens a role="listbox" of role="option" entries;
// picking one fires onChangeFunc with { target: { value } }.
const Host = ({
	alertSound,
	changeAlertSound,
}: {
	alertSound: string;
	changeAlertSound: (e: ChangeEvent<HTMLSelectElement>) => void;
}) => {
	const tab = useSoundTab({ alertSound, changeAlertSound });
	return <div>{tab.children}</div>;
};

describe("useSoundTab", () => {
	it("is titled 'Sound'", () => {
		const { result } = renderHook(() =>
			useSoundTab({
				alertSound: "ClassicyAlertSosumi",
				changeAlertSound: vi.fn(),
			}),
		);
		expect(result.current.title).toBe("Sound");
	});

	it("shows the current selection on the trigger", () => {
		render(<Host alertSound="ClassicyAlertQuack" changeAlertSound={vi.fn()} />);
		expect(screen.getByRole("combobox")).toHaveTextContent("Quack");
	});

	it("lists all seven alert options when opened", async () => {
		const user = userEvent.setup();
		render(
			<Host alertSound="ClassicyAlertSosumi" changeAlertSound={vi.fn()} />,
		);
		await user.click(screen.getByRole("combobox"));
		expect(
			within(screen.getByRole("listbox")).getAllByRole("option"),
		).toHaveLength(7);
	});

	it("fires changeAlertSound with the chosen value", async () => {
		const changeAlertSound = vi.fn();
		const user = userEvent.setup();
		render(
			<Host
				alertSound="ClassicyAlertSosumi"
				changeAlertSound={changeAlertSound}
			/>,
		);
		await user.click(screen.getByRole("combobox"));
		await user.click(screen.getByRole("option", { name: "Quack" }));
		expect(changeAlertSound).toHaveBeenCalledOnce();
		expect(changeAlertSound.mock.calls[0][0].target.value).toBe(
			"ClassicyAlertQuack",
		);
	});
});
