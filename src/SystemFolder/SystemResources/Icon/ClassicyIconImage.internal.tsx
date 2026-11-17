import type { ImgHTMLAttributes } from "react";
import {
	CLASSICY_ICON_DIMMED_IMAGE_CLASS,
	useClassicyDimmedIconImage,
} from "@/Appearance/ClassicyIconDimming";
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
	 * The surface can draw this icon selected (the file browser's list view):
	 * the icon's selected image (`registerClassicySelectedIconImages`) is
	 * preloaded, and drawn while `selected` once it has loaded, the `<img>`
	 * then marked `classicyIconSelectedImage` so the surface's own selected
	 * look stands down. Other surfaces (menus, title bars, tabs, lists that
	 * invert a selected row and keep its icon, as System 7.5's Standard File
	 * list does) leave it off and load nothing more.
	 */
	selectable?: boolean;
	/** The icon is drawn selected (only with `selectable`). */
	selected?: boolean;
	/**
	 * The icon is drawn dimmed (a hidden application's, HIG7 p.127): the
	 * active package's `iconDimming.hiddenApp` rule is applied on a canvas,
	 * and the result drawn once ready, the `<img>` then marked
	 * `classicyIconDimmedImage` so the package's stylesheet dimming stands
	 * down. Without a rule, or for an icon a canvas cannot read (cross-origin
	 * without CORS), the stylesheet's dimming applies.
	 */
	dimmed?: boolean;
};

/** An `<img>` of an icon that picks the leaf's small image at small sizes,
 * and, on a selectable surface, its selected image when `selected`. */
export const ClassicyIconImage = ({
	src,
	drawnAt = true,
	selectable = false,
	selected = false,
	dimmed = false,
	alt,
	className,
	...rest
}: ClassicyIconImageProps) => {
	const { image, drawsSelectedImage } = useClassicySelectedIconImage(
		src ?? "",
		drawnAt,
		selectable && selected,
		selectable,
	);
	// Dimmed at the size it is drawn when that is given, else at the
	// image's own size (the small image, at the small-icon size, where its
	// leaf has one), and scaled by the surface's CSS like the plain image.
	const { image: drawn, drawsDimmedImage } = useClassicyDimmedIconImage(
		image,
		dimmed,
		"hiddenApp",
		drawnAt === true ? undefined : drawnAt,
	);
	return (
		<img
			{...rest}
			className={
				[
					className,
					drawsSelectedImage && "classicyIconSelectedImage",
					drawsDimmedImage && CLASSICY_ICON_DIMMED_IMAGE_CLASS,
				]
					.filter(Boolean)
					.join(" ") || undefined
			}
			src={src === undefined ? undefined : drawn}
			alt={alt}
		/>
	);
};
