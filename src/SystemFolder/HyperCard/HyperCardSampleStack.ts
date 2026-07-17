/**
 * A small built-in sample stack so HyperCard.app is usable out of the box. It
 * exercises navigation, visual effects, field get/set, arithmetic, if, beep,
 * and ask/answer dialogs. Richer JSON stacks can be loaded via OpenStack.
 */

import {
	type HCStack,
	validateStack,
} from "@/SystemFolder/HyperCard/HyperCardModel";
import featuresStackJson from "@/SystemFolder/HyperCard/stacks/features.stack.json";

export const HyperCardWelcomeStack: HCStack = {
	name: "Welcome to HyperCard",
	version: "2",
	size: [420, 300],
	backgrounds: [
		{
			id: "main",
			parts: [
				{
					id: "footer",
					type: "label",
					shared: true,
					rect: [16, 272, 388, 20],
					content: "Classicy HyperCard — a JSON-driven stack player",
				},
			],
		},
	],
	cards: [
		{
			id: "home",
			name: "Home",
			background: "main",
			parts: [
				{
					id: "title",
					type: "label",
					rect: [16, 16, 388, 24],
					content: "HyperCard",
				},
				{
					id: "greeting",
					type: "field",
					rect: [16, 52, 388, 60],
					locked: true,
					content: "Welcome! Click a button below to explore the stack.",
				},
				{
					id: "beep",
					type: "button",
					name: "Beep",
					rect: [16, 130, 100, 28],
					script: { onMouseUp: [{ do: "beep" }] },
				},
				{
					id: "next",
					type: "button",
					name: "Next Card →",
					rect: [280, 130, 124, 28],
					script: {
						onMouseUp: [
							{ do: "visual", effect: "dissolve" },
							{ do: "go", to: "next" },
						],
					},
				},
			],
		},
		{
			id: "counter",
			name: "Counter",
			background: "main",
			parts: [
				{
					id: "ctitle",
					type: "label",
					rect: [16, 16, 388, 24],
					content: "Counter Demo",
				},
				{
					id: "count",
					type: "field",
					rect: [16, 52, 120, 32],
					content: "0",
				},
				{
					id: "add",
					type: "button",
					name: "Add 1",
					rect: [150, 54, 90, 28],
					script: { onMouseUp: [{ do: "add", value: "1", field: "count" }] },
				},
				{
					id: "reset",
					type: "button",
					name: "Reset",
					rect: [250, 54, 90, 28],
					script: { onMouseUp: [{ do: "put", value: "0", field: "count" }] },
				},
				{
					id: "cprev",
					type: "button",
					name: "← Prev",
					rect: [16, 130, 100, 28],
					script: {
						onMouseUp: [
							{ do: "visual", effect: "wipeRight" },
							{ do: "go", to: "prev" },
						],
					},
				},
				{
					id: "cnext",
					type: "button",
					name: "Next →",
					rect: [304, 130, 100, 28],
					script: {
						onMouseUp: [
							{ do: "visual", effect: "wipeLeft" },
							{ do: "go", to: "next" },
						],
					},
				},
			],
		},
		{
			id: "dialogs",
			name: "Dialogs",
			background: "main",
			parts: [
				{
					id: "dtitle",
					type: "label",
					rect: [16, 16, 388, 24],
					content: "Ask & Answer",
				},
				{
					id: "askName",
					type: "button",
					name: "Ask my name",
					rect: [16, 52, 130, 28],
					script: {
						onMouseUp: [
							{ do: "ask", prompt: "What is your name?", var: "who" },
							{ do: "put", value: '"Hello, " & who & "!"', field: "hello" },
						],
					},
				},
				{
					id: "hello",
					type: "field",
					rect: [160, 52, 244, 32],
					locked: true,
					content: "",
				},
				{
					id: "answer",
					type: "button",
					name: "Show a message",
					rect: [16, 96, 150, 28],
					script: {
						onMouseUp: [
							{
								do: "answer",
								message: "This is HyperCard, in Classicy!",
								buttons: ["Neat"],
							},
						],
					},
				},
				{
					id: "home2",
					type: "button",
					name: "⌂ Home",
					rect: [16, 130, 100, 28],
					script: {
						onMouseUp: [
							{ do: "visual", effect: "iris" },
							{ do: "go", to: "home" },
						],
					},
				},
			],
		},
	],
};

/**
 * The Feature Tour, loaded and validated from a JSON stack file — demonstrating
 * the "reads a JSON file that defines placement, content and behavior" premise.
 */
const featuresValidation = validateStack(featuresStackJson);
export const HyperCardFeaturesStack: HCStack | undefined = featuresValidation.ok
	? featuresValidation.stack
	: undefined;

/** Built-in stacks keyed by a stable id, offered in the File menu. */
export const HyperCardBuiltInStacks: Record<
	string,
	{ id: string; stack: HCStack }
> = {
	welcome: { id: "welcome", stack: HyperCardWelcomeStack },
	...(HyperCardFeaturesStack
		? { features: { id: "features", stack: HyperCardFeaturesStack } }
		: {}),
};
