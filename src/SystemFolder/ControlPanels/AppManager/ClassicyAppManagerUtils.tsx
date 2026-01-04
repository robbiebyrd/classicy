import { createContext, type Dispatch, useContext } from "react";
import { ClassicyStore, DefaultAppManagerState } from "./ClassicyAppManager";

export const ClassicyAppManagerContext = createContext<ClassicyStore>(
  DefaultAppManagerState,
);
export const ClassicyAppManagerDispatchContext = createContext<Dispatch<any>>(
  (() => undefined) as Dispatch<any>,
);

export function useAppManager() {
  return useContext(ClassicyAppManagerContext);
}

export function useAppManagerDispatch() {
  return useContext(ClassicyAppManagerDispatchContext);
}
