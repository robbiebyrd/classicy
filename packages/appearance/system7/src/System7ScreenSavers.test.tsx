import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { listClassicyAppearancePackages } from "@/Appearance/ClassicyAppearancePackageRegistry";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { ClassicyScreenSaver } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaver";
import type { ScreenSaverData } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverContext";
import {
	listClassicyScreenSaversFor,
	resolveClassicyScreenSaverFor,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverOffer";
import { listClassicyScreenSaversInRegistrationOrder } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";
import * as ClassicyLog from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import {
	classicyScreenSaverLogoSrc,
	getClassicyScreenSaverLogo,
} from "../../platinum/src/screenSavers/Logo/ClassicyScreenSaverLogoRegistry";

// The After Dark screen savers under System 7 (design 0017-6me, "Screen
// savers"; plan 0018-dbd §3.8), for a host that loads only System 7: its
// entry registers Platinum's twelve savers, offered under System 7, with no
// Platinum package registered (the test setup registers none).

const mockData = vi.hoisted(
	() => ({ current: {} }) as { current: Record<string, unknown> },
);

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	async (importOriginal) => {
		const original =
			await importOriginal<
				typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils")
			>();
		return {
			...original,
			// The hook reads the saver's data and the System 7 package; the
			// store's own methods stay (the core reads them at load).
			useAppManager: Object.assign(
				(selector: (state: unknown) => unknown) => selector(fakeState()),
				original.useAppManager,
			),
			useAppManagerDispatch: () => vi.fn(),
		};
	},
);

const fakeState = () => ({
	System: {
		Manager: {
			Applications: {
				apps: {
					"ScreenSaver.app": {
						id: "ScreenSaver.app",
						name: "Screen Saver",
						icon: "/icons/screensaver.png",
						open: true,
						extension: true,
						windows: {},
						data: mockData.current,
					},
				},
			},
			Appearance: { packageId: "system7" },
		},
	},
});

const SAVER_IDS = [
	"bouncing-ball",
	"fade-out",
	"fish",
	"flying-toasters",
	"globe",
	"hard-rain",
	"logo",
	"messages",
	"messages2",
	"rainstorm",
	"spotlight",
	"warp",
];

const setData = (data: ScreenSaverData) => {
	mockData.current = data as Record<string, unknown>;
};

afterEach(() => setData({}));

describe("the screen savers under System 7 alone", () => {
	it("registers the twelve on import, before the package names its default, warning of nothing", async () => {
		const log = vi.spyOn(ClassicyLog, "classicyLog");
		await import("./index");
		expect(listClassicyAppearancePackages().map((pkg) => pkg.id)).toEqual([
			"system7",
		]);
		expect(
			listClassicyScreenSaversInRegistrationOrder().map((saver) => saver.id),
		).toEqual(SAVER_IDS);
		// An unregistered default would be warned of, and ignored.
		expect(log).not.toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			expect.stringContaining("defaultScreenSaver"),
		);
		log.mockRestore();
	}, 30_000);

	it("offers every saver under System 7, bouncing-ball in effect until the user picks another", async () => {
		await import("./index");
		expect(
			listClassicyScreenSaversFor("system7")
				.map((saver) => saver.id)
				.sort(),
		).toEqual(SAVER_IDS);
		expect(resolveClassicyScreenSaverFor("system7", undefined)?.id).toBe(
			"bouncing-ball",
		);
		expect(resolveClassicyScreenSaverFor("system7", "fish")?.id).toBe("fish");
	});

	it("runs the default saver in the overlay", async () => {
		await import("./index");
		setData({ active: true });
		const { container } = render(<ClassicyScreenSaver />);
		expect(
			container.querySelector(
				".classicyScreenSaverOverlay .classicySaverBouncingBall",
			),
		).not.toBeNull();
	});

	it("runs the chosen saver", async () => {
		await import("./index");
		setData({
			active: true,
			selectedSaver: "fish",
		});
		const { container } = render(<ClassicyScreenSaver />);
		expect(
			container.querySelector(".classicyScreenSaverOverlay .classicySaverFish"),
		).not.toBeNull();
		expect(container.querySelector(".classicySaverBouncingBall")).toBeNull();
	});

	// System 7 registers neither icon the stock logos draw, so they read the
	// core's icon tree, never the Berkeley Systems stand-in.
	it("draws the Classicy and Startup Screen logos from the core's icons", async () => {
		const log = vi.spyOn(ClassicyLog, "classicyLog");
		await import("./index");
		const drawn = (id: string) => {
			const logo = getClassicyScreenSaverLogo(id);
			return logo ? classicyScreenSaverLogoSrc(logo) : undefined;
		};
		expect(drawn("classicy")).toBe(ClassicyIcons.classicy.logo);
		expect(drawn("startup-screen")).toBe(ClassicyIcons.system.macosSvg);
		expect(log).not.toHaveBeenCalledWith(
			"warn",
			"ScreenSaver",
			expect.anything(),
		);
		log.mockRestore();
	});
});
