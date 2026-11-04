import { describe, expect, it } from "vitest";
import {
	parseStoryList,
	storyIdsFromIndex,
	storyUrl,
} from "./parityStories.ts";

describe("storyIdsFromIndex", () => {
	const index = {
		v: 5,
		entries: {
			"b--two": { id: "b--two", type: "story", title: "B" },
			"a--docs": { id: "a--docs", type: "docs", title: "A" },
			"a--one": { id: "a--one", type: "story", title: "A" },
			"c--three": { id: "c--three", type: "story", title: "C" },
		},
	};

	it("lists the story entries, sorted, without docs", () =>
		expect(storyIdsFromIndex(index)).toEqual(["a--one", "b--two", "c--three"]));

	it("applies the filter to the ids", () =>
		expect(storyIdsFromIndex(index, /^(a|c)-/)).toEqual([
			"a--one",
			"c--three",
		]));

	it("throws on something that is not a Storybook index", () =>
		expect(() => storyIdsFromIndex({ stories: [] })).toThrow(/index\.json/));
});

describe("parseStoryList", () => {
	it("reads one id per line, ignoring blanks and # comments", () =>
		expect(parseStoryList("a--one\n\n# note\n  b--two  \n", /^a/)).toEqual([
			"a--one",
		]));
});

describe("storyUrl", () => {
	it("builds the iframe URL for one story", () =>
		expect(storyUrl("http://localhost:6091", "controls-button--default")).toBe(
			"http://localhost:6091/iframe.html?id=controls-button--default&viewMode=story",
		));
});
