import type { Connect, Plugin } from "vite";

/** Where the mock backend answers: `/__mock-state/<account>`. */
const ROUTE = /^\/__mock-state\/([A-Za-z0-9_-]{1,64})$/;
/** The largest saved desktop state it takes. */
const MAX_BODY_BYTES = 8 * 1024 * 1024;

/**
 * The example's mock backend for its desktop state adapter
 * (`src/stateSync/mockStateAdapter.ts`): one saved snapshot per account, kept
 * in the dev (or preview) server's memory, so browser profiles on one server
 * share a desktop as a signed-in user's devices share it through a real
 * backend. `GET` answers the account's snapshot (204 when there is none),
 * `PUT` replaces it. Nothing is written to disk; a server restart forgets
 * every account.
 */
export function mockStateServer(): Plugin {
	const accounts = new Map<string, string>();
	const handle: Connect.NextHandleFunction = (req, res, next) => {
		const match = ROUTE.exec((req.url ?? "").split("?")[0]);
		if (!match) {
			next();
			return;
		}
		const account = match[1];
		if (req.method === "GET") {
			const saved = accounts.get(account);
			res.setHeader("Cache-Control", "no-store");
			// No copy yet: 204, which a browser does not log as a failed load.
			if (saved === undefined) {
				res.statusCode = 204;
				res.end();
				return;
			}
			res.setHeader("Content-Type", "application/json");
			res.end(saved);
			return;
		}
		if (req.method === "PUT") {
			const chunks: Buffer[] = [];
			let size = 0;
			req.on("data", (chunk: Buffer) => {
				size += chunk.length;
				if (size <= MAX_BODY_BYTES) chunks.push(chunk);
			});
			req.on("end", () => {
				const body = Buffer.concat(chunks).toString("utf8");
				let valid = size <= MAX_BODY_BYTES;
				try {
					const parsed = valid ? JSON.parse(body) : null;
					valid = !!parsed && typeof parsed === "object" && "state" in parsed;
				} catch {
					valid = false;
				}
				if (!valid) {
					res.statusCode = size > MAX_BODY_BYTES ? 413 : 400;
					res.end();
					return;
				}
				accounts.set(account, body);
				res.statusCode = 204;
				res.end();
			});
			return;
		}
		res.statusCode = 405;
		res.setHeader("Allow", "GET, PUT");
		res.end();
	};
	return {
		name: "classicy-example-mock-state",
		configureServer(server) {
			server.middlewares.use(handle);
		},
		configurePreviewServer(server) {
			server.middlewares.use(handle);
		},
	};
}
