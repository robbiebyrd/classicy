import { useCallback, useEffect, useRef, useState } from "react";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	type ClassicyThemeLinkResult,
	classicyThemeLinkUrl,
	createClassicyThemeLink,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeLink";
import { useClassicyThemeLinksEnabled } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeLinkAvailability.internal";

// The Themes tab's Copy Theme Link: the active theme's link, on the
// clipboard. The link is made ahead, whenever the active theme changes, so
// the click writes the clipboard at once: Safari lets a page write it only
// while handling the click, which awaiting the codec's first load (a lazy
// chunk) could outlast. The page's address is read at the click, so a host
// that changed its route meanwhile gets a link to the page it is on.

const COPY_FAILED = "The theme link could not be copied.";

/** `text` through the `copy` command: for a page the Clipboard API is not
 * offered to (an http page other than localhost) or refused it. */
const copyWithCommand = (text: string): boolean => {
	if (typeof document === "undefined" || !document.execCommand) return false;
	let copied = false;
	const onCopy = (event: ClipboardEvent) => {
		if (!event.clipboardData) return;
		event.clipboardData.setData("text/plain", text);
		event.preventDefault();
		copied = true;
	};
	document.addEventListener("copy", onCopy);
	try {
		document.execCommand("copy");
	} catch {
		// Refused: copied stays false.
	} finally {
		document.removeEventListener("copy", onCopy);
	}
	return copied;
};

/** Puts `text` on the clipboard; false when the browser would not. */
const writeClipboardText = async (text: string): Promise<boolean> => {
	const clipboard = globalThis.navigator?.clipboard;
	if (clipboard?.writeText) {
		try {
			await clipboard.writeText(text);
			return true;
		} catch {
			// Denied: the copy command may still be allowed.
		}
	}
	return copyWithCommand(text);
};

export type ClassicyThemeLinkCopy = {
	/** Copies the active theme's link to the clipboard. */
	copy: () => void;
	/** The name of the theme whose link was copied, while it is active. */
	copiedThemeName: string | null;
};

/**
 * Copy Theme Link for `theme` (the active theme), or `undefined` while no
 * mounted desktop opens theme links (`themeLinks`): a link to a page that
 * ignores it would open nothing. `onError(label, message)` reports why a link
 * could not be made or copied. The link is made ahead only while `ahead`
 * (the panel is open), so a desktop that never opens the panel never loads
 * the codec.
 */
export const useClassicyThemeLinkCopy = (
	theme: ClassicyTheme,
	onError: (label: string, message: string) => void,
	ahead: boolean,
): ClassicyThemeLinkCopy | undefined => {
	const enabled = useClassicyThemeLinksEnabled();
	const ready = useRef<{
		theme: ClassicyTheme;
		result: ClassicyThemeLinkResult;
	} | null>(null);
	const [copied, setCopied] = useState<ClassicyTheme | null>(null);

	useEffect(() => {
		if (!enabled || !ahead) return;
		let current = true;
		void createClassicyThemeLink(theme).then((result) => {
			if (current) ready.current = { theme, result };
		});
		return () => {
			current = false;
		};
	}, [enabled, ahead, theme]);

	const copy = useCallback(() => {
		const write = (result: ClassicyThemeLinkResult) => {
			if (!result.ok) {
				onError(COPY_FAILED, result.error);
				return;
			}
			const url = classicyThemeLinkUrl(result.payload);
			if (url === undefined) {
				onError(COPY_FAILED, "This page has no address to link to.");
				return;
			}
			void writeClipboardText(url).then((written) => {
				if (written) setCopied(theme);
				else
					onError(
						COPY_FAILED,
						"Your browser did not let Classicy use the clipboard.",
					);
			});
		};
		const link = ready.current;
		if (link?.theme === theme) write(link.result);
		else void createClassicyThemeLink(theme).then(write);
	}, [theme, onError]);

	if (!enabled) return undefined;
	return { copy, copiedThemeName: copied === theme ? theme.name : null };
};
