import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ClassicyCursorRole } from "@/Appearance/ClassicyAssetRegistry";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { useClassicyCursor } from "./useClassicyCursor";

/** Buttons that switch the page cursor through `useClassicyCursor`. */
const CursorDemo = () => {
	const setCursor = useClassicyCursor();
	return (
		<div style={{ display: "flex", gap: "1em" }}>
			<ClassicyButton onClickFunc={() => setCursor("watch")}>
				Watch
			</ClassicyButton>
			<ClassicyButton onClickFunc={() => setCursor("hand")}>
				Hand
			</ClassicyButton>
			<ClassicyButton onClickFunc={() => setCursor("resizeLr")}>
				Resize
			</ClassicyButton>
			<ClassicyButton onClickFunc={() => setCursor()}>Reset</ClassicyButton>
		</div>
	);
};

const meta = {
	title: "System/Cursor",
	component: CursorDemo,
	parameters: {
		docs: {
			description: {
				component:
					"`useClassicyCursor()` returns a stable `setCursor(name?)` that swaps the " +
					"whole page's pointer (`document.body.style.cursor`) for one of the Mac OS 8 " +
					"cursor roles registered with `registerClassicyCursors`; call it with no name to restore the " +
					"default. The change is global, so reset it when the operation ends. " +
					"`ClassicySplitView` uses it to hold the resize cursor during a divider drag.",
			},
		},
	},
} satisfies Meta<typeof CursorDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Click a button to change the cursor everywhere on the page that does not
 * set its own CSS cursor, then Reset to restore the default arrow.
 */
export const Default: Story = {};

const cursorNames: ClassicyCursorRole[] = [
	"arrow",
	"watch",
	"hand",
	"ibeam",
	"crosshair",
	"resizeLr",
	"resizeUd",
	"resizeNwse",
	"resizeNesw",
	"resizeU",
	"resizeD",
	"resizeL",
	"resizeR",
];

/**
 * Every cursor role, one button each, so the full set can be compared. Platinum
 * registers no cursor for `ibeam`, `crosshair`, `resizeNwse` or `resizeNesw`,
 * so those buttons restore the default. Remember to Reset afterwards — the
 * cursor stays until changed.
 */
export const AllCursors: Story = {
	render: function AllCursorsRender() {
		const setCursor = useClassicyCursor();
		return (
			<div style={{ display: "flex", flexWrap: "wrap", gap: "0.5em" }}>
				{cursorNames.map((name) => (
					<ClassicyButton key={name} onClickFunc={() => setCursor(name)}>
						{name}
					</ClassicyButton>
				))}
				<ClassicyButton isDefault onClickFunc={() => setCursor()}>
					Reset
				</ClassicyButton>
			</div>
		);
	},
};
