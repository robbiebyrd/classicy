import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Whether this render is a client render: `false` while React renders on the
 * server (`renderToString`, a streaming render) and while the client hydrates
 * that server HTML, `true` in every other client render, a `createRoot` one
 * included. A component that draws what only the client knows (persisted
 * state, the viewport, asset URLs relative to the bundle's own URL) renders a
 * shell on `false`; React then renders it again with `true` straight after
 * hydrating, without a hydration mismatch (story 0223-a0y). The flag never
 * changes after that, so it subscribes to nothing.
 */
export const useClassicyClientRender = (): boolean =>
	useSyncExternalStore(
		subscribe,
		() => true,
		() => false,
	);
