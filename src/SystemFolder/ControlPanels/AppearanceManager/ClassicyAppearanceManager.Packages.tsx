import { useMemo } from "react";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { intToHex } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyColors";
import { ClassicyRadioInput } from "@/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput";
import type { TabIndividual } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";

interface PackagesTabProps {
	/** Every registered Appearance Package, in registration order. */
	packages: ClassicyAppearancePackage[];
	/** The id of the package in use (the resolved one), whose button is on. */
	activePackageId: string;
	/** Called with the id of the package the user picks. */
	changePackage: (packageId: string) => void;
}

/** DOM id of a package's radio button, e.g. `appearance_package_platinum`. */
export const appearancePackageInputId = (packageId: string): string =>
	`appearance_package_${packageId}`;

/**
 * The Appearance Manager's Packages tab: one radio button per registered
 * Appearance Package, labeled with its name and preset count, and below them
 * each package's seven theme colors (`defaults.color.theme`) as a row of
 * swatches. Picking a package calls `changePackage` with its id.
 */
export const usePackagesTab = ({
	packages,
	activePackageId,
	changePackage,
}: PackagesTabProps): TabIndividual => {
	// ClassicyRadioInput re-derives its selection whenever `inputs` changes
	// identity, so the list is rebuilt only when the packages or the active
	// one change.
	const inputs = useMemo(
		() =>
			packages.map((pkg) => ({
				id: appearancePackageInputId(pkg.id),
				label: `${pkg.name} (${pkg.presets?.length ?? 0} presets)`,
				checked: pkg.id === activePackageId,
			})),
		[packages, activePackageId],
	);

	return useMemo(
		() => ({
			title: "Packages",
			children: (
				<>
					<ClassicyRadioInput
						name="appearance_package"
						inputs={inputs}
						onClickFunc={(id) => {
							const pkg = packages.find(
								(p) => appearancePackageInputId(p.id) === id,
							);
							if (pkg) changePackage(pkg.id);
						}}
					/>
					<ul className={"classicyAppearanceManagerPackageSwatches"}>
						{packages.map((pkg) => (
							<li
								key={pkg.id}
								data-package-id={pkg.id}
								aria-label={`${pkg.name} colors`}
							>
								{pkg.defaults.color.theme.map((c, i) => (
									<span
										// biome-ignore lint/suspicious/noArrayIndexKey: a fixed seven-slot palette; colors may repeat.
										key={i}
										className={"classicyAppearanceManagerPackageSwatch"}
										style={{ background: intToHex(c) }}
									/>
								))}
							</li>
						))}
					</ul>
				</>
			),
		}),
		[inputs, packages, changePackage],
	);
};
