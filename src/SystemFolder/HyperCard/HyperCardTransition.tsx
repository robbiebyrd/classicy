/**
 * Wraps the card stage and plays a visual-effect entry animation when a
 * transition is active. Completion is tokenized (a stale token no-ops in the
 * reducer) and backstopped by a timeout so a missed animationend event never
 * strands the interpreter in `awaitingTransition`.
 */

import classNames from "classnames";
import {
	type FC as FunctionalComponent,
	type ReactNode,
	useEffect,
} from "react";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type { HCTransition } from "@/SystemFolder/HyperCard/HyperCardUtils";
import "./HyperCard.scss";

/** Keep in sync with --hc-transition-duration in HyperCard.scss. */
export const HC_TRANSITION_MS = 300;
const BACKSTOP_MS = HC_TRANSITION_MS + 120;

interface HyperCardTransitionProps {
	transition?: HCTransition;
	stackId: string;
	/** Current card id — keys the stage so plain card changes remount cleanly. */
	cardKey: string;
	children: ReactNode;
}

export const HyperCardTransition: FunctionalComponent<
	HyperCardTransitionProps
> = ({ transition, stackId, cardKey, children }) => {
	const dispatch = useAppManagerDispatch();
	const token = transition?.token;

	useEffect(() => {
		if (!token) return;
		const timer = setTimeout(() => {
			dispatch({
				type: "ClassicyAppHyperCardTransitionComplete",
				stackId,
				token,
			});
		}, BACKSTOP_MS);
		return () => clearTimeout(timer);
	}, [token, stackId, dispatch]);

	const complete = () => {
		if (token) {
			dispatch({
				type: "ClassicyAppHyperCardTransitionComplete",
				stackId,
				token,
			});
		}
	};

	return (
		<div
			key={token ?? cardKey}
			className={classNames(
				"classicyHyperCardStageInner",
				token && "classicyHyperCardAnimating",
				token && transition && `effect-${transition.effect}`,
			)}
			onAnimationEnd={token ? complete : undefined}
		>
			{children}
		</div>
	);
};
