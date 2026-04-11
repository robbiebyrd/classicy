import { ClassicyApp, ClassicyWindow, quitAppHelper, useAppManagerDispatch } from 'classicy';
import { useCallback, useMemo } from 'react';
import './BlueBox.scss';
import infiniteMacIcon from './infinite-mac.png';

export const BlueBox = () => {
  const appName = 'InfiniteMac';
  const appId = 'InfiniteMac.app';
  const appIcon = infiniteMacIcon;

  const desktopEventDispatch = useAppManagerDispatch();

  const quitApp = useCallback(() => {
    desktopEventDispatch(quitAppHelper(appId, appName, appIcon));
  }, [desktopEventDispatch]);

  const appMenu = useMemo(
    () => [
      {
        id: 'file',
        title: 'File',
        menuChildren: [
          {
            id: `${appId}_quit`,
            title: 'Quit',
            onClickFunc: quitApp,
          },
        ],
      },
    ],
    [quitApp]
  );

  return (
    <ClassicyApp id={appId} name={appName} icon={appIcon} defaultWindow={'blueBox'}>
      <ClassicyWindow
        id={'blueBox'}
        title={appName}
        icon={appIcon}
        appId={appId}
        scrollable={false}
        initialSize={[645, 485]}
        initialPosition={[100, 100]}
        appMenu={appMenu}
        collapsable={true}
        growable={false}
        resizable={false}
        zoomable={false}
      >
        <div className="blueBox">
          <div className="blueBoxBar blueBoxToolbar">
            <div className="blueBoxToolbarInner">
              <div className="blueBoxToolbarControls">
                <div className="blueBoxNavButtons"></div>
              </div>
            </div>
          </div>
          <div className="blueBoxContents">
            <iframe
              title='Infinite Mac'
              src="https://infinitemac.org/embed?disk=Mac+OS+8.1&machine=Quadra+650&paused=false&auto_pause=true"
              width="640"
              height="480"
              allow="cross-origin-isolated"
            ></iframe>
          </div>
        </div>
      </ClassicyWindow>
    </ClassicyApp>
  );
};
