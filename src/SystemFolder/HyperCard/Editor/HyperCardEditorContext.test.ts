import { describe, expect, it } from "vitest";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyHyperCardEditorEventHandler } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorContext";
import type { HCEditState } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";
import type { HCStack } from "@/SystemFolder/HyperCard/HyperCardModel";

const APP_ID = "HyperCard.app";

const demoStack: HCStack = {
	name: "Demo",
	backgrounds: [{ id: "bg1", parts: [{ id: "banner1", type: "label" }] }],
	cards: [
		{
			id: "c1",
			name: "One",
			background: "bg1",
			parts: [{ id: "button1", type: "button", rect: [10, 10, 100, 24] }],
		},
		{ id: "c2", name: "Two" },
	],
};

function makeStore(): ClassicyStore {
	return {
		System: {
			Manager: {
				Applications: {
					focusedAppId: APP_ID,
					fileTypeHandlers: {},
					apps: {
						[APP_ID]: {
							id: APP_ID,
							name: "HyperCard",
							icon: "icon.png",
							windows: [],
							open: true,
							data: {
								openStacks: {
									demo: {
										stackSource: "demo",
										stack: JSON.parse(JSON.stringify(demoStack)),
										currentCardId: "c1",
										history: [],
										variables: {},
										fieldValues: {},
										partVisibility: {},
										fieldRev: {},
									},
								},
								activeStackId: "demo",
							},
						},
					},
				},
			},
		},
	} as unknown as ClassicyStore;
}

function dispatch(store: ClassicyStore, action: Record<string, unknown>) {
	classicyHyperCardEditorEventHandler(store, action as never);
}

function edit(store: ClassicyStore): HCEditState {
	const data = store.System.Manager.Applications.apps[APP_ID].data as {
		edits?: Record<string, HCEditState>;
	};
	return data.edits!.demo;
}

function enter(store: ClassicyStore) {
	dispatch(store, { type: "ClassicyAppHCEditEnter", stackId: "demo" });
}

