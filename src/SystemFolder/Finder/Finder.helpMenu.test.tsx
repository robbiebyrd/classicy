import { cleanup, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const captured: Record<string, ClassicyMenuItem[] | undefined> = {};

vi.mock("@/SystemFolder/SystemResources/Window/ClassicyWindow", () => ({
	ClassicyWindow: ({
		id,
		appMenu,
		children,
	}: {
		id: string;
		appMenu?: ClassicyMenuItem[];
		children?: ReactNode;
	}) => {
		captured[id] = appMenu;
		return <div>{children}</div>;
	},
}));

vi.mock("@/SystemFolder/SystemResources/File/ClassicyFileBrowser", () => ({
	ClassicyFileBrowser: () => <div />,
}));

import { Finder } from "./Finder";

const PATH = "Macintosh HD:Documents";

afterEach(() => {
	cleanup();
	for (const k of Object.keys(captured)) delete captured[k];
	dispatch({ type: "ClassicyAppFinderCloseFolder", path: PATH });
});

describe("Finder's own Help menu", () => {
	it("carries no balloon toggle: the bar's standard Help menu owns it", async () => {
		dispatch({ type: "ClassicyAppFinderOpenFolder", path: PATH });
		render(<Finder />);
		await waitFor(() => expect(captured[PATH]).toBeDefined());
		const help = captured[PATH]?.find((m) => m.title === "Help");
		const titles = (help?.menuChildren ?? []).map((i) => i.title);
		expect(titles.some((t) => /balloon/i.test(t ?? ""))).toBe(false);
		// What it keeps: the About entry, which the Apple menu hoists.
		expect(help?.menuChildren?.some((i) => i.id?.endsWith("_about"))).toBe(
			true,
		);
	});
});
