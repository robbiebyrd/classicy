import "./ClassicyFileBrowserViewTable.scss";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { FC as FunctionalComponent, useRef } from "react";
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

  return (
    <div className={"classicyFileBrowserFill"}>
      {display === "list" ? (
        <ClassicyFileBrowserViewTable
          fileOnClickFunc={fileOnClickFunc ?? defaultFileOnClick}
          dirOnClickFunc={dirOnClickFunc ?? defaultDirOnClick}
          fs={fs}
          path={path}
          appId={appId}
          iconSize={18}
          holderRef={holderRef}
        />
      ) : (
        <ClassicyFileBrowserViewIcons
          fileOnClickFunc={fileOnClickFunc ?? defaultFileOnClick}
          dirOnClickFunc={dirOnClickFunc ?? defaultDirOnClick}
          fs={fs}
          path={path}
          appId={appId}
          holderRef={holderRef}
        />
      )}
    </div>
  );
};
