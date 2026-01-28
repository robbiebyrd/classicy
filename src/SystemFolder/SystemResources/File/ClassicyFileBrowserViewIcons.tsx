import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
  cleanupIcon,
  iconImageByType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryMetadata } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { ClassicyIcon } from "@/SystemFolder/SystemResources/Icon/ClassicyIcon";
import React, { RefObject, useEffect, useState } from "react";

export type ClassicyFileBrowserViewIconsProps = {
  fs: ClassicyFileSystem;
  path: string;
  appId: string;
  dirOnClickFunc?: (path: string) => void;
  fileOnClickFunc?: (path: string) => void;
  holderRef?: RefObject<HTMLDivElement | null>;
};

type iconType = {
  appId: string;
  name: string;
  invisible: boolean;
  icon: string;
  onClickFunc: () => void;
  holder: React.RefObject<HTMLDivElement | null>;
  initialPosition: [number, number];
};

export const ClassicyFileBrowserViewIcons: React.FC<ClassicyFileBrowserViewIconsProps> =
  React.memo(
    ({ fs, path, appId, dirOnClickFunc, fileOnClickFunc, holderRef }) => {
      const desktopContext = useAppManager();

      const [items, setItems] = useState<iconType[]>([]);

      useEffect(() => {
        if (!holderRef?.current) {
          return;
        }

        const openFileOrFolder = (
          properties: ClassicyFileSystemEntryMetadata,
          path: string,
          filename: string,
        ) => {
          switch (properties["_type"]) {
            case "directory": {
              if (dirOnClickFunc) {
                return dirOnClickFunc(path + ":" + filename);
              }
              break;
            }
            case "file": {
              if (fileOnClickFunc) {
                return fileOnClickFunc(path + ":" + filename);
              }
              break;
            }
          }
        };

        const containerMeasure: [number, number] = [
          holderRef.current.getBoundingClientRect().width,
          holderRef.current.getBoundingClientRect().height,
        ];
        const directoryListing: ClassicyFileSystemEntryMetadata | object =
          fs.filterByType(path, ["file", "directory"]);

        const updatedIcons = Object.entries(directoryListing).map(
          ([filename, properties], index) => {
            return {
              appId: appId,
              name: filename,
              invisible: properties["_invisible"],
              icon: properties["_icon"] || iconImageByType(properties["_type"]),
              onClickFunc: () => openFileOrFolder(properties, path, filename),
              holder: holderRef,
              initialPosition: cleanupIcon(
                desktopContext.System.Manager.Appearance.activeTheme,
                index,
                Object.entries(directoryListing).length,
                containerMeasure,
              ),
            };
          },
        );
        setItems(updatedIcons);
      }, [
        appId,
        path,
        fs,
        dirOnClickFunc,
        fileOnClickFunc,
        desktopContext.System.Manager.Appearance.activeTheme,
        holderRef,
      ]);

      return (
        <div
          style={{ position: "absolute", width: "100%", height: "100%" }}
          ref={holderRef}
        >
          {items.map((item) => {
            return <ClassicyIcon {...item} key={item.name} />;
          })}
        </div>
      );
    },
  );

ClassicyFileBrowserViewIcons.displayName = "ClassicyFileBrowserViewIcons";
