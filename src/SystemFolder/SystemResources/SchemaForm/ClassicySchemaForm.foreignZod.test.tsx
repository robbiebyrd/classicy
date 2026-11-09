import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { render } from "@/__tests__/test-utils";
import { ClassicyScreenSaverConfigForm } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverConfigForm";
import type { ClassicyScreenSaverDefinition } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";
import { ClassicySchemaForm } from "@/SystemFolder/SystemResources/SchemaForm/ClassicySchemaForm";
import { classicyZodType } from "@/SystemFolder/SystemResources/SchemaForm/ClassicySchemaFormFields";

// A schema from "another copy of zod": vitest resolves one module graph per
// file, so a second copy of zod cannot be loaded here. Instead, every schema
// node is structurally cloned onto a plain prototype (Object.prototype), with
// the same definition data and no class traits (zod 4 answers `instanceof`
// from `_zod.traits`, so an empty set is what a copy that does not share the
// core's class names looks like), so `instanceof z.ZodX` against the core's
// classes is false at every level.
// Own plus inherited property descriptors (zod keeps getters such as
// `minValue` on the class prototype); nearer definitions win.
const inheritedDescriptors = (source: object): PropertyDescriptorMap => {
	const chain: object[] = [];
	for (
		let proto: object | null = source;
		proto && proto !== Object.prototype;
		proto = Object.getPrototypeOf(proto)
	)
		chain.unshift(proto);
	return Object.assign({}, ...chain.map(Object.getOwnPropertyDescriptors));
};

const foreignClone = <T,>(schema: T, seen = new Map<object, object>()): T => {
	const source = schema as unknown as object;
	const known = seen.get(source);
	if (known) return known as T;
	const zodInternals = (source as { _zod: { def: Record<string, unknown> } })
		._zod;
	const def = { ...zodInternals.def };
	if (def.shape) {
		def.shape = Object.fromEntries(
			Object.entries(def.shape as Record<string, object>).map(([k, v]) => [
				k,
				foreignClone(v, seen),
			]),
		);
	}
	const clone = Object.create(Object.prototype, {
		...inheritedDescriptors(source),
		_zod: {
			value: Object.create(Object.prototype, {
				...Object.getOwnPropertyDescriptors(zodInternals),
				def: { value: def, enumerable: true },
				traits: { value: new Set<string>(), enumerable: true },
			}),
		},
	});
	seen.set(source, clone);
	if (def.innerType) def.innerType = foreignClone(def.innerType, seen);
	return clone;
};

const buildSchemas = async () => {
	const core = z.looseObject({
		speed: z.number().min(1).max(10).default(5),
		trails: z.boolean().default(true),
		color: z.enum(["red", "blue"]).default("red"),
		label: z.string().optional(),
	});
	return { core, foreign: foreignClone(core) };
};

const values = { speed: 5, trails: true, color: "red", label: "hi" };

const expectAllFields = (prefix: string) => {
	expect(document.getElementById(`${prefix}_speed`)).not.toBeNull();
	expect(document.getElementById(`${prefix}_trails`)).not.toBeNull();
	expect(document.getElementById(`${prefix}_color`)).not.toBeNull();
	expect(document.getElementById(`${prefix}_label`)).not.toBeNull();
	expect(screen.getByRole("checkbox")).toBeTruthy();
	expect(screen.getByRole("combobox")).toBeTruthy();
	expect(screen.getByRole("spinbutton")).toBeTruthy();
	expect(screen.getByRole("textbox")).toBeTruthy();
};

describe("schema form with a schema from another zod copy", () => {
	it("really is a separate zod copy (the precondition)", async () => {
		const { core, foreign } = await buildSchemas();
		expect(core instanceof z.ZodObject).toBe(true);
		expect(foreign instanceof z.ZodObject).toBe(false);
		expect(classicyZodType(foreign)).toBe("object");
		expect(classicyZodType(core)).toBe("object");
		expect(classicyZodType({})).toBeUndefined();
		expect(classicyZodType(null)).toBeUndefined();
	});

	it.each([
		"core",
		"foreign",
	] as const)("renders every field of the %s schema", async (which) => {
		const schemas = await buildSchemas();
		render(
			<ClassicySchemaForm
				schema={schemas[which] as z.ZodObject<z.ZodRawShape>}
				values={values}
				idPrefix="T"
				onChange={vi.fn()}
			/>,
		);
		expectAllFields("T");
	});

	it.each([
		"core",
		"foreign",
	] as const)("ClassicyScreenSaverConfigForm renders the %s schema", async (which) => {
		const schemas = await buildSchemas();
		const saver = {
			id: "s",
			name: "S",
			component: () => null,
			configSchema: schemas[which],
		} as unknown as ClassicyScreenSaverDefinition;
		render(
			<ClassicyScreenSaverConfigForm
				saver={saver}
				config={values}
				onChange={vi.fn()}
			/>,
		);
		expectAllFields("ScreenSaver_s");
	});

	it("reads a foreign number's bounds and a foreign nested object", () => {
		const schema = foreignClone(
			z.object({ group: z.object({ n: z.number().min(2).max(4) }) }),
		);
		expect(schema instanceof z.ZodObject).toBe(false);
		const onChange = vi.fn();
		render(
			<ClassicySchemaForm
				schema={schema as unknown as z.ZodObject<z.ZodRawShape>}
				values={{ group: { n: 3 } }}
				idPrefix="T"
				onChange={onChange}
			/>,
		);
		const input = document.getElementById("T_group.n") as HTMLInputElement;
		expect(input).not.toBeNull();
		// The spinner clamps to the schema's bounds (read from the foreign number).
		fireEvent.change(input, { target: { value: "99" } });
		expect(onChange).toHaveBeenCalledWith(["group", "n"], 4);
		fireEvent.change(input, { target: { value: "0" } });
		expect(onChange).toHaveBeenCalledWith(["group", "n"], 2);
	});
});
