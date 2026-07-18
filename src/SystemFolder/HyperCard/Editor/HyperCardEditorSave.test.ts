import { afterEach, describe, expect, it, vi } from "vitest";
import {
	downloadStack,
	serializeStack,
	stackFileName,
} from "@/SystemFolder/HyperCard/Editor/HyperCardEditorSave";
import type { HCStack } from "@/SystemFolder/HyperCard/HyperCardModel";

const stack: HCStack = { name: "My Stack!", cards: [{ id: "c1" }] };

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("serializeStack", () => {
	it("round-trips through JSON.parse and ends with a newline", () => {
		const text = serializeStack(stack);
		expect(text.endsWith("\n")).toBe(true);
		expect(JSON.parse(text)).toEqual(stack);
	});
});

describe("stackFileName", () => {
	it("slugifies the stack name", () => {
		expect(stackFileName(stack)).toBe("my-stack.stack.json");
		expect(stackFileName({ name: "  ", cards: [{ id: "c" }] })).toBe(
			"untitled.stack.json",
		);
	});
});

describe("downloadStack", () => {
	it("returns validation errors without downloading an invalid stack", () => {
		const click = vi.fn();
		vi.spyOn(document, "createElement").mockReturnValue({
			click,
			set href(_: string) {},
			set download(_: string) {},
		} as unknown as HTMLAnchorElement);
		const result = downloadStack({ name: "", cards: [] } as unknown as HCStack);
		expect(result.ok).toBe(false);
		if (result.ok === false) expect(result.errors.length).toBeGreaterThan(0);
		expect(click).not.toHaveBeenCalled();
	});

	it("creates and clicks a download anchor for a valid stack", () => {
		const click = vi.fn();
		const anchor = {
			click,
			href: "",
			download: "",
		} as unknown as HTMLAnchorElement;
		vi.spyOn(document, "createElement").mockReturnValue(anchor);
		vi.stubGlobal("URL", {
			createObjectURL: vi.fn(() => "blob:x"),
			revokeObjectURL: vi.fn(),
		});
		const result = downloadStack(stack);
		expect(result.ok).toBe(true);
		expect(anchor.download).toBe("my-stack.stack.json");
		expect(click).toHaveBeenCalledOnce();
	});
});
