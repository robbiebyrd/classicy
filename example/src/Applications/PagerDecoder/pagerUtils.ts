export interface PagerRecord {
	timestamp: string;
	provider: string;
	recipient_id: string;
	mode: string;
	message: string;
}

/** Extract HH:MM:SS from a "YYYY-MM-DD HH:MM:SS" timestamp string. Returns "" if malformed. */
export function extractTimeKey(timestamp: string): string {
	const parts = timestamp.split(" ");
	if (parts.length !== 2) return "";
	const time = parts[1];
	if (!/^\d{2}:\d{2}:\d{2}$/.test(time)) return "";
	return time;
}

/** Parse one JSONL line. Returns null if non-ALPHA, empty message, or malformed. */
export function parseJsonlLine(line: string): PagerRecord | null {
	if (!line.trim()) return null;
	try {
		const record = JSON.parse(line) as Record<string, unknown>;
		if (record.mode !== "ALPHA") return null;
		const message = record.message;
		if (typeof message !== "string" || message.trim() === "") return null;
		return {
			timestamp: String(record.timestamp ?? ""),
			provider: String(record.provider ?? ""),
			recipient_id: String(record.recipient_id ?? ""),
			mode: "ALPHA",
			message,
		};
	} catch {
		return null;
	}
}

/** Get the current Eastern Daylight Time as "HH:MM:SS". Assumes EDT (UTC-4). */
export function getCurrentEasternHMS(): string {
	const now = new Date();
	const edtMs = now.getTime() - 4 * 60 * 60 * 1000;
	const edt = new Date(edtMs);
	const h = String(edt.getUTCHours()).padStart(2, "0");
	const m = String(edt.getUTCMinutes()).padStart(2, "0");
	const s = String(edt.getUTCSeconds()).padStart(2, "0");
	return `${h}:${m}:${s}`;
}
