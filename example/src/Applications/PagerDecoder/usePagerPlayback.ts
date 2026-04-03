import { useEffect, useRef, useState } from "react";
import type { PagerRecord } from "./pagerUtils";
import { getCurrentEasternHMS } from "./pagerUtils";

export interface CompletedLine {
	id: string;
	timeKey: string;
	provider: string;
	text: string;
}

export interface PlaybackState {
	lines: CompletedLine[];
	streamingText: string;
	streamingMeta: { timeKey: string; provider: string } | null;
}

interface StreamingItem {
	record: PagerRecord;
	timeKey: string;
}

export function usePagerPlayback(
	index: Map<string, PagerRecord[]> | null,
): PlaybackState {
	const [lines, setLines] = useState<CompletedLine[]>([]);
	const [streamingText, setStreamingText] = useState("");
	const [streamingMeta, setStreamingMeta] = useState<{
		timeKey: string;
		provider: string;
	} | null>(null);

	const queueRef = useRef<StreamingItem[]>([]);
	const currentItemRef = useRef<StreamingItem | null>(null);
	const wordIndexRef = useRef(0);
	const seenSecondsRef = useRef(new Set<string>());

	// Clock tick: every 1s, look up new messages for the current ET second
	useEffect(() => {
		if (!index) return;

		const clockId = setInterval(() => {
			const timeKey = getCurrentEasternHMS();
			if (seenSecondsRef.current.has(timeKey)) return;
			seenSecondsRef.current.add(timeKey);

			const records = index.get(timeKey);
			if (!records) return;

			for (const record of records) {
				queueRef.current.push({ record, timeKey });
			}
		}, 1000);

		return () => clearInterval(clockId);
	}, [index]);

	// Stream tick: every 30ms, advance one character
	useEffect(() => {
		if (!index) return;

		const streamId = setInterval(() => {
			// If not currently streaming, pick the next item from the queue
			if (!currentItemRef.current) {
				const next = queueRef.current.shift();
				if (!next) return;
				currentItemRef.current = next;
				wordIndexRef.current = 0;
				setStreamingMeta({
					timeKey: next.timeKey,
					provider: next.record.provider,
				});
				setStreamingText("");
			}

			const item = currentItemRef.current;
			const words = item.record.message.split(" ");
			wordIndexRef.current += 1;
			const partial = words.slice(0, wordIndexRef.current).join(" ");
			setStreamingText(partial);

			if (wordIndexRef.current >= words.length) {
				// Message complete — move to lines
				const completed: CompletedLine = {
					id: `${item.timeKey}-${item.record.recipient_id}-${Date.now()}`,
					timeKey: item.timeKey,
					provider: item.record.provider,
					text: item.record.message,
				};
				setLines((prev) => [...prev, completed]);
				setStreamingText("");
				setStreamingMeta(null);
				currentItemRef.current = null;
				wordIndexRef.current = 0;
			}
		}, 1);

		return () => clearInterval(streamId);
	}, [index]);

	return { lines, streamingText, streamingMeta };
}
