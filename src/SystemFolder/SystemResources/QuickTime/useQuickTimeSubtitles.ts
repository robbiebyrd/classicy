import { parse } from "@plussub/srt-vtt-parser";
import type { ParsedResult } from "@plussub/srt-vtt-parser/dist/types";
import { useCallback, useEffect, useState } from "react";
import { isValidHttpUrl } from "@/SystemFolder/SystemResources/Utils/urlValidation";

/**
 * Fetches and parses an SRT/VTT subtitle file, exposing an active-cue lookup
 * keyed by the player's current time in seconds.
 */
export function useQuickTimeSubtitles(subtitlesUrl?: string): {
	activeCueText: (currentTimeSec: number) => string | null;
} {
	const [subtitlesData, setSubtitlesData] = useState<ParsedResult | null>(null);

	useEffect(() => {
		if (!subtitlesUrl || !isValidHttpUrl(subtitlesUrl)) {
			setSubtitlesData(null);
			return;
		}
		const controller = new AbortController();
		fetch(subtitlesUrl, { signal: controller.signal })
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.text();
			})
			.then((text) => parse(text))
			.then((result) => setSubtitlesData(result))
			.catch((error) => {
				if (error.name === "AbortError") return;
				console.error("[QuickTime] Subtitle fetch failed", {
					subtitlesUrl,
					error,
				});
				setSubtitlesData(null);
			});
		return () => controller.abort();
	}, [subtitlesUrl]);

	const activeCueText = useCallback(
		(currentTimeSec: number): string | null => {
			if (!subtitlesData?.entries?.length) return null;
			const currentTimeMs = currentTimeSec * 1000;
			const entry = subtitlesData.entries.find(
				(i) => i.from < currentTimeMs && i.to > currentTimeMs,
			);
			return entry ? entry.text : null;
		},
		[subtitlesData],
	);

	return { activeCueText };
}
