// What a user searches for is theirs (story 0227-815): the words typed in
// Find File's fields, and what it finds, never reach an analytics payload.
import "@/__tests__/withPlatinum";
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	listClassicyFindSources,
	registerClassicyFindSource,
	unregisterClassicyFindSource,
} from "@/SystemFolder/FindFile/ClassicyFindSources";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";

const analytics = vi.hoisted(() => ({
	track: [] as unknown[][],
	page: [] as unknown[][],
}));
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	async (importOriginal) => ({
		...(await importOriginal<object>()),
		useClassicyAnalytics: () => ({
			track: (...args: unknown[]) => analytics.track.push(args),
			page: (...args: unknown[]) => analytics.page.push(args),
		}),
	}),
);

const SECRET = "Quarterly Secret";

describe("Find File and analytics", { timeout: 30_000 }, () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
		analytics.track.length = 0;
		analytics.page.length = 0;
		new ClassicyFileSystem().writeFile(
			`Macintosh HD:Documents:${SECRET}.txt`,
			"x",
			{ _type: ClassicyFileSystemEntryFileType.TextFile },
		);
	});

	afterEach(() => {
		cleanup();
		for (const s of listClassicyFindSources())
			unregisterClassicyFindSource(s.id);
	});

	it("sends no search words, and no name found, in a track or pageview payload", async () => {
		registerClassicyFindSource({
			id: "archive",
			name: "Archive",
			search: async () => [
				{ name: `${SECRET} memo`, kind: "page", open: () => {} },
			],
		});
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop controlStrip={false} />
			</ClassicyAppManagerProvider>,
		);
		act(() => {
			dispatch({ type: "ClassicyAppFindFileShowFind" });
		});
		await screen.findByText("Find items");
		fireEvent.change(
			document.getElementById("classicy-find-file-row-0-value") as HTMLElement,
			{ target: { value: SECRET } },
		);
		fireEvent.click(screen.getByRole("button", { name: "Find" }));
		await waitFor(() =>
			expect(screen.getByText("Items Found")).toBeInTheDocument(),
		);
		const tab = screen.getByRole("tab", { name: "Search Internet" });
		fireEvent.mouseDown(tab);
		fireEvent.mouseUp(tab);
		fireEvent.change(
			document.getElementById("classicy-find-file-words") as HTMLElement,
			{ target: { value: SECRET } },
		);
		fireEvent.click(screen.getByRole("button", { name: "Search" }));
		const results = screen
			.getByText("Items Found")
			.closest(".classicyWindow") as HTMLElement;
		await waitFor(() =>
			expect(
				within(results).getAllByText(`${SECRET} memo`).length,
			).toBeGreaterThan(0),
		);
		// The fields' changes were tracked, without their text.
		expect(
			analytics.track.some(
				([event, payload]) =>
					event === "selected" &&
					(payload as { id?: string }).id === "classicy-find-file-words",
			),
		).toBe(true);
		const sent = JSON.stringify([analytics.track, analytics.page]);
		expect(sent).not.toContain("Quarterly");
	});

	it("keeps an analyticsPrivate field's text out, and a plain field's in", () => {
		render(
			<>
				<ClassicyInput id="private" analyticsPrivate prefillValue="hidden" />
				<ClassicyInput id="plain" />
			</>,
		);
		fireEvent.change(document.getElementById("private") as HTMLElement, {
			target: { value: "my words" },
		});
		fireEvent.change(document.getElementById("plain") as HTMLElement, {
			target: { value: "shown" },
		});
		const sent = JSON.stringify(analytics.track);
		expect(sent).not.toContain("my words");
		expect(sent).not.toContain("hidden");
		expect(sent).toContain("shown");
	});
});
