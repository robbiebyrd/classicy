import { useClassicyDateTime } from "classicy";
import {
	type FC,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { MediaStreamContext, type MediaItem } from "./MediaStreamContext";

const WS_URL: string =
	(import.meta.env.VITE_MEDIA_STREAM_URL as string | undefined) ??
	"ws://localhost:8080/stream";

const HEARTBEAT_INTERVAL_MS = 30_000;

// Jumps larger than this are treated as manual seeks rather than clock ticks
const SEEK_THRESHOLD_MS = 90_000;

interface WsItemsMessage {
	type: "items" | "init_ack" | "seek_ack";
	items: MediaItem[];
}

type WsIncomingMessage = WsItemsMessage | { type: string };

interface MediaStreamProviderProps {
	children: ReactNode;
}

export const MediaStreamProvider: FC<MediaStreamProviderProps> = ({
	children,
}) => {
	const { localDate, dateTime } = useClassicyDateTime({ tick: true });

	const [items, setItems] = useState<MediaItem[]>([]);
	const [connected, setConnected] = useState(false);

	const wsRef = useRef<WebSocket | null>(null);
	// Always-current localDate for use inside WS callbacks and intervals
	const localDateRef = useRef(localDate);
	const prevDateTimeRef = useRef(dateTime);

	useEffect(() => {
		localDateRef.current = localDate;
	}, [localDate]);

	const send = useCallback((msg: object) => {
		const ws = wsRef.current;
		if (ws?.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(msg));
		}
	}, []);

	// Prune expired items on every second tick
	useEffect(() => {
		const now = localDate.getTime();
		setItems((prev) =>
			prev.filter(
				(item) => !item.end_date || new Date(item.end_date).getTime() > now,
			),
		);
	}, [localDate]);

	// Detect manual time changes and send seek; ignore tick-driven minute boundaries
	useEffect(() => {
		const prevMs = new Date(prevDateTimeRef.current).getTime();
		const nowMs = new Date(dateTime).getTime();

		if (Math.abs(nowMs - prevMs) > SEEK_THRESHOLD_MS) {
			send({ type: "seek", time: new Date(dateTime).toISOString() });
		}

		prevDateTimeRef.current = dateTime;
	}, [dateTime, send]);

	// WebSocket lifecycle: connect once, heartbeat inside onopen
	useEffect(() => {
		let active = true;
		let heartbeatId: ReturnType<typeof setInterval>;
		const ws = new WebSocket(WS_URL);
		wsRef.current = ws;

		ws.onopen = () => {
			// StrictMode cleanup may have run before the socket finished connecting.
			if (!active) {
				ws.close();
				return;
			}
			setConnected(true);
			ws.send(
				JSON.stringify({
					type: "init",
					time: localDateRef.current.toISOString(),
				}),
			);
			heartbeatId = setInterval(() => {
				if (ws.readyState === WebSocket.OPEN) {
					ws.send(
						JSON.stringify({
							type: "heartbeat",
							time: localDateRef.current.toISOString(),
						}),
					);
				}
			}, HEARTBEAT_INTERVAL_MS);
		};

		ws.onmessage = (event: MessageEvent<string>) => {
			if (!active) return;
			let msg: WsIncomingMessage;
			try {
				msg = JSON.parse(event.data) as WsIncomingMessage;
			} catch {
				return;
			}

			if (msg.type !== "items" && msg.type !== "init_ack" && msg.type !== "seek_ack") return;

			const incoming = (msg as WsItemsMessage).items;
			if (incoming.length === 0) return;

			const now = localDateRef.current.getTime();
			const fresh = incoming.filter(
				(item) => !item.end_date || new Date(item.end_date).getTime() > now,
			);

			setItems((prev) => {
				const byId = new Map(prev.map((i) => [i.id, i]));
				for (const item of fresh) {
					byId.set(item.id, item);
				}
				return Array.from(byId.values());
			});
		};

		ws.onclose = () => {
			if (!active) return;
			setConnected(false);
			clearInterval(heartbeatId);
		};

		ws.onerror = () => {
			ws.close();
		};

		return () => {
			active = false;
			clearInterval(heartbeatId);
			ws.onclose = null;
			// Calling close() on a CONNECTING socket logs a browser error.
			// Defer to onopen so it can close cleanly once the handshake finishes.
			if (ws.readyState === WebSocket.CONNECTING) {
				ws.onopen = () => ws.close();
			} else {
				ws.close();
			}
			wsRef.current = null;
		};
		// Intentionally runs once on mount; localDateRef carries the live value
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<MediaStreamContext.Provider value={{ items, connected }}>
			{children}
		</MediaStreamContext.Provider>
	);
};
