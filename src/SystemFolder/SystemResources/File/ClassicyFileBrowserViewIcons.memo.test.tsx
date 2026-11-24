import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClassicyFileBrowserViewIcons } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

// The icon view memoizes its icons with stable handlers (story 0228-e9l,
// review M8): a selection change redraws the icons it changes, not every
// icon in the folder.

const renders: string[] = [];
vi.mock(
	"@/SystemFolder/SystemResources/Icon/ClassicyIcon",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("@/SystemFolder/SystemResources/Icon/ClassicyIcon")
			>();
		const Counted: typeof actual.ClassicyIcon = (props) => {
			renders.push(props.filePath ?? "");
			return actual.ClassicyIcon(props);
		};
		return { ...actual, ClassicyIcon: Counted };
	},
);

afterEach(cleanup);

const NAMES = Array.from({ length: 12 }, (_, i) => `doc${i}.pdf`);

const makeFs = () =>
	new ClassicyFileSystem("icon-view-memo", {
		_type: "directory",
		Documents: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			...Object.fromEntries(
				NAMES.map((name) => [
					name,
					{
						_type: ClassicyFileSystemEntryFileType.Pdf,
						_url: `https://example.com/${name}`,
					},
				]),
			),
		},
	});

describe("ClassicyFileBrowserViewIcons rendering", () => {
	it("redraws only the icons a click's selection change touches", async () => {
		const { container } = render(
			<ClassicyFileBrowserViewIcons
				fs={makeFs()}
				path="Documents"
				appId="Finder.app"
			/>,
		);
		await waitFor(() =>
			expect(container.querySelectorAll(".classicyIcon")).toHaveLength(
				NAMES.length,
			),
		);
		const icon = (name: string) =>
			container.querySelector(
				`.classicyIcon[data-classicy-file-path="Documents:${name}"]`,
			) as HTMLElement;
		fireEvent.click(icon(NAMES[0]), { detail: 1 });
		renders.length = 0;
		fireEvent.click(icon(NAMES[1]), { detail: 1 });
		// The one deselected and the one selected; the other ten stay.
		expect([...renders].sort()).toEqual(
			[`Documents:${NAMES[0]}`, `Documents:${NAMES[1]}`].sort(),
		);
	});
});
