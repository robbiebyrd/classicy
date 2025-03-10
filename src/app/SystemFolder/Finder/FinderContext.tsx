// import {ClassicyFinderContextData, DefaultClassicyFinderState} from "@/app/SystemFolder/Finder/FinderState";
// import React from 'react';
//
// export const ClassicyFinderContext = React.createContext(DefaultClassicyFinderState);
// export const ClassicyFinderDispatchContext = React.createContext(null);
//
// type ClassicyFinderProviderProps = {
//     children?: any
// }
//
// export const ClassicyFinderProvider: React.FC<ClassicyFinderProviderProps> = ({children}) => {
//     let finderState = typeof window !== 'undefined'
//         ? JSON.parse(localStorage.getItem('classicyFinderState')) || DefaultClassicyFinderState
//         : DefaultClassicyFinderState;
//
//     const [finder, dispatch] = React.useReducer(classicyFinderEventHandler, finderState);
//
//     React.useEffect(() => {
//         localStorage.setItem('classicyFinderState', JSON.stringify(finder));
//     }, [finder])
//
//     return (
//         <ClassicyFinderContext.Provider value={finder}>
//             <ClassicyFinderDispatchContext.Provider value={dispatch}>
//                 {children}
//             </ClassicyFinderDispatchContext.Provider>
//         </ClassicyFinderContext.Provider>
//     );
// }
//
//
// export function useFinder() {
//     return React.useContext(ClassicyFinderContext);
// }
//
// export function useFinderDispatch() {
//     return React.useContext(ClassicyFinderDispatchContext);
// }
//
// export const classicyFinderEventHandler = (ds: ClassicyFinderContextData, action) => {
//     switch (action.type) {
//         case "ClassicyFinderEmptyTrash": {
//             // TODO: We need to decide how to reset the state here.
//             break;
//         }
//         case "ClassicyFinderOpenDirectory": {
//             ds.openPaths = [...ds.openPaths, action.path];
//             break;
//         }
//     }
//     return ds;
// };

import { ClassicyStore } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManager'

export const classicyFinderEventHandler = (ds: ClassicyStore, action) => {
    switch (action.type) {
        case 'ClassicyAppFinderOpen': {
            break
        }
    }
    return ds
}
