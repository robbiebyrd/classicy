// Story 0226-a6f, fix round 2 (N5): Recent Documents read the desktop's own
// file system, the one its `fileSystemStorageKey` names, not the default key.
import "@/__tests__/withPlatinum";
import { act, render, screen, waitFor } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { classicyDesktopFileSystemStorageKey } from "@/SystemFolder/SystemResources/File/ClassicyDesktopFileSystemKey.internal";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

const OTHER_KEY = "classicyRecentItemsOtherKey";
const ONLY_THERE = "Macintosh HD:Documents:Only There.txt";
const ONLY_DEFAULT = "Macintosh HD:Documents:Only Default.txt";

const recentDocuments = () =>
	(useAppManager.getState().System.Manager.Desktop.recentItems?.items ?? [])
		.filter((i) => i.kind === "document")
		.map((i) => i.path);

const openInSimpleText = (path: string) =>
	act(() => {
		dispatch({
			type: "ClassicyAppSimpleTextOpenFile",
			app: { id: "SimpleText.app" },
			path,
		});
	});

describe("Recent Documents on a desktop with its own storage key", {
	timeout: 20_000,
}, () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
		new ClassicyFileSystem(OTHER_KEY).writeFile(
			ONLY_THERE,
			"from the desktop's key",
			{
				_type: ClassicyFileSystemEntryFileType.TextFile,
			},
		);
		new ClassicyFileSystem().writeFile(ONLY_DEFAULT, "from the default key", {
			_type: ClassicyFileSystemEntryFileType.TextFile,
		});
	});

	it("remembers a file of the desktop's file system, and SimpleText reads it there", async () => {
		render(
			<ClassicyAppManagerProvider fileSystemStorageKey={OTHER_KEY}>
				<ClassicyDesktop controlStrip={false} />
			</ClassicyAppManagerProvider>,
		);
		openInSimpleText(ONLY_THERE);
		await waitFor(() =>
			expect(
				screen.getByDisplayValue("from the desktop's key"),
			).toBeInTheDocument(),
		);
		expect(recentDocuments()).toEqual([ONLY_THERE]);
	});

	it("does not remember a path only the default key's file system holds", async () => {
		render(
			<ClassicyAppManagerProvider fileSystemStorageKey={OTHER_KEY}>
				<ClassicyDesktop controlStrip={false} />
			</ClassicyAppManagerProvider>,
		);
		openInSimpleText(ONLY_DEFAULT);
		await waitFor(() =>
			expect(
				useAppManager.getState().System.Manager.Applications.apps[
					"SimpleText.app"
				]?.open,
			).toBe(true),
		);
		expect(recentDocuments()).toEqual([]);
	});

	it("reads the default key on a desktop with none of its own", async () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop controlStrip={false} />
			</ClassicyAppManagerProvider>,
		);
		openInSimpleText(ONLY_DEFAULT);
		await waitFor(() =>
			expect(
				screen.getByDisplayValue("from the default key"),
			).toBeInTheDocument(),
		);
		expect(recentDocuments()).toEqual([ONLY_DEFAULT]);
	});

	// Re-review 2, M4: the key follows the providers that are mounted.
	it("falls back to the default key once the provider unmounts", () => {
		const { unmount } = render(
			<ClassicyAppManagerProvider fileSystemStorageKey={OTHER_KEY}>
				<span />
			</ClassicyAppManagerProvider>,
		);
		expect(classicyDesktopFileSystemStorageKey()).toBe(OTHER_KEY);
		unmount();
		expect(classicyDesktopFileSystemStorageKey()).toBe("classicyStorage");
	});

	it("keeps the first mounted provider's key while it stays mounted", () => {
		const first = render(
			<ClassicyAppManagerProvider fileSystemStorageKey={OTHER_KEY}>
				<span />
			</ClassicyAppManagerProvider>,
		);
		const second = render(
			<ClassicyAppManagerProvider fileSystemStorageKey="classicyThirdKey">
				<span />
			</ClassicyAppManagerProvider>,
		);
		expect(classicyDesktopFileSystemStorageKey()).toBe(OTHER_KEY);
		first.unmount();
		expect(classicyDesktopFileSystemStorageKey()).toBe("classicyThirdKey");
		second.unmount();
		expect(classicyDesktopFileSystemStorageKey()).toBe("classicyStorage");
	});

	// Re-review 3, N5: a provider render that never commits publishes
	// nothing.
	it("publishes no key for a provider render that never commits", () => {
		class Catch extends Component<
			{ children: ReactNode },
			{ failed: boolean }
		> {
			state = { failed: false };
			static getDerivedStateFromError() {
				return { failed: true };
			}
			render() {
				return this.state.failed ? null : this.props.children;
			}
		}
		const Throw = (): never => {
			throw new Error("never commits");
		};
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});
		const { unmount } = render(
			<Catch>
				<ClassicyAppManagerProvider fileSystemStorageKey="classicyLeakedKey">
					<Throw />
				</ClassicyAppManagerProvider>
			</Catch>,
		);
		expect(classicyDesktopFileSystemStorageKey()).toBe("classicyStorage");
		unmount();
		consoleError.mockRestore();
	});
});
