// A desktop mount loads Platinum's sound sprites from the Platinum package
// (plan 0015-kxa §3.3): the files left the core's assets/sounds for
// packages/appearance/platinum/src/assets/sounds/platinum, and pixel parity
// cannot hear the difference, so this reads the src the Howl is built with.
// The core registers no Appearance Package: this test loads Platinum.
import "@/__tests__/withPlatinum";
import path from "node:path";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assetSourceFile } from "@/__tests__/assetSourceFile";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

const { created } = vi.hoisted(() => ({ created: [] as string[][] }));

// jsdom plays no audio; this Howl records the sources it is built with.
vi.mock("howler", () => ({
	Howl: class {
		play = vi.fn();
		stop = vi.fn();
		volume = vi.fn();
		unload = vi.fn();
		playing = vi.fn().mockReturnValue(false);
		constructor(opts: { src: string[] }) {
			created.push(opts.src);
		}
	},
}));

const SPRITES = path.join(
	process.cwd(),
	"packages/appearance/platinum/src/assets/sounds/platinum",
);

describe("a desktop with Platinum loaded", () => {
	beforeEach(() => {
		localStorage.clear();
		created.length = 0;
		useAppManager.setState(DefaultAppManagerState, true);
	});

	afterEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("plays Platinum's sprites from the Platinum package's assets", () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		expect(created.length).toBeGreaterThan(0);
		for (const src of created)
			expect(src.map((url) => assetSourceFile(url, process.cwd()))).toEqual(
				["ogg", "m4a", "mp3", "ac3"].map((ext) =>
					path.join(SPRITES, `platinum.${ext}`),
				),
			);
	});
});
