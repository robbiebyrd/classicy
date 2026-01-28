import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import React, { useRef, useMemo, useCallback } from "react";
import { ClassicyFileBrowserViewIcons } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons";
import { ClassicyFileBrowserViewTable } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable";

type ClassicyFileBrowserProps = {
  fs: ClassicyFileSystem;
  path: string;
  appId: string;
  display?: "icons" | "list";
  dirOnClickFunc?: (path: string) => void;
  fileOnClickFunc?: (path: string) => void;
};

// Define stable default functions outside component to prevent re-creation
const defaultDirOnClick = () => {};
const defaultFileOnClick = () => {};

export const ClassicyFileBrowser: React.FC<ClassicyFileBrowserProps> = ({
  fs,
  display = "icons",
  path,
  appId,
  dirOnClickFunc,
  fileOnClickFunc,
}) => {
  const holderRef = useRef<HTMLDivElement>(null);

  // Use useCallback to create stable references for callback functions
  const handleDirClick = useCallback(
    (path: string) => {
      if (dirOnClickFunc) {
        dirOnClickFunc(path);
      }
    },
    [dirOnClickFunc],
  );

  const handleFileClick = useCallback(
    (path: string) => {
      if (fileOnClickFunc) {
        fileOnClickFunc(path);
      }
    },
    [fileOnClickFunc],
  );

  // Use default functions if no callbacks provided
  const finalDirClick = dirOnClickFunc ? handleDirClick : defaultDirOnClick;
  const finalFileClick = fileOnClickFunc ? handleFileClick : defaultFileOnClick;

  // Memoize the view component to prevent unnecessary re-renders
  const viewComponent = useMemo(() => {
    switch (display) {
      case "list":
        return (
          <ClassicyFileBrowserViewTable
            fileOnClickFunc={finalFileClick}
            dirOnClickFunc={finalDirClick}
            fs={fs}
            path={path}
            appId={appId}
            iconSize={18}
            holderRef={holderRef}
          />
        );
      default:
        return (
          <ClassicyFileBrowserViewIcons
            fileOnClickFunc={finalFileClick}
            dirOnClickFunc={finalDirClick}
            fs={fs}
            path={path}
            appId={appId}
            holderRef={holderRef}
          />
        );
    }
  }, [display, finalFileClick, finalDirClick, fs, path, appId]);

  return (
    <div style={{ position: "absolute", width: "100%", height: "100%" }}>
      {viewComponent}
    </div>
  );
};
