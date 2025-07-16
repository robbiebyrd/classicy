import {ClassicyDesktopProvider} from './SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import {ClassicyDesktop} from './SystemFolder/SystemResources/Desktop/ClassicyDesktop'
import React from 'react'

class App extends React.Component {
    render() {
        return (
            <ClassicyDesktopProvider>
                <ClassicyDesktop>
                </ClassicyDesktop>
            </ClassicyDesktopProvider>
        );
    }
}

export default App;
