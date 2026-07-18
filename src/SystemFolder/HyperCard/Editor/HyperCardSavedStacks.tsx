/**
 * "Open Saved Stack…" browser: lists every save provider that implements
 * list(), with an Open button per entry that load()s the stack and hands it
 * to the host (which dispatches OpenStack and closes this window).
 */

import { type FC as FunctionalComponent, useEffect, useState } from "react";
import type { HCStack } from "@/SystemFolder/HyperCard/HyperCardModel";
import {
	getHyperCardSaveProviders,
	type HCSavedStackRef,
} from "@/SystemFolder/HyperCard/HyperCardPlugins";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";

interface ProviderListing {
	providerId: string;
	label: string;
	refs?: HCSavedStackRef[];
	error?: string;
}

interface HyperCardSavedStacksProps {
	onOpen: (stack: HCStack, ref: HCSavedStackRef, providerId: string) => void;
}

export const HyperCardSavedStacks: FunctionalComponent<
	HyperCardSavedStacksProps
> = ({ onOpen }) => {
	const [listings, setListings] = useState<ProviderListing[] | undefined>();
	const [error, setError] = useState<string | undefined>();

	useEffect(() => {
		let cancelled = false;
		const providers = getHyperCardSaveProviders().filter((p) => p.list);
		Promise.all(
			providers.map(async (p) => {
				try {
					// biome-ignore lint/style/noNonNullAssertion: filtered on list above
					const refs = await p.list!();
					return { providerId: p.id, label: p.label, refs };
				} catch (err) {
					return {
						providerId: p.id,
						label: p.label,
						error: err instanceof Error ? err.message : String(err),
					};
				}
			}),
		).then((results) => {
			if (!cancelled) setListings(results);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	const open = async (providerId: string, ref: HCSavedStackRef) => {
		const provider = getHyperCardSaveProviders().find(
			(p) => p.id === providerId,
		);
		if (!provider?.load) return;
		try {
			const stack = await provider.load(ref);
			onOpen(stack, ref, providerId);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	};

	if (!listings) return <ClassicyControlLabel label={"Loading…"} />;

	return (
		<div className={"classicyHyperCardSavedStacks"}>
			{listings.map((listing) => (
				<div key={listing.providerId}>
					<ClassicyControlLabel label={listing.label} />
					{listing.error ? (
						<ClassicyControlLabel label={`✗ ${listing.error}`} />
					) : null}
					{(listing.refs ?? []).map((ref) => (
						<div
							key={`${listing.providerId}:${ref.id}`}
							className={"classicyHyperCardInspectorRow"}
						>
							<ClassicyControlLabel label={ref.name} />
							<ClassicyButton
								onClickFunc={() => void open(listing.providerId, ref)}
							>
								Open
							</ClassicyButton>
						</div>
					))}
				</div>
			))}
			{error ? <ClassicyControlLabel label={`✗ ${error}`} /> : null}
		</div>
	);
};
