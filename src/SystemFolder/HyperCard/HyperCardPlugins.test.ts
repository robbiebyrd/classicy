import { describe, expect, it } from "vitest";
import {
	resumeCustom,
	startRun,
} from "@/SystemFolder/HyperCard/HyperCardEngine";
import type { HCStack } from "@/SystemFolder/HyperCard/HyperCardModel";
import {
	getHyperCardCommand,
	getHyperCardEffectHandler,
	getHyperCardPart,
	getRegisteredStacks,
	type HyperCardPartComponent,
	registerHyperCardCommand,
	registerHyperCardEffectHandler,
	registerHyperCardPart,
	registerHyperCardStack,
} from "@/SystemFolder/HyperCard/HyperCardPlugins";
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

const oneCard: HCStack = { name: "T", cards: [{ id: "c1" }] };

describe("HyperCardPlugins registries", () => {
	it("registers and retrieves a part component", () => {
		const Comp: HyperCardPartComponent = () => null;
		registerHyperCardPart("testPart", Comp);
		expect(getHyperCardPart("testPart")).toBe(Comp);
		expect(getHyperCardPart("nope")).toBeUndefined();
	});

	it("registers and retrieves an effect handler", () => {
		const handler = () => {};
		registerHyperCardEffectHandler("testFx", handler);
		expect(getHyperCardEffectHandler("testFx")).toBe(handler);
	});

	it("registers a stack for the File menu", () => {
		registerHyperCardStack("stk1", "Stack One", oneCard);
		expect(getRegisteredStacks().some((s) => s.id === "stk1")).toBe(true);
	});
});

describe("HyperCardPlugins commands via the engine", () => {
	it("runs a synchronous command that mutates state", () => {
		registerHyperCardCommand("setScore", {
			run: (ctx, action) => {
				ctx.setVar("score", Number(action.value));
			},
		});
		expect(getHyperCardCommand("setScore")).toBeDefined();
		const open = openStackFrom(oneCard);
		startRun(open, [{ do: "setScore", value: 42 } as never]);
		expect(open.variables.score).toBe(42);
		expect(open.runtime.status).toBe("idle");
	});

	it("suspends on a blocking command and resumes with the result", () => {
		registerHyperCardCommand("loadThing", {
			run: (ctx, action) => {
				ctx.await("loadThing", { id: action.id }, { var: "thing" });
			},
		});
		const open = openStackFrom(oneCard);
		startRun(open, [
			{ do: "loadThing", id: "x" } as never,
			{ do: "put", value: "after", var: "phase" },
		]);
		// Suspended: a custom effect is queued and the next action hasn't run yet.
		expect(open.runtime.status).toBe("awaitingCustom");
		const fx = open.runtime.pendingEffects.find((e) => e.kind === "custom");
		expect(fx).toBeDefined();
		expect(open.variables.phase).toBeUndefined();
		const token = open.runtime.resume?.token;
		// Resolve → binds to `it` + container, then the rest of the handler runs.
		resumeCustom(open, "resolved-value", token);
		expect(open.variables.thing).toBe("resolved-value");
		expect(open.variables.it).toBe("resolved-value");
		expect(open.variables.phase).toBe("after");
		expect(open.runtime.status).toBe("idle");
	});

	it("queues a fire-and-forget effect without suspending", () => {
		registerHyperCardCommand("ping", {
			run: (ctx) => ctx.queueEffect("ping", { n: 1 }),
		});
		const open = openStackFrom(oneCard);
		startRun(open, [{ do: "ping" } as never]);
		expect(open.runtime.status).toBe("idle"); // not suspended
		const fx = open.runtime.pendingEffects.find(
			(e) => e.kind === "custom" && e.name === "ping",
		);
		expect(fx).toBeDefined();
		// Fire-and-forget: no resume token on the effect.
		expect((fx as { token?: string }).token).toBeUndefined();
	});

	it("ignores an unknown command without crashing", () => {
		const open = openStackFrom(oneCard);
		startRun(open, [{ do: "totallyUnknownCmd" } as never]);
		expect(open.runtime.status).toBe("idle");
	});
});
