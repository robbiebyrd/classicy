import { act, useEffect } from "react";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type MockInstance,
	vi,
} from "vitest";
import { render } from "@/__tests__/test-utils";
import {
	useSound,
	useSoundDispatch,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { ClassicySoundManagerProvider } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider";
import { resetClassicySoundPackWarnings } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPackLookup.internal";
import {
	listClassicySoundPacks,
	registerClassicySoundPack,
	resetClassicySoundPacks,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import * as ClassicyLog from "@/SystemFolder/SystemResources/Log/ClassicyLog";

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

// Read before any test registers a pack: mounting the provider's module graph
// must not register one (Platinum's pack comes from the Platinum package only).
const packsAtImport = listClassicySoundPacks().map((p) => p.id);

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

	describe("fallback pack registered after mount", () => {
		const foo = {
			id: "foo",
			name: "foo",
			src: ["foo.ogg"],
			sprite: { ClassicyOther: [0, 100] as [number, number] },
		};

		beforeEach(() => {
			resetClassicySoundPacks();
			resetClassicySoundPackWarnings();
			registerClassicySoundPack(foo);
			mockAppearance.activeTheme.sound.pack = "foo";
		});

		it("plays a sprite the pack lacks on the default pack registered late", () => {
			render(tree());
			expect(created).toEqual([["foo.ogg"]]);
			act(() => registerClassicySoundPack(pack("platinum", PLATINUM_SRC)));
			expect(created).toContainEqual([PLATINUM_SRC]);
			act(() =>
				dispatchRef({ type: "ClassicySoundPlay", sound: "ClassicyBeep" }),
			);
			const platinum =
				instances[created.findIndex(([s]) => s === PLATINUM_SRC)];
			expect(platinum.play).toHaveBeenCalledWith("ClassicyBeep");
			expect(instances[0].play).not.toHaveBeenCalled();
			expect(platinum.volume).toHaveBeenCalled();
		});

		it("keeps the pack's own sprites on the pack after the late registration", () => {
			render(tree());
			act(() => registerClassicySoundPack(pack("platinum", PLATINUM_SRC)));
			act(() =>
				dispatchRef({ type: "ClassicySoundPlay", sound: "ClassicyOther" }),
			);
			expect(instances[0].play).toHaveBeenCalledWith("ClassicyOther");
			expect(created.filter(([s]) => s === "foo.ogg")).toHaveLength(1);
		});

		it("builds the fallback once and logs nothing new", () => {
			const log = vi.spyOn(ClassicyLog, "classicyLog");
			render(tree());
			const before = log.mock.calls.length;
			act(() => registerClassicySoundPack(pack("platinum", PLATINUM_SRC)));
			act(() => registerClassicySoundPack(pack("other", "other.ogg")));
			expect(created.filter(([s]) => s === PLATINUM_SRC)).toHaveLength(1);
			expect(log.mock.calls.length).toBe(before);
			log.mockRestore();
		});

		it("stays silent while the default pack is never registered", () => {
			render(tree());
			act(() => registerClassicySoundPack(pack("other", "other.ogg")));
			act(() =>
				dispatchRef({ type: "ClassicySoundPlay", sound: "ClassicyBeep" }),
			);
			expect(created).toEqual([["foo.ogg"]]);
			expect(instances[0].play).not.toHaveBeenCalled();
		});
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

describe("ClassicySoundManagerProvider with no sound pack registered", () => {
	let log: MockInstance<typeof ClassicyLog.classicyLog>;
	const missingPackWarnings = () =>
		log.mock.calls.filter((c) => c[0] === "warn" && c[1] === "Sound");

	beforeEach(() => {
		created.length = 0;
		instances.length = 0;
		resetClassicySoundPacks();
		resetClassicySoundPackWarnings();
		log = vi.spyOn(ClassicyLog, "classicyLog");
		mockAppearance.activeTheme = {
			color: { a: 1 },
			sound: { pack: "remote", disabled: [] },
		};
	});

	afterEach(() => log.mockRestore());

	it("importing the provider registers no sound pack", () => {
		expect(packsAtImport).toEqual([]);
	});

	it("mounts, constructs no Howl and plays nothing", () => {
		expect(() => render(tree(true))).not.toThrow();
		expect(created).toEqual([]);
		expect(latest.soundPlayer).toBeNull();
		expect(latest.fallbackPlayer).toBeNull();
		expect(latest.packId).toBeNull();
	});

	it("every sound dispatch is a no-op that does not throw", () => {
		render(tree());
		for (const type of [
			"ClassicySoundPlay",
			"ClassicySoundPlayInterrupt",
			"ClassicySoundPlayError",
			"ClassicyAlertSound",
			"ClassicySoundStop",
		]) {
			expect(() =>
				act(() => dispatchRef({ type, sound: "ClassicyBeep" })),
			).not.toThrow();
		}
		expect(created).toEqual([]);
	});

	it("warns once per missing pack id, across renders and dispatches", () => {
		const { rerender } = render(tree(true));
		rerender(tree(true));
		act(() =>
			dispatchRef({ type: "ClassicySoundPlay", sound: "ClassicyBeep" }),
		);
		const ids = missingPackWarnings().map((c) => (c[3] as { id: string }).id);
		expect(ids.sort()).toEqual(["platinum", "remote"]);
	});

	it("warns once when the theme names the missing default pack itself", () => {
		mockAppearance.activeTheme.sound.pack = "platinum";
		render(tree());
		expect(missingPackWarnings()).toHaveLength(1);
		expect(missingPackWarnings()[0][3]).toEqual({ id: "platinum" });
	});

	it("loads the Platinum pack when it registers after mount", () => {
		mockAppearance.activeTheme.sound.pack = "platinum";
		render(tree());
		expect(created).toEqual([]);
		act(() => registerClassicySoundPack(pack("platinum", PLATINUM_SRC)));
		expect(created).toEqual([[PLATINUM_SRC]]);
		expect(latest.packId).toBe("platinum");
	});
});
