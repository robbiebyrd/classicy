import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { render } from "@/__tests__/test-utils";
import { ClassicyScreenSaverConfigForm } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverConfigForm";

// The option rows of Platinum's savers are pinned in its own suite
// (packages/appearance/platinum/src/screenSavers/platinumScreenSaverForms.test.tsx).
describe("ClassicyScreenSaverConfigForm DOM", () => {
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
