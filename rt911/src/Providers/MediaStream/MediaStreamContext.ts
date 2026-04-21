import { createContext } from "react";

export interface CalcDurationFilter {
	gt?: number;
	gte?: number;
	lt?: number;
	lte?: number;
}

export interface MediaStreamFilter {
	/** Keep items whose calc_duration satisfies the given comparisons. */
	calcDuration?: CalcDurationFilter;
	/** Keep only approved (true) or unapproved (false) items. */
	approved?: boolean;
	/** Keep items whose timezone equals the value or is in the list. */
	timezone?: string | string[];
	/** Keep items whose format equals the value or is in the list. */
	format?: string | string[];
	/** true = must have an image; false = must have no image. */
	image?: boolean;
	/** Keep items whose source slug equals the value or is in the list. */
	source?: string | string[];
	/** Keep only muted (true) or audible (false) items. */
	mute?: boolean;
}

export interface MediaItem {
	id: number;
	title: string;
	full_title: string;
	source?: string;
	start_date: string;
	end_date?: string;
	calc_duration?: number;
	timezone?: string;
	url: string;
	format: string;
	approved: number;
	mute: number;
	volume: number;
	jump: number;
	trim: number;
	image?: string;
	image_caption?: string;
	content?: string;
	sort?: number;
}

export interface MediaStreamContextValue {
	items: MediaItem[];
	connected: boolean;
}

export const MediaStreamContext = createContext<MediaStreamContextValue>({
	items: [],
	connected: false,
});
