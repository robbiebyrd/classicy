import "./ClassicyAppearanceManager.scss";
import appIcon from "./resources/app.png";
import packageIcon from "./resources/platinum.png";
import {
  ClassicyTheme,
  getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { ClassicySounds } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicySounds";
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
import { FC as FunctionalComponent, ChangeEvent, startTransition, useMemo, useState } from "react";
import {
  ClassicyDefaultWallpaper,
  ClassicyWallpapers,
} from "./ClassicyWallpapers";
import { isValidHttpUrl } from "@/SystemFolder/SystemResources/Utils/urlValidation";
const APP_ID = "AppearanceManager.app";
const APP_NAME = "Appearance Manager";

const ClassicyFonts = [
  { label: "Charcoal", value: "Charcoal" },
  { label: "ChicagoFLF", value: "ChicagoFLF" },
  { label: "Geneva", value: "Geneva" },
  { label: "AppleGaramond", value: "AppleGaramond" },
];

function isValidUrlWithRegex(url: string): boolean {
  return isValidHttpUrl(url);
}

export const ClassicyAppearanceManager: FunctionalComponent = () => {

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

  const themesList = useMemo(
    () =>
      appearanceState.availableThemes?.map((a: ClassicyTheme) =>
        (({ id, name }) => ({ value: id, label: name }))(a),
      ),
    [appearanceState.availableThemes],
  );

  const switchTheme = (e: ChangeEvent<HTMLSelectElement>) => {
    const themeId = e.currentTarget.value;
    startTransition(() => {
      desktopEventDispatch({
        type: "ClassicyDesktopChangeTheme",
        activeTheme: themeId,
      });
    });
    applySoundTheme(themeId);
  };

  const changeBackground = (e: ChangeEvent<HTMLSelectElement>) => {
    setBg(e.target.value);
    startTransition(() => {
      desktopEventDispatch({
        type: "ClassicyDesktopChangeBackground",
        backgroundImage: e.target.value,
      });
    });
  };

  const setBackgroundURL = (e: ChangeEvent<HTMLInputElement>) => {
    if (isValidUrlWithRegex(e.target.value)) {
      setBg(e.target.value);
      startTransition(() => {
        desktopEventDispatch({
          type: "ClassicyDesktopChangeBackground",
          backgroundImage: e.target.value,
        });
      });
    }
  };

  const alignBackground = (e: ChangeEvent<HTMLSelectElement>) => {
    startTransition(() => {
      desktopEventDispatch({
        type: "ClassicyDesktopChangeBackgroundPosition",
        backgroundPosition: e.target.value,
      });
    });
  };

  const repeatBackground = (e: ChangeEvent<HTMLSelectElement>) => {
    startTransition(() => {
      desktopEventDispatch({
        type: "ClassicyDesktopChangeBackgroundRepeat",
        backgroundRepeat: e.target.value,
      });
    });
  };

  const backgroundSize = (e: ChangeEvent<HTMLSelectElement>) => {
    startTransition(() => {
      desktopEventDispatch({
        type: "ClassicyDesktopChangeBackgroundSize",
        backgroundSize: e.target.value,
      });
    });
  };

  const changeFont = (e: ChangeEvent<HTMLSelectElement>) => {
    startTransition(() => {
      desktopEventDispatch({
        type: "ClassicyDesktopChangeFont",
        font: e.target.value,
        fontType: e.target.id,
      });
    });
  };
  const applySoundTheme = (themeName: string) => {
    const soundTheme = getTheme(themeName).sound;
    const data = ClassicySounds[soundTheme.name];
    if (!data) {
      console.error("[ClassicyAppearanceManager] Sound theme not found", { name: soundTheme.name });
      return;
    }
    player({
      type: "ClassicySoundLoad",
      file: data,
      disabled: soundTheme.disabled,
    });
  };

  const quitApp = () => {
    desktopEventDispatch(quitAppHelper(APP_ID, APP_NAME, appIcon));
  };

  const appMenu = [
    {
      id: APP_ID + "_file",
      title: "File",
      menuChildren: [quitMenuItemHelper(APP_ID, APP_NAME, appIcon)],
    },
    {
      id: APP_ID + "_help",
      title: "Help",
      menuChildren: [
        {
          id: APP_ID + "_about",
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
          <div className={"classicyAppearanceManagerDesktopRow"}>
            <img
              draggable={false}
              src={bg}
              className={"classicyAppearanceManagerDesktopPreview"}
              alt={"Background"}
            />
            <div className={"classicyAppearanceManagerDesktopControls"}>
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
              <div className={"classicyAppearanceManagerDesktopOptionsColumn"}>
                <div className={"classicyAppearanceManagerDesktopOptionsRow"}>
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
                <div className={"classicyAppearanceManagerDesktopOptionsRow"}>
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
                <div className={"classicyAppearanceManagerDesktopOptionsRow"}>
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
        <div className={"classicyAppearanceManagerFontsColumn"}>
          <div className={"classicyAppearanceManagerFontsRow"}>
            <div className={"classicyAppearanceManagerFontsLabel"}>
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
          <div className={"classicyAppearanceManagerFontsRow"}>
            <div className={"classicyAppearanceManagerFontsLabel"}>
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
          <div className={"classicyAppearanceManagerFontsRow"}>
            <div className={"classicyAppearanceManagerFontsLabel"}>
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
      id={APP_ID}
      name={APP_NAME}
      icon={appIcon}
      defaultWindow={"AppearanceManager_1"}
      noDesktopIcon={true}
      addSystemMenu={true}
    >
      <ClassicyWindow
        id={"AppearanceManager_1"}
        title={APP_NAME}
        appId={APP_ID}
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
        <div className={"classicyAppearanceManagerContent"}>
          <ClassicyTabs tabs={tabs} />
          <ClassicyButton onClickFunc={cleanupIcons}>
            Cleanup Icons
          </ClassicyButton>
          <ClassicyButton onClickFunc={quitApp}>Quit</ClassicyButton>
        </div>
      </ClassicyWindow>
      {showAbout
        ? getClassicyAboutWindow({
            appId: APP_ID,
            appName: APP_NAME,
            appIcon,
            hideFunc: () => setShowAbout(false),
          })
        : null}
    </ClassicyApp>
  );
};
