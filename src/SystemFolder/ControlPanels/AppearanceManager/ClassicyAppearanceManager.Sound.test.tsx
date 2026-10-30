import type { ChangeEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import {
	fireEvent,
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

type SoundTabProps = Parameters<typeof useSoundTab>[0];

const baseProps = (): SoundTabProps => ({
	alertSound: "ClassicyAlertSosumi",
	changeAlertSound: vi.fn() as (e: ChangeEvent<HTMLSelectElement>) => void,
	alertVolume: 100,
	changeAlertVolume: vi.fn(),
	previewAlertVolume: vi.fn(),
	soundPacks: [{ id: "platinum", name: "Platinum" }],
	soundPack: "platinum",
	changeSoundPack: vi.fn() as (e: ChangeEvent<HTMLSelectElement>) => void,
});

// ClassicyPopUpMenu is a custom combobox: role="combobox" trigger shows the
// selected label; clicking opens a role="listbox" of role="option" entries;
// picking one fires onChangeFunc with { target: { value } }.
const Host = (props: SoundTabProps) => {
	const tab = useSoundTab(props);
	return <div>{tab.children}</div>;
};

// Sound Pack is the first pop-up on the tab, Alert Sound the second.
const soundPackMenu = () => screen.getAllByRole("combobox")[0];
const alertSoundMenu = () => screen.getAllByRole("combobox")[1];

describe("useSoundTab", () => {
	it("is titled 'Sound'", () => {
		const { result } = renderHook(() => useSoundTab(baseProps()));
		expect(result.current.title).toBe("Sound");
	});

	it("shows the current selection on the trigger", () => {
		render(<Host {...baseProps()} alertSound="ClassicyAlertQuack" />);
		expect(alertSoundMenu()).toHaveTextContent("Quack");
	});

	it("lists all seven alert options when opened", async () => {
		const user = userEvent.setup();
		render(<Host {...baseProps()} />);
		await user.click(alertSoundMenu());
		expect(
			within(screen.getByRole("listbox")).getAllByRole("option"),
		).toHaveLength(7);
	});

	it("fires changeAlertSound with the chosen value", async () => {
		const props = baseProps();
		const user = userEvent.setup();
		render(<Host {...props} />);
		await user.click(alertSoundMenu());
		await user.click(screen.getByRole("option", { name: "Quack" }));
		const changeAlertSound = props.changeAlertSound as ReturnType<typeof vi.fn>;
		expect(changeAlertSound).toHaveBeenCalledOnce();
		expect(changeAlertSound.mock.calls[0][0].target.value).toBe(
			"ClassicyAlertQuack",
		);
	});
});

describe("useSoundTab — Sound Pack", () => {
	const packs = [
		{ id: "platinum", name: "Platinum" },
		{ id: "beep", name: "Beep" },
	];

	it("lists sound packs and selects the theme's pack", async () => {
		const user = userEvent.setup();
		const { container } = render(
			<Host {...baseProps()} soundPacks={packs} soundPack="beep" />,
		);
		// ClassicyPopUpMenu has no native <select> (J-R14): the combobox
		// carrying the id shows the selected pack's name.
		const menu = container.querySelector("#soundPack");
		expect(menu).toBe(soundPackMenu());
		expect(menu).toHaveTextContent("Beep");
		await user.click(soundPackMenu());
		expect(
			within(screen.getByRole("listbox"))
				.getAllByRole("option")
				.map((o) => o.textContent?.replace(/^✓/, "")),
		).toEqual(["Platinum", "Beep"]);
	});

	it("sits above Alert Sound, with its own label", () => {
		render(<Host {...baseProps()} />);
		const label = screen.getByText("Sound Pack");
		expect(
			label.compareDocumentPosition(screen.getByText("Alert Sound")) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("changeSoundPack fires on change", async () => {
		const props = baseProps();
		const user = userEvent.setup();
		render(<Host {...props} soundPacks={packs} soundPack="beep" />);
		await user.click(soundPackMenu());
		await user.click(screen.getByRole("option", { name: "Platinum" }));
		const changeSoundPack = props.changeSoundPack as ReturnType<typeof vi.fn>;
		expect(changeSoundPack).toHaveBeenCalledOnce();
		expect(changeSoundPack.mock.calls[0][0].target.value).toBe("platinum");
	});
});

describe("useSoundTab — Alert Volume", () => {
	it("renders a labeled 0–100 slider at the stored level", () => {
		render(<Host {...baseProps()} alertVolume={35} />);
		const slider = screen.getByRole("slider", { name: "Alert Volume" });
		expect(slider).toHaveValue("35");
		expect(slider).toHaveAttribute("min", "0");
		expect(slider).toHaveAttribute("max", "100");
		expect(screen.getByText("35%")).toBeInTheDocument();
	});

	it("reports each step through changeAlertVolume as a number", () => {
		const props = baseProps();
		render(<Host {...props} />);
		fireEvent.change(screen.getByRole("slider", { name: "Alert Volume" }), {
			target: { value: "60" },
		});
		expect(props.changeAlertVolume).toHaveBeenCalledWith(60);
		expect(props.previewAlertVolume).not.toHaveBeenCalled();
	});

	it("previews the alert once the slider is released", () => {
		const props = baseProps();
		render(<Host {...props} />);
		const slider = screen.getByRole("slider", { name: "Alert Volume" });
		fireEvent.change(slider, { target: { value: "25" } });
		fireEvent.pointerUp(slider);
		expect(props.previewAlertVolume).toHaveBeenCalledOnce();
		expect(props.previewAlertVolume).toHaveBeenCalledWith(25);
	});
});
