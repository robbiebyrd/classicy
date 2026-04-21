import { useContext, useMemo } from "react";
import {
	type MediaItem,
	MediaStreamContext,
	type MediaStreamContextValue,
	type MediaStreamFilter,
} from "./MediaStreamContext";

function applyFilter(items: MediaItem[], filter: MediaStreamFilter): MediaItem[] {
	return items.filter((item) => {
		if (filter.approved !== undefined && filter.approved !== (item.approved === 1)) {
			return false;
		}
		if (filter.mute !== undefined && filter.mute !== (item.mute === 1)) {
			return false;
		}
		if (filter.image !== undefined && filter.image !== Boolean(item.image)) {
			return false;
		}
		if (filter.calcDuration !== undefined) {
			const d = item.calc_duration ?? 0;
			const { gt, gte, lt, lte } = filter.calcDuration;
			if (gt !== undefined && !(d > gt)) return false;
			if (gte !== undefined && !(d >= gte)) return false;
			if (lt !== undefined && !(d < lt)) return false;
			if (lte !== undefined && !(d <= lte)) return false;
		}
		if (filter.timezone !== undefined) {
			const tz = item.timezone ?? "";
			const match = Array.isArray(filter.timezone)
				? filter.timezone.includes(tz)
				: tz === filter.timezone;
			if (!match) return false;
		}
		if (filter.format !== undefined) {
			const match = Array.isArray(filter.format)
				? filter.format.includes(item.format)
				: item.format === filter.format;
			if (!match) return false;
		}
		if (filter.source !== undefined) {
			if (item.source === undefined) return false;
			const match = Array.isArray(filter.source)
				? filter.source.includes(item.source)
				: item.source === filter.source;
			if (!match) return false;
		}
		return true;
	});
}

/**
 * Access live media items from the MediaStreamProvider.
 *
 * Pass a stable filter object (e.g. defined outside the component or wrapped
 * in useMemo) to avoid recomputing the filtered list on every render.
 */
export function useMediaStream(filter?: MediaStreamFilter): MediaStreamContextValue {
	const ctx = useContext(MediaStreamContext);

	const items = useMemo(
		() => (filter ? applyFilter(ctx.items, filter) : ctx.items),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[ctx.items, filter],
	);

	return { ...ctx, items };
}
