import { describe, expect, it } from "vitest";
import {
	consumeEffects,
	resumeDialog,
	resumeTransition,
	resumeWait,
	runPartEvent,
	runStackOpen,
	startRun,
} from "@/SystemFolder/HyperCard/HyperCardEngine";
import type {
	HCAction,
	HCStack,
} from "@/SystemFolder/HyperCard/HyperCardModel";
import {
	type HCOpenStack,
	makeInitialRuntime,
} from "@/SystemFolder/HyperCard/HyperCardUtils";

function openStackFrom(stack: HCStack): HCOpenStack {
	return {
		stackSource: "test",
		stack,
		currentCardId: stack.cards[0].id,
		history: [],
		variables: { ...(stack.variables ?? {}) },
		fieldValues: {},
		partVisibility: {},
		fieldRev: {},
		runtime: makeInitialRuntime(),
	};
}

function threeCardStack(): HCStack {
	return {
		name: "Test",
		cards: [
			{ id: "c1", name: "One" },
			{ id: "c2", name: "Two" },
			{ id: "c3", name: "Three" },
		],
	};
}

function run(open: HCOpenStack, actions: HCAction[]) {
	startRun(open, actions);
}

describe("HyperCardEngine navigation", () => {
	it("goes next / prev / first / last with wraparound", () => {
		const open = openStackFrom(threeCardStack());
		run(open, [{ do: "go", to: "next" }]);
		expect(open.currentCardId).toBe("c2");
		run(open, [{ do: "go", to: "last" }]);
		expect(open.currentCardId).toBe("c3");
		run(open, [{ do: "go", to: "next" }]);
		expect(open.currentCardId).toBe("c1"); // wraps
		run(open, [{ do: "go", to: "prev" }]);
		expect(open.currentCardId).toBe("c3"); // wraps back
		run(open, [{ do: "go", to: "first" }]);
		expect(open.currentCardId).toBe("c1");
	});

	it("goes to a card by id and by name", () => {
		const open = openStackFrom(threeCardStack());
		run(open, [{ do: "go", to: "c3" }]);
		expect(open.currentCardId).toBe("c3");
		run(open, [{ do: "go", to: "Two" }]);
		expect(open.currentCardId).toBe("c2");
	});

	it("supports go back via history", () => {
		const open = openStackFrom(threeCardStack());
		run(open, [{ do: "go", to: "c3" }]);
		run(open, [{ do: "go", to: "c2" }]);
		run(open, [{ do: "go", to: "back" }]);
		expect(open.currentCardId).toBe("c3");
	});

	it("runs onCloseCard then onOpenCard around a go", () => {
		const stack: HCStack = {
			name: "T",
			cards: [
				{
					id: "c1",
					script: { onCloseCard: [{ do: "put", value: "left1", var: "log" }] },
				},
				{
					id: "c2",
					script: { onOpenCard: [{ do: "put", value: "opened2", var: "log" }] },
				},
			],
		};
		const open = openStackFrom(stack);
		run(open, [{ do: "go", to: "c2" }]);
		expect(open.currentCardId).toBe("c2");
		expect(open.variables.log).toBe("opened2");
	});
});

describe("HyperCardEngine containers & arithmetic", () => {
	it("puts values into variables and does arithmetic", () => {
		const open = openStackFrom(threeCardStack());
		open.variables.score = 0;
		run(open, [
			{ do: "put", value: "10", var: "score" },
			{ do: "add", value: "5", var: "score" },
			{ do: "subtract", value: "2", var: "score" },
			{ do: "multiply", value: "2", var: "score" },
		]);
		expect(open.variables.score).toBe(26);
	});

	it("puts into a field and bumps its revision", () => {
		const stack: HCStack = {
			name: "T",
			cards: [{ id: "c1", parts: [{ id: "f1", type: "field", content: "x" }] }],
		};
		const open = openStackFrom(stack);
		run(open, [{ do: "put", value: '"hello"', field: "f1" }]);
		expect(open.fieldValues["card:c1:f1"]).toBe("hello");
		expect(open.fieldRev["card:c1:f1"]).toBe(1);
	});
});

describe("HyperCardEngine control flow", () => {
	it("takes the then / else branch of if", () => {
		const open = openStackFrom(threeCardStack());
		run(open, [
			{
				do: "if",
				condition: "1 = 1",
				then: [{ do: "put", value: "yes", var: "a" }],
				else: [{ do: "put", value: "no", var: "a" }],
			},
			{
				do: "if",
				condition: "1 = 2",
				then: [{ do: "put", value: "yes", var: "b" }],
				else: [{ do: "put", value: "no", var: "b" }],
			},
		]);
		expect(open.variables.a).toBe("yes");
		expect(open.variables.b).toBe("no");
	});

	it("runs a counted repeat", () => {
		const open = openStackFrom(threeCardStack());
		open.variables.n = 0;
		run(open, [
			{ do: "repeat", times: 5, body: [{ do: "add", value: "1", var: "n" }] },
		]);
		expect(open.variables.n).toBe(5);
	});

	it("runs a while repeat with the loop guard", () => {
		const open = openStackFrom(threeCardStack());
		open.variables.n = 0;
		run(open, [
			{
				do: "repeat",
				while: "n < 3",
				body: [{ do: "add", value: "1", var: "n" }],
			},
		]);
		expect(open.variables.n).toBe(3);
	});

	it("toggles part visibility with show / hide", () => {
		const open = openStackFrom(threeCardStack());
		run(open, [{ do: "hide", part: "b1" }]);
		expect(open.partVisibility.b1).toBe(false);
		run(open, [{ do: "show", part: "b1" }]);
		expect(open.partVisibility.b1).toBe(true);
	});
});

