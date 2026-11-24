// The core registers no Appearance Package: these tests draw Platinum.
import "@/__tests__/withPlatinum";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { createClassicyThemeLink } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeLink";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { Classicy } from "@/SystemFolder/SystemResources/Desktop/Classicy";
import { resetClassicyThemeLinkImportForTests } from "@/SystemFolder/SystemResources/Desktop/ClassicyThemeLinkImport.internal";
import {
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

// A read that rejects (nothing does today: every decode step is caught) must
// not hold the page's claim, or no link would open until a reload.
const { rejectNext } = vi.hoisted(() => ({ rejectNext: { count: 0 } }));
vi.mock(
	"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeLink",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeLink")
			>();
		return {
			...actual,
			readClassicyThemeLink: (hash: string) => {
				if (rejectNext.count > 0) {
					rejectNext.count--;
					return Promise.reject(new Error("read failed"));
				}
				return actual.readClassicyThemeLink(hash);
			},
		};
	},
);

const PAGE = `${window.location.origin}/desktop/`;

const linkTo = async (name: string) => {
	const result = await createClassicyThemeLink(
		{ ...structuredClone(getTheme("bondi")), id: "x", name },
		PAGE,
	);
	if (!result.ok) throw new Error(result.error);
	return result.url;
};

describe("a theme link read that rejects", { timeout: 15_000 }, () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		resetClassicyThemeLinkImportForTests();
	});

	afterEach(() => {
		cleanup();
		unregisterClassicyLogSink("theme-link-reject-test");
		window.history.replaceState(null, "", "/");
	});

	it("is logged and releases the claim, so the next link opens", async () => {
		const entries: string[] = [];
		registerClassicyLogSink({
			id: "theme-link-reject-test",
			onLog: (entry) =>
				entries.push(`${entry.level} ${entry.subsystem}: ${entry.message}`),
		});
		rejectNext.count = 1;
		window.history.replaceState(null, "", await linkTo("Ocean"));
		render(<Classicy startupScreen={false} controlStrip={false} themeLinks />);
		await waitFor(() =>
			expect(entries).toContain(
				"error ClassicyThemeLink: The theme link could not be read.",
			),
		);
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		const next = await linkTo("Sea");
		act(() => {
			window.location.hash = new URL(next).hash;
		});
		expect(
			await screen.findByRole("alertdialog", {
				name: "Add the theme “Sea” from this link?",
			}),
		).toBeInTheDocument();
	});
});
