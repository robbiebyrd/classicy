// A desktop story that keeps its desktop state across a reload
// (`parameters.classicy.persistence`, ./StorybookSavedDesktop): it saves as a
// host's page does while it is shown, a reload draws what it saved, and no
// other story saves or draws saved state (integration review G round 4, F1
// and F2: the palette check's reload step reloaded a page that saved
// nothing, so it never drew a palette from its saved window record).
import { act, render, screen } from "@testing-library/react";
import type { FC, ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

const KEY = "classicyDesktopState";
const OWNER_KEY = "classicyStorybookDesktopStateOwner";
/** The test story under Platinum's defaults, as the decorator names it. */
const OWNER = JSON.stringify(["test--story", "platinum", "default"]);

/**
 * A page loaded anew, as a reload loads it: localStorage holding `saved`
 * when the store is created, then Platinum and the decorator, in
 * preview.tsx's order.
 */
const loadPage = async (saved?: string | null, owner = OWNER) =>
	loadPageWith({
		[KEY]: saved ?? null,
		[OWNER_KEY]: saved ? owner : null,
	});

/** A page loaded anew with localStorage holding exactly `storage`. */
const loadPageWith = async (storage: Record<string, string | null>) => {
	for (const [key, value] of Object.entries(storage)) {
		if (value === null) localStorage.removeItem(key);
		else localStorage.setItem(key, value);
	}
	vi.resetModules();
	await import("@classicy/appearance-platinum");
	const { withClassicy } = await import("./ClassicyDecorators");
	const store = await import(
		"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
	);
	/** Whether balloon help was off when the story first drew. */
	let offAtFirstDraw: boolean | undefined;
	const Story: FC = () => {
		offAtFirstDraw ??=
			store.useAppManager.getState().System.Manager.Desktop.disableBalloonHelp;
		return <p>story</p>;
	};
	const show = async (classicy: Record<string, unknown>) => {
		const view = render(
			withClassicy(
				Story as never,
				{
					id: "test--story",
					viewMode: "story",
					globals: { theme: "default", appearancePackage: "platinum" },
					parameters: { classicy },
				} as never,
			) as ReactElement,
		);
		await screen.findByText("story", {}, { timeout: 20000 });
		return view;
	};
	const balloonHelpOff = () =>
		store.useAppManager.getState().System.Manager.Desktop.disableBalloonHelp;
	const turnBalloonHelpOff = () =>
		act(() => {
			store.dispatch({
				type: "ClassicyDesktopSetBalloonHelp",
				disableBalloonHelp: true,
			});
		});
	return {
		show,
		/** The page goes away as a reload takes it: it writes nothing more. */
		stopSaving: store.stopAppManagerPersistence,
		dispatch: store.dispatch,
		balloonHelpOff,
		turnBalloonHelpOff,
		offAtFirstDraw: () => offAtFirstDraw,
	};
};

/**
 * The saved state's balloon help switch once it reads `expected` (within
 * 3 s), else the last one saved: the story saves its state at once when it
 * is shown, so a change is saved over an earlier copy.
 */
const savedBalloonHelpOff = async (
	expected: boolean,
): Promise<boolean | undefined> => {
	let last: boolean | undefined;
	for (let waited = 0; waited < 3000; waited += 100) {
		const text = localStorage.getItem(KEY);
		if (text) {
			last = JSON.parse(text).System.Manager.Desktop.disableBalloonHelp;
			if (last === expected) return last;
		}
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	return last;
};

const KEEPS = { desktop: true, controlStrip: false, persistence: true };

/** Desktop state a page saved, with balloon help turned off. */
const SAVED = JSON.stringify({
	System: {
		Manager: {
			Applications: { apps: {} },
			Desktop: { disableBalloonHelp: true },
			Appearance: {
				activeTheme: { id: "default", package: "platinum", defaults: true },
			},
		},
	},
});

describe("a Storybook story that keeps its desktop state", () => {
	it("saves it as a host's page does while it is shown, and removes it when it leaves", async () => {
		const page = await loadPage();
		const { unmount } = await page.show(KEEPS);
		page.turnBalloonHelpOff();
		expect(await savedBalloonHelpOff(true)).toBe(true);
		// Saved for this story, under this package and theme.
		expect(localStorage.getItem(OWNER_KEY)).toBe(OWNER);
		act(() => unmount());
		// Gone, and the store is the defaults again for the next story.
		expect(localStorage.getItem(KEY)).toBeNull();
		expect(localStorage.getItem(OWNER_KEY)).toBeNull();
		expect(page.balloonHelpOff()).toBe(false);
		page.turnBalloonHelpOff();
		await new Promise((resolve) => setTimeout(resolve, 800));
		expect(localStorage.getItem(KEY)).toBeNull();
	}, 60000);

	it("draws, after a reload, the state it saved, and goes on saving", async () => {
		const reloaded = await loadPage(SAVED);
		await reloaded.show(KEEPS);
		expect(reloaded.offAtFirstDraw()).toBe(true);
		expect(reloaded.balloonHelpOff()).toBe(true);
		localStorage.removeItem(KEY);
		act(() => {
			reloaded.dispatch({
				type: "ClassicyDesktopSetBalloonHelp",
				disableBalloonHelp: false,
			});
		});
		expect(await savedBalloonHelpOff(false)).toBe(false);
	}, 60000);

	it.each([
		["another story", JSON.stringify(["other--story", "platinum", "default"])],
		["another package", JSON.stringify(["test--story", "system7", "system7"])],
		["another theme", JSON.stringify(["test--story", "platinum", "azul"])],
	])(
		"is not drawn for %s: the story starts from the defaults",
		async (_, owner) => {
			const page = await loadPage(SAVED, owner);
			await page.show(KEEPS);
			expect(page.offAtFirstDraw()).toBe(false);
			expect(page.balloonHelpOff()).toBe(false);
		},
		60000,
	);

	// A page that starts the story afresh (the state left under the key was
	// saved for another owner) saves its own state with the owner at once:
	// reloaded before its first debounced save, it draws the defaults, never
	// the other owner's state under its own owner (integration review G
	// round 5, findings 1 and 3).
	it.each([
		0, 300,
	])("a reload %i ms after the story started afresh draws the defaults, not the other owner's state", async (wait) => {
		const first = await loadPage(
			SAVED,
			JSON.stringify(["test--story", "platinum", "azul"]),
		);
		const view = await first.show(KEEPS);
		expect(first.offAtFirstDraw()).toBe(false);
		await new Promise((resolve) => setTimeout(resolve, wait));
		// What the page leaves when it goes away: a reload runs no cleanup.
		const left = {
			[KEY]: localStorage.getItem(KEY),
			[OWNER_KEY]: localStorage.getItem(OWNER_KEY),
		};
		expect(left[OWNER_KEY]).toBe(OWNER);
		first.stopSaving();
		act(() => view.unmount());
		const reloaded = await loadPageWith(left);
		await reloaded.show(KEEPS);
		expect(reloaded.offAtFirstDraw()).toBe(false);
		expect(reloaded.balloonHelpOff()).toBe(false);
	}, 60000);

	it.each([
		["a desktop story", { desktop: true, controlStrip: false }],
		["a plain story", {}],
	])(
		"is drawn by no other story: %s on a page that loaded it starts from the defaults, and saves nothing",
		async (_, classicy) => {
			const other = await loadPage(SAVED);
			await other.show(classicy);
			expect(other.offAtFirstDraw()).toBe(false);
			expect(other.balloonHelpOff()).toBe(false);
			localStorage.removeItem(KEY);
			other.turnBalloonHelpOff();
			await new Promise((resolve) => setTimeout(resolve, 800));
			expect(localStorage.getItem(KEY)).toBeNull();
		},
		60000,
	);
});
