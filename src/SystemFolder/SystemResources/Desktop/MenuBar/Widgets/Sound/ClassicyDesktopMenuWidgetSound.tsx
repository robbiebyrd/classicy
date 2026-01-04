import "./ClassicyDesktopMenuWidgetSound.scss";
import "@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
  useSound,
  useSoundDispatch,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import classNames from "classnames";
import React from "react";
import soundOnImg from "@img/icons/control-panels/sound-manager/sound-on.png";
import soundOffImg from "@img/icons/control-panels/sound-manager/sound-off.png";
import appIcon from "@img/icons/control-panels/sound-manager/app.png";

type ClassicyDesktopMenuWidgetSoundProps = {
  hide?: boolean;
};

export const ClassicyDesktopMenuWidgetSound: React.FC<
  ClassicyDesktopMenuWidgetSoundProps
> = ({ hide = false }) => {
  const player = useSoundDispatch();
  const playerState = useSound();
  const desktopEventDispatch = useAppManagerDispatch();

  const openSoundManager = (e: React.MouseEvent) => {
    e.preventDefault();
    desktopEventDispatch({
      type: "ClassicyAppOpen",
      app: {
        id: "SoundManager.app",
        name: "Sound Manager",
        icon: appIcon,
      },
    });
  };

  const mute = () => {
    player({
      type: "ClassicySoundDisable",
      disabled: playerState.disabled.includes("*") ? [] : ["*"],
    });
    return;
  };

  return (
    <>
      {!hide && (
        <li
          className={classNames(
            "classicyDesktopMenuWidgetSound",
            "classicyMenuItem",
            "classicyMenuItemNoImage",
          )}
          onClick={mute}
          onDoubleClick={openSoundManager}
        >
          <img
            src={playerState.disabled.includes("*") ? soundOffImg : soundOnImg}
            alt={playerState.disabled.includes("*") ? "Unmute" : "Mute"}
          />
        </li>
      )}
    </>
  );
};
