import { ClassicyMenuContext } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuContext";
import {
  FC as FunctionalComponent,
  ReactNode,
  useCallback,
  useState,
} from "react";

export const ClassicyMenuProvider: FunctionalComponent<{ children: ReactNode; onClose?: () => void }> = ({ children, onClose }) => {
  const [closeSignal, setCloseSignal] = useState(0);
  const [menuBarActive, setMenuBarActive] = useState(false);

  const closeAll = useCallback(() => {
    setCloseSignal(s => s + 1);
    setMenuBarActive(false);
    onClose?.();
  }, [onClose]);

  const activateMenuBar = useCallback(() => {
    setMenuBarActive(true);
  }, []);

  return (
    <ClassicyMenuContext.Provider value={{ closeSignal, closeAll, menuBarActive, activateMenuBar }}>
      {children}
    </ClassicyMenuContext.Provider>
  );
};
