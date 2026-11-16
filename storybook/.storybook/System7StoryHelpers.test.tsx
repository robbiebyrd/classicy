// The System 7 stories share one WithTheme and one inColor, from
// @sb/system7 (story 0199-chr): no story file keeps its own copy.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { act, render, screen } from "@testing-library/react";
import { isValidElement, type ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { inColor, WithTheme } from "./system7";

const STORIES = path.resolve(process.cwd(), "packages/appearance/system7/src");
const storyFiles = readdirSync(STORIES)
	.filter((file) => file.endsWith(".stories.tsx"))
	.sort();

describe("System 7 story helpers", () => {
	it("WithTheme activates its theme and renders its children", async () => {
		await act(async () => {
			render(
				<WithTheme id="system7-color">
					<p>scene</p>
				</WithTheme>,
			);
		});
		expect(screen.getByText("scene")).toBeTruthy();
		expect(
			useAppManager.getState().System.Manager.Appearance.activeTheme.id,
		).toBe("system7-color");
	});

	it("inColor renders the scene under the color theme", () => {
		const scene = () => <p>scene</p>;
		const element = inColor(scene).render() as ReactElement<{
			id: string;
			children: ReactElement;
		}>;
		expect(isValidElement(element)).toBe(true);
		expect(element.type).toBe(WithTheme);
		expect(element.props.id).toBe("system7-color");
		expect(isValidElement(element.props.children)).toBe(true);
		expect(element.props.children.type).toBe("p");
	});

	it("finds the System 7 story files", () => {
		expect(storyFiles.length).toBeGreaterThanOrEqual(8);
	});

	it.each(storyFiles)("%s keeps no copy of either helper", (file) => {
		const source = readFileSync(path.join(STORIES, file), "utf8");
		expect(source).not.toMatch(/\bfunction\s+WithTheme\b/);
		expect(source).not.toMatch(/\b(?:const|let|var)\s+(?:WithTheme|inColor)\b/);
		const uses = ["WithTheme", "inColor"].filter((name) =>
			new RegExp(`\\b${name}\\b`).test(source),
		);
		if (uses.length === 0) return;
		const imported = source.match(
			/import\s*\{([^}]*)\}\s*from\s*"@sb\/system7";/,
		);
		expect(imported, `${file} imports from @sb/system7`).not.toBeNull();
		for (const name of uses)
			expect(imported?.[1]).toMatch(new RegExp(`\\b${name}\\b`));
	});
});
