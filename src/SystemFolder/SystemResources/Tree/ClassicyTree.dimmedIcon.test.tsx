import { describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicyTree } from "@/SystemFolder/SystemResources/Tree/ClassicyTree";

// Story 0217-etx: a row that cannot be chosen dims its icon by the active
// package's `iconDimming.disabledItem` rule (System 7.5's Save box dims the
// files' icons, `*-dialog-standardfile-save.png`); a row that can be chosen
// asks for no dimming.

const dimmingCalls = vi.hoisted(
	() => [] as { src: string; dimmed: boolean; purpose?: string }[],
);

vi.mock("@/Appearance/ClassicyIconDimming", async (importOriginal) => {
	const original =
		await importOriginal<typeof import("@/Appearance/ClassicyIconDimming")>();
	return {
		...original,
		useClassicyDimmedIconImage: (
			src: string,
			dimmed: boolean,
			purpose?: string,
		) => {
			dimmingCalls.push({ src, dimmed, purpose });
			return { image: src, drawsDimmedImage: dimmed };
		},
	};
});

describe("ClassicyTree's icons", () => {
	it("dims a disabled row's icon for the disabledItem purpose, and no other", () => {
		const { container } = render(
			<ClassicyTree
				nodes={[
					{ id: "folder", label: "Apple Extras", leftIcon: "folder.png" },
					{
						id: "file",
						label: "SimpleText",
						leftIcon: "app.png",
						disabled: true,
					},
				]}
			/>,
		);
		const icon = (src: string) =>
			container.querySelector(`.classicyTreeNodeIcon[src="${src}"]`);
		expect(icon("app.png")?.classList.contains("classicyIconDimmedImage")).toBe(
			true,
		);
		expect(
			icon("folder.png")?.classList.contains("classicyIconDimmedImage"),
		).toBe(false);
		expect(dimmingCalls).toContainEqual({
			src: "app.png",
			dimmed: true,
			purpose: "disabledItem",
		});
		expect(
			dimmingCalls.filter((call) => call.src === "folder.png" && call.dimmed),
		).toEqual([]);
	});
});
