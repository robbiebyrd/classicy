import type { ImgHTMLAttributes } from "react";
import { useClassicySelectedIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicySelectedIconImage.internal";

type ClassicyIconImageProps = Omit<
	ImgHTMLAttributes<HTMLImageElement>,
	"src"
> & {
	/** The icon's URL, as registered (the leaf's `src`). */
	src: string | undefined;
	/**
	 * The size the image is drawn at in px, or `true` (default) for a surface
	 * whose CSS gives it the small-icon size. An icon drawn at the small-icon
	 * size or less uses its own small image when its leaf has one.
	 */
	drawnAt?: number | true;
	/**
	 * Draw the active package's selected image for the icon
	 * (`registerClassicySelectedIconImages`) once it has loaded. For a
	 * surface that draws a selected icon as icons are drawn selected; no
	 * list passes it, since System 7.5 drew a selected list row inverted and
	 * its icon as it is (Standard File's list, `color-dialog-standardfile-
	 * open.png`).
	 */
	selected?: boolean;
};

/** An `<img>` of an icon that picks the leaf's small image at small sizes,
 * and its selected image when `selected`. */
export const ClassicyIconImage = ({
	src,
	drawnAt = true,
	selected = false,
	alt,
	...rest
}: ClassicyIconImageProps) => {
	const { image } = useClassicySelectedIconImage(src ?? "", drawnAt, selected);
	return (
		<img {...rest} src={src === undefined ? undefined : image} alt={alt} />
	);
};
