"use client";

import appIcon from "./resources/app.png";
import packageIcon from "./resources/platinum.png";
import {
  ClassicyTheme,
  getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
  useAppManager,
  useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { getClassicyAboutWindow } from "@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindowUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
  quitAppHelper,
  quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { FC as FunctionalComponent, ChangeEvent, useState } from "react";
import {
  ClassicyDefaultWallpaper,
  ClassicyWallpapers,
} from "./ClassicyWallpapers";
import { ClassicyFonts } from "./ClassicyFonts";

function isValidUrlWithRegex(url: string): boolean {
  const urlPattern = /^(https?):\/\/[^\s/$.?#].[^\s]*$/i;
  return urlPattern.test(url);
}

export const ClassicyAppearanceManager: FunctionalComponent = () => {
  const appName: string = "Appearance Manager";
  const appId: string = "AppearanceManager.app";

  const appearanceState = useAppManager(
      (state) => state.System.Manager.Appearance,
    ),
    desktopEventDispatch = useAppManagerDispatch(),
    player = useSoundDispatch();

  const [showAbout, setShowAbout] = useState(false);
  const [bg, setBg] = useState<string>(
    appearanceState.activeTheme.desktop.backgroundImage.startsWith("data:")
      ? appearanceState.activeTheme.desktop.backgroundImage
      : ClassicyDefaultWallpaper,
  );

  const themesList = appearanceState.availableThemes?.map((a: ClassicyTheme) =>
    (({ id, name }) => ({ value: id, label: name }))(a),
  );

  const switchTheme = async (e: ChangeEvent<HTMLSelectElement>) => {
    desktopEventDispatch({
      type: "ClassicyDesktopChangeTheme",
      activeTheme: e.currentTarget.value,
    });
    await loadSoundTheme(e.currentTarget.value);
  };

  const changeBackground = (e: ChangeEvent<HTMLSelectElement>) => {
    setBg(e.target.value);
    desktopEventDispatch({
      type: "ClassicyDesktopChangeBackground",
      backgroundImage: e.target.value,
    });
  };

  const setBackgroundURL = (e: ChangeEvent<HTMLInputElement>) => {
    if (isValidUrlWithRegex(e.target.value)) {
      setBg(e.target.value);
      desktopEventDispatch({
        type: "ClassicyDesktopChangeBackground",
        backgroundImage: e.target.value,
      });
    }
  };

  const alignBackground = (e: ChangeEvent<HTMLSelectElement>) => {
    desktopEventDispatch({
      type: "ClassicyDesktopChangeBackgroundPosition",
      backgroundPosition: e.target.value,
    });
  };

  const repeatBackground = (e: ChangeEvent<HTMLSelectElement>) => {
    desktopEventDispatch({
      type: "ClassicyDesktopChangeBackgroundRepeat",
      backgroundRepeat: e.target.value,
    });
  };

  const backgroundSize = (e: ChangeEvent<HTMLSelectElement>) => {
    desktopEventDispatch({
      type: "ClassicyDesktopChangeBackgroundSize",
      backgroundSize: e.target.value,
    });
  };

  const changeFont = (e: ChangeEvent<HTMLSelectElement>) => {
    desktopEventDispatch({
      type: "ClassicyDesktopChangeFont",
      font: e.target.value,
      fontType: e.target.id,
    });
  };
  const loadSoundTheme = async (themeName: string) => {
    const soundTheme = getTheme(themeName).sound;
    const data = await fetch(soundTheme.file).then((response) =>
      response.json(),
    );
    player({
      type: "ClassicySoundLoad",
      file: data,
      disabled: soundTheme.disabled,
    });
  };

  const quitApp = () => {
    desktopEventDispatch(quitAppHelper(appId, appName, appIcon));
  };

  const appMenu = [
    {
      id: appId + "_file",
      title: "File",
      menuChildren: [quitMenuItemHelper(appId, appName, appIcon)],
    },
    {
      id: appId + "_help",
      title: "Help",
      menuChildren: [
        {
          id: appId + "_about",
          title: "About",
          onClickFunc: () => {
            setShowAbout(true);
          },
        },
      ],
    },
  ];

  const cleanupIcons = () => {
    desktopEventDispatch({
      type: "ClassicyDesktopIconCleanup",
    });
  };

  const tabs = [
    {
      title: "Themes",
      children: (
        <>
          <ClassicyControlLabel
            label={"The current Theme Package is Platinum"}
            icon={packageIcon}
          />
          <br />
          {themesList && (
            <ClassicyPopUpMenu
              id={"select_theme"}
              label={"Selected Theme"}
              options={themesList}
              onChangeFunc={switchTheme}
              selected={appearanceState.activeTheme.id || "default"}
            />
          )}
          <br />
        </>
      ),
    },
    {
      title: "Desktop",
      children: (
        <>
          <div style={{ display: "flex", flexDirection: "row", gap: "1em" }}>
            <img
              draggable={false}
              src={bg}
              style={{ height: "100%", minWidth: "50%", userSelect: "none" }}
              alt={"Background"}
            />
            <div style={{ width: "100%" }}>
              <ClassicyControlLabel label={"Patterns"} direction={"left"} />
              <ClassicyPopUpMenu
                id={"bg"}
                options={ClassicyWallpapers}
                onChangeFunc={changeBackground}
                selected={bg.split("/").pop()}
              ></ClassicyPopUpMenu>
              <br />
              <ClassicyControlLabel label={"Picture"} direction={"left"} />
              <ClassicyInput
                id={"custom_background_image_url"}
                onChangeFunc={setBackgroundURL}
              />
              <br />
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1em",
                }}
              >
                <div
                  style={{ display: "flex", flexDirection: "row", gap: "1em" }}
                >
                  <ClassicyControlLabel label={"Align"} direction={"left"} />
                  <ClassicyPopUpMenu
                    onChangeFunc={alignBackground}
                    id={"position_custom_background_image"}
                    small={false}
                    options={[
                      { value: "center", label: "Center" },
                      { value: "top left", label: "Top Left" },
                      { value: "top right", label: "Top Right" },
                      { value: "top center", label: "Top Center" },
                      { value: "bottom left", label: "Bottom Left" },
                      { value: "bottom right", label: "Bottom Right" },
                      { value: "bottom center", label: "Bottom Center" },
                      // { value: 'tile', label: 'Tile on Screen' },
                    ]}
                    selected={"center"}
                  />
                </div>
                <div
                  style={{ display: "flex", flexDirection: "row", gap: "1em" }}
                >
                  <ClassicyControlLabel label={"Repeat"} direction={"left"} />
                  <ClassicyPopUpMenu
                    onChangeFunc={repeatBackground}
                    id={"repeat_background_image"}
                    small={false}
                    options={[
                      { value: "repeat", label: "Repeat" },
                      { value: "repeat-x", label: "Repeat Horizontally" },
                      { value: "repeat-y", label: "Repeat Vertically" },
                      { value: "no-repeat", label: "No Repeat" },
                    ]}
                    selected={"repeat"}
                  />
                </div>
                <div
                  style={{ display: "flex", flexDirection: "row", gap: "1em" }}
                >
                  <ClassicyControlLabel label={"Size"} direction={"left"} />
                  <ClassicyPopUpMenu
                    onChangeFunc={backgroundSize}
                    id={"repeat_background_image"}
                    small={false}
                    options={[
                      { value: "normal", label: "Normal" },
                      { value: "cover", label: "Stretch" },
                      { value: "contain", label: "Fill" },
                    ]}
                    selected={"repeat"}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      ),
    },
    {
      title: "Fonts",
      children: (
        <div style={{ display: "flex", flexDirection: "column", gap: "1em" }}>
          <div style={{ display: "flex", flexDirection: "row", gap: "1em" }}>
            <div style={{ width: "50%" }}>
              <ClassicyControlLabel
                label={"Large System Font"}
                direction={"left"}
              />
            </div>
            <ClassicyPopUpMenu
              id={"ui"}
              options={ClassicyFonts}
              selected={appearanceState.activeTheme.typography.ui}
              onChangeFunc={changeFont}
            ></ClassicyPopUpMenu>
          </div>
          <div style={{ display: "flex", flexDirection: "row", gap: "1em" }}>
            <div style={{ width: "50%" }}>
              <ClassicyControlLabel
                label={"Small System Font"}
                direction={"left"}
              />
            </div>
            <ClassicyPopUpMenu
              id={"body"}
              options={ClassicyFonts}
              selected={appearanceState.activeTheme.typography.body}
              onChangeFunc={changeFont}
            ></ClassicyPopUpMenu>
          </div>
          <div style={{ display: "flex", flexDirection: "row", gap: "1em" }}>
            <div style={{ width: "50%" }}>
              <ClassicyControlLabel label={"Header Font"} direction={"left"} />
            </div>
            <ClassicyPopUpMenu
              id={"header"}
              options={ClassicyFonts}
              selected={appearanceState.activeTheme.typography.header}
              onChangeFunc={changeFont}
            ></ClassicyPopUpMenu>
          </div>
        </div>
      ),
    },
  ];

  return (
    <ClassicyApp
      id={appId}
      name={appName}
      icon={appIcon}
      defaultWindow={"AppearanceManager_1"}
      noDesktopIcon={true}
      addSystemMenu={true}
    >
      <ClassicyWindow
        id={"AppearanceManager_1"}
        title={appName}
        appId={appId}
        icon={appIcon}
        closable={true}
        resizable={false}
        zoomable={false}
        scrollable={false}
        collapsable={false}
        initialSize={[500, 0]}
        initialPosition={[300, 50]}
        modal={false}
        appMenu={appMenu}
      >
        <div
          style={{
            backgroundColor: "var(--color-system-03)",
            height: "100%",
            width: "100%",
            padding: "var(--window-padding-size)",
            boxSizing: "border-box",
          }}
        >
          <ClassicyTabs tabs={tabs} />
          <ClassicyButton onClickFunc={cleanupIcons}>
            Cleanup Icons
          </ClassicyButton>
          <ClassicyButton onClickFunc={quitApp}>Quit</ClassicyButton>
        </div>
      </ClassicyWindow>
      {showAbout &&
        getClassicyAboutWindow({
          appId,
          appName,
          appIcon,
          hideFunc: () => setShowAbout(false),
        })}
    </ClassicyApp>
  );
};
