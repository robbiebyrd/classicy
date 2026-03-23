import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { FC as FunctionalComponent, useRef, useCallback } from "react";
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

export const ClassicyFileBrowser: FunctionalComponent<ClassicyFileBrowserProps> = ({
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

  return (
    <div style={{ position: "absolute", width: "100%", height: "100%" }}>
      {display === "list" ? (
        <ClassicyFileBrowserViewTable
          fileOnClickFunc={finalFileClick}
          dirOnClickFunc={finalDirClick}
          fs={fs}
          path={path}
          appId={appId}
          iconSize={18}
          holderRef={holderRef}
        />
      ) : (
        <ClassicyFileBrowserViewIcons
          fileOnClickFunc={finalFileClick}
          dirOnClickFunc={finalDirClick}
          fs={fs}
          path={path}
          appId={appId}
          holderRef={holderRef}
        />
      )}
    </div>
  );
};
