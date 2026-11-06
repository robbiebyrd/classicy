import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { render } from "@/__tests__/test-utils";
// Register the built-ins so every bundled saver's schema form is covered.
import "@/SystemFolder/Extensions/ScreenSaver/savers/ClassicyScreenSaverBuiltIns";
import { ClassicyScreenSaverConfigForm } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverConfigForm";
import {
	listClassicyScreenSavers,
	resolveScreenSaverConfig,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";

type OptionRow = { id: string; element: string; label: string | null };

/** Every control the form renders, in document order: id, element type, label. */
const describeOptionRows = (container: HTMLElement): OptionRow[] =>
	Array.from(
		container.querySelectorAll<HTMLElement>("[id^='ScreenSaver_']"),
	).map((el) => {
		const type = el.getAttribute("type");
		const label = container.querySelector(`label[for="${el.id}"]`);
		return {
			id: el.id,
			element: type
				? `${el.tagName.toLowerCase()}[${type}]`
				: el.tagName.toLowerCase(),
			label: label?.textContent?.trim() ?? null,
		};
	});

describe("ClassicyScreenSaverConfigForm DOM", () => {
	// Pins the Screen Saver options rows (ids, element types, labels) for every
	// bundled saver with a config schema, so moving the form onto
	// ClassicySchemaForm cannot change what the control panel renders.
	it("renders the same option rows for every bundled saver", () => {
		const rows: Record<string, OptionRow[]> = {};
		for (const saver of listClassicyScreenSavers()) {
			if (!saver.configSchema) continue;
			const { container, unmount } = render(
				<ClassicyScreenSaverConfigForm
					saver={saver}
					config={resolveScreenSaverConfig(saver, undefined)}
					onChange={vi.fn()}
				/>,
			);
			rows[saver.id] = describeOptionRows(container);
			unmount();
		}
		expect(rows).toMatchInlineSnapshot(`
			{
			  "bouncing-ball": [
			    {
			      "element": "input[number]",
			      "id": "ScreenSaver_bouncing-ball_balls",
			      "label": "Number of bouncing balls.",
			    },
			  ],
			  "fish": [
			    {
			      "element": "input[number]",
			      "id": "ScreenSaver_fish_fish",
			      "label": "How many fish swim in the aquarium.",
			    },
			  ],
			  "flying-toasters": [
			    {
			      "element": "input[number]",
			      "id": "ScreenSaver_flying-toasters_toasters",
			      "label": "How many toasters fly past.",
			    },
			    {
			      "element": "input[number]",
			      "id": "ScreenSaver_flying-toasters_toast",
			      "label": "How many slices of toast fly along.",
			    },
			  ],
			  "hard-rain": [
			    {
			      "element": "input[number]",
			      "id": "ScreenSaver_hard-rain_drops",
			      "label": "Number of expanding raindrop rings.",
			    },
			  ],
			  "logo": [
			    {
			      "element": "input[text]",
			      "id": "ScreenSaver_logo_logo",
			      "label": "Logo",
			    },
			  ],
			  "messages": [
			    {
			      "element": "input[text]",
			      "id": "ScreenSaver_messages_text",
			      "label": "The message to crawl.",
			    },
			    {
			      "element": "input[number]",
			      "id": "ScreenSaver_messages_speedSeconds",
			      "label": "Seconds one crawl across the screen takes.",
			    },
			  ],
			  "messages2": [
			    {
			      "element": "input[text]",
			      "id": "ScreenSaver_messages2_text",
			      "label": "The message that bounces around the screen.",
			    },
			  ],
			  "rainstorm": [
			    {
			      "element": "button[button]",
			      "id": "ScreenSaver_rainstorm_intensity",
			      "label": "How many layers of rain fall.",
			    },
			    {
			      "element": "input[checkbox]",
			      "id": "ScreenSaver_rainstorm_lightning",
			      "label": "Flash lightning every few seconds.",
			    },
			  ],
			  "warp": [
			    {
			      "element": "input[number]",
			      "id": "ScreenSaver_warp_layers",
			      "label": "Star density",
			    },
			  ],
			}
		`);
	});

	it("patches a nested option's top-level key with a copy holding the new value", () => {
		const onChange = vi.fn();
		const config = { trail: { length: 3, fade: true }, count: 2 };
		render(
			<ClassicyScreenSaverConfigForm
				saver={{
					id: "nested-test",
					name: "Nested Test",
					component: () => null,
					configSchema: z.object({
						trail: z.object({ length: z.number(), fade: z.boolean() }),
						count: z.number(),
					}),
				}}
				config={config}
				onChange={onChange}
			/>,
		);
		fireEvent.change(
			document.getElementById(
				"ScreenSaver_nested-test_trail.length",
			) as HTMLElement,
			{ target: { value: "5" } },
		);
		expect(onChange).toHaveBeenLastCalledWith({
			trail: { length: 5, fade: true },
		});
		fireEvent.change(
			document.getElementById("ScreenSaver_nested-test_count") as HTMLElement,
			{ target: { value: "4" } },
		);
		expect(onChange).toHaveBeenLastCalledWith({ count: 4 });
		// The saver's config object is never mutated.
		expect(config.trail.length).toBe(3);
	});
});
