import { useEffect, useSyncExternalStore } from "react";
import { useClassicyIconImage } from "@/Appearance/ClassicyAssetRegistry";

/**
 * Selected icon images (`registerClassicySelectedIconImages`), drawn only
 * once loaded. A selected icon that swapped to its selected image at once
 * would lose the package's own selected look (System 7's half-black layer,
 * which stands down over a selected image) before the image arrived, and
 * flash its plain image for a frame on the first selection. So each icon
 * preloads its selected image when it mounts, and draws it once it has
 * loaded; until then it keeps its plain image and the package's look.
 *
 * Not public API — `.internal.ts` modules are excluded from the barrels.
 */

const loaded = new Set<string>();
const pending = new Set<string>();
const listeners = new Set<() => void>();

const subscribe = (listener: () => void): (() => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

/** Starts loading `url` once per page; listeners hear when it has loaded. */
const preload = (url: string): void => {
	if (loaded.has(url) || pending.has(url) || typeof Image === "undefined")
		return;
	pending.add(url);
	const image = new Image();
	image.onload = () => {
		pending.delete(url);
		loaded.add(url);
		for (const listener of [...listeners]) listener();
	};
	image.onerror = () => {
		pending.delete(url);
	};
	image.src = url;
};

/** Test-only: forgets every loaded and pending image. */
export const resetClassicySelectedIconImagesForTests = (): void => {
	loaded.clear();
	pending.clear();
};

/**
 * The image an icon draws: its selected image (the active package's look,
 * `resolveClassicyIconImage(src, px, true)`) while `selected` and once that
 * image has loaded, else its plain image. `drawsSelectedImage` says which,
 * for the `SelectedImage` part class. `plain` is the plain image, for the
 * icon's mask.
 */
export const useClassicySelectedIconImage = (
	src: string,
	px: number | true,
	selected: boolean,
): { image: string; plain: string; drawsSelectedImage: boolean } => {
	const plain = useClassicyIconImage(src, px);
	const selectedImage = useClassicyIconImage(src, px, true);
	const hasSelectedImage = selectedImage !== plain;
	useEffect(() => {
		if (hasSelectedImage) preload(selectedImage);
	}, [hasSelectedImage, selectedImage]);
	const ready = useSyncExternalStore(
		subscribe,
		() => loaded.has(selectedImage),
		() => false,
	);
	const drawsSelectedImage = selected && hasSelectedImage && ready;
	return {
		image: drawsSelectedImage ? selectedImage : plain,
		plain,
		drawsSelectedImage,
	};
};
