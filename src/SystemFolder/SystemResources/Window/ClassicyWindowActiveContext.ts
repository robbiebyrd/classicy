import { createContext } from "react";

/**
 * Whether the window a component is drawn in is the active (frontmost,
 * focused) one: `true` or `false` inside a `ClassicyWindow`, `undefined`
 * outside any window. `ClassicyScrollArea` reads it, so every scroll bar in
 * an inactive window draws inactive (HIG7 p.160) without being told.
 */
export const ClassicyWindowActiveContext = createContext<boolean | undefined>(
	undefined,
);