describe("HyperCardEngine effects & suspension", () => {
	it("queues beep effects with ids and consumes them", () => {
		const open = openStackFrom(threeCardStack());
		run(open, [{ do: "beep" }, { do: "beep" }]);
		expect(open.runtime.pendingEffects).toHaveLength(2);
		const ids = open.runtime.pendingEffects.map((e) => e.id);
		consumeEffects(open, [ids[0]]);
		expect(open.runtime.pendingEffects).toHaveLength(1);
		expect(open.runtime.pendingEffects[0].id).toBe(ids[1]);
	});

	it("suspends on answer and resumes, binding the button to it", () => {
		const open = openStackFrom(threeCardStack());
		run(open, [
			{ do: "answer", message: "Proceed?", buttons: ["OK", "Cancel"] },
			{ do: "put", value: "it", var: "choice" },
		]);
		expect(open.runtime.status).toBe("awaitingDialog");
		expect(open.runtime.dialog?.kind).toBe("answer");
		resumeDialog(open, "OK", open.runtime.dialog?.token);
		expect(open.runtime.status).toBe("idle");
		expect(open.variables.it).toBe("OK");
		expect(open.variables.choice).toBe("OK");
	});

	it("suspends on ask and writes the response into a container", () => {
		const open = openStackFrom(threeCardStack());
		run(open, [{ do: "ask", prompt: "Name?", var: "userName" }]);
		expect(open.runtime.status).toBe("awaitingDialog");
		resumeDialog(open, "Ada", open.runtime.dialog?.token);
		expect(open.variables.userName).toBe("Ada");
		expect(open.runtime.status).toBe("idle");
	});

	it("ignores a stale dialog token", () => {
		const open = openStackFrom(threeCardStack());
		run(open, [{ do: "answer", message: "?" }]);
		resumeDialog(open, "OK", "wrong-token");
		expect(open.runtime.status).toBe("awaitingDialog");
	});

	it("suspends on wait and resumes on its token", () => {
		const open = openStackFrom(threeCardStack());
		run(open, [
			{ do: "wait", ms: 500 },
			{ do: "put", value: "done", var: "state" },
		]);
		expect(open.runtime.status).toBe("awaitingWait");
		resumeWait(open, open.runtime.wait?.token);
		expect(open.variables.state).toBe("done");
		expect(open.runtime.status).toBe("idle");
	});

	it("suspends on a visual transition and resumes after completion", () => {
		const open = openStackFrom(threeCardStack());
		run(open, [
			{ do: "visual", effect: "dissolve" },
			{ do: "go", to: "c2" },
		]);
		expect(open.runtime.status).toBe("awaitingTransition");
		expect(open.currentCardId).toBe("c2"); // card already switched
		expect(open.runtime.transition?.effect).toBe("dissolve");
		resumeTransition(open, open.runtime.transition?.token);
		expect(open.runtime.status).toBe("idle");
	});

	it("gates re-entrant runs while suspended", () => {
		const open = openStackFrom(threeCardStack());
		run(open, [{ do: "answer", message: "?" }]);
		// A second event should be dropped while awaiting.
		run(open, [{ do: "put", value: "sneaky", var: "x" }]);
		expect(open.variables.x).toBeUndefined();
	});
});

describe("HyperCardEngine part & stack entry points", () => {
	it("runs a part's onMouseUp handler", () => {
		const stack: HCStack = {
			name: "T",
			cards: [
				{
					id: "c1",
					parts: [
						{
							id: "b1",
							type: "button",
							script: { onMouseUp: [{ do: "go", to: "c2" }] },
						},
					],
				},
				{ id: "c2" },
			],
		};
		const open = openStackFrom(stack);
		runPartEvent(open, "b1", "onMouseUp");
		expect(open.currentCardId).toBe("c2");
	});

	it("runs onOpenStack then the first card's onOpenCard", () => {
		const stack: HCStack = {
			name: "T",
			variables: { boot: "no" },
			stackScript: { onOpenStack: [{ do: "put", value: "yes", var: "boot" }] },
			cards: [
				{
					id: "c1",
					script: { onOpenCard: [{ do: "put", value: "1", var: "card" }] },
				},
			],
		};
		const open = openStackFrom(stack);
		runStackOpen(open);
		expect(open.variables.boot).toBe("yes");
		expect(open.variables.card).toBe(1); // numeric literal "1" evaluates to a number
	});
});
