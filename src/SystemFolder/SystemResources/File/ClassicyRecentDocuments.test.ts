import { describe, expect, it, vi } from "vitest";
import {
	CLASSICY_RECENT_DOCUMENTS_LIMIT,
	getClassicyRecentDocuments,
	noteClassicyRecentDocument,
	renameClassicyRecentDocuments,
	resetClassicyRecentDocuments,
	subscribeClassicyRecentDocuments,
} from "@/SystemFolder/SystemResources/File/ClassicyRecentDocuments.internal";

// Plan 0020-w98 E2: the session's recent documents, Start ▸ Documents'
// list, as Windows 98's Recent folder fed its Documents menu. The test setup
// empties the list before each test.

describe("the recent documents", () => {
	it("starts empty, and lists each document opened, most recent first, once", () => {
		expect(getClassicyRecentDocuments()).toEqual([]);
		noteClassicyRecentDocument("HD:a.txt");
		noteClassicyRecentDocument("HD:b.txt");
		noteClassicyRecentDocument("HD:a.txt");
		expect(getClassicyRecentDocuments()).toEqual(["HD:a.txt", "HD:b.txt"]);
	});

	it("keeps at most 15, as Windows 98's Documents menu", () => {
		expect(CLASSICY_RECENT_DOCUMENTS_LIMIT).toBe(15);
		for (let i = 0; i < 20; i++) noteClassicyRecentDocument(`HD:${i}.txt`);
		const listed = getClassicyRecentDocuments();
		expect(listed).toHaveLength(15);
		expect(listed[0]).toBe("HD:19.txt");
		expect(listed.at(-1)).toBe("HD:5.txt");
	});

	it("ignores an empty path", () => {
		noteClassicyRecentDocument("");
		expect(getClassicyRecentDocuments()).toEqual([]);
	});

	it("follows a moved document, and the documents inside a moved folder", () => {
		noteClassicyRecentDocument("HD:Docs:a.txt");
		noteClassicyRecentDocument("HD:b.txt");
		noteClassicyRecentDocument("HD:Docsy:c.txt");
		renameClassicyRecentDocuments([
			{ from: "HD:Docs", to: "HD:Archive:Docs" },
			{ from: "HD:b.txt", to: "Trash:b.txt" },
		]);
		expect(getClassicyRecentDocuments()).toEqual([
			"HD:Docsy:c.txt",
			"Trash:b.txt",
			"HD:Archive:Docs:a.txt",
		]);
	});

	it("keeps the more recent of two documents a move lands on one path", () => {
		noteClassicyRecentDocument("HD:old.txt");
		noteClassicyRecentDocument("HD:new.txt");
		renameClassicyRecentDocuments([{ from: "HD:old.txt", to: "HD:new.txt" }]);
		expect(getClassicyRecentDocuments()).toEqual(["HD:new.txt"]);
	});

	it("notifies its subscribers on a change only, and empties on reset", () => {
		const listener = vi.fn();
		const unsubscribe = subscribeClassicyRecentDocuments(listener);
		noteClassicyRecentDocument("HD:a.txt");
		noteClassicyRecentDocument("HD:a.txt");
		renameClassicyRecentDocuments([{ from: "HD:x", to: "HD:y" }]);
		expect(listener).toHaveBeenCalledOnce();
		resetClassicyRecentDocuments();
		expect(getClassicyRecentDocuments()).toEqual([]);
		expect(listener).toHaveBeenCalledTimes(2);
		unsubscribe();
		noteClassicyRecentDocument("HD:b.txt");
		expect(listener).toHaveBeenCalledTimes(2);
	});
});
