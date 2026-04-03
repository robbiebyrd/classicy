import { useEffect, useRef, useState } from "react";
import { extractTimeKey, parseJsonlLine } from "./pagerUtils";
import type { PagerRecord } from "./pagerUtils";

interface PagerIndexState {
	index: Map<string, PagerRecord[]> | null;
	progress: number;
	error: string | null;
}

export function usePagerIndex(): PagerIndexState {
	const [state, setState] = useState<PagerIndexState>({
		index: null,
		progress: 0,
		error: null,
	});
	const abortRef = useRef<AbortController | null>(null);

	useEffect(() => {
		const controller = new AbortController();
		abortRef.current = controller;

		async function load() {
			try {
				const response = await fetch("/pager/output.jsonl", {
					signal: controller.signal,
				});

				if (!response.ok || !response.body) {
					setState((s) => ({ ...s, error: "Failed to fetch pager data" }));
					return;
				}

				const contentLength = response.headers.get("Content-Length");
				const total = contentLength ? parseInt(contentLength, 10) : 0;

				const index = new Map<string, PagerRecord[]>();
				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let leftover = "";
				let bytesRead = 0;

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					bytesRead += value.byteLength;
					const chunk = decoder.decode(value, { stream: true });
					const lines = (leftover + chunk).split("\n");
					leftover = lines.pop() ?? "";

					for (const line of lines) {
						const record = parseJsonlLine(line);
						if (!record) continue;
						const key = extractTimeKey(record.timestamp);
						if (!key) continue;
						const bucket = index.get(key);
						if (bucket) {
							bucket.push(record);
						} else {
							index.set(key, [record]);
						}
					}

					if (total > 0) {
						setState((s) => ({ ...s, progress: bytesRead / total }));
					}
				}

				// Handle any remaining leftover after stream ends
				if (leftover.trim()) {
					const record = parseJsonlLine(leftover);
					if (record) {
						const key = extractTimeKey(record.timestamp);
						if (key) {
							const bucket = index.get(key);
							if (bucket) {
								bucket.push(record);
							} else {
								index.set(key, [record]);
							}
						}
					}
				}

				setState({ index, progress: 1, error: null });
			} catch (err) {
				if (err instanceof Error && err.name === "AbortError") return;
				const message = err instanceof Error ? err.message : "Unknown error";
				setState((s) => ({ ...s, error: message }));
			}
		}

		void load();

		return () => {
			controller.abort();
		};
	}, []);

	return state;
}