describe("classicyHyperCardEditorEventHandler", () => {
	it("Enter seeds an independent draft from the open stack", () => {
		const store = makeStore();
		enter(store);
		const e = edit(store);
		expect(e.draft).toEqual(demoStack);
		expect(e.currentCardId).toBe("c1");
		expect(e.tool).toBe("pointer");
		expect(e.dirty).toBe(false);
		// The draft is a copy — editing must not touch the player's stack.
		dispatch(store, {
			type: "ClassicyAppHCEditSetRect",
			stackId: "demo",
			partId: "button1",
			rect: [50, 60, 100, 24],
		});
		const data = store.System.Manager.Applications.apps[APP_ID].data as {
			openStacks: Record<string, { stack: HCStack }>;
		};
		expect(data.openStacks.demo.stack.cards[0].parts![0].rect).toEqual([
			10, 10, 100, 24,
		]);
		expect(edit(store).draft.cards[0].parts![0].rect).toEqual([
			50, 60, 100, 24,
		]);
	});

	it("SetRect clamps position to >=0 and size to >=8", () => {
		const store = makeStore();
		enter(store);
		dispatch(store, {
			type: "ClassicyAppHCEditSetRect",
			stackId: "demo",
			partId: "button1",
			rect: [-5, -5, 2, 2],
		});
		expect(edit(store).draft.cards[0].parts![0].rect).toEqual([0, 0, 8, 8]);
	});

	it("AddPart creates a descriptor-shaped part with a fresh id and selects it", () => {
		const store = makeStore();
		enter(store);
		dispatch(store, {
			type: "ClassicyAppHCEditAddPart",
			stackId: "demo",
			partType: "button",
			at: [40, 50],
		});
		const e = edit(store);
		const parts = e.draft.cards[0].parts!;
		expect(parts).toHaveLength(2);
		expect(parts[1]).toMatchObject({
			id: "button2",
			type: "button",
			rect: [40, 50, 100, 24],
		});
		expect(e.selectedPartId).toBe("button2");
	});

	it("AddPart targets the background layer when active", () => {
		const store = makeStore();
		enter(store);
		dispatch(store, {
			type: "ClassicyAppHCEditSetLayer",
			stackId: "demo",
			layer: "background",
		});
		dispatch(store, {
			type: "ClassicyAppHCEditAddPart",
			stackId: "demo",
			partType: "label",
			at: [0, 0],
		});
		expect(edit(store).draft.backgrounds![0].parts).toHaveLength(2);
	});

	it("DeletePart removes and deselects", () => {
		const store = makeStore();
		enter(store);
		dispatch(store, {
			type: "ClassicyAppHCEditSelect",
			stackId: "demo",
			partId: "button1",
		});
		dispatch(store, {
			type: "ClassicyAppHCEditDeletePart",
			stackId: "demo",
			partId: "button1",
		});
		const e = edit(store);
		expect(e.draft.cards[0].parts).toHaveLength(0);
		expect(e.selectedPartId).toBeUndefined();
	});

	it("Copy/Paste duplicates with a fresh id offset by 16,16", () => {
		const store = makeStore();
		enter(store);
		dispatch(store, {
			type: "ClassicyAppHCEditCopyPart",
			stackId: "demo",
			partId: "button1",
		});
		dispatch(store, { type: "ClassicyAppHCEditPastePart", stackId: "demo" });
		const parts = edit(store).draft.cards[0].parts!;
		expect(parts).toHaveLength(2);
		expect(parts[1].id).toBe("button2");
		expect(parts[1].rect).toEqual([26, 26, 100, 24]);
	});

	it("Undo restores the previous draft; Redo re-applies; both stay dirty", () => {
		const store = makeStore();
		enter(store);
		dispatch(store, {
			type: "ClassicyAppHCEditSetRect",
			stackId: "demo",
			partId: "button1",
			rect: [50, 60, 100, 24],
		});
		dispatch(store, { type: "ClassicyAppHCEditUndo", stackId: "demo" });
		expect(edit(store).draft.cards[0].parts![0].rect).toEqual([
			10, 10, 100, 24,
		]);
		dispatch(store, { type: "ClassicyAppHCEditRedo", stackId: "demo" });
		expect(edit(store).draft.cards[0].parts![0].rect).toEqual([
			50, 60, 100, 24,
		]);
		expect(edit(store).dirty).toBe(true);
	});

	it("AddCard inserts after current inheriting the background and navigates", () => {
		const store = makeStore();
		enter(store);
		dispatch(store, { type: "ClassicyAppHCEditAddCard", stackId: "demo" });
		const e = edit(store);
		expect(e.draft.cards.map((c) => c.id)).toEqual(["c1", "card1", "c2"]);
		expect(e.draft.cards[1].background).toBe("bg1");
		expect(e.currentCardId).toBe("card1");
	});

	it("DeleteCard refuses to delete the last card", () => {
		const store = makeStore();
		enter(store);
		dispatch(store, {
			type: "ClassicyAppHCEditSetCard",
			stackId: "demo",
			to: "c2",
		});
		dispatch(store, { type: "ClassicyAppHCEditDeleteCard", stackId: "demo" });
		let e = edit(store);
		expect(e.draft.cards.map((c) => c.id)).toEqual(["c1"]);
		expect(e.currentCardId).toBe("c1");
		dispatch(store, { type: "ClassicyAppHCEditDeleteCard", stackId: "demo" });
		e = edit(store);
		expect(e.draft.cards).toHaveLength(1);
	});

	it("SetCard resolves next/prev keywords against the draft", () => {
		const store = makeStore();
		enter(store);
		dispatch(store, {
			type: "ClassicyAppHCEditSetCard",
			stackId: "demo",
			to: "next",
		});
		expect(edit(store).currentCardId).toBe("c2");
	});

	it("Exit discards the edit session; MarkSaved clears dirty", () => {
		const store = makeStore();
		enter(store);
		dispatch(store, {
			type: "ClassicyAppHCEditSetRect",
			stackId: "demo",
			partId: "button1",
			rect: [50, 60, 100, 24],
		});
		dispatch(store, { type: "ClassicyAppHCEditMarkSaved", stackId: "demo" });
		expect(edit(store).dirty).toBe(false);
		dispatch(store, { type: "ClassicyAppHCEditExit", stackId: "demo" });
		const data = store.System.Manager.Applications.apps[APP_ID].data as {
			edits?: Record<string, HCEditState>;
		};
		expect(data.edits?.demo).toBeUndefined();
	});
});
