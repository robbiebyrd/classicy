import { FC as FunctionalComponent, ReactNode, useReducer } from "react";
import {
  initialPlayer,
  ClassicySoundStateEventReducer,
  ClassicySoundDispatchContext,
  ClassicySoundManagerContext,
} from "./ClassicySoundManagerUtils";

export const ClassicySoundManagerProvider: FunctionalComponent<{ children: ReactNode }> = ({
  children,
}) => {
  const [sound, soundDispatch] = useReducer(
    ClassicySoundStateEventReducer,
    initialPlayer,
  );

  return (
    <ClassicySoundManagerContext.Provider value={sound}>
      <ClassicySoundDispatchContext.Provider value={soundDispatch}>
        {children}
      </ClassicySoundDispatchContext.Provider>
    </ClassicySoundManagerContext.Provider>
  );
};
