/**
 * Example HyperCard plugins — stands in for the external rt911 apps (TV/EPG,
 * Pager Decoder, flight tracker, Directus audio). Demonstrates every extension
 * surface: a custom display part, a synchronous command, a blocking async
 * command with its effect handler, and a registered stack.
 *
 * Side-effect import this module once (before rendering) — see app.tsx.
 */

import {
	type HCStack,
	type HyperCardPartProps,
	registerHyperCardCommand,
	registerHyperCardEffectHandler,
	registerHyperCardPart,
	registerHyperCardStack,
} from "classicy";
import type { FC } from "react";

// --- 1. A custom display part (honors `options` + `locked`) ----------------
// Stands in for a flight-tracker map / TV station tile. A real plugin would
// render a map or a video here; this shows the wiring: read settings from
// `options`, respect `locked`, and (when unlocked) write back + fire a script.
const DemoMap: FC<HyperCardPartProps> = ({
	options,
	locked,
	value,
	setValue,
	fire,
}) => {
	const lat = String(options.lat ?? "?");
	const lon = String(options.lon ?? "?");
	const zoom = String(options.zoom ?? "?");
	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				border: "1px solid #808080",
				background:
					"repeating-linear-gradient(45deg,#dfe7ef,#dfe7ef 8px,#eef3f8 8px,#eef3f8 16px)",
				boxSizing: "border-box",
				padding: "6px",
				fontFamily: "var(--ui-font)",
				fontSize: "11px",
			}}
		>
			<div>
				🗺️ Map @ {lat}, {lon} (zoom {zoom})
			</div>
			<div>Controls: {locked ? "🔒 locked" : "unlocked"}</div>
			{value && <div>Selected: {value}</div>}
			{!locked && (
				<button
					type="button"
					onClick={() => {
						setValue(`pin @ ${lat},${lon}`);
						fire();
					}}
				>
					Drop pin
				</button>
			)}
		</div>
	);
};

registerHyperCardPart("demoMap", DemoMap);

// --- 2. A synchronous command (runs in the reducer, instant) ----------------
// `{ "do": "appendBang", "field": "x" }` — appends "!" to a field.
registerHyperCardCommand("appendBang", {
	run: (ctx, action) => {
		const field = action.field as string | undefined;
		if (!field) return;
		ctx.setField(field, `${ctx.getField(field) ?? ""}!`);
	},
});

// --- 3. A blocking async command + its effect handler -----------------------
// `{ "do": "fetchQuote", "field": "quote" }` suspends the stack until the async
// handler resolves — stands in for a Directus fetch / pager-feed lookup.
registerHyperCardCommand("fetchQuote", {
	run: (ctx, action) => {
		const into =
			typeof action.field === "string"
				? { field: action.field }
				: typeof action.var === "string"
					? { var: action.var }
					: undefined;
		ctx.await("fetchQuote", {}, into);
	},
});

const QUOTES = [
	"Think different.",
	"It just works.",
	"Here's to the crazy ones.",
	"Say hello to the future.",
];

registerHyperCardEffectHandler("fetchQuote", async (_args, api) => {
	// Simulate a network round-trip (a real handler would fetch Directus here).
	await new Promise((r) => setTimeout(r, 500));
	const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
	api.resolve(quote);
});

// --- 4. A registered stack that uses the plugins ----------------------------
const pluginStack: HCStack = {
	name: "Plugin Demo",
	version: "2",
	size: [460, 320],
	cards: [
		{
			id: "plugins",
			name: "Plugins",
			parts: [
				{
					id: "title",
					type: "label",
					rect: [16, 14, 428, 22],
					content: "Plugin Demo",
				},
				{
					id: "map",
					type: "demoMap", // custom part
					rect: [16, 46, 240, 90],
					locked: true,
					options: { lat: 40.7, lon: -74.0, zoom: 6 },
				},
				{
					id: "fetch",
					type: "button",
					name: "Fetch quote (blocking)",
					rect: [272, 46, 172, 28],
					script: { onMouseUp: [{ do: "fetchQuote", field: "quote" }] },
				},
				{
					id: "bang",
					type: "button",
					name: "Append !",
					rect: [272, 82, 172, 28],
					script: { onMouseUp: [{ do: "appendBang", field: "quote" }] },
				},
				{
					id: "quote",
					type: "field",
					locked: true,
					rect: [16, 150, 428, 60],
					content: "(click Fetch quote)",
				},
			],
		},
	],
};

registerHyperCardStack("pluginDemo", "Plugin Demo", pluginStack);
