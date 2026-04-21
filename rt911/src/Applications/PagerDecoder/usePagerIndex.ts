import { useEffect, useRef, useState } from 'react';
import type { PagerRecord } from './pagerUtils';
import { extractTimeKey, parseJsonlLine } from './pagerUtils';

export interface PagerUniqueValues {
	provider: string[];
	id_type: string[];
	channel: string[];
}

interface PagerIndexState {
	index: Map<string, PagerRecord[]> | null;
	progress: number;
	error: string | null;
	uniqueValues: PagerUniqueValues | null;
}

export function usePagerIndex(): PagerIndexState {
	const [state, setState] = useState<PagerIndexState>({
		index: null,
		progress: 0,
		error: null,
		uniqueValues: null,
	});
	const abortRef = useRef<AbortController | null>(null);

	useEffect(() => {
		const controller = new AbortController();
		abortRef.current = controller;

		async function load() {
			try {
				const response = await fetch('/pager/output.jsonl', {
					signal: controller.signal,
				});

				if (!response.ok || !response.body) {
					setState((s) => ({ ...s, error: 'Failed to fetch pager data' }));
					return;
				}

				const contentLength = response.headers.get('Content-Length');
				const total = contentLength ? parseInt(contentLength, 10) : 0;

				const index = new Map<string, PagerRecord[]>();
				const providers = new Set<string>();
				const idTypes = new Set<string>();
				const channels = new Set<string>();

				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let leftover = '';
				let bytesRead = 0;

				const addRecord = (record: PagerRecord) => {
					const key = extractTimeKey(record.timestamp);
					if (!key) return;
					const bucket = index.get(key);
					if (bucket) {
						bucket.push(record);
					} else {
						index.set(key, [record]);
					}
					if (record.provider) providers.add(record.provider);
					if (record.id_type) idTypes.add(record.id_type);
					if (record.channel) channels.add(record.channel);
				};

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					bytesRead += value.byteLength;
					const chunk = decoder.decode(value, { stream: true });
					const lines = (leftover + chunk).split('\n');
					leftover = lines.pop() ?? '';

					for (const line of lines) {
						const record = parseJsonlLine(line);
						if (record) addRecord(record);
					}

					if (total > 0) {
						setState((s) => ({ ...s, progress: bytesRead / total }));
					}
				}

				if (leftover.trim()) {
					const record = parseJsonlLine(leftover);
					if (record) addRecord(record);
				}

				const uniqueValues: PagerUniqueValues = {
					provider: [...providers].sort(),
					id_type: [...idTypes].sort(),
					channel: [...channels].sort(),
				};

				setState({ index, progress: 1, error: null, uniqueValues });
			} catch (err) {
				if (err instanceof Error && err.name === 'AbortError') return;
				const message = err instanceof Error ? err.message : 'Unknown error';
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
