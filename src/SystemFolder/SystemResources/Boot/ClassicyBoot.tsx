import "./ClassicyBoot.scss";
import { type FC as FunctionalComponent, useEffect } from "react";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";

export const ClassicyBoot: FunctionalComponent = () => {
	const player = useSoundDispatch();
	useEffect(() => {
		player({ type: "ClassicySoundPlay", sound: "ClassicyBoot" });
	}, [player]);

	return <div className={"classicyBoot"} />;
};
