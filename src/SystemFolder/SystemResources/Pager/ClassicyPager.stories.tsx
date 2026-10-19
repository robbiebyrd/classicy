import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useState } from "react";
import { fn } from "storybook/test";
import { ClassicyPager } from "./ClassicyPager";

// The Storybook frame is painted system-03, so the disabled arrows' punch-out
// must use that colour too — exactly what ClassicyAssistant's footer does.
const footerBand = {
	display: "inline-block",
	padding: 4,
	background: "var(--color-system-03)",
	"--classicy-pager-band": "var(--color-system-03)",
} as CSSProperties;

const meta = {
	title: "Controls/Pager",
	component: ClassicyPager,
	args: { onPageChange: fn() },
	decorators: [
		(Story) => (
			<div style={footerBand}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ClassicyPager>;

export default meta;
type Story = StoryObj<typeof meta>;

const InteractivePager = () => {
	const [page, setPage] = useState(0);
	return <ClassicyPager page={page} pageCount={5} onPageChange={setPage} />;
};

/**
 * A working five-page pager: the owner stores `page` from `onPageChange`.
 * The back arrow is disabled on page 1 and the forward arrow on page 5.
 */
export const Interactive: Story = {
	args: { page: 0, pageCount: 5 },
	render: () => <InteractivePager />,
};

/**
 * Mid-way through a topic, both arrows are enabled. Being controlled, the
 * pager only reports the requested page (see the Actions panel) — with a
 * fixed `page` nothing moves.
 */
export const MiddlePage: Story = {
	args: { page: 2, pageCount: 5 },
};

/** On the last page the forward arrow is disabled and drawn hollow. */
export const LastPage: Story = {
	args: { page: 4, pageCount: 5 },
};

/**
 * A one-page topic needs no special case: both arrows derive their state
 * from position, so both render disabled.
 */
export const SinglePage: Story = {
	args: { page: 0, pageCount: 1 },
};

/**
 * On its default band, `--color-system-01`, no override is needed: the
 * hollow arrows punch out in the pager's built-in fallback colour.
 */
export const DefaultBand: Story = {
	args: { page: 0, pageCount: 3 },
	decorators: [
		(Story) => (
			<div
				style={
					{
						display: "inline-block",
						padding: 4,
						background: "var(--color-system-01)",
						// Unset the meta decorator's override so the fallback applies.
						"--classicy-pager-band": "initial",
					} as CSSProperties
				}
			>
				<Story />
			</div>
		),
	],
};
