/**
 * HyperCard.app — a JSON-driven HyperCard stack player for Classicy.
 *
 * Renders the active stack's current card in a window, wires the Go/File menus,
 * and bridges the pure interpreter to the outside world: it consumes queued
 * sound/openApp effects, drives `wait` timers, animates card transitions, and
 * shows ask/answer dialogs — all by dispatching back into the reducer.
 */

import {
	type FC as FunctionalComponent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { HyperCardCard } from "@/SystemFolder/HyperCard/HyperCardCard";
import { HyperCardDialog } from "@/SystemFolder/HyperCard/HyperCardDialog";
import { HyperCardBuiltInStacks } from "@/SystemFolder/HyperCard/HyperCardSampleStack";
import { HyperCardTransition } from "@/SystemFolder/HyperCard/HyperCardTransition";
import {
	getCard,
	type HCOpenStack,
	HyperCardAppInfo,
	type HyperCardData,
	isHyperCardData,
} from "@/SystemFolder/HyperCard/HyperCardUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { quitMenuItemHelper } from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
// Side-effect import: registers the ClassicyAppHyperCard* reducer.
import "./HyperCardContext";
import "./HyperCard.scss";

const { id: appId, name: appName, icon: appIcon } = HyperCardAppInfo;

function useHyperCardData(): HyperCardData | undefined {
	return useAppManager((s) => {
		const raw = s.System.Manager.Applications.apps[appId]?.data;
		return raw && isHyperCardData(raw) ? raw : undefined;
	});
}

export const HyperCard: FunctionalComponent = () => {
	const dispatch = useAppManagerDispatch();
	const player = useSoundDispatch();

	const data = useHyperCardData();
	const activeStackId = data?.activeStackId;
	const open: HCOpenStack | undefined = activeStackId
		? data?.openStacks[activeStackId]
		: undefined;

	const runtime = open?.runtime;
	const pendingEffects = runtime?.pendingEffects;
	const waitToken = runtime?.wait?.token;
	const waitMs = runtime?.wait?.ms;

	// --- consume queued sound / openApp effects (by id, once) ---
	const playedRef = useRef<Set<number>>(new Set());
	useEffect(() => {
		if (
			!open ||
			!activeStackId ||
			!pendingEffects ||
			pendingEffects.length === 0
		)
			return;
		const consumed: number[] = [];
		for (const e of pendingEffects) {
			consumed.push(e.id);
			if (playedRef.current.has(e.id)) continue;
			playedRef.current.add(e.id);
			if (e.kind === "beep") {
				player({ type: "ClassicySoundPlay", sound: "ClassicyBeep" });
			} else if (e.kind === "play") {
				player({ type: "ClassicySoundPlay", sound: e.sound });
			} else if (e.kind === "openApp") {
				dispatch({
					type: e.event ?? "ClassicyAppOpen",
					app: { id: e.appId },
					...(e.data ?? {}),
				});
			}
		}
		dispatch({
			type: "ClassicyAppHyperCardConsumeEffects",
			stackId: activeStackId,
			ids: consumed,
		});
	}, [open, activeStackId, pendingEffects, player, dispatch]);

	// --- drive `wait` timers ---
	useEffect(() => {
		if (!activeStackId || !waitToken) return;
		const timer = setTimeout(() => {
			dispatch({
				type: "ClassicyAppHyperCardWaitComplete",
				stackId: activeStackId,
				token: waitToken,
			});
		}, waitMs ?? 0);
		return () => clearTimeout(timer);
	}, [activeStackId, waitToken, waitMs, dispatch]);

	const openStack = useCallback(
		(id: string) => {
			const entry = HyperCardBuiltInStacks[id];
			if (!entry) return;
			dispatch({
				type: "ClassicyAppHyperCardOpenStack",
				stackId: entry.id,
				stack: entry.stack,
			});
		},
		[dispatch],
	);

	const navigate = useCallback(
		(to: string) => {
			if (!activeStackId) return;
			dispatch({
				type: "ClassicyAppHyperCardNavigate",
				stackId: activeStackId,
				to,
			});
		},
		[activeStackId, dispatch],
	);

	const appMenu: ClassicyMenuItem[] = useMemo(
		() => [
			{
				id: "file",
				title: "File",
				menuChildren: [
					...Object.values(HyperCardBuiltInStacks).map((entry) => ({
						id: `open_${entry.id}`,
						title: `Open “${entry.stack.name}”`,
						onClickFunc: () => openStack(entry.id),
					})),
					{ id: "file_sep", title: "-" },
					quitMenuItemHelper(appId, appName, appIcon),
				],
			},
			{
				id: "go",
				title: "Go",
				menuChildren: [
					{
						id: "go_first",
						title: "First",
						onClickFunc: () => navigate("first"),
					},
					{ id: "go_prev", title: "Prev", onClickFunc: () => navigate("prev") },
					{ id: "go_next", title: "Next", onClickFunc: () => navigate("next") },
					{ id: "go_last", title: "Last", onClickFunc: () => navigate("last") },
					{ id: "go_sep", title: "-" },
					{ id: "go_back", title: "Back", onClickFunc: () => navigate("back") },
				],
			},
		],
		[navigate, openStack],
	);

	const currentCard = open
		? getCard(open.stack, open.currentCardId)
		: undefined;
	const windowTitle = open
		? `${open.stack.name}${currentCard?.name ? ` — ${currentCard.name}` : ""}`
		: appName;

	return (
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			addSystemMenu={true}
			defaultWindow={"hypercard_main"}
		>
			<ClassicyWindow
				id={"hypercard_main"}
				title={windowTitle}
				appId={appId}
				appMenu={appMenu}
				scrollable={true}
				resizable={true}
				initialSize={open ? [(open.stack.size?.[0] ?? 420) + 4, 0] : [420, 320]}
				initialPosition={["center", 80]}
			>
				{open && activeStackId ? (
					<div className={"classicyHyperCardStage"}>
						<HyperCardTransition
							transition={runtime?.transition}
							stackId={activeStackId}
							cardKey={open.currentCardId}
						>
							<HyperCardCard open={open} stackId={activeStackId} />
						</HyperCardTransition>
					</div>
				) : (
					<div style={{ padding: "1em" }}>
						<ClassicyControlLabel
							label={"No stack open. Choose File → Open to load a stack."}
						/>
					</div>
				)}
			</ClassicyWindow>

			{open && activeStackId && runtime?.dialog ? (
				<HyperCardDialog dialog={runtime.dialog} stackId={activeStackId} />
			) : null}
		</ClassicyApp>
	);
};

export default HyperCard;
