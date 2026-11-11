import type { ImgHTMLAttributes } from "react";
import { useClassicyIconImage } from "@/Appearance/ClassicyAssetRegistry";

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
};

/** An `<img>` of an icon that picks the leaf's small image at small sizes. */
export const ClassicyIconImage = ({
	src,
	drawnAt = true,
	alt,
	...rest
}: ClassicyIconImageProps) => {
	const image = useClassicyIconImage(src ?? "", drawnAt);
	return (
		<img {...rest} src={src === undefined ? undefined : image} alt={alt} />
	);
};
