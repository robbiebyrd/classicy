// System 7's icons, system art and cursors (plan 0018-dbd §4.1), exported
// from System 7.5.5, under each of its two themes: the black-and-white
// "System 7" draws the `bw` variant (the 1-bit families), "System 7 Color"
// the base tree (the 8-bit ones). Each icon shows at 32 px and at 16 px, its
// own small image where System 7 has one.
import {
	type ClassicyCursorRole,
	type ClassicySystemArtKey,
	ClassicyWindow,
	useAppManagerDispatch,
	useClassicyAsset,
	useClassicyIconImage,
} from "@classicy/classicy";
import { StoryApp } from "@sb/helpers";
import { system7Parameters } from "@sb/system7";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, type ReactNode, useEffect } from "react";
import { SYSTEM7_ICON_FILES, SYSTEM7_ICON_REUSE } from "./assets/system7Icons";

const meta = {
	title: "Appearance/System 7/Icons",
	parameters: system7Parameters,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Activates one of the package's themes once the desktop has mounted. */
function WithTheme({ id, children }: { id: string; children: ReactNode }) {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({ type: "ClassicyDesktopChangeTheme", activeTheme: id });
	}, [dispatch, id]);
	return children;
}

const grid: CSSProperties = {
	display: "grid",
	gridTemplateColumns: "repeat(auto-fill, minmax(7.5em, 1fr))",
	gap: "0.5em",
	padding: "0.5em",
};
const cell: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	gap: "0.25em",
	margin: 0,
	fontSize: "9px",
	textAlign: "center",
	overflowWrap: "anywhere",
};
const pixelated: CSSProperties = { imageRendering: "pixelated" };

function IconCell({ iconKey }: { iconKey: string }) {
	const src = useClassicyAsset("icons", iconKey) ?? "";
	const small = useClassicyIconImage(src, 16);
	return (
		<figure style={cell}>
			<span>
				<img src={src} width={32} height={32} alt="" style={pixelated} />{" "}
				<img src={small} width={16} height={16} alt="" style={pixelated} />
			</span>
			<figcaption>{iconKey}</figcaption>
		</figure>
	);
}

const ART_KEYS: ClassicySystemArtKey[] = [
	"appleMenu",
	"helpMenuTitle",
	"trashEmpty",
	"trashFull",
	"windowStripes",
	"windowUtilityTexture",
	"windowGrip",
	"zoomGlyph",
	"submenuArrow",
	"popupArrows",
	"sliderThumb",
	"menuCheck",
	"menuDash",
	"halftone",
	"startupLogo",
];

function ArtCell({ artKey }: { artKey: ClassicySystemArtKey }) {
	const src = useClassicyAsset("systemArt", artKey) ?? "";
	return (
		<figure style={cell}>
			<img src={src} alt="" style={pixelated} />
			<figcaption>{artKey}</figcaption>
		</figure>
	);
}

const CURSOR_ROLES: ClassicyCursorRole[] = [
	"arrow",
	"watch",
	"ibeam",
	"crosshair",
	"hand",
	"resizeLr",
	"resizeUd",
	"resizeNwse",
	"resizeNesw",
	"resizeU",
	"resizeD",
	"resizeL",
	"resizeR",
];

function CursorCell({ role }: { role: ClassicyCursorRole }) {
	const src = useClassicyAsset("cursors", role) ?? "";
	return (
		<figure style={cell}>
			<img src={src} width={16} height={16} alt="" style={pixelated} />
			<figcaption>{role}</figcaption>
		</figure>
	);
}

const ICON_KEYS = [
	...Object.keys(SYSTEM7_ICON_FILES),
	...Object.keys(SYSTEM7_ICON_REUSE),
];

function Gallery() {
	return (
		<StoryApp id="storybook.app" name="Storybook">
			<ClassicyWindow
				id="system7-icons"
				appId="storybook.app"
				title="System 7 Icons"
				initialSize={[620, 440]}
				initialPosition={[10, 30]}
				scrollable
			>
				<h3>Icons</h3>
				<div style={grid}>
					{ICON_KEYS.map((key) => (
						<IconCell key={key} iconKey={key} />
					))}
				</div>
				<h3>System art</h3>
				<div style={grid}>
					{ART_KEYS.map((key) => (
						<ArtCell key={key} artKey={key} />
					))}
				</div>
				<h3>Cursors</h3>
				<div style={grid}>
					{CURSOR_ROLES.map((role) => (
						<CursorCell key={role} role={role} />
					))}
				</div>
			</ClassicyWindow>
		</StoryApp>
	);
}

/** The black-and-white "System 7" theme: the 1-bit icons and art. */
export const BlackAndWhite: Story = {
	render: () => <Gallery />,
};

/** The "System 7 Color" theme: the 8-bit icons and color art. */
export const Color: Story = {
	render: () => (
		<WithTheme id="system7-color">
			<Gallery />
		</WithTheme>
	),
};
