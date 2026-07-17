import { describe, expect, it } from "vitest";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyHyperCardEventHandler } from "@/SystemFolder/HyperCard/HyperCardContext";
import type { HCStack } from "@/SystemFolder/HyperCard/HyperCardModel";
import {
	type HyperCardData,
	isHyperCardData,
} from "@/SystemFolder/HyperCard/HyperCardUtils";

const APP_ID = "HyperCard.app";

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
							open: false,
							data: {},
						},
					},
				},
			},
		},
	} as unknown as ClassicyStore;
}

function data(store: ClassicyStore): HyperCardData {
	return store.System.Manager.Applications.apps[APP_ID]
		.data as unknown as HyperCardData;
}

const demoStack: HCStack = {
	name: "Demo",
	variables: { score: 0 },
	cards: [
		{
			id: "c1",
			name: "One",
			parts: [
				{
					id: "next",
					type: "button",
					script: { onMouseUp: [{ do: "go", to: "next" }] },
				},
				{ id: "note", type: "field", content: "hi" },
			],
		},
		{
			id: "c2",
			name: "Two",
			script: {
				onMouseUp: [
					{ do: "answer", message: "On card two?", buttons: ["Yes", "No"] },
					{ do: "put", value: "it", var: "answer" },
				],
			},
		},
	],
};

function dispatch(store: ClassicyStore, action: Record<string, unknown>) {
	classicyHyperCardEventHandler(store, action as never);
}

describe("classicyHyperCardEventHandler", () => {
	it("opens a stack and marks the app open", () => {
		const store = makeStore();
		dispatch(store, {
			type: "ClassicyAppHyperCardOpenStack",
			stackId: "demo",
			stack: demoStack,
		});
		expect(store.System.Manager.Applications.apps[APP_ID].open).toBe(true);
		expect(isHyperCardData(data(store))).toBe(true);
		expect(data(store).activeStackId).toBe("demo");
		expect(data(store).openStacks.demo.currentCardId).toBe("c1");
	});

	it("runs a button's mouseUp handler to navigate", () => {
		const store = makeStore();
		dispatch(store, {
			type: "ClassicyAppHyperCardOpenStack",
			stackId: "demo",
			stack: demoStack,
		});
		dispatch(store, {
			type: "ClassicyAppHyperCardEvent",
			partId: "next",
			event: "onMouseUp",
		});
		expect(data(store).openStacks.demo.currentCardId).toBe("c2");
	});

	it("commits a field edit and lets a script read it back", () => {
		const store = makeStore();
		dispatch(store, {
			type: "ClassicyAppHyperCardOpenStack",
			stackId: "demo",
			stack: demoStack,
		});
		dispatch(store, {
			type: "ClassicyAppHyperCardCommitField",
			partId: "note",
			value: "edited",
		});
		expect(data(store).openStacks.demo.fieldValues["card:c1:note"]).toBe(
			"edited",
		);
	});

	it("suspends on a dialog and resumes via DialogResponse", () => {
		const store = makeStore();
		dispatch(store, {
			type: "ClassicyAppHyperCardOpenStack",
			stackId: "demo",
			stack: demoStack,
		});
		dispatch(store, {
			type: "ClassicyAppHyperCardEvent",
			partId: "next",
			event: "onMouseUp",
		});
		// Now on c2; fire its card-level mouseUp which triggers an answer dialog.
		dispatch(store, {
			type: "ClassicyAppHyperCardEvent",
			event: "onMouseUp",
		});
		const rt = data(store).openStacks.demo.runtime;
		expect(rt.status).toBe("awaitingDialog");
		const token = rt.dialog?.token;
		dispatch(store, {
			type: "ClassicyAppHyperCardDialogResponse",
			token,
			result: "Yes",
		});
		expect(data(store).openStacks.demo.runtime.status).toBe("idle");
		expect(data(store).openStacks.demo.variables.answer).toBe("Yes");
	});

	it("consumes pending effects by id", () => {
		const store = makeStore();
		const stack: HCStack = {
			name: "S",
			cards: [
				{
					id: "c1",
					parts: [
						{
							id: "b",
							type: "button",
							script: { onMouseUp: [{ do: "beep" }] },
						},
					],
				},
			],
		};
		dispatch(store, {
			type: "ClassicyAppHyperCardOpenStack",
			stackId: "s",
			stack,
		});
		dispatch(store, {
			type: "ClassicyAppHyperCardEvent",
			partId: "b",
			event: "onMouseUp",
		});
		const effects = data(store).openStacks.s.runtime.pendingEffects;
		expect(effects).toHaveLength(1);
		dispatch(store, {
			type: "ClassicyAppHyperCardConsumeEffects",
			stackId: "s",
			ids: effects.map((e) => e.id),
		});
		expect(data(store).openStacks.s.runtime.pendingEffects).toHaveLength(0);
	});
});
