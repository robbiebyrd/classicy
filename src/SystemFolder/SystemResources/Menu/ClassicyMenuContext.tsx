import { createContext } from "react";

export interface ClassicyMenuContextValue {
  closeSignal: number;
  closeAll: () => void;
  menuBarActive: boolean;
  activateMenuBar: () => void;
}

export const ClassicyMenuContext = createContext<ClassicyMenuContextValue>({
  closeSignal: 0,
  closeAll: () => {},
  menuBarActive: false,
  activateMenuBar: () => {},
});
