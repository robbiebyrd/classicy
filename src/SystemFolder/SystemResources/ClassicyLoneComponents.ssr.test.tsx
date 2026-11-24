// @vitest-environment node
// Lone components, rendered outside a desktop (a host's own page), server-
// render in full: unlike ClassicyDesktop, which draws a shell there (story
// 0223-a0y), they read no saved state and no asset URL relative to the
// bundle.
import "@/__tests__/withPlatinum";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicyProgressBar } from "@/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar";

describe("lone components under server rendering", () => {
	const logged: unknown[][] = [];
	beforeEach(() => {
		for (const name of ["window", "document", "localStorage", "navigator"])
			vi.stubGlobal(name, undefined);
		// Errors only: a lone component without a provider warns, in development
		// builds and on the client too, that analytics are off (classicyLog's
		// console mirror drops warnings in production).
		vi.spyOn(console, "error").mockImplementation((...args) => {
			logged.push(args);
		});
		logged.length = 0;
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it.each([
		["ClassicyButton", () => <ClassicyButton>OK</ClassicyButton>, /OK/],
		[
			"ClassicyCheckbox",
			() => <ClassicyCheckbox id="c" label="Sound" checked />,
			/Sound/,
		],
		[
			"ClassicyInput",
			() => <ClassicyInput id="i" placeholder="Name" />,
			/Name/,
		],
		[
			"ClassicyPopUpMenu",
			() => (
				<ClassicyPopUpMenu
					id="p"
					selected="a"
					options={[
						{ value: "a", label: "Alpha" },
						{ value: "b", label: "Beta" },
					]}
				/>
			),
			/Alpha/,
		],
		["ClassicyProgressBar", () => <ClassicyProgressBar value={40} />, /<div/],
	])("renders %s in full, without an error", (_name, element, content) => {
		const html = renderToString(element());
		expect(html).toMatch(content);
		expect(html).not.toContain("file://");
		expect(logged).toEqual([]);
	});
});
