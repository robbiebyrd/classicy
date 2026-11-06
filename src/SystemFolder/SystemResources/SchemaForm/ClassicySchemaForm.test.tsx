import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { render, userEvent } from "@/__tests__/test-utils";
import { ClassicySchemaForm } from "@/SystemFolder/SystemResources/SchemaForm/ClassicySchemaForm";
import {
	classicySchemaFieldId,
	classicySchemaFieldLabel,
	unwrapClassicySchemaField,
} from "@/SystemFolder/SystemResources/SchemaForm/ClassicySchemaFormFields";

const schema = z.object({
	on: z.boolean().describe("Enabled"),
	speed: z.number().min(1).max(9),
	mode: z.enum(["a", "b"]),
	name: z.string(),
	nested: z.object({ depth: z.number() }).describe("Nested group"),
});

const values = {
	on: true,
	speed: 3,
	mode: "b",
	name: "x",
	nested: { depth: 2 },
};

describe("ClassicySchemaForm", () => {
	it("renders one control per leaf with prefixed ids", () => {
		render(
			<ClassicySchemaForm
				schema={schema}
				values={values}
				idPrefix="T"
				onChange={vi.fn()}
			/>,
		);
		for (const id of ["T_on", "T_speed", "T_mode", "T_name", "T_nested.depth"])
			expect(document.getElementById(id)).not.toBeNull();
	});

	it("uses .describe() as the label and humanizes bare keys", () => {
		render(
			<ClassicySchemaForm
				schema={schema}
				values={values}
				idPrefix="T"
				onChange={vi.fn()}
			/>,
		);
		expect(screen.getByText("Enabled")).toBeInTheDocument();
		expect(screen.getByText("Speed")).toBeInTheDocument();
		expect(screen.getByText("Nested group")).toBeInTheDocument();
	});

	it("reports changes with the full path", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<ClassicySchemaForm
				schema={schema}
				values={values}
				idPrefix="T"
				onChange={onChange}
			/>,
		);
		fireEvent.change(document.getElementById("T_nested.depth") as HTMLElement, {
			target: { value: "7" },
		});
		expect(onChange).toHaveBeenCalledWith(["nested", "depth"], 7);
		// ClassicyPopUpMenu is an ARIA combobox with no native <select>, so the
		// option is picked through its listbox rather than a change event.
		await user.click(document.getElementById("T_mode") as HTMLElement);
		await user.click(screen.getByRole("option", { name: "a" }));
		expect(onChange).toHaveBeenCalledWith(["mode"], "a");
	});

	it("spinner takes min/max from the schema", () => {
		// ClassicySpinner clamps to minValue…maxValue instead of writing
		// min/max attributes, so the bounds show as the clamped value.
		render(
			<ClassicySchemaForm
				schema={schema}
				values={{ ...values, speed: 0 }}
				idPrefix="T"
				onChange={vi.fn()}
			/>,
		);
		const speed = document.getElementById("T_speed") as HTMLInputElement;
		expect(speed).toHaveValue(1);
		fireEvent.change(speed, { target: { value: "99" } });
		expect(speed).toHaveValue(9);
	});

	it("clamps a typed number to the schema's min and max before reporting it (J-R17)", () => {
		const onChange = vi.fn();
		render(
			<ClassicySchemaForm
				schema={schema}
				values={values}
				idPrefix="T"
				onChange={onChange}
			/>,
		);
		const speed = document.getElementById("T_speed") as HTMLInputElement;
		fireEvent.change(speed, { target: { value: "99" } });
		expect(speed).toHaveValue(9);
		expect(onChange).toHaveBeenLastCalledWith(["speed"], 9);
		fireEvent.change(speed, { target: { value: "-4" } });
		expect(speed).toHaveValue(1);
		expect(onChange).toHaveBeenLastCalledWith(["speed"], 1);
		// A field without .int() keeps its fraction.
		fireEvent.change(speed, { target: { value: "2.5" } });
		expect(onChange).toHaveBeenLastCalledWith(["speed"], 2.5);
	});

	it("rounds an integer field to a whole number before clamping (J-R17)", () => {
		const onChange = vi.fn();
		render(
			<ClassicySchemaForm
				schema={z.object({ count: z.number().int().min(2).max(10) })}
				values={{ count: 5 }}
				idPrefix="I"
				onChange={onChange}
			/>,
		);
		const count = document.getElementById("I_count") as HTMLInputElement;
		fireEvent.change(count, { target: { value: "6.6" } });
		expect(onChange).toHaveBeenLastCalledWith(["count"], 7);
		fireEvent.change(count, { target: { value: "10.4" } });
		expect(onChange).toHaveBeenLastCalledWith(["count"], 10);
		fireEvent.change(count, { target: { value: "1.4" } });
		expect(onChange).toHaveBeenLastCalledWith(["count"], 2);
	});

	it("reports nothing for an empty or non-numeric entry (J-R17)", () => {
		const onChange = vi.fn();
		render(
			<ClassicySchemaForm
				schema={schema}
				values={values}
				idPrefix="T"
				onChange={onChange}
			/>,
		);
		fireEvent.change(document.getElementById("T_speed") as HTMLElement, {
			target: { value: "" },
		});
		expect(onChange).not.toHaveBeenCalled();
	});

	it("reports checkbox and text changes with their paths", () => {
		const onChange = vi.fn();
		render(
			<ClassicySchemaForm
				schema={schema}
				values={values}
				idPrefix="T"
				onChange={onChange}
			/>,
		);
		fireEvent.click(document.getElementById("T_on") as HTMLElement);
		expect(onChange).toHaveBeenCalledWith(["on"], false);
		fireEvent.change(document.getElementById("T_name") as HTMLElement, {
			target: { value: "y" },
		});
		expect(onChange).toHaveBeenCalledWith(["name"], "y");
	});

	it("renders nothing for unsupported kinds and reads missing nested values as empty", () => {
		const { container } = render(
			<ClassicySchemaForm
				schema={z.object({
					list: z.array(z.string()),
					group: z.object({ size: z.number().optional() }).optional(),
				})}
				values={{}}
				idPrefix="U"
				onChange={vi.fn()}
			/>,
		);
		expect(container.querySelector("[id^='U_list']")).toBeNull();
		expect(document.getElementById("U_group.size")).toHaveValue(0);
		expect(screen.getByText("Group")).toBeInTheDocument();
	});

	it("classicySchemaFieldLabel", () => {
		expect(classicySchemaFieldLabel("cellHeight")).toBe("Cell height");
		expect(classicySchemaFieldLabel("x", "Given")).toBe("Given");
	});

	it("classicySchemaFieldId joins the prefix and path", () => {
		expect(classicySchemaFieldId("ScreenSaver_fish", ["fish"])).toBe(
			"ScreenSaver_fish_fish",
		);
		expect(classicySchemaFieldId("T", ["nested", "depth"])).toBe(
			"T_nested.depth",
		);
	});

	it("never gives a key with an underscore or a dot the id of a nested field", () => {
		const ids = [
			classicySchemaFieldId("T", ["a_b"]),
			classicySchemaFieldId("T", ["a", "b"]),
			classicySchemaFieldId("T", ["a.b"]),
			classicySchemaFieldId("T", ["a%2Eb"]),
		];
		expect(new Set(ids).size).toBe(ids.length);
		// Top-level keys keep their plain ids (the Screen Saver's ids).
		expect(ids[0]).toBe("T_a_b");
		render(
			<ClassicySchemaForm
				schema={z.object({
					a_b: z.number(),
					a: z.object({ b: z.number() }),
				})}
				values={{ a_b: 1, a: { b: 2 } }}
				idPrefix="T"
				onChange={vi.fn()}
			/>,
		);
		expect(document.getElementById(ids[0])).toHaveValue(1);
		expect(document.getElementById(ids[1])).toHaveValue(2);
	});

	it("unwrapClassicySchemaField peels wrappers and keeps the outermost description", () => {
		const { schema: inner, description } = unwrapClassicySchemaField(
			z.number().describe("inner").optional().default(1).describe("outer"),
		);
		expect(inner).toBeInstanceOf(z.ZodNumber);
		expect(description).toBe("outer");
	});
});
