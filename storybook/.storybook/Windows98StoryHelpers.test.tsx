// The Windows 98 stories share one WithTheme and one inScheme, from
// @sb/windows98 (as System 7's from @sb/system7): no story file keeps its
// own copy.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { act, render, screen } from "@testing-library/react";
import { isValidElement, type ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { inScheme, WithTheme } from "./windows98";

const STORIES = path.resolve(
	process.cwd(),
	"packages/appearance/windows98/src",
);
const storyFiles = readdirSync(STORIES)
	.filter((file) => file.endsWith(".stories.tsx"))
	.sort();

describe("Windows 98 story helpers", () => {
	it("WithTheme activates its theme and renders its children", async () => {
		await act(async () => {
			render(
				<WithTheme id="windows95">
					<p>scene</p>
				</WithTheme>,
			);
		});
		expect(screen.getByText("scene")).toBeTruthy();
		expect(
			useAppManager.getState().System.Manager.Appearance.activeTheme.id,
		).toBe("windows95");
	});

	it("inScheme renders the scene under the named scheme", () => {
		const scene = () => <p>scene</p>;
		const element = inScheme("windows98Brick", scene).render() as ReactElement<{
			id: string;
			children: ReactElement;
		}>;
		expect(isValidElement(element)).toBe(true);
		expect(element.type).toBe(WithTheme);
		expect(element.props.id).toBe("windows98Brick");
		expect(isValidElement(element.props.children)).toBe(true);
		expect(element.props.children.type).toBe("p");
	});

	it("finds the Windows 98 story files", () => {
		expect(storyFiles.length).toBeGreaterThanOrEqual(1);
	});

	it.each(storyFiles)("%s keeps no copy of either helper", (file) => {
		const source = readFileSync(path.join(STORIES, file), "utf8");
		expect(source).not.toMatch(/\bfunction\s+WithTheme\b/);
		expect(source).not.toMatch(
			/\b(?:const|let|var)\s+(?:WithTheme|inScheme)\b/,
		);
		const uses = ["WithTheme", "inScheme"].filter((name) =>
			new RegExp(`\\b${name}\\b`).test(source),
		);
		if (uses.length === 0) return;
		const imported = source.match(
			/import\s*\{([^}]*)\}\s*from\s*"@sb\/windows98";/,
		);
		expect(imported, `${file} imports from @sb/windows98`).not.toBeNull();
		for (const name of uses)
			expect(imported?.[1]).toMatch(new RegExp(`\\b${name}\\b`));
	});
});
