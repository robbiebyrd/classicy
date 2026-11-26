// A pop-up whose choices are the user's (Find File's location names their
// disks) reports a choice to analytics without naming it (story 0227-815,
// fix round 1).
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";

const analytics = vi.hoisted(() => ({ track: [] as unknown[][] }));
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	async (importOriginal) => ({
		...(await importOriginal<object>()),
		useClassicyAnalytics: () => ({
			track: (...args: unknown[]) => analytics.track.push(args),
			page: () => {},
		}),
	}),
);

const choose = (id: string, label: string) => {
	fireEvent.click(document.getElementById(id) as HTMLElement);
	fireEvent.click(within(screen.getByRole("listbox")).getByText(label));
};

describe("ClassicyPopUpMenu analyticsPrivate", () => {
	beforeEach(() => {
		analytics.track.length = 0;
	});

	it("tracks a choice without the item, the options or the current choice", () => {
		render(
			<div id="classicyDesktop">
				<ClassicyPopUpMenu
					id="where"
					analyticsPrivate
					selected="a"
					options={[
						{ value: "a", label: "on “Family Photos”" },
						{ value: "b", label: "on “Tax Returns”" },
					]}
				/>
			</div>,
		);
		choose("where", "on “Tax Returns”");
		expect(analytics.track).toEqual([
			[
				"selected",
				{ type: "ClassicyPopUpMenu", id: "where", label: undefined },
			],
		]);
	});

	it("tracks the whole choice otherwise", () => {
		render(
			<div id="classicyDesktop">
				<ClassicyPopUpMenu
					id="font"
					selected="a"
					options={[
						{ value: "a", label: "Charcoal" },
						{ value: "b", label: "Geneva" },
					]}
				/>
			</div>,
		);
		choose("font", "Geneva");
		expect(analytics.track[0][1]).toMatchObject({
			itemId: "b",
			selected: "a",
			options: [
				{ value: "a", label: "Charcoal" },
				{ value: "b", label: "Geneva" },
			],
		});
	});
});
