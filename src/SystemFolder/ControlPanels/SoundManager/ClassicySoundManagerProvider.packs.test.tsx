import { act, useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import {
	useSound,
	useSoundDispatch,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { ClassicySoundManagerProvider } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider";
import {
	registerClassicySoundPack,
	resetClassicySoundPacks,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";

const { created, instances, mockAppearance } = vi.hoisted(() => ({
	created: [] as string[][],
	instances: [] as {
		play: ReturnType<typeof vi.fn>;
		volume: ReturnType<typeof vi.fn>;
	}[],
	mockAppearance: {
		alertSound: "ClassicyAlertQuack",
		alertVolume: undefined as number | undefined,
		activeTheme: {
			color: { a: 1 } as Record<string, number>,
			sound: { pack: "remote", disabled: [] as string[] },
		},
	},
}));

vi.mock("howler", () => ({
	Howl: class {
		play = vi.fn();
		stop = vi.fn();
		volume = vi.fn();
		unload = vi.fn();
		playing = vi.fn().mockReturnValue(false);
		constructor(opts: { src: string[] }) {
			created.push(opts.src);
			instances.push(this);
		}
	},
}));

vi.mock("@/Appearance/Platinum/assets/sounds/platinum", () => ({}));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => {
		const state = () => ({
			System: { Manager: { Appearance: mockAppearance } },
		});
		const useAppManager = Object.assign(
			(selector: (s: unknown) => unknown): unknown => selector(state()),
			{ getState: state },
		);
		return { useAppManager };
	},
);

const pack = (id: string, src: string) => ({
	id,
	name: id,
	src: [src],
	sprite: { ClassicyBeep: [0, 100] as [number, number] },
});

const PLATINUM_SRC = "https://cdn.example.com/platinum.ogg";
const REMOTE_SRC = "https://cdn.example.com/remote.ogg";

let latest: ReturnType<typeof useSound>;
let dispatchRef: ReturnType<typeof useSoundDispatch>;

const Probe = ({ beep }: { beep?: boolean }) => {
	const sound = useSound();
	const dispatch = useSoundDispatch();
	latest = sound;
	dispatchRef = dispatch;
	useEffect(() => {
		if (beep) dispatch({ type: "ClassicySoundPlay", sound: "ClassicyBeep" });
	}, [beep, dispatch]);
	return null;
};

const tree = (beep?: boolean) => (
	<ClassicySoundManagerProvider>
		<Probe beep={beep} />
	</ClassicySoundManagerProvider>
);

describe("ClassicySoundManagerProvider sound packs", () => {
	beforeEach(() => {
		created.length = 0;
		instances.length = 0;
		resetClassicySoundPacks();
		registerClassicySoundPack(pack("platinum", PLATINUM_SRC));
		registerClassicySoundPack(pack("remote", REMOTE_SRC));
		mockAppearance.activeTheme = {
			color: { a: 1 },
			sound: { pack: "remote", disabled: [] },
		};
	});

	it("seeds the player from the persisted theme's pack before children's effects run", () => {
		render(tree(true));
		expect(created[0]).toEqual([REMOTE_SRC]);
		expect(instances[0].play).toHaveBeenCalledWith("ClassicyBeep");
	});

	it("falls back to platinum when the persisted pack is unregistered", () => {
		mockAppearance.activeTheme.sound.pack = "ghost";
		expect(() => render(tree())).not.toThrow();
		expect(created[0]).toEqual([PLATINUM_SRC]);
	});

	it("loads a pack registered after mount", () => {
		mockAppearance.activeTheme.sound.pack = "late";
		render(tree());
		const before = created.length;
		act(() => registerClassicySoundPack(pack("late", "late.ogg")));
		expect(created.length).toBeGreaterThan(before);
		expect(created).toContainEqual(["late.ogg"]);
		expect(latest.packId).toBe("late");
	});

	it("reloads when the theme's pack changes and re-applies the volume", () => {
		const { rerender } = render(tree());
		act(() => dispatchRef({ type: "ClassicyVolumeSet", volume: 40 }));
		mockAppearance.activeTheme = {
			color: { a: 1 },
			sound: { pack: "platinum", disabled: [] },
		};
		rerender(tree());
		expect(latest.packId).toBe("platinum");
		const player = instances[instances.length - 1];
		expect(created[created.length - 1]).toEqual([PLATINUM_SRC]);
		expect(player.volume).toHaveBeenCalledWith(0.4);
	});

	it("hands the theme's disabled list over when the pack changes", () => {
		const { rerender } = render(tree());
		mockAppearance.activeTheme = {
			color: { a: 1 },
			sound: { pack: "platinum", disabled: ["ClassicyBeep"] },
		};
		rerender(tree());
		expect(latest.disabled).toEqual(["ClassicyBeep"]);
	});

	it("keeps defaultMuted when a pack registers after mount", () => {
		mockAppearance.activeTheme.sound.pack = "late";
		render(
			<ClassicySoundManagerProvider defaultMuted>
				<Probe />
			</ClassicySoundManagerProvider>,
		);
		act(() => registerClassicySoundPack(pack("late", "late.ogg")));
		expect(latest.packId).toBe("late");
		expect(latest.disabled).toContain("*");
	});

	it("does not recreate the Howl when another theme field changes", () => {
		const { rerender } = render(tree());
		const count = created.length;
		mockAppearance.activeTheme.color = { a: 2 };
		rerender(tree());
		expect(created.length).toBe(count);
	});
});
